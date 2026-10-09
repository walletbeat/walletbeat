import { type ChildProcess, spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { getErrorMessage } from '@/types/errors'

/** The fields of CDP command results this module reads. */
interface CdpResult {
	targetId?: unknown
	sessionId?: unknown
	result?: { value?: unknown }
}

interface CdpResponse {
	id: number
	result?: CdpResult
	error?: { message: string }
}

function isCdpResponse(message: unknown): message is CdpResponse {
	return (
		typeof message === 'object' &&
		message !== null &&
		'id' in message &&
		typeof message.id === 'number'
	)
}

const POLL_INTERVAL_MS = 250

const sleep = (ms: number): Promise<void> =>
	new Promise(resolve => {
		setTimeout(resolve, ms)
	})

/**
 * A headless Chromium process driven over the Chrome DevTools Protocol,
 * with a fresh profile and optionally one unpacked extension loaded.
 */
export class HeadlessBrowser {
	private nextId = 1
	private readonly pending = new Map<number, (response: CdpResponse) => void>()

	private constructor(
		private readonly process: ChildProcess,
		private readonly socket: WebSocket,
		private readonly profileDir: string,
	) {
		socket.addEventListener('message', event => {
			if (typeof event.data !== 'string') {
				return
			}

			const response: unknown = JSON.parse(event.data)

			if (!isCdpResponse(response)) {
				return
			}

			const resolve = this.pending.get(response.id)

			if (resolve !== undefined) {
				this.pending.delete(response.id)
				resolve(response)
			}
		})
	}

	/**
	 * Launch `browserPath` headless. `extensionDir`, if set, is loaded as the
	 * only extension. Branded Google Chrome ignores `--load-extension`, so use
	 * Chromium or Chrome for Testing.
	 */
	static async launch(browserPath: string, extensionDir?: string): Promise<HeadlessBrowser> {
		const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walletbeat-speedometer-'))
		const args = [
			'--headless=new',
			'--remote-debugging-port=0',
			`--user-data-dir=${profileDir}`,
			'--no-first-run',
			'--no-default-browser-check',
			'--window-size=1280,900',
			...(extensionDir !== undefined
				? [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`]
				: ['--disable-extensions']),
			'about:blank',
		]
		const child = spawn(browserPath, args, { stdio: 'ignore' })
		const portFile = path.join(profileDir, 'DevToolsActivePort')
		const deadline = Date.now() + 30_000

		while (!fs.existsSync(portFile) || fs.readFileSync(portFile, 'utf8').split('\n').length < 2) {
			if (Date.now() > deadline || child.exitCode !== null) {
				child.kill()
				throw new Error(`Browser did not start: ${browserPath}`)
			}

			await sleep(POLL_INTERVAL_MS)
		}

		const [port, browserPathOnPort] = fs.readFileSync(portFile, 'utf8').split('\n')
		const socket = new WebSocket(`ws://127.0.0.1:${port}${browserPathOnPort}`)

		await new Promise<void>((resolve, reject) => {
			socket.addEventListener('open', () => {
				resolve()
			})
			socket.addEventListener('error', () => {
				reject(new Error('Could not connect to the browser over CDP'))
			})
		})

		return new HeadlessBrowser(child, socket, profileDir)
	}

	private async send(
		method: string,
		params: Record<string, unknown> = {},
		sessionId?: string,
	): Promise<CdpResult> {
		const id = this.nextId++
		const response = await new Promise<CdpResponse>(resolve => {
			this.pending.set(id, resolve)
			this.socket.send(JSON.stringify({ id, method, params, sessionId }))
		})

		if (response.error !== undefined) {
			throw new Error(`${method}: ${response.error.message}`)
		}

		return response.result ?? {}
	}

	/**
	 * Open `url` in a new tab and return the tab's CDP session ID.
	 */
	async openTab(url: string): Promise<string> {
		const { targetId } = await this.send('Target.createTarget', { url })
		const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true })

		if (typeof sessionId !== 'string') {
			throw new Error('Target.attachToTarget returned no session ID')
		}

		return sessionId
	}

	/**
	 * Evaluate a JavaScript expression in a tab and return its value as a string,
	 * or `null` if it threw or returned `null`/`undefined`.
	 */
	async evaluateString(sessionId: string, expression: string): Promise<string | null> {
		try {
			const { result } = await this.send(
				'Runtime.evaluate',
				{ expression: `String(${expression} ?? '')`, returnByValue: true },
				sessionId,
			)
			const value = result?.value

			return typeof value === 'string' && value !== '' ? value : null
		} catch (e) {
			// A navigation destroys the execution context mid-evaluation; callers poll again.
			if (getErrorMessage(e).includes('context')) {
				return null
			}

			throw e
		}
	}

	/**
	 * Poll `expression` until it evaluates to a non-empty string.
	 */
	async waitForString(sessionId: string, expression: string, timeoutMs: number): Promise<string> {
		const deadline = Date.now() + timeoutMs

		for (;;) {
			const value = await this.evaluateString(sessionId, expression)

			if (value !== null) {
				return value
			}

			if (Date.now() > deadline) {
				throw new Error(`Timed out waiting for: ${expression}`)
			}

			await sleep(1000)
		}
	}

	async close(): Promise<void> {
		this.socket.close()

		if (this.process.exitCode === null) {
			const exited = new Promise(resolve => this.process.once('exit', resolve))

			this.process.kill()
			await exited
		}

		fs.rmSync(this.profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
	}
}

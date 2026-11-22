import { execFile } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { promisify } from 'node:util'

import type { Browser, BrowserContext, BrowserServer } from '@playwright/test'
import { chromium } from '@playwright/test'

const executeFile = promisify(execFile)
const activationScript = `
ObjC.import('AppKit')
function run(argv) {
	const action = argv[0]
	const workspace = $.NSWorkspace.sharedWorkspace
	if (action === 'frontmost') {
		const application = workspace.frontmostApplication
		if (application.isNil()) throw new Error('No frontmost application')
		return String(application.processIdentifier)
	}
	let application
	if (action === 'finder') {
		const applications = $.NSRunningApplication.runningApplicationsWithBundleIdentifier('com.apple.finder')
		if (!applications.count) throw new Error('Finder is not running')
		application = applications.objectAtIndex(0)
	} else {
		application = $.NSRunningApplication.runningApplicationWithProcessIdentifier(Number(argv[1]))
	}
	if (application.isNil() || application.isTerminated) {
		if (action === 'restore') return 'gone'
		throw new Error('Requested application is not running')
	}
	if (!application.activateWithOptions($.NSApplicationActivateIgnoringOtherApps)) {
		throw new Error('Native application activation was refused')
	}
	return String(application.processIdentifier)
}
`

async function nativeActivation(action: 'frontmost' | 'activate' | 'finder' | 'restore', pid = 0) {
	if (process.platform !== 'darwin') {
		throw new Error('Native application focus requires macOS')
	}

	const { stdout } = await executeFile(
		'/usr/bin/osascript',
		['-l', 'JavaScript', '-e', activationScript, action, String(pid)],
		{
			timeout: 5000,
			killSignal: 'SIGKILL',
			maxBuffer: 16384,
		},
	)

	return stdout.trim()
}

/** Uses a fresh diagnostics directory and a native default context without focus overrides. */
export async function launchNativeAttentionBrowser(artifactDirectory: string): Promise<{
	browser: Browser
	context: BrowserContext
	focus: (focused: boolean) => Promise<void>
	close: () => Promise<void>
}> {
	if (!isAbsolute(artifactDirectory)) {
		throw new Error('Native attention browser requires an absolute diagnostics directory')
	}

	await mkdir(artifactDirectory)
	let server: BrowserServer | undefined
	let browser: Browser | undefined
	let cleanup: Promise<void> | undefined
	let originalApplicationPid: number | undefined
	const focus = async (focused: boolean): Promise<void> => {
		const pid = server?.process().pid

		if (!pid || cleanup) {
			throw new Error('Native browser is unavailable for activation')
		}

		if (originalApplicationPid === undefined) {
			const original = Number(await nativeActivation('frontmost'))

			if (!Number.isInteger(original) || original <= 0) {
				throw new Error('Frontmost application PID is unavailable')
			}

			originalApplicationPid = original
		}

		const expected = await nativeActivation(focused ? 'activate' : 'finder', pid)
		const deadline = Date.now() + 3000

		while (Date.now() < deadline) {
			if ((await nativeActivation('frontmost')) === expected) {
				return
			}

			await delay(100)
		}
		throw new Error(`Native application did not become frontmost (expected PID ${expected})`)
	}
	const close = (): Promise<void> => {
		cleanup ??= (async () => {
			if (server) {
				let timeout: ReturnType<typeof setTimeout> | undefined

				try {
					await Promise.race([
						server.close(),
						new Promise<void>((_, reject) => {
							timeout = setTimeout(
								() => reject(new Error('Native browser shutdown timed out')),
								3000,
							)
						}),
					])
				} catch {
					await server.kill()
				} finally {
					clearTimeout(timeout)
				}
			}

			try {
				await browser?.close()
			} finally {
				try {
					if (
						originalApplicationPid !== undefined &&
						originalApplicationPid !== server?.process().pid
					) {
						await nativeActivation('restore', originalApplicationPid)
					}
				} finally {
					await rm(artifactDirectory, { recursive: true, force: true })
				}
			}
		})()

		return cleanup
	}

	try {
		// Nonpersistent launch leaves native default-context targets to the CDP connection.
		server = await chromium.launchServer({
			headless: false,
			args: ['--remote-debugging-port=0'],
			downloadsPath: artifactDirectory,
			tracesDir: artifactDirectory,
		})
		const profileArgument = server
			.process()
			.spawnargs.find(argument => argument.startsWith('--user-data-dir='))

		if (!profileArgument) {
			throw new Error('Native browser profile path is unavailable')
		}

		const profileDirectory = profileArgument.slice('--user-data-dir='.length)
		const deadline = Date.now() + 15000
		let port = 0

		while (Date.now() < deadline) {
			const contents = await readFile(join(profileDirectory, 'DevToolsActivePort'), 'utf8').catch(
				(error: unknown) => {
					if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
						return ''
					}

					throw error
				},
			)

			port = Number(contents.split('\n')[0])

			if (Number.isInteger(port) && port > 0 && port <= 65535) {
				break
			}

			await delay(100)
		}

		if (!port) {
			throw new Error('Native browser readiness timed out')
		}

		browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, {
			noDefaults: true,
			timeout: 10000,
		})
		const context = browser.contexts()[0]

		if (!context) {
			throw new Error('Native browser has no default context')
		}

		return { browser, context, focus, close }
	} catch (error) {
		await close()
		throw error
	}
}

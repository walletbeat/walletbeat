import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join } from 'node:path'

import {
	sourceSnapshot,
	verifyServerSource,
} from '../../../tests/browser/fixtures/source-snapshot.mjs'
import { qualifyNativeBreadcrumbClock } from '../../../tests/browser/sticky-observation.mjs'
import { runNativeKeyboard } from './native-keyboard.client.mjs'

/** @param {string} name */
const required = name => {
	const value = process.env[name]

	if (!value) {
		throw new Error(name + ' is required')
	}

	return value
}
const runner = required('WALLET_WEBKIT_RUNNER')
const output = required('WALLET_PAGE_RESULTS')
const url = new URL(required('WALLET_PAGE_URL'))

if (!isAbsolute(runner) || !isAbsolute(output)) {
	throw new Error('Runner and artifact directory must be absolute')
}

if (!['http:', 'https:'].includes(url.protocol)) {
	throw new Error('An HTTP fixture URL is required')
}

const executable = await realpath(runner)
const frameworks = process.env.WALLET_WEBKIT_FRAMEWORKS ?? dirname(executable)

if (!isAbsolute(frameworks)) {
	throw new Error('Framework directory must be absolute')
}

const source = await sourceSnapshot()

await mkdir(output)
/**
 * @typedef {{code: number | null, signal: NodeJS.Signals | null, timedOut: boolean, outputExceeded: boolean, stdout: string, stderr: string}} NativeProcessResult
 */
/** @type {{source: Awaited<ReturnType<typeof sourceSnapshot>>, url: string, executable: string, runnerSha256: string, requestedFrameworkDirectory: string, loadedFrameworkIdentity: string, scope: string, args?: string[], process?: Omit<NativeProcessResult, 'stdout' | 'stderr'>, markers?: string[], observation?: unknown, sourceStable?: boolean, complete?: boolean, error?: string}} */
const report = {
	source,
	url: url.href,
	executable,
	runnerSha256: createHash('sha256')
		.update(await readFile(executable))
		.digest('hex'),
	requestedFrameworkDirectory: frameworks,
	loadedFrameworkIdentity:
		'Not independently observed; record the selected native distribution separately',
	scope: 'Native WebKit held-key behavior; does not skip or replace bundled Playwright failures',
}

try {
	await verifyServerSource(url, source)
	const config = { source: source.build, width: 390, height: 900 }
	const script =
		'(' +
		runNativeKeyboard.toString() +
		')(' +
		JSON.stringify(config) +
		', ' +
		qualifyNativeBreadcrumbClock.toString() +
		')'
	const html =
		'<!doctype html><script>testRunner.dumpAsText();testRunner.queueLoad(' +
		JSON.stringify(url.href) +
		', "");testRunner.queueNonLoadingScript(' +
		JSON.stringify(script).replaceAll('<', '\\u003c') +
		');</script>'
	const fixture = join(output, 'native-keyboard.html')

	await writeFile(fixture, html, { flag: 'wx' })
	const args = [
		'--no-enable-all-experimental-features',
		'--no-timeout',
		'--show-window',
		'--allowed-host',
		url.hostname,
		'--additional-header',
		'viewWidth=390 viewHeight=900',
		fixture,
	]

	report.args = args
	const result = await new Promise(
		/** @param {(value: NativeProcessResult) => void} resolve */ (resolve, reject) => {
			const child = spawn(executable, args, {
				detached: true,
				env: { ...process.env, DYLD_FRAMEWORK_PATH: frameworks, DYLD_LIBRARY_PATH: frameworks },
				stdio: ['ignore', 'pipe', 'pipe'],
			})
			/** @type {Buffer[]} */
			const stdout = []
			/** @type {Buffer[]} */
			const stderr = []
			let bytes = 0,
				timedOut = false,
				outputExceeded = false
			/** @type {ReturnType<typeof setTimeout> | undefined} */
			let force
			const stop = () => {
				const pid = child.pid

				if (pid === undefined) {
					return
				}

				try {
					process.kill(-pid, 'SIGTERM')
				} catch {
					// The owned process group can exit before a termination signal arrives.
				}

				force ??= setTimeout(() => {
					try {
						process.kill(-pid, 'SIGKILL')
					} catch {
						// The owned process group can exit before a termination signal arrives.
					}
				}, 5000)
			}
			const deadline = setTimeout(() => {
				timedOut = true
				stop()
			}, 150000)
			/** @param {Buffer[]} chunks @returns {(chunk: Buffer) => void} */
			const collect = chunks => chunk => {
				bytes += chunk.length

				if (bytes <= 8 * 1024 * 1024) {
					chunks.push(chunk)
				} else if (!outputExceeded) {
					outputExceeded = true
					stop()
				}
			}

			child.stdout.on('data', collect(stdout))
			child.stderr.on('data', collect(stderr))
			child.on('error', error => {
				clearTimeout(deadline)
				clearTimeout(force)
				reject(error)
			})
			child.on('close', (code, signal) => {
				clearTimeout(deadline)
				clearTimeout(force)
				resolve({
					code,
					signal,
					timedOut,
					outputExceeded,
					stdout: Buffer.concat(stdout).toString(),
					stderr: Buffer.concat(stderr).toString(),
				})
			})
		},
	)

	await writeFile(join(output, 'stdout.txt'), result.stdout, { flag: 'wx' })
	await writeFile(join(output, 'stderr.txt'), result.stderr, { flag: 'wx' })
	const markers = result.stdout
		.split(/\r?\n/)
		.filter(
			line =>
				line.includes('WALLET_RESULT ') ||
				line.includes('WALLET_ERROR ') ||
				line.includes('WALLET_PROGRESS '),
		)

	report.process = {
		code: result.code,
		signal: result.signal,
		timedOut: result.timedOut,
		outputExceeded: result.outputExceeded,
	}
	report.markers = markers
	const successes = markers.filter(line => line.includes('WALLET_RESULT '))

	if (
		result.code !== 0 ||
		result.timedOut ||
		result.outputExceeded ||
		successes.length !== 1 ||
		markers.some(line => line.includes('WALLET_ERROR '))
	) {
		throw new Error('Native keyboard capture failed; inspect stdout/stderr')
	}

	report.observation = JSON.parse(
		successes[0].slice(successes[0].indexOf('WALLET_RESULT ') + 'WALLET_RESULT '.length),
	)
	report.sourceStable = JSON.stringify(source) === JSON.stringify(await sourceSnapshot())

	if (!report.sourceStable) {
		throw new Error('Local source changed during capture')
	}

	await verifyServerSource(url, source)
	report.complete = true
} catch (error) {
	report.error = String(error)
	process.exitCode = 1
} finally {
	await writeFile(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n', {
		flag: 'wx',
	})
	process.stdout.write(
		JSON.stringify({
			complete: report.complete === true,
			error: report.error,
			report: join(output, 'result.json'),
		}) + '\n',
	)
}

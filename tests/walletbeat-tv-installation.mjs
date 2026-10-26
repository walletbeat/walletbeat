import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

for (const mode of [
	'repair',
	'broken',
	'environment',
	'permissions',
	'crash',
	'low-space',
	'shortcut',
	...(process.platform !== 'win32' ? ['libraries'] : []),
]) {
	await test(`checks browser installation and reusable launchers: ${mode}`, () => {
		const directory = mkdtempSync(join(tmpdir(), 'walletbeat-tv-browser-failure '))

		try {
			const prefix = join(directory, 'walletbeat-tv')

			assert.equal(
				spawnSync(process.execPath, ['deploy/walletbeat-tv/build-launchers.mjs', prefix]).status,
				0,
			)
			const shell = readFileSync(`${prefix}.sh`, 'utf8')
			let installationScript = Buffer.from(
				shell.match(/<<'INSTALLATION_SCRIPT'\r?\n([\s\S]*?)\r?\nINSTALLATION_SCRIPT/)?.[1] ?? '',
				'base64',
			).toString('utf8')
			const metadata =
				installationScript.match(/const encodedPackageManifest = '([^']+)'/)?.[1] ?? ''
			/** @type {unknown} */
			const manifest = JSON.parse(Buffer.from(metadata, 'base64').toString('utf8'))

			if (
				typeof manifest !== 'object' ||
				manifest === null ||
				Array.isArray(manifest) ||
				!('dependencies' in manifest) ||
				typeof manifest.dependencies !== 'object' ||
				manifest.dependencies === null ||
				Array.isArray(manifest.dependencies) ||
				!('@playwright/test' in manifest.dependencies)
			) {
				throw new Error('Invalid fixture manifest')
			}

			const version = manifest.dependencies['@playwright/test']

			if (typeof version !== 'string') {
				throw new Error('Missing fixture dependency version')
			}

			const cache =
				mode === 'shortcut'
					? join(
							directory,
							process.platform === 'darwin'
								? 'Library/Caches/walletbeat-tv'
								: process.platform === 'win32'
									? 'local/walletbeat-tv'
									: 'cache/walletbeat-tv',
						)
					: join(directory, 'cache')
			const packages = join(cache, `playwright-${version}`)
			const moduleDirectory = join(packages, 'node_modules/@playwright/test')

			mkdirSync(moduleDirectory, { recursive: true })
			writeFileSync(
				join(moduleDirectory, 'package.json'),
				JSON.stringify({ name: '@playwright/test', version, main: 'index.js' }),
			)
			writeFileSync(
				join(moduleDirectory, 'index.js'),
				`
const fs = require('node:fs');
const record = event => fs.appendFileSync(process.env.TEST_EVENTS, event + '\\n');
let launches = 0;
module.exports = { chromium: {
 executablePath: () => process.execPath,
 launch: async () => {
  record('launch'); launches++;
  if (process.env.TEST_FAILURE === 'crash') throw new Error('process did exit: exitCode=null, signal=SIGSEGV');
  if (process.env.TEST_FAILURE === 'permissions') throw new Error('spawn chrome EACCES');
  if (process.env.TEST_FAILURE === 'environment') throw new Error('Missing X server or DISPLAY');
  if (process.env.TEST_FAILURE === 'broken' || (process.env.TEST_FAILURE === 'repair' && launches === 1)) throw new Error('spawn chrome ENOEXEC');
  if (process.env.TEST_FAILURE === 'libraries' && launches === 1) throw new Error('Host system is missing dependencies');
  return { newPage: async () => ({ setContent: async () => {}, title: async () => 'Walletbeat TV installation check' }), close: async () => record('close') };
 }
}};
`,
			)
			const cliDirectory = join(packages, 'node_modules/playwright')

			mkdirSync(cliDirectory)
			writeFileSync(
				join(cliDirectory, 'cli.js'),
				"require('node:fs').appendFileSync(process.env.TEST_EVENTS, process.argv.slice(2).join(' ') + '\\n')",
			)
			const script = join(directory, 'install.mjs')

			if (mode === 'shortcut') {
				const tour = Buffer.from(
					"import { appendFileSync } from 'node:fs'; appendFileSync(process.env.TEST_EVENTS, 'tour\\n');",
				).toString('base64')

				installationScript = installationScript.replace(
					/const encodedTour = '[^']*'/,
					`const encodedTour = '${tour}'`,
				)
			}

			writeFileSync(script, installationScript)
			const preload = join(directory, 'disk-space.cjs')

			writeFileSync(
				preload,
				"if (process.env.TEST_FAILURE === 'libraries') Object.defineProperty(process, 'platform', { value: 'linux' }); require('node:fs').statfsSync = () => ({ bavail: process.env.TEST_FAILURE === 'low-space' ? 1n : 2n ** 40n, bsize: 1n }); require('node:module').syncBuiltinESMExports()",
			)
			const events = join(directory, 'events.log')

			writeFileSync(events, '')
			const execution = spawnSync(
				process.execPath,
				[
					'--require',
					preload,
					script,
					...(mode === 'shortcut' ? ['https://example.test'] : ['--check']),
				],
				{
					encoding: 'utf8',
					timeout: 10_000,
					env: {
						...process.env,
						WALLETBEAT_TV_CACHE: cache,
						WALLETBEAT_TV_NPM_CLI: process.execPath,
						TEST_EVENTS: events,
						TEST_FAILURE: mode,
						HOME: directory,
						LOCALAPPDATA: join(directory, 'local'),
						APPDATA: join(directory, 'roaming'),
						XDG_CACHE_HOME: join(directory, 'cache'),
						XDG_DATA_HOME: join(directory, 'data'),
						WALLETBEAT_TV_DESKTOP: join(directory, 'Desktop'),
						DISPLAY: ':0',
						NODE_OPTIONS: `--require "${preload}"`,
					},
				},
			)
			const calls = readFileSync(events, 'utf8').trim().split('\n').filter(Boolean)

			if (mode === 'repair' || mode === 'libraries') {
				assert.equal(execution.status, 0, execution.stderr)
				assert.deepEqual(calls, [
					'launch',
					mode === 'repair' ? 'install --no-shell --force chromium' : 'install-deps chromium',
					'launch',
					'close',
				])
			} else if (mode === 'shortcut') {
				assert.equal(execution.status, 0, execution.stderr)
				assert.deepEqual(calls, ['launch', 'close', 'tour'])
				const launchers =
					process.platform === 'darwin'
						? join(directory, 'Library/Application Support/walletbeat-tv')
						: process.platform === 'win32'
							? join(directory, 'roaming/walletbeat-tv')
							: join(directory, 'data/walletbeat-tv')
				const bootstrap = join(
					launchers,
					process.platform === 'win32' ? 'walletbeat-tv.ps1' : 'walletbeat-tv.sh',
				)
				const before = readFileSync(bootstrap, 'utf8')

				rmSync(script)
				const command = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'
				const shortcut =
					process.platform === 'win32'
						? join(directory, 'Desktop/Walletbeat TV.cmd')
						: process.platform === 'darwin'
							? join(directory, 'Desktop/Walletbeat TV.command')
							: join(launchers, 'open-walletbeat-tv.sh')
				const reopened = spawnSync(
					command,
					process.platform === 'win32' ? ['/d', '/c', shortcut] : [shortcut],
					{
						encoding: 'utf8',
						timeout: 10_000,
						input: '',
						env: {
							...process.env,
							HOME: directory,
							LOCALAPPDATA: join(directory, 'local'),
							APPDATA: join(directory, 'roaming'),
							XDG_CACHE_HOME: join(directory, 'cache'),
							XDG_DATA_HOME: join(directory, 'data'),
							WALLETBEAT_TV_DESKTOP: join(directory, 'Desktop'),
							TEST_EVENTS: events,
							TEST_FAILURE: mode,
							DISPLAY: ':0',
							NODE_OPTIONS: `--require "${preload}"`,
						},
					},
				)

				assert.equal(reopened.status, 0, reopened.stdout + reopened.stderr)
				assert.equal(readFileSync(bootstrap, 'utf8'), before)
				assert.deepEqual(readFileSync(events, 'utf8').trim().split('\n'), [
					'launch',
					'close',
					'tour',
					'launch',
					'close',
					'tour',
				])
			} else if (mode === 'broken') {
				assert.notEqual(execution.status, 0)
				assert.deepEqual(calls, ['launch', 'install --no-shell --force chromium', 'launch'])
			} else if (mode === 'environment' || mode === 'permissions' || mode === 'crash') {
				assert.notEqual(execution.status, 0)
				assert.deepEqual(calls, ['launch'])
			} else {
				assert.notEqual(execution.status, 0)
				assert.ok(execution.stderr.includes('Free disk space and rerun the same command'))
				assert.deepEqual(calls, [])
			}
		} finally {
			rmSync(directory, { recursive: true, force: true })
		}
	})
}

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

import { createShortcut } from '../deploy/walletbeat-tv/create-shortcut.mjs'

for (const running of [false, true]) {
	await test(`uninstall ${running ? 'protects a running session' : 'removes only TV and is repeatable'}`, () => {
		const home = fs.mkdtempSync(join(tmpdir(), "Walletbeat TV uninstall ' ü "))

		try {
			const windows = process.platform === 'win32'
			const mac = process.platform === 'darwin'
			const data = join(home, 'data')
			const cache = mac
				? join(home, 'Library/Caches/walletbeat-tv')
				: join(home, 'cache/walletbeat-tv')
			const appData = mac ? join(home, 'Library/Application Support') : data
			const desktop = join(home, 'Desktop')
			const extension = windows ? 'ps1' : 'sh'
			const source = fs.readFileSync(`deploy/walletbeat-tv/uninstall.${extension}`, 'utf8')
			const shortcut = createShortcut({
				platform: process.platform,
				desktopDirectory: desktop,
				dataDirectory: appData,
				launcherSource: 'TV fixture',
				uninstallerSource: source,
				siteUrl: 'https://example.test',
			})

			fs.mkdirSync(cache, { recursive: true })
			fs.writeFileSync(join(cache, 'dependency'), 'TV')
			const shared = join(home, 'shared-browser')

			fs.writeFileSync(shared, 'keep')
			const script = resolve(`deploy/walletbeat-tv/uninstall.${extension}`)
			const env = {
				...process.env,
				HOME: home,
				XDG_DATA_HOME: data,
				XDG_CACHE_HOME: join(home, 'cache'),
				LOCALAPPDATA: join(home, 'cache'),
				APPDATA: data,
				WALLETBEAT_TV_DESKTOP: desktop,
				TEST_UNINSTALL: script,
				TEST_CACHE: cache,
			}
			let result

			if (windows) {
				const invoke =
					'& ([ScriptBlock]::Create((Get-Content -LiteralPath $env:TEST_UNINSTALL -Raw)))'
				const command = running
					? `$lock = [IO.File]::Open((Join-Path $env:TEST_CACHE 'launch.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None); try { ${invoke} } finally { $lock.Dispose() }`
					: invoke

				result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
					env,
					encoding: 'utf8',
					timeout: 10000,
				})
			} else {
				const command = running
					? `exec 9>"$TEST_CACHE/launch.lock"
${mac ? 'lockf -s -t 0 9' : 'flock -n 9'}
/bin/sh "$TEST_UNINSTALL"\nstatus=$?\nexit "$status"`
					: '/bin/sh "$TEST_UNINSTALL"'

				result = spawnSync('/bin/sh', ['-c', command], { env, encoding: 'utf8', timeout: 10000 })
			}

			if (running) {
				assert.notEqual(result.status, 0)
				assert.match(result.stdout + result.stderr, /Close Walletbeat TV/)
				assert.ok(fs.existsSync(shortcut))
				assert.ok(fs.existsSync(join(cache, 'dependency')))
			} else {
				assert.equal(result.status, 0, result.stdout + result.stderr)
				assert.equal(fs.existsSync(shortcut), false)
				assert.equal(fs.existsSync(cache), false)
				assert.equal(fs.existsSync(join(appData, 'walletbeat-tv')), false)
				const again = windows
					? spawnSync(
							'powershell.exe',
							[
								'-NoProfile',
								'-Command',
								'& ([ScriptBlock]::Create((Get-Content -LiteralPath $env:TEST_UNINSTALL -Raw)))',
							],
							{ env, encoding: 'utf8', timeout: 10000 },
						)
					: spawnSync('/bin/sh', [script], { env, encoding: 'utf8', timeout: 10000 })

				assert.equal(again.status, 0, again.stdout + again.stderr)
			}

			assert.equal(fs.readFileSync(shared, 'utf8'), 'keep')
		} finally {
			fs.rmSync(home, { recursive: true, force: true })
		}
	})
}

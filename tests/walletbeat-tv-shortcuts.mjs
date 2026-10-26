import './walletbeat-tv-installation.mjs'

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createShortcut } from '../deploy/walletbeat-tv/create-shortcut.mjs'

for (const platform of ['darwin', 'linux', 'win32']) {
	await test(`${platform} creates a stable shortcut with quoted paths and the chosen site`, () => {
		const directory = fs.mkdtempSync(join(tmpdir(), "Walletbeat TV ' $ % ü "))

		try {
			const options = {
				platform,
				desktopDirectory: join(directory, 'Desktop'),
				dataDirectory: join(directory, 'applications'),
				launcherSource: platform === 'win32' ? "Write-Host 'Walletbeat TV'" : '#!/bin/sh\nexit 0\n',
				siteUrl: "https://example.test/?name=Walletbeat%20TV&value='quoted'",
			}
			const shortcut = createShortcut(options)
			const contents = fs.readFileSync(shortcut, 'utf8')
			const before = fs.statSync(shortcut).mtimeMs

			assert.equal(createShortcut(options), shortcut)
			assert.equal(fs.statSync(shortcut).mtimeMs, before)

			if (platform === 'win32') {
				const encoded = contents.match(/-EncodedCommand (\S+)/)?.[1]

				assert.ok(encoded)
				const command = Buffer.from(encoded, 'base64').toString('utf16le')

				assert.ok(command.includes("-LiteralPath '"))
				assert.ok(command.includes("''quoted''"))
				assert.ok(command.includes('Press Enter to retry'))
				assert.ok(command.includes('IsInputRedirected'))

				if (process.platform === 'win32') {
					const result = spawnSync('cmd.exe', ['/d', '/c', shortcut], {
						encoding: 'utf8',
						timeout: 10_000,
					})

					assert.equal(result.status, 0, result.stdout + result.stderr)
					assert.match(result.stdout, /Walletbeat TV/)
				}
			} else if (platform === 'linux') {
				assert.match(contents, /\nTerminal=true\n/)
				assert.ok(contents.includes('%%'))
				assert.ok(contents.includes('\\\\$'))
			} else {
				assert.ok(fs.statSync(shortcut).mode & 0o111)
			}
		} finally {
			fs.rmSync(directory, { recursive: true, force: true })
		}
	})
}

for (const mode of ['close', 'retry', 'quit', 'eof', 'interrupt']) {
	await test(
		`Unix launcher handles ${mode} without losing its error or looping`,
		{ skip: process.platform === 'win32' },
		() => {
			const directory = fs.mkdtempSync(join(tmpdir(), "Walletbeat TV ' $ % ü "))

			try {
				const events = join(directory, 'events')
				const captured = join(directory, 'site')
				const siteUrl = "https://example.test/?value='quoted'&percent=%20"
				const shortcut = createShortcut({
					platform: 'darwin',
					dataDirectory: join(directory, 'data'),
					desktopDirectory: join(directory, 'Desktop'),
					launcherSource:
						'#!/bin/sh\nprintf "%s\\n" launch >> "$TEST_EVENTS"\nprintf "%s" "$1" > "$TEST_SITE"\ncase "$TEST_MODE" in close) exit 0;; interrupt) exit 130;; retry) [ "$(wc -l < "$TEST_EVENTS")" -gt 1 ] && exit 0;; esac\nexit 1\n',
					siteUrl,
				})
				const result = spawnSync('/bin/sh', [shortcut], {
					encoding: 'utf8',
					timeout: 5000,
					input: mode === 'retry' ? '\n' : mode === 'quit' ? 'q\n' : '',
					env: { ...process.env, TEST_MODE: mode, TEST_EVENTS: events, TEST_SITE: captured },
				})

				assert.equal(
					result.status,
					['close', 'retry', 'interrupt'].includes(mode) ? 0 : 1,
					result.stderr,
				)
				assert.equal(fs.readFileSync(captured, 'utf8'), siteUrl)
				assert.equal(
					fs.readFileSync(events, 'utf8').trim().split('\n').length,
					mode === 'retry' ? 2 : 1,
				)
				assert.equal(
					result.stdout.includes('Press Enter to retry'),
					!['close', 'interrupt'].includes(mode),
				)
			} finally {
				fs.rmSync(directory, { recursive: true, force: true })
			}
		},
	)
}

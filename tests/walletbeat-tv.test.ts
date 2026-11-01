import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { isRecord } from '@/types/utils/record'

describe('Walletbeat TV standalone launchers', () => {
	it('embeds the current tour and dependency version identically for both shells', () => {
		const directory = mkdtempSync(join(tmpdir(), 'walletbeat-tv-launchers '))

		try {
			const prefix = join(directory, 'walletbeat-tv')
			const build = spawnSync(
				process.execPath,
				['deploy/walletbeat-tv/build-launchers.mjs', prefix],
				{
					encoding: 'utf8',
				},
			)

			expect(build.status, build.stderr).toBe(0)
			const shell = readFileSync(`${prefix}.sh`, 'utf8')
			const powershell = readFileSync(`${prefix}.ps1`, 'utf8')
			const shellInstallationScript = shell.match(
				/<<'INSTALLATION_SCRIPT'\r?\n([\s\S]*?)\r?\nINSTALLATION_SCRIPT/,
			)
			const windowsInstallationScript = powershell.match(
				/FromBase64String\(@'\r?\n([\s\S]*?)\r?\n'@/,
			)

			expect(shellInstallationScript).not.toBeNull()
			expect(windowsInstallationScript).not.toBeNull()
			const installationScript = Buffer.from(shellInstallationScript?.[1] ?? '', 'base64').toString(
				'utf8',
			)

			expect(Buffer.from(windowsInstallationScript?.[1] ?? '', 'base64').toString('utf8')).toBe(
				installationScript,
			)
			expect(shell + powershell).not.toMatch(
				/@(?:NODE_VERSION|RUNTIME_PROBE|ENCODED_RUNTIME_PROBE|INSTALLATION_SCRIPT|TOUR_SOURCE|PACKAGE_MANIFEST)@/,
			)
			expect(installationScript).not.toMatch(
				/@(?:TOUR_SOURCE|PACKAGE_MANIFEST|LAUNCHER_TEMPLATES|SHORTCUT_SCRIPT|UNINSTALLERS)@/,
			)
			expect(installationScript).toContain(
				readFileSync('deploy/walletbeat-tv/create-shortcut.mjs', 'utf8').replace(
					'export function createShortcut',
					'function createShortcut',
				),
			)
			const encodedTour = installationScript.match(/const encodedTour = '([^']+)'/)?.[1] ?? ''
			const encodedPackageManifest =
				installationScript.match(/const encodedPackageManifest = '([^']+)'/)?.[1] ?? ''

			expect(Buffer.from(encodedTour, 'base64')).toEqual(
				readFileSync('deploy/walletbeat-tv/tour.mjs'),
			)
			const packageManifest: unknown = JSON.parse(
				Buffer.from(encodedPackageManifest, 'base64').toString('utf8'),
			)
			const projectManifest: unknown = JSON.parse(readFileSync('package.json', 'utf8'))

			if (
				!isRecord(packageManifest) ||
				!isRecord(packageManifest.dependencies) ||
				!isRecord(projectManifest) ||
				!isRecord(projectManifest.devDependencies)
			) {
				throw new Error('Invalid package manifest')
			}

			expect(packageManifest.dependencies['@playwright/test']).toBe(
				projectManifest.devDependencies['@playwright/test'],
			)
		} finally {
			rmSync(directory, { recursive: true, force: true })
		}
	})

	it('creates reusable launchers with native retry and clean exit behavior', () => {
		const result = spawnSync(process.execPath, ['--test', 'tests/walletbeat-tv-shortcuts.mjs'], {
			encoding: 'utf8',
			timeout: 20_000,
		})

		expect(result.status, result.stdout + result.stderr).toBe(0)
	})

	it('refuses to run an unbundled installation template before touching adjacent files', () => {
		const directory = mkdtempSync(join(tmpdir(), 'walletbeat-tv-template '))

		try {
			const installationScript = join(directory, 'install.mjs')

			writeFileSync(installationScript, readFileSync('deploy/walletbeat-tv/install.mjs'))
			writeFileSync(join(directory, 'tour.mjs'), 'existing tour')
			const execution = spawnSync(process.execPath, [installationScript], { encoding: 'utf8' })

			expect(execution.status).not.toBe(0)
			expect(execution.stderr).toContain('standalone launcher')
			expect(readFileSync(join(directory, 'tour.mjs'), 'utf8')).toBe('existing tour')
			expect(readdirSync(directory).sort()).toEqual(['install.mjs', 'tour.mjs'])
		} finally {
			rmSync(directory, { recursive: true, force: true })
		}
	})

	it.skipIf(process.platform === 'win32').each(
		['Darwin', 'Linux'].flatMap(platform => [
			{ platform, cached: false, lowSpace: false },
			{ platform, cached: true, lowSpace: false },
			{ platform, cached: false, lowSpace: true },
		]),
	)(
		'$platform checks runtime reuse and disk space (cached: $cached, low space: $lowSpace)',
		({ platform, cached, lowSpace }) => {
			const directory = mkdtempSync(join(tmpdir(), 'walletbeat-tv-checksum '))

			try {
				const prefix = join(directory, 'walletbeat-tv')

				expect(
					spawnSync(process.execPath, ['deploy/walletbeat-tv/build-launchers.mjs', prefix]).status,
				).toBe(0)
				const bin = join(directory, 'bin')
				const temporary = join(directory, 'tmp')

				mkdirSync(bin)
				mkdirSync(temporary)

				if (lowSpace) {
					writeFileSync(
						join(bin, 'df'),
						'#!/bin/sh\necho "Filesystem 1024-blocks Used Available Capacity Mounted on"\necho "disk 100 99 1 99% /"\n',
						{ mode: 0o755 },
					)
				}

				writeFileSync(
					join(bin, 'uname'),
					'#!/bin/sh\nif [ "$1" = -s ]; then echo "$TEST_PLATFORM"; else echo arm64; fi\n',
					{ mode: 0o755 },
				)

				for (const command of ['lockf', 'flock']) {
					writeFileSync(join(bin, command), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
				}
				writeFileSync(join(bin, 'node'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
				writeFileSync(join(bin, 'sw_vers'), '#!/bin/sh\necho 14.0\n', { mode: 0o755 })
				writeFileSync(
					join(bin, 'curl'),
					`#!/bin/sh
while [ "$1" != -o ]; do download_url="$1"; shift; done
shift
case "$download_url" in
  */SHASUMS256.txt) printf '%064d  %s\\n' 0 "$TEST_ARCHIVE" > "$1" ;;
  *) printf 'corrupt archive' > "$1" ;;
esac
`,
					{ mode: 0o755 },
				)
				const shell = readFileSync(`${prefix}.sh`, 'utf8')
				const nodeVersion = shell.match(/node_version=(v[\d.]+)/)?.[1]

				if (cached) {
					const runtime = join(
						directory,
						platform === 'Darwin' ? 'Library/Caches' : 'cache',
						'walletbeat-tv',
						`node-${nodeVersion}-${platform === 'Darwin' ? 'darwin' : 'linux'}-arm64`,
					)

					mkdirSync(join(runtime, 'bin'), { recursive: true })
					mkdirSync(join(runtime, 'lib/node_modules/npm/bin'), { recursive: true })
					writeFileSync(join(runtime, 'lib/node_modules/npm/bin/npm-cli.js'), '')
					writeFileSync(
						join(runtime, 'bin/node'),
						`#!/bin/sh\nif [ "$1" = --version ]; then echo '${nodeVersion}'; else echo 'Reused cached runtime'; fi\n`,
						{ mode: 0o755 },
					)
				}

				const execution = spawnSync('/bin/sh', [`${prefix}.sh`], {
					encoding: 'utf8',
					timeout: 10_000,
					env: {
						...process.env,
						PATH: `${bin}:${process.env.PATH}`,
						TMPDIR: temporary,
						HOME: directory,
						XDG_CACHE_HOME: join(directory, 'cache'),
						TEST_PLATFORM: platform,
						TEST_ARCHIVE: `node-${nodeVersion}-${platform === 'Darwin' ? 'darwin' : 'linux'}-arm64.tar.gz`,
					},
				})

				if (cached) {
					expect(execution.status, execution.stderr).toBe(0)
					expect(execution.stdout).toContain('Reused cached runtime')
				} else if (lowSpace) {
					expect(execution.status).not.toBe(0)
					expect(execution.stderr).toContain('Free disk space and rerun the same command')
				} else {
					expect(execution.status).not.toBe(0)
					expect(execution.stdout + execution.stderr).toMatch(/FAILED|checksum/i)
				}

				expect(readdirSync(temporary)).toEqual([])
			} finally {
				rmSync(directory, { recursive: true, force: true })
			}
		},
	)

	it.skipIf(process.platform === 'win32')(
		'excludes concurrent launches and releases its OS lock after exit',
		async () => {
			const directory = mkdtempSync(join(tmpdir(), 'walletbeat-tv-concurrency '))

			try {
				const prefix = join(directory, 'walletbeat-tv')

				expect(
					spawnSync(process.execPath, ['deploy/walletbeat-tv/build-launchers.mjs', prefix]).status,
				).toBe(0)
				const shell = readFileSync(`${prefix}.sh`, 'utf8')
				const version = shell.match(/node_version=(v[\d.]+)/)?.[1]
				const cache = join(
					directory,
					process.platform === 'darwin' ? 'Library/Caches' : 'cache',
					'walletbeat-tv',
				)
				const runtime = join(
					cache,
					`node-${version}-${process.platform === 'darwin' ? 'darwin' : 'linux'}-${process.arch}`,
				)
				const bin = join(directory, 'bin')
				const temporary = join(directory, 'tmp')

				mkdirSync(bin)
				mkdirSync(temporary)
				writeFileSync(join(bin, 'node'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
				mkdirSync(join(runtime, 'bin'), { recursive: true })
				mkdirSync(join(runtime, 'lib/node_modules/npm/bin'), { recursive: true })
				writeFileSync(join(runtime, 'lib/node_modules/npm/bin/npm-cli.js'), '')
				writeFileSync(
					join(runtime, 'bin/node'),
					`#!/bin/sh\nif [ "$1" = --version ]; then echo '${version}'; else sleep "\${TEST_HOLD_SECONDS:-0}"; fi\n`,
					{ mode: 0o755 },
				)
				const env = {
					...process.env,
					PATH: `${bin}:${process.env.PATH}`,
					HOME: directory,
					XDG_CACHE_HOME: join(directory, 'cache'),
					TMPDIR: temporary,
				}
				const first = spawn('/bin/sh', [`${prefix}.sh`], {
					env: { ...env, TEST_HOLD_SECONDS: '2' },
				})

				if (!first.stdout) {
					throw new Error('Missing launcher output')
				}

				const finished = once(first, 'exit')

				await once(first.stdout, 'data')
				const second = spawnSync('/bin/sh', [`${prefix}.sh`], {
					env,
					encoding: 'utf8',
					timeout: 5000,
				})

				expect(second.status).not.toBe(0)
				expect(second.stderr).toContain('already running or installing')
				expect((await finished)[0]).toBe(0)
				const third = spawnSync('/bin/sh', [`${prefix}.sh`], {
					env,
					encoding: 'utf8',
					timeout: 5000,
				})

				expect(third.status, third.stderr).toBe(0)
				expect(readdirSync(temporary)).toEqual([])
			} finally {
				rmSync(directory, { recursive: true, force: true })
			}
		},
		15_000,
	)
})

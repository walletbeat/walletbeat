import { existsSync, mkdirSync, readFileSync, rmSync, statfsSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, delimiter, dirname, join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

// @SHORTCUT_SCRIPT@

const encodedUninstallers = '@UNINSTALLERS@'
const encodedTour = '@TOUR_SOURCE@'
const encodedPackageManifest = '@PACKAGE_MANIFEST@'
const encodedLauncherTemplates = '@LAUNCHER_TEMPLATES@'
if (
	[encodedTour, encodedPackageManifest, encodedLauncherTemplates, encodedUninstallers].some(value =>
		value.startsWith('@'),
	)
) {
	throw new Error(
		'Build a standalone launcher with pnpm walletbeat-tv:build-launchers; do not run the installation template directly.',
	)
}

const installationDirectory = dirname(fileURLToPath(import.meta.url))
const cacheDirectory = process.env.WALLETBEAT_TV_CACHE
const npmCli = process.env.WALLETBEAT_TV_NPM_CLI
if (!cacheDirectory || !npmCli) {
	throw new Error('Use the Walletbeat TV shell or PowerShell launcher.')
}
const packageManifest = JSON.parse(Buffer.from(encodedPackageManifest, 'base64').toString('utf8'))
const playwrightVersion = packageManifest.dependencies['@playwright/test']
const packageDirectory = join(cacheDirectory, `playwright-${playwrightVersion}`)
mkdirSync(packageDirectory, { recursive: true })
const arguments_ = process.argv.slice(2)
const installSystemDependencies = arguments_.includes('--with-deps')
const checkHeaded = arguments_.includes('--check-headed')
const checkInstallation = checkHeaded || arguments_.includes('--check')
if (
	process.platform === 'linux' &&
	(checkHeaded || !checkInstallation) &&
	!process.env.DISPLAY &&
	!process.env.WAYLAND_DISPLAY
) {
	throw new Error(
		'Walletbeat TV needs an active graphical desktop session. Run it from the desktop terminal, or use --check to verify dependencies without opening TV.',
	)
}
const siteUrls = arguments_.filter(
	arg => !['--with-deps', '--check', '--check-headed'].includes(arg),
)
if (siteUrls.length > 1) {
	throw new Error('Pass one Walletbeat URL, optionally with --with-deps on Linux.')
}
const siteUrl = new URL(siteUrls[0] || 'https://beta.walletbeat.eth.limo')
if (!['http:', 'https:'].includes(siteUrl.protocol)) {
	throw new Error('Use an HTTP or HTTPS Walletbeat URL.')
}
Object.assign(process.env, {
	PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH || ''}`,
	npm_config_cache: join(cacheDirectory, 'npm-cache'),
	TMPDIR: installationDirectory,
	TEMP: installationDirectory,
	TMP: installationDirectory,
})
if (!checkInstallation) {
	try {
		const templates = JSON.parse(Buffer.from(encodedLauncherTemplates, 'base64').toString('utf8'))
		const encodedInstallation = Buffer.from(readFileSync(fileURLToPath(import.meta.url)))
			.toString('base64')
			.match(/.{1,76}/g)
			.join('\n')
		const launcherSource = templates[process.platform === 'win32' ? 'ps1' : 'sh'].replace(
			'@INSTALLATION_SCRIPT@',
			encodedInstallation,
		)
		const shortcut = createShortcut({
			platform: process.platform,
			desktopDirectory: process.env.WALLETBEAT_TV_DESKTOP || join(homedir(), 'Desktop'),
			dataDirectory:
				process.platform === 'darwin'
					? join(homedir(), 'Library/Application Support')
					: process.platform === 'win32'
						? process.env.APPDATA
						: process.env.XDG_DATA_HOME || join(homedir(), '.local/share'),
			launcherSource,
			uninstallerSource: JSON.parse(Buffer.from(encodedUninstallers, 'base64').toString('utf8'))[
				process.platform === 'win32' ? 'ps1' : 'sh'
			],
			siteUrl: siteUrl.href,
		})
		console.log(`Walletbeat TV: open it again using ${shortcut}`)
	} catch (error) {
		console.warn(
			`Walletbeat TV could not create its shortcut: ${error.message}. Keep the downloaded launcher to reopen it.`,
		)
	}
}
const requireDiskSpace = (directory, minimumBytes) => {
	let existingDirectory = directory
	while (!existsSync(existingDirectory)) {
		existingDirectory = dirname(existingDirectory)
	}
	const { bavail, bsize } = statfsSync(existingDirectory, { bigint: true })
	if (bavail * bsize < BigInt(minimumBytes)) {
		throw new Error(
			`Walletbeat TV needs at least ${minimumBytes / 1024 ** 2} MiB free at ${existingDirectory}. Free disk space and rerun the same command.`,
		)
	}
}
requireDiskSpace(installationDirectory, 16 * 1024 ** 2)
const runNode = (...arguments_) => {
	const result = spawnSync(process.execPath, arguments_, {
		cwd: packageDirectory,
		stdio: 'inherit',
	})
	if (result.error) {
		throw result.error
	}
	if (result.status !== 0) {
		throw new Error(`Walletbeat TV command exited with status ${result.status ?? 1}.`)
	}
}
const loadPlaywright = () => {
	const require = createRequire(join(packageDirectory, 'package.json'))
	if (
		JSON.parse(readFileSync(require.resolve('@playwright/test/package.json'), 'utf8')).version !==
		playwrightVersion
	) {
		throw new Error('Playwright version does not match the launcher.')
	}
	return require('@playwright/test')
}
let playwright
try {
	playwright = loadPlaywright()
	console.log(`Walletbeat TV: reusing Playwright ${playwrightVersion}`)
} catch {
	requireDiskSpace(packageDirectory, 64 * 1024 ** 2)
	writeFileSync(
		join(packageDirectory, 'package.json'),
		Buffer.from(encodedPackageManifest, 'base64'),
	)
	console.log(`Walletbeat TV: installing Playwright ${playwrightVersion}…`)
	rmSync(join(packageDirectory, 'node_modules'), { recursive: true, force: true })
	runNode(npmCli, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false')
	playwright = loadPlaywright()
}
const playwrightCli = join(packageDirectory, 'node_modules/playwright/cli.js')
if (installSystemDependencies && process.platform === 'linux') {
	runNode(playwrightCli, 'install-deps', 'chromium')
}
const { chromium } = playwright
const installBrowser = (force = false) => {
	requireDiskSpace(installationDirectory, 768 * 1024 ** 2)
	requireDiskSpace(dirname(chromium.executablePath()), 768 * 1024 ** 2)
	runNode(playwrightCli, 'install', '--no-shell', ...(force ? ['--force'] : []), 'chromium')
}
if (!existsSync(chromium.executablePath())) {
	console.log('Walletbeat TV: installing its browser…')
	installBrowser()
} else {
	console.log('Walletbeat TV: reusing its installed browser')
}
const launchBrowserProbe = () => chromium.launch({ headless: true, channel: 'chromium' })
let probeBrowser
let repairedBrowser = false
let installedSystemDependencies = installSystemDependencies
while (!probeBrowser) {
	try {
		probeBrowser = await launchBrowserProbe()
	} catch (error) {
		if (
			process.platform === 'linux' &&
			!installedSystemDependencies &&
			/Host system is missing dependencies|error while loading shared libraries/.test(String(error))
		) {
			console.log(
				'Walletbeat TV: installing missing Linux browser libraries; administrator access may be requested…',
			)
			runNode(playwrightCli, 'install-deps', 'chromium')
			installedSystemDependencies = true
		} else if (
			!repairedBrowser &&
			/Executable doesn't exist|spawn .*\b(?:ENOENT|ENOEXEC)\b|Exec format|not a valid Win32 application|file too short|invalid ELF|invalid image|Syntax error/i.test(
				String(error),
			)
		) {
			console.error(`Walletbeat TV: browser check failed: ${error.message}`)
			console.log('Walletbeat TV: repairing its browser…')
			installBrowser(true)
			repairedBrowser = true
		} else {
			throw new Error(
				repairedBrowser
					? 'Chromium still cannot launch after repair. Check the browser error below.'
					: 'Chromium cannot launch in this environment. Check OS support, display availability, and permissions.',
				{ cause: error },
			)
		}
	}
}
if (checkInstallation && !checkHeaded) {
	try {
		const page = await probeBrowser.newPage({ viewport: null })
		await page.setContent('<title>Walletbeat TV installation check</title>')
		if ((await page.title()) !== 'Walletbeat TV installation check') {
			throw new Error('Browser check failed.')
		}
		console.log(`Walletbeat TV installation verified with runtime: ${process.execPath}`)
	} finally {
		await probeBrowser.close()
	}
} else {
	await probeBrowser.close()
	console.log(
		checkHeaded
			? 'Walletbeat TV: checking its full-screen browser…'
			: 'Walletbeat TV: ready. Close the browser or press Control+C to finish.',
	)
	const sessionDirectory = join(packageDirectory, 'sessions', basename(installationDirectory))
	mkdirSync(sessionDirectory, { recursive: true })
	try {
		const tourScript = join(sessionDirectory, 'tour.mjs')
		writeFileSync(tourScript, Buffer.from(encodedTour, 'base64'))
		const tourProcess = spawn(
			process.execPath,
			[tourScript, siteUrl.href, ...(checkHeaded ? ['--check-headed'] : [])],
			{
				cwd: packageDirectory,
				stdio: 'inherit',
			},
		)
		let stoppingTour = false
		const forwardInterrupt = () => {
			stoppingTour = true
			tourProcess.kill('SIGINT')
		}
		const forwardTermination = () => {
			stoppingTour = true
			tourProcess.kill('SIGTERM')
		}
		process.on('SIGINT', forwardInterrupt)
		process.on('SIGTERM', forwardTermination)
		try {
			await new Promise((resolve, reject) => {
				tourProcess.once('error', reject)
				tourProcess.once('exit', (status, signal) => {
					if (stoppingTour || status === 0) {
						resolve(undefined)
					} else {
						reject(new Error(`Walletbeat TV exited with ${signal || `status ${status}`}.`))
					}
				})
			})
		} finally {
			process.off('SIGINT', forwardInterrupt)
			process.off('SIGTERM', forwardTermination)
		}
	} finally {
		rmSync(sessionDirectory, { recursive: true, force: true })
	}
}

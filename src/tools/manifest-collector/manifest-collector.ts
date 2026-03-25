import * as fs from 'node:fs'
import * as path from 'node:path'

import { allWallets, assertValidWalletName } from '@/data/wallets'
import { getExtensionId } from '@/schema/extension-url'
import { getRepositoryRoot } from '@/tests/utils/codebase'

import {
	parseAndroidManifest,
	parseIosPlist,
	renderAndroidPermissions,
	renderIosUsageDescriptions,
} from './android-manifest-parser'
import {
	parseBrowserExtensionManifest,
	renderBrowserExtensionManifest,
} from './browser-ext-manifest-parser'
import { fetchBrowserExtensionManifest, fetchText } from './crx-downloader'

const REPO_ROOT = getRepositoryRoot()

function usage(): never {
	process.stderr.write(`
Usage: pnpm collect:manifests [options]

Fetches and stores manifest data for wallet(s), then prints the corresponding
TypeScript field values to paste into the wallet's data file.

Modes (pick one):
  --all                            Collect browser extension manifests for all
                                   wallets that have a Chrome Web Store URL.
  --id <wallet-id>                 Collect manifests for a single wallet by ID
                                   (e.g. "metamask", "rabby").

Optional (requires --id):
  --android-manifest-url <url>     URL to a raw AndroidManifest.xml (e.g. from
                                   GitHub) for the wallet's mobile app.
  --ios-plist-url <url>            URL to a raw Info.plist XML (e.g. from
                                   GitHub) for the wallet's iOS app.

Data is saved to:
  data/software-wallets/manifests/<wallet-id>/<extension-id>.manifest.json
  data/software-wallets/manifests/<wallet-id>/android-manifest.xml
  data/software-wallets/manifests/<wallet-id>/ios-info.plist.xml

Examples:
  pnpm collect:manifests -- --all
  pnpm collect:manifests -- --id metamask
  pnpm collect:manifests -- --id metamask --android-manifest-url \\
    https://raw.githubusercontent.com/MetaMask/metamask-mobile/main/android/app/src/main/AndroidManifest.xml
`)
	process.exit(1)
}

function getArg(name: string): string | undefined {
	const args = process.argv.slice(2)
	const idx = args.indexOf(`--${name}`)

	if (idx < 0 || idx + 1 >= args.length) {
		return undefined
	}

	return args[idx + 1]
}

function hasFlag(name: string): boolean {
	return process.argv.includes(`--${name}`)
}

if (hasFlag('help')) {
	usage()
}

const allMode = hasFlag('all')
const walletId = getArg('id')
const androidManifestUrl = getArg('android-manifest-url')
const iosPlistUrl = getArg('ios-plist-url')

if (!allMode && walletId === undefined) {
	process.stderr.write('Error: either --all or --id <wallet-id> is required\n')
	usage()
}

if (allMode && walletId !== undefined) {
	process.stderr.write('Error: --all and --id are mutually exclusive\n')
	usage()
}

if (allMode && (androidManifestUrl !== undefined || iosPlistUrl !== undefined)) {
	process.stderr.write('Error: --android-manifest-url and --ios-plist-url require --id\n')
	usage()
}

type WalletEntry = { id: string; extensionUrls: string[] }

function getExtensionUrls(id: string): string[] {
	const wallet = allWallets[assertValidWalletName(id)]

	return (wallet.metadata.urls?.extensions ?? []).map(url => getExtensionId(url))
}

let targets: WalletEntry[]

if (allMode) {
	targets = Object.entries(allWallets)
		.map(([id, wallet]) => ({
			extensionUrls: (wallet.metadata.urls?.extensions ?? []).map(url => getExtensionId(url)),
			id,
		}))
		.filter(entry => entry.extensionUrls.length > 0)

	if (targets.length === 0) {
		process.stderr.write('No wallets with Chrome extension URLs found.\n')
		process.exit(0)
	}

	process.stderr.write(`Found ${targets.length} wallet(s) with extension URLs.\n`)
} else {
	const extensionUrls = getExtensionUrls(walletId!)

	if (extensionUrls.length === 0) {
		process.stderr.write(
			`Error: wallet "${walletId}" has no Chrome extension URLs in its metadata.urls.extensions field.\n` +
				"Add a Chrome Web Store URL to the wallet's data file first.\n",
		)
		process.exit(1)
	}

	targets = [{ extensionUrls, id: walletId! }]
}

for (const { id, extensionUrls } of targets) {
	const manifestDir = path.join(REPO_ROOT, 'data', 'software-wallets', 'manifests',id)

	fs.mkdirSync(manifestDir, { recursive: true })

	for (const extensionId of extensionUrls) {
		process.stderr.write(`\n[${id}] Fetching manifest for extension: ${extensionId} ...\n`)

		const rawManifest = await fetchBrowserExtensionManifest(extensionId)

		const outPath = path.join(manifestDir, `${extensionId}.manifest.json`)

		fs.writeFileSync(outPath, JSON.stringify(rawManifest, null, '\t') + '\n')
		process.stderr.write(`Saved: ${path.relative(REPO_ROOT, outPath)}\n`)

		const parsed = parseBrowserExtensionManifest(rawManifest)
		const snippet = renderBrowserExtensionManifest(parsed)

		process.stderr.write('\n--- browserExtensionHardening (paste into wallet file) ---\n\n')
		process.stdout.write(snippet + '\n')
	}
}

if (walletId !== undefined) {
	const manifestDir = path.join(REPO_ROOT, 'data', 'software-wallets', 'manifests',walletId)

	fs.mkdirSync(manifestDir, { recursive: true })

	if (androidManifestUrl !== undefined) {
		process.stderr.write(
			`\n[${walletId}] Fetching AndroidManifest.xml from: ${androidManifestUrl} ...\n`,
		)

		const xmlText = await fetchText(androidManifestUrl)
		const outPath = path.join(manifestDir, 'android-manifest.xml')

		fs.writeFileSync(outPath, xmlText)
		process.stderr.write(`Saved: ${path.relative(REPO_ROOT, outPath)}\n`)

		const permissions = parseAndroidManifest(xmlText)

		process.stderr.write('\n--- MobileAppManifest.android (paste into wallet file) ---\n\n')
		process.stdout.write(renderAndroidPermissions(permissions) + '\n')
	}

	if (iosPlistUrl !== undefined) {
		process.stderr.write(`\n[${walletId}] Fetching Info.plist from: ${iosPlistUrl} ...\n`)

		const plistText = await fetchText(iosPlistUrl)
		const outPath = path.join(manifestDir, 'ios-info.plist.xml')

		fs.writeFileSync(outPath, plistText)
		process.stderr.write(`Saved: ${path.relative(REPO_ROOT, outPath)}\n`)

		const usageDescriptions = parseIosPlist(plistText)

		process.stderr.write('\n--- MobileAppManifest.ios (paste into wallet file) ---\n\n')
		process.stdout.write(renderIosUsageDescriptions(usageDescriptions) + '\n')
	}
}

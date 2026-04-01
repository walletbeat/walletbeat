import * as fs from 'node:fs'
import * as path from 'node:path'

import * as prettier from 'prettier'

import { allWallets, assertValidWalletName, type WalletName } from '@/data/wallets'
import { getExtensionId } from '@/schema/extension-url'
import { getRepositoryRoot } from '@/tests/utils/codebase'

import { parseBrowserExtensionManifest } from './browser-ext-manifest-parser'
import { fetchBrowserExtensionManifest, fetchText } from './crx-downloader'
import { checkParsedManifests } from './manifest-checker'
import { parseAndroidManifest, parseIosPlist } from './mobile-manifest-parser'

const REPO_ROOT = getRepositoryRoot()

function usage(): never {
	process.stderr.write(`
Usage: pnpm collect:manifests [options]

Fetches and stores manifest data for wallet(s), then prints the corresponding
TypeScript field values to paste into the wallet's data file.

Modes (pick one):
  --all                            Collect all manifests for all wallets that
                                   have any manifest URL in their metadata.
  --id <wallet-id>                 Collect manifests for a single wallet by ID
                                   (e.g. "metamask", "rabby").
  --check                          Verify that all checked-in *.parsed.json
                                   files match their raw manifest files.
                                   Exits with a non-zero status if any are
                                   out of date. Does not fetch or write files.

Data is saved to:
  data/software-wallets/manifests/<wallet-id>/<extension-id>.manifest.json
  data/software-wallets/manifests/<wallet-id>/android-manifest.xml
  data/software-wallets/manifests/<wallet-id>/ios-info.plist.xml

Examples:
  pnpm collect:manifests -- --all
  pnpm collect:manifests -- --id metamask
  pnpm collect:manifests -- --check
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

const checkMode = hasFlag('check')
const allMode = hasFlag('all')
const walletIdArg = getArg('id')

if (checkMode && (allMode || walletIdArg !== undefined)) {
	process.stderr.write('Error: --check is mutually exclusive with --all and --id\n')
	usage()
}

if (!checkMode && !allMode && walletIdArg === undefined) {
	process.stderr.write('Error: either --all, --id <wallet-id>, or --check is required\n')
	usage()
}

if (!checkMode && allMode && walletIdArg !== undefined) {
	process.stderr.write('Error: --all and --id are mutually exclusive\n')
	usage()
}

if (checkMode) {
	const mismatches = await checkParsedManifests(REPO_ROOT)

	if (mismatches.length === 0) {
		process.stderr.write('All parsed manifest files are up to date.\n')
		process.exit(0)
	}

	for (const { walletId, parsedFile, issue } of mismatches) {
		process.stderr.write(`[${walletId}] ${parsedFile}: ${issue}\n`)
	}

	process.exit(1)
}

type WalletEntry = {
	id: string
	extensionIds: string[]
	androidManifestXml: string | undefined
	iosInfoPlist: string | undefined
}

function getWalletEntry(id: WalletName): WalletEntry {
	const wallet = allWallets[id]

	return {
		androidManifestXml: wallet.metadata.urls?.androidManifestXml,
		extensionIds: (wallet.metadata.urls?.extensions ?? []).map(url => getExtensionId(url)),
		id,
		iosInfoPlist: wallet.metadata.urls?.iosInfoPlist,
	}
}

function hasAnyManifest(entry: WalletEntry): boolean {
	return (
		entry.extensionIds.length > 0 ||
		entry.androidManifestXml !== undefined ||
		entry.iosInfoPlist !== undefined
	)
}

let targets: WalletEntry[] = []

if (allMode) {
	targets = Object.keys(allWallets)
		.map(id => getWalletEntry(id as WalletName))
		.filter(hasAnyManifest)

	if (targets.length === 0) {
		process.stderr.write('No wallets with manifest URLs found.\n')
		process.exit(0)
	}

	process.stderr.write(`Found ${targets.length} wallet(s) with manifest URLs.\n`)
} else if (walletIdArg !== undefined) {
	const walletId = assertValidWalletName(walletIdArg)
	const entry = getWalletEntry(walletId)

	if (!hasAnyManifest(entry)) {
		process.stderr.write(
			`Error: wallet "${walletId}" has no manifest URLs in its metadata.urls fields.\n` +
				"Add a Chrome Web Store URL, androidManifest URL, or iosManifest URL to the wallet's data file first.\n",
		)
		process.exit(1)
	}

	targets = [entry]
}

for (const { id, extensionIds, androidManifestXml, iosInfoPlist } of targets) {
	const manifestDir = path.join(REPO_ROOT, 'data', 'software-wallets', 'manifests', id)

	fs.mkdirSync(manifestDir, { recursive: true })

	for (const extensionId of extensionIds) {
		process.stderr.write(`\n[${id}] Fetching manifest for extension: ${extensionId} ...\n`)

		const rawManifest = await fetchBrowserExtensionManifest(extensionId)

		const outPath = path.join(manifestDir, `${extensionId}.manifest.json`)

		fs.writeFileSync(outPath, JSON.stringify(rawManifest, null, '\t') + '\n')
		process.stderr.write(`Saved: ${path.relative(REPO_ROOT, outPath)}\n`)

		const parsed = parseBrowserExtensionManifest(rawManifest)
		const parsedPath = path.join(manifestDir, `${extensionId}.parsed.json`)
		const parsedConfig = (await prettier.resolveConfig(parsedPath)) ?? {}

		fs.writeFileSync(
			parsedPath,
			await prettier.format(JSON.stringify(parsed), { ...parsedConfig, parser: 'json' }),
		)
		process.stderr.write(`Saved: ${path.relative(REPO_ROOT, parsedPath)}\n`)
	}

	if (androidManifestXml !== undefined) {
		process.stderr.write(`\n[${id}] Fetching AndroidManifest.xml from: ${androidManifestXml} ...\n`)

		const xmlText = await fetchText(androidManifestXml)
		const outPath = path.join(manifestDir, 'android-manifest.xml')

		fs.writeFileSync(outPath, xmlText)
		process.stderr.write(`Saved: ${path.relative(REPO_ROOT, outPath)}\n`)

		const permissions = parseAndroidManifest(xmlText)
		const androidParsedPath = path.join(manifestDir, 'android.parsed.json')
		const androidParsedConfig = (await prettier.resolveConfig(androidParsedPath)) ?? {}

		fs.writeFileSync(
			androidParsedPath,
			await prettier.format(JSON.stringify({ usesPermissions: [...permissions] }), {
				...androidParsedConfig,
				parser: 'json',
			}),
		)
		process.stderr.write(`Saved: ${path.relative(REPO_ROOT, androidParsedPath)}\n`)
	}

	if (iosInfoPlist !== undefined) {
		process.stderr.write(`\n[${id}] Fetching Info.plist from: ${iosInfoPlist} ...\n`)

		const plistText = await fetchText(iosInfoPlist)
		const outPath = path.join(manifestDir, 'ios-info.plist.xml')

		fs.writeFileSync(outPath, plistText)
		process.stderr.write(`Saved: ${path.relative(REPO_ROOT, outPath)}\n`)

		const usageDescriptions = parseIosPlist(plistText)
		const iosParsedPath = path.join(manifestDir, 'ios.parsed.json')
		const iosParsedConfig = (await prettier.resolveConfig(iosParsedPath)) ?? {}

		fs.writeFileSync(
			iosParsedPath,
			await prettier.format(JSON.stringify({ usageDescriptions: [...usageDescriptions] }), {
				...iosParsedConfig,
				parser: 'json',
			}),
		)
		process.stderr.write(`Saved: ${path.relative(REPO_ROOT, iosParsedPath)}\n`)
	}
}

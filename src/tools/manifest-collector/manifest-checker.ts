import * as fs from 'node:fs'
import * as path from 'node:path'

import * as prettier from 'prettier'

import { parseBrowserExtensionManifest } from './browser-ext-manifest-parser'
import { parseAndroidManifest, parseIosPlist } from './mobile-manifest-parser'

export interface ManifestMismatch {
	walletId: string
	parsedFile: string
	issue: string
}

async function formatJson(obj: unknown, filePath: string): Promise<string> {
	const config = (await prettier.resolveConfig(filePath)) ?? {}

	return prettier.format(JSON.stringify(obj), { ...config, parser: 'json' })
}

/**
 * Checks that all `.parsed.json` files under `data/software-wallets/manifests/`
 * are consistent with their corresponding raw manifest files.
 *
 * Returns a list of mismatches. An empty list means everything is up to date.
 */
export async function checkParsedManifests(repoRoot: string): Promise<ManifestMismatch[]> {
	const manifestsRoot = path.join(repoRoot, 'data', 'software-wallets', 'manifests')

	if (!fs.existsSync(manifestsRoot)) {
		return []
	}

	const mismatches: ManifestMismatch[] = []
	const walletDirs = fs
		.readdirSync(manifestsRoot, { withFileTypes: true })
		.filter(d => d.isDirectory())
		.map(d => d.name)

	for (const walletId of walletDirs) {
		const walletDir = path.join(manifestsRoot, walletId)
		const files = fs.readdirSync(walletDir)

		// Check browser extension manifests
		for (const rawFile of files.filter(f => f.endsWith('.manifest.json'))) {
			const extId = rawFile.slice(0, -'.manifest.json'.length)
			const rawPath = path.join(walletDir, rawFile)
			const parsedPath = path.join(walletDir, `${extId}.parsed.json`)

			if (!fs.existsSync(parsedPath)) {
				mismatches.push({
					walletId,
					parsedFile: `${extId}.parsed.json`,
					issue: `Parsed file does not exist. Run \`pnpm collect:manifests -- --id ${walletId}\` to generate it.`,
				})
				continue
			}

			let rawManifest: unknown

			try {
				rawManifest = JSON.parse(fs.readFileSync(rawPath, 'utf-8'))
			} catch (e) {
				mismatches.push({
					walletId,
					parsedFile: `${extId}.parsed.json`,
					issue: `Failed to JSON-parse raw manifest: ${e instanceof Error ? e.message : String(e)}`,
				})
				continue
			}

			let parsed: unknown

			try {
				parsed = parseBrowserExtensionManifest(rawManifest)
			} catch (e) {
				mismatches.push({
					walletId,
					parsedFile: `${extId}.parsed.json`,
					issue: `Failed to parse manifest: ${e instanceof Error ? e.message : String(e)}`,
				})
				continue
			}

			const expected = await formatJson(parsed, parsedPath)
			const actual = await formatJson(
				JSON.parse(fs.readFileSync(parsedPath, 'utf-8')) as unknown,
				parsedPath,
			)

			if (expected !== actual) {
				mismatches.push({
					walletId,
					parsedFile: `${extId}.parsed.json`,
					issue: `Parsed file is out of date with raw manifest. Run \`pnpm collect:manifests -- --id ${walletId}\` to regenerate it.`,
				})
			}
		}

		// Check Android manifest
		const androidRawPath = path.join(walletDir, 'android-manifest.xml')

		if (fs.existsSync(androidRawPath)) {
			const androidParsedPath = path.join(walletDir, 'android.parsed.json')

			if (!fs.existsSync(androidParsedPath)) {
				mismatches.push({
					walletId,
					parsedFile: 'android.parsed.json',
					issue: `Parsed file does not exist. Run \`pnpm collect:manifests -- --id ${walletId}\` to generate it.`,
				})
			} else {
				let permissions: Set<string> | undefined

				try {
					permissions = parseAndroidManifest(fs.readFileSync(androidRawPath, 'utf-8'))
				} catch (e) {
					mismatches.push({
						walletId,
						parsedFile: 'android.parsed.json',
						issue: `Failed to parse Android manifest: ${e instanceof Error ? e.message : String(e)}`,
					})
				}

				if (permissions !== undefined) {
					const expected = await formatJson(
						{ usesPermissions: [...permissions] },
						androidParsedPath,
					)
					const actual = await formatJson(
						JSON.parse(fs.readFileSync(androidParsedPath, 'utf-8')) as unknown,
						androidParsedPath,
					)

					if (expected !== actual) {
						mismatches.push({
							walletId,
							parsedFile: 'android.parsed.json',
							issue: `Parsed file is out of date with raw manifest. Run \`pnpm collect:manifests -- --id ${walletId}\` to regenerate it.`,
						})
					}
				}
			}
		}

		// Check iOS plist
		const iosRawPath = path.join(walletDir, 'ios-info.plist.xml')

		if (fs.existsSync(iosRawPath)) {
			const iosParsedPath = path.join(walletDir, 'ios.parsed.json')

			if (!fs.existsSync(iosParsedPath)) {
				mismatches.push({
					walletId,
					parsedFile: 'ios.parsed.json',
					issue: `Parsed file does not exist. Run \`pnpm collect:manifests -- --id ${walletId}\` to generate it.`,
				})
			} else {
				let usageDescriptions: Set<string> | undefined

				try {
					usageDescriptions = parseIosPlist(fs.readFileSync(iosRawPath, 'utf-8'))
				} catch (e) {
					mismatches.push({
						walletId,
						parsedFile: 'ios.parsed.json',
						issue: `Failed to parse iOS plist: ${e instanceof Error ? e.message : String(e)}`,
					})
				}

				if (usageDescriptions !== undefined) {
					const expected = await formatJson(
						{ usageDescriptions: [...usageDescriptions] },
						iosParsedPath,
					)
					const actual = await formatJson(
						JSON.parse(fs.readFileSync(iosParsedPath, 'utf-8')) as unknown,
						iosParsedPath,
					)

					if (expected !== actual) {
						mismatches.push({
							walletId,
							parsedFile: 'ios.parsed.json',
							issue: `Parsed file is out of date with raw manifest. Run \`pnpm collect:manifests -- --id ${walletId}\` to regenerate it.`,
						})
					}
				}
			}
		}
	}

	return mismatches
}

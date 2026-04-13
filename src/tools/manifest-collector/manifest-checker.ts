import * as fs from 'node:fs'
import * as path from 'node:path'

import {
	computeAndroidParsed,
	computeBrowserExtParsed,
	computeIosParsed,
	formatJson,
} from './manifest-collector-lib'

export interface ManifestMismatch {
	walletId: string
	parsedFile: string
	/** Absolute path to the `.parsed.json` file. */
	parsedPath: string
	issue: string
	/**
	 * The correct formatted JSON that the parsed file should contain.
	 * Undefined when the raw manifest could not be parsed.
	 */
	expectedContents?: string
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
			const parsedFile = `${extId}.parsed.json`

			let rawManifest: unknown

			try {
				rawManifest = JSON.parse(fs.readFileSync(rawPath, 'utf-8'))
			} catch (e) {
				mismatches.push({
					walletId,
					parsedFile,
					parsedPath,
					issue: `Failed to JSON-parse raw manifest: ${e instanceof Error ? e.message : String(e)}`,
				})
				continue
			}

			let expectedContents: string

			try {
				expectedContents = await computeBrowserExtParsed(rawManifest, parsedPath)
			} catch (e) {
				mismatches.push({
					walletId,
					parsedFile,
					parsedPath,
					issue: `Failed to parse manifest: ${e instanceof Error ? e.message : String(e)}`,
				})
				continue
			}

			if (!fs.existsSync(parsedPath)) {
				mismatches.push({
					walletId,
					parsedFile,
					parsedPath,
					issue: `Parsed file does not exist. Run \`pnpm collect:manifests -- --id ${walletId}\` to generate it.`,
					expectedContents,
				})
				continue
			}

			const actual = await formatJson(
				JSON.parse(fs.readFileSync(parsedPath, 'utf-8')) as unknown,
				parsedPath,
			)

			if (expectedContents !== actual) {
				mismatches.push({
					walletId,
					parsedFile,
					parsedPath,
					issue: `Parsed file is out of date with raw manifest. Run \`pnpm collect:manifests -- --id ${walletId}\` to regenerate it.`,
					expectedContents,
				})
			}
		}

		// Check Android manifest
		const androidRawPath = path.join(walletDir, 'android-manifest.xml')

		if (fs.existsSync(androidRawPath)) {
			const parsedPath = path.join(walletDir, 'android.parsed.json')
			const parsedFile = 'android.parsed.json'

			let expectedContents: string | undefined

			try {
				expectedContents = await computeAndroidParsed(
					fs.readFileSync(androidRawPath, 'utf-8'),
					parsedPath,
				)
			} catch (e) {
				mismatches.push({
					walletId,
					parsedFile,
					parsedPath,
					issue: `Failed to parse Android manifest: ${e instanceof Error ? e.message : String(e)}`,
				})
			}

			if (expectedContents !== undefined) {
				if (!fs.existsSync(parsedPath)) {
					mismatches.push({
						walletId,
						parsedFile,
						parsedPath,
						issue: `Parsed file does not exist. Run \`pnpm collect:manifests -- --id ${walletId}\` to generate it.`,
						expectedContents,
					})
				} else {
					const actual = await formatJson(
						JSON.parse(fs.readFileSync(parsedPath, 'utf-8')) as unknown,
						parsedPath,
					)

					if (expectedContents !== actual) {
						mismatches.push({
							walletId,
							parsedFile,
							parsedPath,
							issue: `Parsed file is out of date with raw manifest. Run \`pnpm collect:manifests -- --id ${walletId}\` to regenerate it.`,
							expectedContents,
						})
					}
				}
			}
		}

		// Check iOS plist
		const iosRawPath = path.join(walletDir, 'ios-info.plist.xml')

		if (fs.existsSync(iosRawPath)) {
			const parsedPath = path.join(walletDir, 'ios.parsed.json')
			const parsedFile = 'ios.parsed.json'

			let expectedContents: string | undefined

			try {
				expectedContents = await computeIosParsed(fs.readFileSync(iosRawPath, 'utf-8'), parsedPath)
			} catch (e) {
				mismatches.push({
					walletId,
					parsedFile,
					parsedPath,
					issue: `Failed to parse iOS plist: ${e instanceof Error ? e.message : String(e)}`,
				})
			}

			if (expectedContents !== undefined) {
				if (!fs.existsSync(parsedPath)) {
					mismatches.push({
						walletId,
						parsedFile,
						parsedPath,
						issue: `Parsed file does not exist. Run \`pnpm collect:manifests -- --id ${walletId}\` to generate it.`,
						expectedContents,
					})
				} else {
					const actual = await formatJson(
						JSON.parse(fs.readFileSync(parsedPath, 'utf-8')) as unknown,
						parsedPath,
					)

					if (expectedContents !== actual) {
						mismatches.push({
							walletId,
							parsedFile,
							parsedPath,
							issue: `Parsed file is out of date with raw manifest. Run \`pnpm collect:manifests -- --id ${walletId}\` to regenerate it.`,
							expectedContents,
						})
					}
				}
			}
		}
	}

	return mismatches
}

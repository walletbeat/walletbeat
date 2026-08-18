import { readdirSync, readFileSync } from 'fs'
import path from 'path'

import { knownValidUrls, URLS_TO_SKIP } from '@/tests/utils/known-urls'

/**
 * Post-build check that the known-valid URL set is comprehensive:
 * every external URL linked from the built HTML must be present in
 * tests/utils/known-urls.json (or covered by URLS_TO_SKIP).
 *
 * This catches external links that do not come from wallet data references
 * (e.g. hardcoded links in components or markdown content), which the URL
 * check test and `pnpm validate-urls` would otherwise never see.
 */

const distDir = process.env.DIST_DIR

if (distDir === undefined || distDir === '') {
	process.stderr.write('DIST_DIR environment variable is not set.\n')
	process.exit(1)
}

function findHtmlFiles(dir: string): string[] {
	const files: string[] = []

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const entryPath = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			files.push(...findHtmlFiles(entryPath))
		} else if (entry.isFile() && entry.name.endsWith('.html')) {
			files.push(entryPath)
		}
	}

	return files
}

/** Decode the HTML entities that can occur inside a serialized href attribute. */
function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 10)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
}

const knownUrls = new Set(knownValidUrls.map(known => known.url))
// URL -> first file it was found in, for error reporting.
const unknownUrls = new Map<string, string>()
let checked = 0

for (const file of findHtmlFiles(distDir)) {
	const contents = readFileSync(file, 'utf-8')

	for (const match of contents.matchAll(/(?:href|src)="([^"]*)"/gi)) {
		const url = decodeHtmlEntities(match[1])

		if (!/^https?:\/\//.test(url)) {
			continue
		}

		checked++

		if (URLS_TO_SKIP.some(skipped => url.includes(skipped))) {
			continue
		}

		if (!knownUrls.has(url) && !unknownUrls.has(url)) {
			unknownUrls.set(url, path.relative(distDir, file))
		}
	}
}

if (unknownUrls.size > 0) {
	process.stderr.write(
		`${unknownUrls.size.toString()} external URL(s) in the built site are not in the known-valid URL set\n` +
			'(tests/utils/known-urls.json). Run `pnpm validate-urls` if they come from wallet data;\n' +
			'otherwise verify each URL in a browser and add its entry to the JSON file.\n\n',
	)

	for (const [url, file] of [...unknownUrls.entries()].sort()) {
		process.stderr.write(`- ${url}\n  (first seen in ${file})\n`)
	}

	process.exit(1)
}

if (process.env.QUIET !== 'true') {
	process.stderr.write(
		`All ${checked.toString()} external links in the built site are in the known-valid URL set.\n`,
	)
}

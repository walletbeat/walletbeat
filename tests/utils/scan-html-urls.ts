import { readdirSync, readFileSync } from 'fs'
import path from 'path'

/** Recursively find all `.html` files under `dir`. */
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

/**
 * Scan every built `.html` file under `distDir` for `href`/`src` attributes
 * pointing at an external (`http(s)://`) URL.
 *
 * @returns a map of URL -> the dist-relative path of the first file it was found in.
 */
export function findExternalUrlsInDist(distDir: string): Map<string, string> {
	const found = new Map<string, string>()

	for (const file of findHtmlFiles(distDir)) {
		const contents = readFileSync(file, 'utf-8')

		for (const match of contents.matchAll(/(?:href|src)="([^"]*)"/gi)) {
			const url = decodeHtmlEntities(match[1])

			if (!/^https?:\/\//.test(url)) {
				continue
			}

			if (!found.has(url)) {
				found.set(url, path.relative(distDir, file))
			}
		}
	}

	return found
}

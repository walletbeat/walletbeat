import * as fs from 'node:fs'
import * as path from 'node:path'

export enum HtmlLinkKind {
	EXTERNAL = 'external',
	IGNORED = 'ignored',
	INTERNAL = 'internal',
	PROTOCOL_RELATIVE = 'protocol-relative',
}

export type HtmlLink = {
	kind: HtmlLinkKind
	normalizedUrl: string
	originalUrl: string
	sourceHtmlFile: string
	sourceUrl: string
}

const HTML_TAG_PATTERN = /<[A-Za-z][^>]*>/g
const URL_ATTRIBUTE_PATTERN = /(?:^|\s)(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi
const URL_SCHEME_PATTERN = /^([A-Za-z][A-Za-z\d+.-]*):/

function findHtmlFiles(dir: string): string[] {
	const htmlFiles: string[] = []

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const entryPath = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			htmlFiles.push(...findHtmlFiles(entryPath))
		} else if (entry.isFile() && entry.name.endsWith('.html')) {
			htmlFiles.push(entryPath)
		}
	}

	return htmlFiles.sort()
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
		.replace(/&#x([\da-f]+);/gi, (_, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 16)),
		)
		.replace(/&quot;/gi, '"')
		.replace(/&apos;/gi, "'")
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&amp;/gi, '&')
}

function sourceUrlForHtmlFile(distDir: string, htmlFile: string): string {
	const relativePath = path.relative(distDir, htmlFile).split(path.sep).join('/')

	if (relativePath === 'index.html') {
		return '/'
	}

	if (relativePath.endsWith('/index.html')) {
		return `/${relativePath.slice(0, -'index.html'.length)}`
	}

	return `/${relativePath}`
}

function classifyUrl(url: string): HtmlLinkKind {
	if (url === '' || url.startsWith('#')) {
		return HtmlLinkKind.IGNORED
	}

	if (url.startsWith('//')) {
		return HtmlLinkKind.PROTOCOL_RELATIVE
	}

	const scheme = URL_SCHEME_PATTERN.exec(url)?.[1]?.toLowerCase()

	if (scheme === undefined) {
		return HtmlLinkKind.INTERNAL
	}

	if (scheme === 'http' || scheme === 'https') {
		return HtmlLinkKind.EXTERNAL
	}

	return HtmlLinkKind.IGNORED
}

function urlsInHtml(html: string): string[] {
	const urls: string[] = []

	for (const tagMatch of html.matchAll(HTML_TAG_PATTERN)) {
		for (const attributeMatch of tagMatch[0].matchAll(URL_ATTRIBUTE_PATTERN)) {
			const url = attributeMatch[1] ?? attributeMatch[2] ?? attributeMatch[3]

			if (url !== undefined) {
				urls.push(url)
			}
		}
	}

	return urls
}

/** Recursively extract and classify `href` and `src` values from built HTML. */
export function scanHtmlLinks(distDir: string): HtmlLink[] {
	const absoluteDistDir = path.resolve(distDir)
	const links: HtmlLink[] = []

	for (const htmlFile of findHtmlFiles(absoluteDistDir)) {
		const sourceHtmlFile = path.relative(absoluteDistDir, htmlFile).split(path.sep).join('/')
		const sourceUrl = sourceUrlForHtmlFile(absoluteDistDir, htmlFile)
		const html = fs.readFileSync(htmlFile, 'utf8')

		for (const originalUrl of urlsInHtml(html)) {
			const normalizedUrl = decodeHtmlEntities(originalUrl).trim()

			links.push({
				kind: classifyUrl(normalizedUrl),
				normalizedUrl,
				originalUrl,
				sourceHtmlFile,
				sourceUrl,
			})
		}
	}

	return links
}

import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

enum HtmlLinkKind {
	EXTERNAL = 'external',
	IGNORED = 'ignored',
	INTERNAL = 'internal',
	PROTOCOL_RELATIVE = 'protocol-relative',
}

type HtmlLink = {
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

/** Recursively extract `href` and `src` values from built HTML. */
function scanHtmlLinks(distDir: string): HtmlLink[] {
	const absoluteDistDir = path.resolve(distDir)
	const links: HtmlLink[] = []

	for (const htmlFile of findHtmlFiles(absoluteDistDir)) {
		const sourceHtmlFile = path.relative(absoluteDistDir, htmlFile).split(path.sep).join('/')
		const sourceUrl = sourceUrlForHtmlFile(absoluteDistDir, htmlFile)
		const html = fs.readFileSync(htmlFile, 'utf8')

		for (const originalUrl of urlsInHtml(html)) {
			links.push({
				originalUrl,
				sourceHtmlFile,
				sourceUrl,
			})
		}
	}

	return links
}

export type BrokenInternalLink = {
	sourceHtmlFile: string
	originalUrl: string
	resolvedTarget: string
}

export type InternalLinkFormatViolation = {
	sourceHtmlFile: string
	originalUrl: string
	reason: string
}

export type InternalLinkCheckResult = {
	brokenLinks: BrokenInternalLink[]
	formatViolations: InternalLinkFormatViolation[]
}

function isFile(filePath: string): boolean {
	try {
		return fs.statSync(filePath).isFile()
	} catch {
		return false
	}
}

function targetExists(distDir: string, resolvedTarget: string): boolean {
	const filePath = path.resolve(distDir, `.${resolvedTarget}`)
	const relativePath = path.relative(distDir, filePath)
	const isWithinDist =
		relativePath === '' ||
		(!relativePath.startsWith(`..${path.sep}`) &&
			relativePath !== '..' &&
			!path.isAbsolute(relativePath))

	if (!isWithinDist) {
		return false
	}

	const exactFileExists = !resolvedTarget.endsWith('/') && isFile(filePath)

	return exactFileExists || isFile(path.join(filePath, 'index.html'))
}

function resolveTarget(url: string, sourceUrl: string): string {
	try {
		return decodeURIComponent(
			new URL(url, new URL(sourceUrl, 'https://walletbeat.invalid')).pathname,
		)
	} catch {
		return url
	}
}

/** Validate one URL's format without reading the build output. */
export function validateInternalLinkFormat(url: string, sourceUrl: string): string[] {
	const normalizedUrl = url.trim()
	const kind = classifyUrl(normalizedUrl)

	if (kind === HtmlLinkKind.PROTOCOL_RELATIVE) {
		return ['Protocol-relative URLs are not allowed.']
	}

	if (kind !== HtmlLinkKind.INTERNAL) {
		return []
	}

	const reasons: string[] = []

	if (!normalizedUrl.startsWith('/')) {
		reasons.push('Internal site URLs must be root-relative.')
	}

	const resolvedTarget = resolveTarget(normalizedUrl, sourceUrl)

	if (!resolvedTarget.endsWith('/') && path.posix.extname(resolvedTarget) === '') {
		reasons.push('Links to directory routes must end in a slash.')
	}

	return reasons
}

/** Resolve one internal URL and check its target, regardless of format policy. */
export function resolveInternalLink(
	url: string,
	sourceUrl: string,
	distDir: string,
): { resolvedTarget: string; exists: boolean } | null {
	const normalizedUrl = url.trim()

	if (classifyUrl(normalizedUrl) !== HtmlLinkKind.INTERNAL) {
		return null
	}

	const resolvedTarget = resolveTarget(normalizedUrl, sourceUrl)

	return { resolvedTarget, exists: targetExists(path.resolve(distDir), resolvedTarget) }
}

function compareLinkLocations(
	a: { sourceHtmlFile: string; originalUrl: string },
	b: { sourceHtmlFile: string; originalUrl: string },
): number {
	return (
		a.sourceHtmlFile.localeCompare(b.sourceHtmlFile) || a.originalUrl.localeCompare(b.originalUrl)
	)
}

/** Check the targets and formatting of internal `href` and `src` attributes. */
export function checkInternalLinks(distDir: string): InternalLinkCheckResult {
	const absoluteDistDir = path.resolve(distDir)
	const brokenLinks = new Map<string, BrokenInternalLink>()
	const formatViolations = new Map<string, InternalLinkFormatViolation>()

	for (const { originalUrl, sourceHtmlFile, sourceUrl } of scanHtmlLinks(absoluteDistDir)) {
		for (const reason of validateInternalLinkFormat(originalUrl, sourceUrl)) {
			const violation = { sourceHtmlFile, originalUrl, reason }
			const key = `${sourceHtmlFile}\0${originalUrl}\0${reason}`

			formatViolations.set(key, violation)
		}

		const target = resolveInternalLink(originalUrl, sourceUrl, absoluteDistDir)

		if (target === null || target.exists) {
			continue
		}

		const { resolvedTarget } = target
		const brokenLink = { sourceHtmlFile, originalUrl, resolvedTarget }
		const key = `${sourceHtmlFile}\0${originalUrl}\0${resolvedTarget}`

		brokenLinks.set(key, brokenLink)
	}

	return {
		brokenLinks: [...brokenLinks.values()].sort(
			(a, b) => compareLinkLocations(a, b) || a.resolvedTarget.localeCompare(b.resolvedTarget),
		),
		formatViolations: [...formatViolations.values()].sort(
			(a, b) => compareLinkLocations(a, b) || a.reason.localeCompare(b.reason),
		),
	}
}

function run(): void {
	const distDir = path.resolve(process.env.DIST_DIR ?? 'dist')

	try {
		const { brokenLinks, formatViolations } = checkInternalLinks(distDir)

		if (brokenLinks.length === 0 && formatViolations.length === 0) {
			if (process.env.QUIET !== 'true') {
				process.stderr.write(
					'All internal links have valid formats and resolve to files in the build output.\n',
				)
			}

			return
		}

		if (formatViolations.length > 0) {
			process.stderr.write(
				`Found ${formatViolations.length.toString()} internal link format violation(s):\n`,
			)

			for (const violation of formatViolations) {
				process.stderr.write(
					`- ${violation.sourceHtmlFile}: ${violation.originalUrl}\n` + `  ${violation.reason}\n`,
				)
			}
		}

		if (brokenLinks.length > 0) {
			process.stderr.write(
				`Found ${brokenLinks.length.toString()} broken internal link(s) in the build output:\n`,
			)

			for (const brokenLink of brokenLinks) {
				process.stderr.write(
					`- ${brokenLink.sourceHtmlFile}: ${brokenLink.originalUrl}\n` +
						`  resolved missing target: ${brokenLink.resolvedTarget}\n`,
				)
			}
		}

		process.exitCode = 1
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)

		process.stderr.write(`Unable to check internal links in ${distDir}: ${message}\n`)
		process.exitCode = 1
	}
}

const invokedPath = process.argv[1]

if (
	invokedPath !== undefined &&
	import.meta.url === pathToFileURL(path.resolve(invokedPath)).href
) {
	run()
}

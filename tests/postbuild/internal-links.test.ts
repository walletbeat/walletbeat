import * as fs from 'node:fs'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import { CodebaseEntryType, crawlCodebase, getRepositoryRoot } from '@/utils/codebase'

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

function sourceUrlForHtmlFile(relativePath: string): string {
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
async function scanHtmlLinks(distDir: string): Promise<HtmlLink[]> {
	const links: HtmlLink[] = []

	await crawlCodebase({
		root: distDir,
		ignore: [],
		complexTraversalFn: async (entryBase, getFullEntry) => {
			if (entryBase.type !== CodebaseEntryType.FILE || !entryBase.path.endsWith('.html')) {
				return
			}

			const entry = await getFullEntry()

			if (entry.type !== CodebaseEntryType.FILE) {
				throw new Error('inconsistent type')
			}

			const sourceUrl = sourceUrlForHtmlFile(entry.path)

			for (const originalUrl of urlsInHtml(entry.contents)) {
				links.push({
					originalUrl,
					sourceHtmlFile: entry.path,
					sourceUrl,
				})
			}
		},
	})

	return links
}

type BrokenInternalLink = {
	sourceHtmlFile: string
	originalUrl: string
	resolvedTarget: string
}

type InternalLinkFormatViolation = {
	sourceHtmlFile: string
	originalUrl: string
	reason: string
}

type InternalLinkCheckResult = {
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
function validateInternalLinkFormat(url: string, sourceUrl: string): string[] {
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
function resolveInternalLink(
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
async function checkInternalLinks(distDir: string): Promise<InternalLinkCheckResult> {
	const absoluteDistDir = path.resolve(distDir)
	const brokenLinks = new Map<string, BrokenInternalLink>()
	const formatViolations = new Map<string, InternalLinkFormatViolation>()

	for (const { originalUrl, sourceHtmlFile, sourceUrl } of await scanHtmlLinks(absoluteDistDir)) {
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

const distDir = path.join(getRepositoryRoot(), 'dist')

describe('internal links', () => {
	it('have valid formats and resolve to files in the build output', async () => {
		const { brokenLinks, formatViolations } = await checkInternalLinks(distDir)
		const violations = [
			...formatViolations.map(
				({ sourceHtmlFile, originalUrl, reason }) =>
					`${sourceHtmlFile}: ${originalUrl}\n  ${reason}`,
			),
			...brokenLinks.map(
				({ sourceHtmlFile, originalUrl, resolvedTarget }) =>
					`${sourceHtmlFile}: ${originalUrl}\n  resolved missing target: ${resolvedTarget}`,
			),
		]

		expect(violations, violations.join('\n')).toEqual([])
	})
})

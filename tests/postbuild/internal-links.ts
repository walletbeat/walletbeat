import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

import { HtmlLinkKind, scanHtmlLinks } from './html-links'

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
	const addFormatViolation = (
		sourceHtmlFile: string,
		originalUrl: string,
		reason: string,
	): void => {
		const violation = { sourceHtmlFile, originalUrl, reason }
		const key = `${sourceHtmlFile}\0${originalUrl}\0${reason}`

		formatViolations.set(key, violation)
	}

	for (const link of scanHtmlLinks(absoluteDistDir)) {
		const { kind, normalizedUrl, originalUrl, sourceHtmlFile, sourceUrl } = link

		if (kind === HtmlLinkKind.IGNORED || kind === HtmlLinkKind.EXTERNAL) {
			continue
		}

		if (kind === HtmlLinkKind.PROTOCOL_RELATIVE) {
			addFormatViolation(sourceHtmlFile, originalUrl, 'Protocol-relative URLs are not allowed.')

			continue
		}

		if (!normalizedUrl.startsWith('/')) {
			addFormatViolation(sourceHtmlFile, originalUrl, 'Internal site URLs must be root-relative.')
		}

		let resolvedTarget: string

		try {
			resolvedTarget = decodeURIComponent(
				new URL(normalizedUrl, new URL(sourceUrl, 'https://walletbeat.invalid')).pathname,
			)
		} catch {
			resolvedTarget = normalizedUrl
		}

		if (!resolvedTarget.endsWith('/') && path.posix.extname(resolvedTarget) === '') {
			addFormatViolation(
				sourceHtmlFile,
				originalUrl,
				'Links to directory routes must end in a slash.',
			)
		}

		if (targetExists(absoluteDistDir, resolvedTarget)) {
			continue
		}

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

/** Find internal targets that do not exist in the build output. */
export function findBrokenInternalLinks(distDir: string): BrokenInternalLink[] {
	return checkInternalLinks(distDir).brokenLinks
}

/** Find internal URLs that violate the site's link-format policies. */
export function findInternalLinkFormatViolations(distDir: string): InternalLinkFormatViolation[] {
	return checkInternalLinks(distDir).formatViolations
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

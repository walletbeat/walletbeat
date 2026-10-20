import type { NonEmptyArray } from '@/types/utils/non-empty'

import {
	formatLineRanges,
	fullCommitHashRegExp,
	type LineRange,
	lineRangesProblem,
	parseLineFragment,
} from './url'

/**
 * The source location of a locally stored code snippet: a file in a GitHub
 * repository pinned to a specific commit, plus one or more line ranges.
 *
 * Snippets are stored as flat files under
 * `public/references/wallets/<wallet-id>/code/`, named
 * `<org>--<repo>--<commit>--<path with '/' as '--'>.<line ranges>.<ext>.snippet`,
 * where `<line ranges>` is the URL's line anchor (e.g. `L12-L34` or
 * `L53,L340-L353`). The source file's extension is kept right before
 * `.snippet` so the language remains identifiable when rendered.
 */
export interface CodeSnippetSource {
	org: string
	repo: string
	/** Full 40-character commit hash the URL is pinned to. */
	commit: string
	/** Repository-relative file path, using forward slashes, percent-decoded. */
	path: string
	/** Referenced line ranges, valid per `lineRangesProblem`. */
	ranges: NonEmptyArray<LineRange>
}

/** Whether two lists of line ranges are identical. */
export function lineRangesEqual(a: LineRange[], b: LineRange[]): boolean {
	return (
		a.length === b.length &&
		a.every((range, i) => range.first === b[i].first && range.last === b[i].last)
	)
}

/** A contiguous run of source lines stored in a `.snippet` file. */
export interface StoredSnippetSegment {
	/** 1-based source line number of `lines[0]`. */
	startLine: number
	lines: string[]
}

/**
 * The JSON content of a `.snippet` file: the referenced ranges
 * (`highlightRanges`, matching the `CodeSnippetSource` line ranges) plus the
 * surrounding-context and scope-header segments built around them. Segments
 * are ordered by `startLine` and are never adjacent or overlapping (adjacent
 * runs are merged into one segment), so a gap between two segments always
 * means source lines were omitted there.
 */
export interface StoredSnippetContent {
	highlightRanges: NonEmptyArray<LineRange>
	segments: StoredSnippetSegment[]
}

/**
 * One renderable row of a resolved snippet: either a divider marking omitted
 * source lines between two segments, or a single source line, flagged as
 * `highlighted` when it falls within the referenced range.
 */
export type SnippetRow =
	{ type: 'gap' } | { type: 'line'; number: number; html: string; highlighted: boolean }

/** Type predicate for `SnippetRow`. */
export function isSnippetRow(row: unknown): row is SnippetRow {
	if (typeof row !== 'object' || row === null || !('type' in row)) {
		return false
	}

	if (row.type === 'gap') {
		return true
	}

	return (
		row.type === 'line' &&
		'number' in row &&
		typeof row.number === 'number' &&
		'html' in row &&
		typeof row.html === 'string' &&
		'highlighted' in row &&
		typeof row.highlighted === 'boolean'
	)
}

export type NotASnippetUrl = 'NOT_GITHUB_URL' | 'NOT_BLOB_URL' | 'NO_LINE_ANCHOR'

/**
 * Parse a commit-pinned GitHub blob URL with a line anchor,
 * e.g. `https://github.com/org/repo/blob/<40-hex>/path/file.ts#L12-L34`.
 *
 * Returns a `NotASnippetUrl` sentinel for URLs that are not even trying to be
 * a snippet source (see `NotASnippetUrl`). Once a URL is a `/blob/...` link,
 * anything wrong with it besides a missing line anchor — a missing file path,
 * a branch/tag instead of a commit hash, or a nonsensical line range — throws,
 * since a real GitHub blob link never produces those; they only come from a
 * hand-edited or corrupted URL that needs fixing in the data.
 */
export function parseGitHubBlobUrl(url: string): CodeSnippetSource | NotASnippetUrl {
	let parsed: URL

	// Root-relative paths (file-based refs, resolved to "/public/some/path.pdf")
	// are a legitimate non-GitHub reference type.
	if (url.startsWith('/')) {
		return 'NOT_GITHUB_URL'
	}

	try {
		parsed = new URL(url)
	} catch {
		throw new Error(`Not a valid URL: ${url}`)
	}

	if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
		return 'NOT_GITHUB_URL'
	}

	const segments = parsed.pathname
		.split('/')
		.filter(segment => segment !== '')
		.map(segment => {
			try {
				return decodeURIComponent(segment)
			} catch {
				return segment
			}
		})
	const [org, repo, view, ref, ...pathSegments] = segments

	if (view !== 'blob') {
		return 'NOT_BLOB_URL'
	}

	if (org === undefined || repo === undefined || ref === undefined || pathSegments.length === 0) {
		throw new Error(`Malformed GitHub blob URL (missing org/repo/ref/path): ${url}`)
	}

	if (!fullCommitHashRegExp.test(ref)) {
		throw new Error(`GitHub blob URL is pinned to "${ref}", not a 40-character commit hash: ${url}`)
	}

	const ranges = parseLineFragment(parsed.hash.replace(/^#/, ''))

	if (ranges === null) {
		return 'NO_LINE_ANCHOR'
	}

	const problem = lineRangesProblem(ranges)

	if (problem !== null) {
		throw new Error(`GitHub blob URL has ${problem}: ${url}`)
	}

	return {
		commit: ref,
		org,
		path: pathSegments.join('/'),
		ranges,
		repo,
	}
}

/** Type guard narrowing a `parseGitHubBlobUrl` result to an actual `CodeSnippetSource`. */
export function isSnippetSource(
	result: CodeSnippetSource | NotASnippetUrl,
): result is CodeSnippetSource {
	if (typeof result !== 'string') {
		return true
	}

	switch (result) {
		case 'NOT_GITHUB_URL':
		case 'NOT_BLOB_URL':
		case 'NO_LINE_ANCHOR':
			return false
		default:
			throw new Error(`Unhandled NotASnippetUrl: ${String(result)}`)
	}
}

/** Human-readable reason a `parseGitHubBlobUrl` sentinel means the URL isn't a snippet source. */
export function describeNotASnippetUrl(reason: NotASnippetUrl): string {
	switch (reason) {
		case 'NOT_GITHUB_URL':
			return 'not a github.com URL'
		case 'NOT_BLOB_URL':
			return 'not a /blob/ URL'
		case 'NO_LINE_ANCHOR':
			return 'missing a line anchor (#L<first>[-L<last>][,L<first>[-L<last>]...])'
		default:
			throw new Error(`Unhandled NotASnippetUrl: ${String(reason)}`)
	}
}

/**
 * The canonical commit-pinned GitHub blob URL for a snippet source.
 * Column-qualified line anchors (`#L1C2-L3C4`) normalize to plain line
 * anchors, so this may differ textually from the URL a source was parsed from.
 */
export function gitHubBlobUrl(source: CodeSnippetSource): string {
	return `https://github.com/${source.org}/${source.repo}/blob/${source.commit}/${source.path}#${formatLineRanges(source.ranges)}`
}

/** The raw.githubusercontent.com URL serving the full file a snippet is cut from. */
export function rawGitHubContentUrl(source: CodeSnippetSource): string {
	const encodedPath = source.path
		.split('/')
		.map(segment => encodeURIComponent(segment))
		.join('/')

	return `https://raw.githubusercontent.com/${source.org}/${source.repo}/${source.commit}/${encodedPath}`
}

/** Repository-relative directory holding a wallet's code snippets. */
export function walletCodeSnippetsDir(walletId: string): string {
	return `public/references/wallets/${walletId}/code`
}

/**
 * Flat snippet filename for a source:
 * `<org>--<repo>--<commit>--<path with '/' as '--'>.L<first>[-L<last>].<ext>.snippet`.
 * The source file's extension is moved after the line range so it sits right
 * before `.snippet`, keeping the language identifiable from the filename when
 * the snippet is rendered. This mapping is forward-only: snippet files are
 * always looked up by computing the name from a URL, never parsed back.
 */
export function snippetFileName(source: CodeSnippetSource): string {
	const lastSlash = source.path.lastIndexOf('/')
	const directory = lastSlash === -1 ? '' : source.path.slice(0, lastSlash + 1)
	const fileName = source.path.slice(lastSlash + 1)
	const lastDot = fileName.lastIndexOf('.')
	const stem = lastDot <= 0 ? fileName : fileName.slice(0, lastDot)
	const extension = lastDot <= 0 ? '' : fileName.slice(lastDot)
	const flattenedPath = `${directory}${stem}`.replaceAll('/', '--')

	return `${source.org}--${source.repo}--${source.commit}--${flattenedPath}.${formatLineRanges(source.ranges)}${extension}.snippet`
}

/** Repository-relative path of the stored snippet file for a source. */
export function snippetRelativePath(walletId: string, source: CodeSnippetSource): string {
	return `${walletCodeSnippetsDir(walletId)}/${snippetFileName(source)}`
}

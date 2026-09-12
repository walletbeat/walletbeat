import { fullCommitHashRegExp, lineFragmentRegExp } from './url'

/**
 * The source location of a locally stored code snippet: a file in a GitHub
 * repository pinned to a specific commit, plus an inclusive 1-based line range.
 *
 * Snippets are stored as flat files under
 * `public/references/wallets/<wallet-id>/code/`, named
 * `<org>--<repo>--<commit>--<path with '/' as '--'>.L<first>[-L<last>].<ext>.snippet`
 * (the source file's extension is kept right before `.snippet` so the language
 * remains identifiable when rendered). They hold the referenced lines plus a
 * small bounded window of surrounding context and enclosing scope headers,
 * never the whole file, so that storing them stays within fair use regardless of the source repository's license.
 */
export interface CodeSnippetSource {
	org: string
	repo: string
	/** Full 40-character commit hash the URL is pinned to. */
	commit: string
	/** Repository-relative file path, using forward slashes, percent-decoded. */
	path: string
	/** 1-based first line of the snippet, inclusive. */
	firstLine: number
	/** 1-based last line of the snippet, inclusive. */
	lastLine: number
}

/** A contiguous run of source lines stored in a `.snippet` file. */
export interface StoredSnippetSegment {
	/** 1-based source line number of `lines[0]`. */
	startLine: number
	lines: string[]
}

/**
 * The JSON content of a `.snippet` file: the referenced range
 * (`highlightFirstLine`-`highlightLastLine`, matching a `CodeSnippetSource`'s
 * `firstLine`/`lastLine`) plus the surrounding-context and scope-header
 * segments built around it. Segments are ordered by `startLine` and are never
 * adjacent or overlapping (adjacent runs are merged into one segment), so a
 * gap between two segments always means source lines were omitted there.
 */
export interface StoredSnippetContent {
	highlightFirstLine: number
	highlightLastLine: number
	segments: StoredSnippetSegment[]
}

/**
 * One renderable row of a resolved snippet: either a divider marking omitted
 * source lines between two segments, or a single source line, flagged as
 * `highlighted` when it falls within the referenced range.
 */
export type SnippetRow =
	{ type: 'gap' } | { type: 'line'; number: number; html: string; highlighted: boolean }

/** The `L123` / `L123-L456` filename and URL-fragment suffix for a snippet. */
function snippetLineSuffix(source: CodeSnippetSource): string {
	if (source.firstLine === source.lastLine) {
		return `L${source.firstLine}`
	}

	return `L${source.firstLine}-L${source.lastLine}`
}

/**
 * Parse a commit-pinned GitHub blob URL with a line anchor,
 * e.g. `https://github.com/org/repo/blob/<40-hex>/path/file.ts#L12-L34`.
 *
 * Returns null for anything else: non-GitHub URLs, non-blob URLs, URLs pinned
 * to a branch instead of a commit hash, URLs without a line anchor (those
 * reference a whole file, which is deliberately not stored locally), and
 * multi-range anchors such as `#L1,L5-L7`.
 */
export function parseGitHubBlobUrl(url: string): CodeSnippetSource | null {
	let parsed: URL

	try {
		parsed = new URL(url)
	} catch {
		return null
	}

	if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
		return null
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

	if (
		org === undefined ||
		repo === undefined ||
		view !== 'blob' ||
		ref === undefined ||
		!fullCommitHashRegExp.test(ref) ||
		pathSegments.length === 0
	) {
		return null
	}

	const lineMatch = lineFragmentRegExp.exec(parsed.hash.replace(/^#/, ''))

	if (lineMatch?.groups === undefined) {
		return null
	}

	const firstLine = parseInt(lineMatch.groups.first, 10)
	const lastLine =
		lineMatch.groups.last === undefined ? firstLine : parseInt(lineMatch.groups.last, 10)

	if (firstLine < 1 || lastLine < firstLine) {
		return null
	}

	return {
		commit: ref,
		firstLine,
		lastLine,
		org,
		path: pathSegments.join('/'),
		repo,
	}
}

/**
 * The canonical commit-pinned GitHub blob URL for a snippet source.
 * Column-qualified line anchors (`#L1C2-L3C4`) normalize to plain line
 * anchors, so this may differ textually from the URL a source was parsed from.
 */
export function gitHubBlobUrl(source: CodeSnippetSource): string {
	return `https://github.com/${source.org}/${source.repo}/blob/${source.commit}/${source.path}#${snippetLineSuffix(source)}`
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

	return `${source.org}--${source.repo}--${source.commit}--${flattenedPath}.${snippetLineSuffix(source)}${extension}.snippet`
}

/** Repository-relative path of the stored snippet file for a source. */
export function snippetRelativePath(walletId: string, source: CodeSnippetSource): string {
	return `${walletCodeSnippetsDir(walletId)}/${snippetFileName(source)}`
}

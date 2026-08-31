import {
	type CodeSnippetSource,
	parseGitHubBlobUrl,
	snippetFileName,
	type SnippetRow,
} from '@/schema/code-snippets'

/** A stored code snippet resolved from a reference URL. */
export interface ResolvedCodeSnippet {
	source: CodeSnippetSource

	/**
	 * The snippet's renderable rows: syntax-highlighted at build time by
	 * vite-plugin-code-snippet-highlight.mjs (language inferred from the
	 * source file extension in the snippet filename), with all snippet
	 * content HTML-escaped. Line HTML is safe to render with `{@html}`.
	 */
	rows: SnippetRow[]
}

/**
 * All stored snippet files, syntax-highlighted and bundled at build time
 * (each module's default export is an array of HTML strings, one per line —
 * see vite-plugin-code-snippet-highlight.mjs).
 * Keyed by snippet filename only (the wallet ID segment is dropped): the
 * filename fully encodes org, repo, commit, path, and line range, so the same
 * URL always maps to identical content no matter which wallet stored it.
 * This lets references resolve snippets without knowing the wallet they
 * belong to.
 */
const snippetsByFileName = new Map<string, SnippetRow[]>()

function isSnippetRow(row: unknown): row is SnippetRow {
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

for (const [modulePath, rows] of Object.entries(
	import.meta.glob('/public/references/wallets/*/code/*.snippet', {
		eager: true,
		import: 'default',
	}),
)) {
	if (!Array.isArray(rows) || !rows.every(isSnippetRow)) {
		throw new Error(`Snippet file did not import as an array of snippet rows: ${modulePath}`)
	}

	const fileName = modulePath.split('/').pop()

	if (fileName === undefined) {
		throw new Error(`Cannot extract filename from snippet module path: ${modulePath}`)
	}

	snippetsByFileName.set(fileName, rows)
}

/**
 * Resolve the stored code snippet for a reference URL, or null when the URL
 * is not a commit-pinned line-anchored GitHub blob URL or has no snippet
 * stored under `public/references/wallets/<wallet-id>/code/`
 * (run `pnpm collect:snippets -- --all` to fetch missing ones).
 */
export function codeSnippetForUrl(url: string): ResolvedCodeSnippet | null {
	const source = parseGitHubBlobUrl(url)

	if (source === null) {
		return null
	}

	const rows = snippetsByFileName.get(snippetFileName(source))

	if (rows === undefined) {
		return null
	}

	return { rows, source }
}

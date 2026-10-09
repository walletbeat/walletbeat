import type { SnippetRow } from '@/schema/code-snippets'
import { snippetFileName } from '@/schema/code-snippets'
import { type CodeSnippetIndex, codeSnippetSourceForUrl } from '@/utils/code-snippet-index'

/**
 * All stored snippet files, syntax-highlighted and bundled at build time
 * (each module's default export is an array of `SnippetRow`s — see
 * vite-plugin-code-snippet-highlight.mjs), keyed by snippet filename only
 * (the wallet ID segment is dropped, see `CodeSnippetIndex`).
 *
 * This bundles every wallet's snippets (about 1.9 MB of highlighted HTML), so
 * import this module only from server-rendered `.astro` code, never from a
 * component that hydrates on the client.
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
 * Collect the stored code snippets for every reference URL found anywhere in
 * `values` (searched recursively through arrays, plain objects, maps and
 * sets), so a page can pass its island exactly the snippets it renders.
 */
export function codeSnippetsReferencedBy(...values: unknown[]): CodeSnippetIndex {
	const index: CodeSnippetIndex = {}
	const visited = new WeakSet<object>()

	const visit = (value: unknown): void => {
		if (typeof value === 'string') {
			// Cheap pre-filter: snippet URLs always carry a line anchor.
			const source = value.includes('#L') ? codeSnippetSourceForUrl(value) : null

			if (source !== null) {
				const fileName = snippetFileName(source)
				const rows = snippetsByFileName.get(fileName)

				if (rows !== undefined) {
					index[fileName] = rows
				}
			}

			return
		}

		if (typeof value !== 'object' || value === null || visited.has(value)) {
			return
		}

		visited.add(value)

		const children: Iterable<unknown> =
			value instanceof Map || value instanceof Set ? value.values() : Object.values(value)

		for (const child of children) {
			visit(child)
		}
	}

	for (const value of values) {
		visit(value)
	}

	return index
}

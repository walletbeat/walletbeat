import { getContext, setContext } from 'svelte'

import {
	type CodeSnippetSource,
	isSnippetSource,
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
 * Stored snippet rows keyed by snippet filename (see `snippetFileName`).
 * The filename fully encodes org, repo, commit, path, and line range, so the
 * same URL always maps to identical content no matter which wallet stored it.
 *
 * Pages build the subset they render with `codeSnippetsReferencedBy`
 * (code-snippet-store.ts, build time only) and hand it to their island, which
 * provides it to `ReferenceLinks` via `setCodeSnippetContext`. This keeps
 * every other wallet's snippets out of the client bundle.
 */
export type CodeSnippetIndex = Record<string, SnippetRow[]>

/**
 * The snippet filename a reference URL maps to, or null when the URL is not
 * a commit-pinned line-anchored GitHub blob URL, or is a malformed attempt at
 * one (rendering shouldn't crash over a data problem the
 * `code-snippets-integrity` check already surfaces).
 */
export function codeSnippetSourceForUrl(url: string): CodeSnippetSource | null {
	let source: ReturnType<typeof parseGitHubBlobUrl>

	try {
		source = parseGitHubBlobUrl(url)
	} catch {
		return null
	}

	return isSnippetSource(source) ? source : null
}

/**
 * Resolve the stored code snippet for a reference URL from `index`, or null
 * when the URL is not a snippet source (see `codeSnippetSourceForUrl`) or has
 * no snippet in `index` (run `pnpm collect:snippets -- all` to fetch missing
 * ones).
 */
export function resolveCodeSnippet(
	index: CodeSnippetIndex,
	url: string,
): ResolvedCodeSnippet | null {
	const source = codeSnippetSourceForUrl(url)

	if (source === null) {
		return null
	}

	const rows = index[snippetFileName(source)] as SnippetRow[] | undefined

	if (rows === undefined) {
		return null
	}

	return { rows, source }
}

const codeSnippetContextKey = Symbol('codeSnippets')

/**
 * Provide the code snippets an island renders to its descendant components.
 * Call during component initialization in the island's root component.
 */
export function setCodeSnippetContext(getIndex: () => CodeSnippetIndex): void {
	setContext(codeSnippetContextKey, getIndex)
}

/**
 * Get a lookup resolving reference URLs to the code snippets provided by the
 * nearest `setCodeSnippetContext` ancestor. URLs resolve to null when no
 * ancestor provides snippets. Call during component initialization.
 */
export function getCodeSnippetLookup(): (url: string) => ResolvedCodeSnippet | null {
	const getIndex = getContext<(() => CodeSnippetIndex) | undefined>(codeSnippetContextKey)

	return url => resolveCodeSnippet(getIndex?.() ?? {}, url)
}

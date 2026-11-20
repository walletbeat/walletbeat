import type { AttributeGroupId } from '@/schema/attribute-tree'
import {
	isSnippetRow,
	snippetFileName,
	snippetRelativePath,
	type SnippetRow,
} from '@/schema/code-snippets'
import type { FullyQualifiedReference } from '@/schema/reference'
import type { BaseWallet } from '@/schema/wallet'
import {
	findWalletSnippetOccurrences,
	type SnippetOccurrence,
} from '@/tools/code-snippet-collector/snippet-occurrences'
import { type CodeSnippetIndex, codeSnippetSourceForUrl } from '@/utils/code-snippet-index'

/**
 * All stored snippet files, syntax-highlighted and bundled at build time
 * (each module's default export is an array of `SnippetRow`s, see
 * vite-plugin-code-snippet-highlight.mjs), keyed by `/` followed by their
 * repository-relative path.
 *
 * This bundles every wallet's snippets, so import this module only from
 * server-rendered `.astro` code, never from a component that hydrates on the
 * client.
 */
const snippetModules: Record<string, unknown> = import.meta.glob(
	'/public/references/wallets/*/code/*.snippet',
	{ eager: true, import: 'default' },
)

/** The rows of the stored snippet at `snippetPath`, or undefined if none is stored. */
function storedSnippetRows(snippetPath: string): SnippetRow[] | undefined {
	const rows = snippetModules[`/${snippetPath}`]

	if (rows === undefined) {
		return undefined
	}

	if (!Array.isArray(rows) || !rows.every(isSnippetRow)) {
		throw new Error(`Snippet file did not import as an array of snippet rows: ${snippetPath}`)
	}

	return rows
}

function codeSnippetIndex(
	occurrences: Array<Pick<SnippetOccurrence, 'source' | 'snippetPath'>>,
): CodeSnippetIndex {
	const index: CodeSnippetIndex = {}

	for (const { source, snippetPath } of occurrences) {
		const rows = storedSnippetRows(snippetPath)

		if (rows !== undefined) {
			index[snippetFileName(source)] = rows
		}
	}

	return index
}

/** The stored code snippets for every snippet URL in a wallet's data refs. */
export function codeSnippetsForWallet(
	walletName: string,
	wallet: BaseWallet<AttributeGroupId>,
): CodeSnippetIndex {
	return codeSnippetIndex(findWalletSnippetOccurrences(walletName, wallet))
}

/**
 * The stored code snippets for every snippet URL in `references`, taken from
 * the data of the wallet with ID `walletId`.
 */
export function codeSnippetsForReferences(
	walletId: string,
	references: FullyQualifiedReference[],
): CodeSnippetIndex {
	return codeSnippetIndex(
		references.flatMap(reference =>
			reference.urls.flatMap(({ url }) => {
				const source = codeSnippetSourceForUrl(url)

				return source === null
					? []
					: [{ source, snippetPath: snippetRelativePath(walletId, source) }]
			}),
		),
	)
}

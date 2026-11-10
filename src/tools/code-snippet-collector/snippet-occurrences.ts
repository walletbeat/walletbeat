import type { AttributeGroupId } from '@/schema/attribute-tree'
import {
	type CodeSnippetSource,
	isSnippetSource,
	parseGitHubBlobUrl,
	snippetRelativePath,
} from '@/schema/code-snippets'
import { collectWalletRefs } from '@/schema/reference'
import type { BaseWallet } from '@/schema/wallet'

/** One line-anchored, commit-pinned GitHub blob URL found in a wallet's ref data. */
export interface SnippetOccurrence {
	walletId: string
	source: CodeSnippetSource
	/** The URL as written in the reference. */
	url: string
	/** Period-delimited field path (from the wallet root) the URL was found under. */
	fieldPath: string
	/** Repository-relative path of the snippet file this URL maps to. */
	snippetPath: string
}

/**
 * Find every line-anchored, commit-pinned GitHub blob URL among a wallet's
 * data refs.
 */
export function findWalletSnippetOccurrences(
	walletName: string,
	wallet: BaseWallet<AttributeGroupId>,
): SnippetOccurrence[] {
	const occurrences: SnippetOccurrence[] = []
	const walletId = wallet.metadata.id

	for (const collected of collectWalletRefs(walletName, wallet)) {
		for (const fq of collected.fullyQualifiedRefs) {
			for (const urlEntry of fq.urls) {
				const source = parseGitHubBlobUrl(urlEntry.url)

				if (!isSnippetSource(source)) {
					continue
				}

				occurrences.push({
					fieldPath: collected.fieldPath,
					snippetPath: snippetRelativePath(walletId, source),
					source,
					url: urlEntry.url,
					walletId,
				})
			}
		}
	}

	return occurrences
}

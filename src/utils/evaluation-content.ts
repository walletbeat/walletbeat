import type { ConcreteWalletEvalStrings, WalletNameAndPseudonymStrings } from '@/schema/attributes'
import type { WalletMetadata } from '@/schema/wallet'
import { isTypographicContent, renderTypographicContentToString } from '@/types/content'
import type { EvaluationDetails } from '@/types/content/details'
import { trimWhitespacePrefix } from '@/types/utils/text'

/**
 * Build the wallet name and pseudonym strings used when rendering evaluation content.
 * Single place to avoid drift when adding more placeholder keys.
 */
export function getWalletEvalStrings(wallet: {
	metadata: WalletMetadata
}): ConcreteWalletEvalStrings {
	const { metadata } = wallet

	return {
		WALLET_NAME: metadata.displayName,
		WALLET_PSEUDONYM_SINGULAR: metadata.pseudonymType?.singular ?? 'pseudonym',
		WALLET_PSEUDONYM_PLURAL: metadata.pseudonymType?.plural ?? 'pseudonyms',
	}
}

/**
 * Render content to plain text. Typographic content is rendered with eval strings;
 * structured details and absent details yield the given fallback.
 * Optionally normalizes whitespace by stripping the longest common leading whitespace
 * from each line (via trimWhitespacePrefix).
 * Accepts Content (e.g. Paragraph from stage definitions).
 */
export function renderContentToText(
	content: EvaluationDetails<WalletNameAndPseudonymStrings>,
	strings: WalletNameAndPseudonymStrings,
	options: { fallback?: string; trim?: boolean } = {},
): string {
	const { fallback = '', trim = false } = options

	if (!isTypographicContent(content)) {
		return fallback
	}

	const out = renderTypographicContentToString(content, strings)

	return trim ? trimWhitespacePrefix(out) : out
}

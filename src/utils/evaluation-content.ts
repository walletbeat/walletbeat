import type { WalletNameAndPseudonymStrings } from '@/schema/attributes'
import type { RatedWallet } from '@/schema/wallet'
import {
	type Content,
	isTypographicContent,
	renderTypographicContentToString,
} from '@/types/content'

/**
 * Build the wallet name and pseudonym strings used when rendering evaluation content.
 * Single place to avoid drift when adding more placeholder keys.
 */
export function getWalletEvalStrings(wallet: RatedWallet): WalletNameAndPseudonymStrings {
	const { metadata } = wallet

	return {
		WALLET_NAME: metadata.displayName,
		WALLET_PSEUDONYM_SINGULAR: metadata.pseudonymType?.singular ?? 'pseudonym',
		WALLET_PSEUDONYM_PLURAL: metadata.pseudonymType?.plural ?? 'pseudonyms',
	}
}

/**
 * Render Content, falling back to `fallback` for CustomContent.
 * Always passes the full set of strings including pseudonym placeholders.
 */
export function renderEvaluationContentOrFallback(
	content: Content<WalletNameAndPseudonymStrings>,
	strings: WalletNameAndPseudonymStrings,
	fallback: string,
): string {
	if (!isTypographicContent(content)) {
		return fallback
	}

	return renderTypographicContentToString(content, strings)
}

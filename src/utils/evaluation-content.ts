import type { WalletNameAndPseudonymStrings } from '@/schema/attributes'
import type { RatedWallet } from '@/schema/wallet'
import {
	type Content,
	isTypographicContent,
	renderTypographicContentToString,
} from '@/types/content'
import { trimWhitespacePrefix } from '@/types/utils/text'

/**
 * Concrete wallet eval strings (all fields present, no null).
 * Used as return type of getWalletEvalStrings so it's assignable to Typography's
 * strings prop when content uses WalletNameAndPseudonymStrings (which is a union including null).
 */
export type ConcreteWalletEvalStrings = {
	WALLET_NAME: string
	WALLET_PSEUDONYM_SINGULAR: string
	WALLET_PSEUDONYM_PLURAL: string
}

/**
 * Build the wallet name and pseudonym strings used when rendering evaluation content.
 * Single place to avoid drift when adding more placeholder keys.
 */
export function getWalletEvalStrings(wallet: RatedWallet): ConcreteWalletEvalStrings {
	const { metadata } = wallet

	return {
		WALLET_NAME: metadata.displayName,
		WALLET_PSEUDONYM_SINGULAR: metadata.pseudonymType?.singular ?? 'pseudonym',
		WALLET_PSEUDONYM_PLURAL: metadata.pseudonymType?.plural ?? 'pseudonyms',
	}
}

/**
 * Render content to plain text. Typographic content is rendered with eval strings;
 * CustomContent yields the given fallback.
 * Optionally normalizes whitespace by stripping the longest common leading whitespace
 * from each line (via trimWhitespacePrefix).
 * Accepts Content (e.g. Paragraph from stage definitions).
 */
export function renderContentToText(
	content: Content<WalletNameAndPseudonymStrings>,
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

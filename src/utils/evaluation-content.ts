import type { WalletNameAndPseudonymStrings } from '@/schema/attributes'
import type { WalletStageCriterion, WalletStageGroup } from '@/schema/stages'
import type { RatedWallet } from '@/schema/wallet'
import {
	type Content,
	isTypographicContent,
	type Paragraph,
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

/**
 * Render stage criterion or group description content to plain text.
 * Centralizes "content → string": typographic content is rendered with eval strings and trimmed;
 * custom content yields empty string.
 * Accepts Paragraph (e.g. from stage definitions) or Content<WalletNameAndPseudonymStrings>.
 */
function descriptionContentToText(
	content: Content<WalletNameAndPseudonymStrings> | Paragraph,
	evalStrings: WalletNameAndPseudonymStrings,
): string {
	if (!isTypographicContent(content)) {
		return ''
	}

	return renderTypographicContentToString(content, evalStrings).trim()
}

/**
 * Criterion description as plain text (for JSON export or further markdown processing).
 */
export function renderCriterionDescriptionToText(
	criterion: WalletStageCriterion,
	evalStrings: WalletNameAndPseudonymStrings,
): string {
	return descriptionContentToText(criterion.description, evalStrings)
}

/**
 * Criteria group description as plain text (for JSON export or further markdown processing).
 */
export function renderGroupDescriptionToText(
	group: WalletStageGroup,
	evalStrings: WalletNameAndPseudonymStrings,
): string {
	return descriptionContentToText(group.description, evalStrings)
}

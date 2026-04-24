import type { Attribute, OutcomeMetadata } from '@/schema/attributes'
import { renderTypographicContentToString } from '@/types/content'
import { collapseToSingleLine } from '@/utils/markdown-utils'

export function getHowIsEvaluatedHeading<_OutcomeMetadata extends OutcomeMetadata>(
	attribute: Attribute<_OutcomeMetadata>,
): string {
	const { wording } = attribute

	if (wording.midSentenceName === null) {
		return wording.howIsEvaluated
	}

	return `How is ${wording.midSentenceName} evaluated?`
}

export function getWhyItMattersHeading<_OutcomeMetadata extends OutcomeMetadata>(
	attribute: Attribute<_OutcomeMetadata>,
): string {
	const { wording } = attribute

	if (wording.midSentenceName === null) {
		return 'Why it matters'
	}

	return `Why ${wording.midSentenceName} matters`
}

export function getHowToImproveHeading<_OutcomeMetadata extends OutcomeMetadata>(
	attribute: Attribute<_OutcomeMetadata>,
	walletName: string,
): string {
	const { wording } = attribute

	if (wording.midSentenceName === null) {
		return collapseToSingleLine(
			renderTypographicContentToString(wording.whatCanWalletDoAboutIts, {
				WALLET_NAME: walletName,
			}),
		)
	}

	return `What can ${walletName} do about its ${wording.midSentenceName}?`
}

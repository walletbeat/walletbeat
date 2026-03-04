import type { Attribute, Value } from '@/schema/attributes'
import { renderTypographicContentToString } from '@/types/content'
import { collapseToSingleLine } from '@/utils/markdown-utils'

export function getHowIsEvaluatedHeading<V extends Value>(attribute: Attribute<V>): string {
	const { wording } = attribute

	if (wording.midSentenceName === null) {
		return wording.howIsEvaluated
	}

	return `How is ${wording.midSentenceName} evaluated?`
}

export function getWhyItMattersHeading<V extends Value>(attribute: Attribute<V>): string {
	const { wording } = attribute

	if (wording.midSentenceName === null) {
		return 'Why it matters'
	}

	return `Why ${wording.midSentenceName} matters`
}

export function getHowToImproveHeading<V extends Value>(
	attribute: Attribute<V>,
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

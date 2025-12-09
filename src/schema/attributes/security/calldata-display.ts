import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { type CallDataDisplaySupport } from '@/schema/features/security/calldata-display'
import { refs } from '@/schema/reference'
import type { AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.calldata-display'

export type CallDataDisplayValue = Value & {
	__brand: 'attributes.security.calldata-display'
}

function evaluateCalldataDisplay(features: CallDataDisplaySupport): Rating {
	const ratings = [features.rawHex, features.copyHexToClipboard, features.formatted]

	// If any rating is null (unreviewed), return UNRATED
	if (ratings.some(r => r === null)) {
		return Rating.UNRATED
	}

	const passCount = ratings.filter(r => r).length

	if (passCount >= 3) {
		return Rating.PASS
	}

	if (passCount >= 1) {
		return Rating.PARTIAL
	}

	return Rating.FAIL
}

export const callDataDisplay: Attribute<CallDataDisplayValue> = {
	id: 'calldata-display',
	icon: '💾',
	displayName: 'Calldata Display',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's calldata display evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve its calldata display?',
		),
	},
	question: sentence('Does {{WALLET_NAME}} allow users to view transaction calldata?'),
	why: markdown(`
		Calldata display is an important security feature that allows users to inspect the raw transaction data before signing.
		This transparency enables users to verify what they are actually signing, helping them detect malicious or unexpected transactions.
		Users should be able to view calldata in multiple formats (raw hex, formatted, and be able to copy it) to enable independent verification and analysis.
	`),
	methodology: markdown(`
		Evaluated based on whether the wallet allows users to view transaction calldata in different formats:
		- **Raw Hex Display:** Can the wallet display the calldata in raw hexadecimal format?
		- **Copy to Clipboard:** Can users copy the raw hex calldata to their clipboard for external analysis?
		- **Formatted Display:** Can the wallet display the calldata in a formatted output (e.g., JSON, decoded parameters)?
		
		A wallet receives a passing rating if it supports all three methods of calldata display.
		A wallet receives a partial rating if it supports at least one method.
		A wallet receives a failing rating if it does not support any method of calldata display.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence(
					'The wallet supports all calldata display methods (raw hex, copy to clipboard, and formatted display).',
				),
				(v: CallDataDisplayValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The wallet supports some calldata display methods.'),
				(v: CallDataDisplayValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The wallet does not support calldata display.'),
				(v: CallDataDisplayValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<CallDataDisplayValue>>) =>
		pickWorstRating<CallDataDisplayValue>(perVariant),
	evaluate: (features: ResolvedFeatures): Evaluation<CallDataDisplayValue> => {
		if (features.type === WalletType.HARDWARE) {
			return exempt(
				callDataDisplay,
				sentence('Call data display is only rated for software wallets'),
				brand,
				null,
			)
		}

		const callDataDisplayFeature = features.security.callDataDisplay

		if (callDataDisplayFeature === null) {
			return unrated(callDataDisplay, brand, null)
		}

		const rating = evaluateCalldataDisplay(callDataDisplayFeature)
		const references = refs(callDataDisplayFeature)

		return {
			value: {
				id: 'call-data-display',
				rating,
				displayName: 'Call Data Display',
				shortExplanation: sentence(
					`{{WALLET_NAME}} has ${rating.toLowerCase()} call data display.`,
				),
				...callDataDisplayFeature,
				__brand: brand,
			},
			details: paragraph(
				`{{WALLET_NAME}} call data display evaluation is ${rating.toLowerCase()}.`,
			),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
			references,
		}
	},
}

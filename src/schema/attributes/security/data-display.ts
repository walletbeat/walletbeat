import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { type DataDisplaySupport } from '@/schema/features/security/data-display'
import { mergeRefs, refs } from '@/schema/reference'
import type { AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.data-display'

export type DataDisplayValue = Value & {
	__brand: 'attributes.security.data-display'
}

function evaluateDataDisplay(features: DataDisplaySupport): Rating {
	if (features.calldataDisplay === null || features.transactionDetailsDisplay === null) {
		return Rating.UNRATED
	}

	const ratings = [features.calldataDisplay.rawHex, features.calldataDisplay.copyHexToClipboard, features.calldataDisplay.formatted]

	const transactionDetailsRatings = [features.transactionDetailsDisplay.gas, features.transactionDetailsDisplay.nonce, features.transactionDetailsDisplay.from, features.transactionDetailsDisplay.to, features.transactionDetailsDisplay.chain, features.transactionDetailsDisplay.value]

	const passCount = ratings.filter(r => r).length + transactionDetailsRatings.filter(r => r).length

	return passCount >= 6 ? Rating.PASS : passCount >= 3 ? Rating.PARTIAL : Rating.FAIL
}

export const dataDisplay: Attribute<DataDisplayValue> = {
	id: 'data-display',
	icon: '💾',
	displayName: 'Data Display',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's data display evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve its data display?',
		),
	},
	question: sentence('Does {{WALLET_NAME}} allow users to view transaction data?'),
	why: markdown(`
		Data display is an important security feature that allows users to inspect the raw transaction data before signing.
		This transparency enables users to verify what they are actually signing, helping them detect malicious or unexpected transactions.
		Users should be able to view data in multiple formats (raw hex, formatted, and be able to copy it) to enable independent verification and analysis.
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
				(v: DataDisplayValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The wallet supports some calldata display methods.'),
				(v: DataDisplayValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The wallet does not support calldata display.'),
				(v: DataDisplayValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<DataDisplayValue>>) =>
		pickWorstRating<DataDisplayValue>(perVariant),
	evaluate: (features: ResolvedFeatures): Evaluation<DataDisplayValue> => {
		if (features.type === WalletType.HARDWARE) {
			return exempt(
				dataDisplay,
				sentence('Data display is only rated for software wallets'),
				brand,
				null,
			)
		}

		const dataDisplayFeature = features.security.dataDisplay

		if (dataDisplayFeature === null) {
			return unrated(dataDisplay, brand, null)
		}

		const rating = evaluateDataDisplay(dataDisplayFeature)
		const calldataDisplayReferences = dataDisplayFeature.calldataDisplay ? refs(dataDisplayFeature.calldataDisplay) : []
		const transactionDetailsDisplayReferences = dataDisplayFeature.transactionDetailsDisplay ? refs(dataDisplayFeature.transactionDetailsDisplay) : []

		const references = mergeRefs(calldataDisplayReferences, transactionDetailsDisplayReferences)

		return {
			value: {
				id: 'call-data-display',
				rating,
				displayName: 'Call Data Display',
				shortExplanation: sentence(
					`{{WALLET_NAME}} has ${rating.toLowerCase()} call data display.`,
				),
				...dataDisplayFeature,
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

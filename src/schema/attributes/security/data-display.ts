import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import {
	type CallDataDisplay,
	type DataDisplaySupport,
	type TransactionDetailsDisplay,
} from '@/schema/features/security/data-display'
import { mergeRefs, popRefs, refs } from '@/schema/reference'
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

	const { withoutRefs: calldataDisplay } = popRefs<CallDataDisplay>(features.calldataDisplay)
	const { withoutRefs: transactionDetailsDisplay } = popRefs<TransactionDetailsDisplay>(
		features.transactionDetailsDisplay,
	)

	const calldataRatings = [
		calldataDisplay.rawHex,
		calldataDisplay.copyHexToClipboard,
		calldataDisplay.formatted,
	]

	const transactionDetailsRatings = [
		transactionDetailsDisplay.gas,
		transactionDetailsDisplay.nonce,
		transactionDetailsDisplay.from,
		transactionDetailsDisplay.to,
		transactionDetailsDisplay.chain,
		transactionDetailsDisplay.value,
	]

	const totalCriteria = calldataRatings.length + transactionDetailsRatings.length 
	const passCount = calldataRatings.filter(r => r).length + transactionDetailsRatings.filter(r => r).length


	if (passCount >= totalCriteria) {
		return Rating.PASS
	}

	if (passCount >= 3) {
		return Rating.PARTIAL
	}

	return Rating.FAIL
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
		Data display is an important security feature that allows users to inspect transaction data before signing.
		This transparency enables users to verify what they are actually signing, helping them detect malicious or unexpected transactions.
		Users should be able to view both calldata (in multiple formats: raw hex, formatted, and be able to copy it) and essential transaction details (gas, nonce, from, to, chain, value) to enable independent verification and analysis.
	`),
	methodology: markdown(`
		Evaluated based on two aspects of data display:

		**Calldata Display:**
		- **Raw Hex Display:** Can the wallet display the calldata in raw hexadecimal format?
		- **Copy to Clipboard:** Can users copy the raw hex calldata to their clipboard for external analysis?
		- **Formatted Display:** Can the wallet display the calldata in a formatted output (e.g., JSON, decoded parameters)?

		**Transaction Details Display:**
		- **Gas:** Can the wallet display the gas limit and/or gas price?
		- **Nonce:** Can the wallet display the transaction nonce?
		- **From:** Can the wallet display the sender address?
		- **To:** Can the wallet display the recipient address?
		- **Chain:** Can the wallet display which chain/network the transaction is for?
		- **Value:** Can the wallet display the transaction value/amount?

		A wallet receives a passing rating if it supports all of these 9 criteria.
		A wallet receives a partial rating if it supports at least 5 of these 9 criteria.
		A wallet receives a failing rating if it supports 2 or fewer criteria.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence(
					'The wallet supports comprehensive data display, including calldata display methods and essential transaction details.',
				),
				(v: DataDisplayValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The wallet supports some data display methods for calldata and/or transaction details.'),
				(v: DataDisplayValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The wallet does not support adequate data display for calldata or transaction details.'),
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

		if (rating === Rating.UNRATED) {
			return unrated(dataDisplay, brand, null)
		}

		const calldataDisplayData =
			dataDisplayFeature.calldataDisplay !== null
				? popRefs<CallDataDisplay>(dataDisplayFeature.calldataDisplay).withoutRefs
				: null
		const transactionDetailsDisplayData =
			dataDisplayFeature.transactionDetailsDisplay !== null
				? popRefs<TransactionDetailsDisplay>(dataDisplayFeature.transactionDetailsDisplay).withoutRefs
				: null

		// This should not happen if rating is not UNRATED, but TypeScript needs this check
		if (calldataDisplayData === null || transactionDetailsDisplayData === null) {
			return unrated(dataDisplay, brand, null)
		}

		const calldataDisplayReferences = dataDisplayFeature.calldataDisplay
			? refs(dataDisplayFeature.calldataDisplay)
			: []
		const transactionDetailsDisplayReferences = dataDisplayFeature.transactionDetailsDisplay
			? refs(dataDisplayFeature.transactionDetailsDisplay)
			: []

		const allRefs = mergeRefs(calldataDisplayReferences, transactionDetailsDisplayReferences)

		return {
			value: {
				id: 'data-display',
				rating,
				displayName: 'Data Display',
				shortExplanation: sentence(
					`{{WALLET_NAME}} has ${rating.toLowerCase()} data display.`,
				),
				...dataDisplayFeature,
				__brand: brand,
			},
			details: paragraph(
				`{{WALLET_NAME}} data display evaluation is ${rating.toLowerCase()}, considering both calldata display and transaction details display.`,
			),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
			...(allRefs.length > 0 && { references: allRefs }),
		}
	},
}

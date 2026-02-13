import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import {
	type InteroperabilitySupport,
	InteroperabilityType,
} from '@/schema/features/self-sovereignty/interoperability'
import type { AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type InteroperabilityValue = Value & {
	interoperability: InteroperabilityType
	noSupplierLinkage: InteroperabilityType
}

function evaluateInteroperability(features: InteroperabilitySupport): Rating {
	const ratings = [features.interoperability, features.noSupplierLinkage]
	const passCount = ratings.filter(r => r === InteroperabilityType.PASS).length

	if (passCount === 2) {
		return Rating.PASS
	}

	if (passCount === 1) {
		return Rating.PARTIAL
	}

	return Rating.FAIL
}

export const interoperability: Attribute<InteroperabilityValue> = {
	id: 'interoperability',
	icon: '🔗',
	displayName: 'Interoperability',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's interoperability evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve its interoperability?',
		),
	},
	question: sentence(
		'Does {{WALLET_NAME}} work well with independent wallets and avoid supplier linkage?',
	),
	why: markdown(
		'Interoperability ensures the wallet can be used with independent wallets and does not leak identifying metadata to the supplier.',
	),
	methodology: markdown(
		'Evaluated based on independent wallet compatibility and supplier independence.',
	),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence('The wallet passes both interoperability sub-criteria.'),
				(v: InteroperabilityValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The wallet passes one interoperability sub-criteria.'),
				(v: InteroperabilityValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The wallet fails one or both interoperability sub-criteria.'),
				(v: InteroperabilityValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<InteroperabilityValue>>) =>
		pickWorstRating<InteroperabilityValue>(perVariant),
	evaluate: (features: ResolvedFeatures): Evaluation<InteroperabilityValue> => {
		if (features.type !== WalletType.HARDWARE) {
			return exempt(interoperability, sentence('Only rated for hardware wallets'), {
				interoperability: InteroperabilityType.FAIL,
				noSupplierLinkage: InteroperabilityType.FAIL,
			})
		}

		const interoperabilityFeature = features.selfSovereignty.interoperability

		if (interoperabilityFeature === null) {
			return unrated(interoperability, {
				interoperability: InteroperabilityType.FAIL,
				noSupplierLinkage: InteroperabilityType.FAIL,
			})
		}

		const rating = evaluateInteroperability(interoperabilityFeature)

		return {
			value: {
				id: 'interoperability',
				rating,
				displayName: 'Interoperability',
				shortExplanation: sentence(`{{WALLET_NAME}} has ${rating.toLowerCase()} interoperability.`),
				...interoperabilityFeature, // TODO: Filter fields
			},
			details: paragraph(`{{WALLET_NAME}} interoperability evaluation is ${rating.toLowerCase()}.`),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
			// TODO: Add references
		}
	},
}

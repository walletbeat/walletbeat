import { type Attribute, Rating, Verifiability } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import { InteroperabilityType } from '@/schema/features/self-sovereignty/interoperability'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type InteroperabilityMetadata = {
	interoperability: InteroperabilityType
	noSupplierLinkage: InteroperabilityType
}

export const interoperability: Attribute<InteroperabilityMetadata> = {
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
				v => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The wallet passes one interoperability sub-criteria.'),
				v => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The wallet fails one or both interoperability sub-criteria.'),
				v => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: perVariant => pickWorstRating<InteroperabilityMetadata>(perVariant),
	evaluate: ctx => {
		ctx.setVerifiability(Verifiability.UNKNOWN) // TODO

		if (ctx.features.type !== WalletType.HARDWARE) {
			return exempt(ctx, sentence('Only rated for hardware wallets'), {
				interoperability: InteroperabilityType.FAIL,
				noSupplierLinkage: InteroperabilityType.FAIL,
			})
		}

		const interoperabilityFeature = ctx.features.selfSovereignty.interoperability

		if (interoperabilityFeature === null) {
			return unrated(ctx, {
				interoperability: InteroperabilityType.FAIL,
				noSupplierLinkage: InteroperabilityType.FAIL,
			})
		}

		const ratings = [
			interoperabilityFeature.interoperability,
			interoperabilityFeature.noSupplierLinkage,
		]
		const passCount = ratings.filter(r => r === InteroperabilityType.PASS).length
		const rating = passCount === 2 ? Rating.PASS : passCount === 1 ? Rating.PARTIAL : Rating.FAIL

		return ctx.build({
			outcome: {
				id: 'interoperability',
				rating,
				displayName: 'Interoperability',
				shortExplanation: sentence(`{{WALLET_NAME}} has ${rating.toLowerCase()} interoperability.`),
				metadata: {
					interoperability: interoperabilityFeature.interoperability,
					noSupplierLinkage: interoperabilityFeature.noSupplierLinkage,
				},
			},
			details: paragraph(`{{WALLET_NAME}} interoperability evaluation is ${rating.toLowerCase()}.`),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
		})
	},
}

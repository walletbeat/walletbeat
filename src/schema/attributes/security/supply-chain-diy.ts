import type { ResolvedFeatures } from '@/schema/features'
import { Rating, type Value, type Attribute, type Evaluation } from '@/schema/attributes'
import { pickWorstRating, unrated } from '../common'
import { markdown, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import type { AtLeastOneVariant } from '@/schema/variants'
import {
	SupplyChainDIYType,
	type SupplyChainDIYSupport,
} from '@/schema/features/security/supply-chain-diy'
import { popRefs } from '@/schema/reference'
import { exampleRating } from '@/schema/attributes'
import { Variant } from '@/schema/variants'

const brand = 'attributes.supply_chain_diy'

export type SupplyChainDIYValue = Value & {
	diyNoNda: SupplyChainDIYType
	componentSourcingComplexity: SupplyChainDIYType
	__brand: 'attributes.supply_chain_diy'
}

function evaluateSupplyChainDIY(features: SupplyChainDIYSupport): Rating {
	const ratings = [features.diyNoNda, features.componentSourcingComplexity]
	const passCount = ratings.filter(r => r === SupplyChainDIYType.PASS).length
	if (passCount === 2) {
		return Rating.PASS
	}
	if (passCount === 1) {
		return Rating.PARTIAL
	}
	return Rating.FAIL
}

export const supplyChainDIY: Attribute<SupplyChainDIYValue> = {
	id: 'supply_chain_diy',
	icon: '🛠️',
	displayName: 'Supply Chain (DIY)',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a DIY wallet's supply chain evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve its DIY supply chain?`,
	},
	question: sentence(
		(walletMetadata: WalletMetadata) =>
			`Does ${walletMetadata.displayName} have a transparent and flexible DIY supply chain?`,
	),
	why: markdown(
		`DIY supply chain criteria ensure that users can source components without NDAs and from multiple suppliers.`,
	),
	methodology: markdown(`Evaluated based on NDA-free sourcing and regional sourcing flexibility.`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence(() => 'All sub-criteria are PASS.'),
				(v: SupplyChainDIYValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence(() => 'Some sub-criteria are PASS.'),
				(v: SupplyChainDIYValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence(() => 'Few or no sub-criteria are PASS.'),
				(v: SupplyChainDIYValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<SupplyChainDIYValue>>) => {
		return pickWorstRating<SupplyChainDIYValue>(perVariant)
	},
	evaluate: (features: ResolvedFeatures): Evaluation<SupplyChainDIYValue> => {
		if (features.variant !== Variant.HARDWARE) {
			return unrated(supplyChainDIY, brand, {
				diyNoNda: SupplyChainDIYType.FAIL,
				componentSourcingComplexity: SupplyChainDIYType.FAIL,
			})
		}
		const diyFeature = features.security.supplyChainDIY
		if (!diyFeature) {
			return unrated(supplyChainDIY, brand, {
				diyNoNda: SupplyChainDIYType.FAIL,
				componentSourcingComplexity: SupplyChainDIYType.FAIL,
			})
		}

		const { withoutRefs, refs: extractedRefs } = popRefs<SupplyChainDIYSupport>(diyFeature)
		const rating = evaluateSupplyChainDIY(withoutRefs)

		return {
			value: {
				id: 'supply_chain_diy',
				rating,
				displayName: 'Supply Chain (DIY)',
				shortExplanation: sentence(
					(walletMetadata: WalletMetadata) =>
						`${walletMetadata.displayName} has ${rating.toLowerCase()} DIY supply chain.`,
				),
				...withoutRefs,
				__brand: brand,
			},
			details: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} DIY supply chain evaluation is ${rating.toLowerCase()}.`,
			),
			howToImprove: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} should improve sub-criteria rated PARTIAL or FAIL.`,
			),
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
}

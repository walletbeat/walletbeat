import type { ResolvedFeatures } from '@/schema/features'
import { Rating, type Value, type Attribute, type Evaluation } from '@/schema/attributes'
import { pickWorstRating, unrated, exempt } from '../common'
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
import { HardwareWalletManufactureType } from '@/schema/features/profile'

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
	displayName: 'Supply Chain DIY',
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
		`For Do-It-Yourself (DIY) hardware wallets, a transparent and flexible supply chain allows users to source components independently and verify the hardware they are building.
		Avoiding components that require Non-Disclosure Agreements (NDAs) is crucial for transparency and auditability.`,
	),
	methodology: markdown(
		`Evaluated based on:

- **NDA-Free Sourcing:** Whether all necessary components can be acquired without signing NDAs.

- **Sourcing Complexity:** The ease with which components can be sourced from multiple suppliers across different regions, promoting resilience against single points of failure.
	`,
	),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence(() => 'The hardware wallet passes all DIY supply chain sub-criteria.'),
				(v: SupplyChainDIYValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence(() => 'The hardware wallet passes some DIY supply chain sub-criteria.'),
				(v: SupplyChainDIYValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence(() => 'The hardware wallet fails most or all DIY supply chain sub-criteria.'),
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
				displayName: 'Supply Chain DIY',
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

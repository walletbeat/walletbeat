import {
	type Attribute,
	type Evaluation,
	type ExemptEvaluation,
	Rating,
	type Value,
} from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { HardwareWalletManufactureType } from '@/schema/features/profile'
import {
	type SupplyChainDIYSupport,
	SupplyChainDIYType,
} from '@/schema/features/security/supply-chain-diy'
import { Variant } from '@/schema/variants'
import type { WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type SupplyChainDIYValue = Value & {
	diyNoNda: SupplyChainDIYType
	componentSourcingComplexity: SupplyChainDIYType
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
	id: 'supplyChainDIY',
	icon: '🛠️',
	displayName: 'Supply Chain DIY',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a DIY wallet's supply chain evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve its DIY supply chain?',
		),
	},
	question: sentence('Does {{WALLET_NAME}} have a transparent and flexible DIY supply chain?'),
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
				sentence('The hardware wallet passes all DIY supply chain sub-criteria.'),
				(v: SupplyChainDIYValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The hardware wallet passes some DIY supply chain sub-criteria.'),
				(v: SupplyChainDIYValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The hardware wallet fails most or all DIY supply chain sub-criteria.'),
				(v: SupplyChainDIYValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: pickWorstRating<SupplyChainDIYValue>,
	exempted: (
		features: ResolvedFeatures,
		metadata: WalletMetadata,
	): ExemptEvaluation<SupplyChainDIYValue> | null => {
		if (
			features.variant === Variant.HARDWARE &&
			metadata.hardwareWalletManufactureType !== HardwareWalletManufactureType.DIY
		) {
			return exempt(supplyChainDIY, sentence('Attribute only applies to DIY hardware wallets.'), {
				diyNoNda: SupplyChainDIYType.FAIL,
				componentSourcingComplexity: SupplyChainDIYType.FAIL,
			})
		}

		return null
	},
	evaluate: (features: ResolvedFeatures): Evaluation<SupplyChainDIYValue> => {
		if (features.type !== WalletType.HARDWARE) {
			return exempt(
				supplyChainDIY,
				sentence(
					'This attribute is not applicable for {{WALLET_NAME}} as it is not a hardware wallet.',
				),
				{
					diyNoNda: SupplyChainDIYType.FAIL,
					componentSourcingComplexity: SupplyChainDIYType.FAIL,
				},
			)
		}

		const diyFeature = features.security.supplyChainDIY

		if (diyFeature === null) {
			return unrated(supplyChainDIY, {
				diyNoNda: SupplyChainDIYType.FAIL,
				componentSourcingComplexity: SupplyChainDIYType.FAIL,
			})
		}

		const rating = evaluateSupplyChainDIY(diyFeature)

		return {
			value: {
				id: 'supply_chain_diy',
				rating,
				displayName: 'Supply Chain DIY',
				shortExplanation: sentence(`{{WALLET_NAME}} has ${rating.toLowerCase()} DIY supply chain.`),
				...diyFeature, // TODO: Filter fields
			},
			details: paragraph(`{{WALLET_NAME}} DIY supply chain evaluation is ${rating.toLowerCase()}.`),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
			// TODO: Add references
		}
	},
}

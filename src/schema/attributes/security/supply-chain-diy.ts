import { type Attribute, type ExemptEvaluation, Rating, Verifiability } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import { HardwareWalletManufactureType } from '@/schema/features/profile'
import { SupplyChainDIYType } from '@/schema/features/security/supply-chain-diy'
import { Variant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type SupplyChainDIYMetadata = {
	diyNoNda: SupplyChainDIYType
	componentSourcingComplexity: SupplyChainDIYType
}

export const supplyChainDIY: Attribute<SupplyChainDIYMetadata> = {
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
				outcome => outcome.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The hardware wallet passes some DIY supply chain sub-criteria.'),
				outcome => outcome.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The hardware wallet fails most or all DIY supply chain sub-criteria.'),
				outcome => outcome.rating === Rating.FAIL,
			),
		],
	},
	aggregate: pickWorstRating<SupplyChainDIYMetadata>,
	exempted: (ctx, metadata): ExemptEvaluation<SupplyChainDIYMetadata> | null => {
		if (
			ctx.features.variant === Variant.HARDWARE &&
			metadata.hardwareWalletManufactureType !== HardwareWalletManufactureType.DIY
		) {
			return exempt(ctx, sentence('Attribute only applies to DIY hardware wallets.'), {
				diyNoNda: SupplyChainDIYType.FAIL,
				componentSourcingComplexity: SupplyChainDIYType.FAIL,
			})
		}

		return null
	},
	evaluate: ctx => {
		ctx.setVerifiability(Verifiability.SELF_EVIDENT) // If you build it, you source your own parts.

		if (ctx.features.type !== WalletType.HARDWARE) {
			return exempt(
				ctx,
				sentence(
					'This attribute is not applicable for {{WALLET_NAME}} as it is not a hardware wallet.',
				),
				{
					diyNoNda: SupplyChainDIYType.FAIL,
					componentSourcingComplexity: SupplyChainDIYType.FAIL,
				},
			)
		}

		const diyFeature = ctx.features.security.supplyChainDIY

		if (diyFeature === null) {
			return unrated(ctx, {
				diyNoNda: SupplyChainDIYType.FAIL,
				componentSourcingComplexity: SupplyChainDIYType.FAIL,
			})
		}

		const ratings = [diyFeature.diyNoNda, diyFeature.componentSourcingComplexity]
		const passCount = ratings.filter(r => r === SupplyChainDIYType.PASS).length
		const rating = passCount === 2 ? Rating.PASS : passCount === 1 ? Rating.PARTIAL : Rating.FAIL

		return ctx.build({
			outcome: {
				id: 'supply_chain_diy',
				rating,
				displayName: 'Supply Chain DIY',
				shortExplanation: sentence(`{{WALLET_NAME}} has ${rating.toLowerCase()} DIY supply chain.`),
				metadata: {
					diyNoNda: diyFeature.diyNoNda,
					componentSourcingComplexity: diyFeature.componentSourcingComplexity,
				},
			},
			details: paragraph(`{{WALLET_NAME}} DIY supply chain evaluation is ${rating.toLowerCase()}.`),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
		})
	},
}

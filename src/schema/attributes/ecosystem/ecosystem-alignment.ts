import type { ResolvedFeatures } from '@/schema/features'
import { Rating, type Value, type Attribute, type Evaluation } from '@/schema/attributes'
import { pickWorstRating, unrated } from '../common'
import { markdown, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import type { AtLeastOneVariant } from '@/schema/variants'
import {
	EcosystemAlignmentType,
	type EcosystemAlignmentSupport,
} from '@/schema/features/ecosystem/ecosystem-alignment'
import { popRefs } from '@/schema/reference'
import { Variant } from '@/schema/variants'

const brand = 'attributes.ecosystem_alignment'

export type EcosystemAlignmentValue = Value & {
	eip1559Support: EcosystemAlignmentType
	eip7702Support: EcosystemAlignmentType
	eip4337Support: EcosystemAlignmentType
	__brand: 'attributes.ecosystem_alignment'
}

function evaluateEcosystemAlignment(features: EcosystemAlignmentSupport): Rating {
	const ratings = [features.eip1559Support, features.eip7702Support, features.eip4337Support]
	const passCount = ratings.filter(r => r === EcosystemAlignmentType.PASS).length
	if (passCount === 3) {
		return Rating.PASS
	}
	if (passCount >= 1) {
		return Rating.PARTIAL
	}
	return Rating.FAIL
}

export const ecosystemAlignment: Attribute<EcosystemAlignmentValue> = {
	id: 'ecosystem_alignment',
	icon: '🌐',
	displayName: 'Ecosystem Alignment',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's ecosystem alignment evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve its ecosystem alignment?`,
	},
	question: sentence(
		(walletMetadata: WalletMetadata) =>
			`Does ${walletMetadata.displayName} align well with the ecosystem standards?`,
	),
	why: markdown(`Ecosystem alignment ensures compatibility with important Ethereum standards.`),
	methodology: markdown(`Evaluated based on support for EIP-1559, EIP-7702, and EIP-4337.`),
	ratingScale: {
		display: 'pass-partial-fail',
		exhaustive: true,
		pass: ['All sub-criteria are PASS'],
		partial: ['At least one sub-criteria is PASS'],
		fail: ['No sub-criteria are PASS'],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<EcosystemAlignmentValue>>) => {
		return pickWorstRating<EcosystemAlignmentValue>(perVariant)
	},
	evaluate: (features: ResolvedFeatures): Evaluation<EcosystemAlignmentValue> => {
		if (features.variant !== Variant.HARDWARE) {
			return unrated(ecosystemAlignment, brand, {
				eip1559Support: EcosystemAlignmentType.FAIL,
				eip7702Support: EcosystemAlignmentType.FAIL,
				eip4337Support: EcosystemAlignmentType.FAIL,
			})
		}
		const alignmentFeature = features.ecosystem.ecosystemAlignment
		if (!alignmentFeature) {
			return unrated(ecosystemAlignment, brand, {
				eip1559Support: EcosystemAlignmentType.FAIL,
				eip7702Support: EcosystemAlignmentType.FAIL,
				eip4337Support: EcosystemAlignmentType.FAIL,
			})
		}

		const { withoutRefs, refs: extractedRefs } = popRefs<EcosystemAlignmentSupport>(
			alignmentFeature,
		)
		const rating = evaluateEcosystemAlignment(withoutRefs)

		return {
			value: {
				id: 'ecosystem_alignment',
				rating,
				displayName: 'Ecosystem Alignment',
				shortExplanation: sentence(
					(walletMetadata: WalletMetadata) =>
						`${walletMetadata.displayName} has ${rating.toLowerCase()} ecosystem alignment.`,
				),
				...withoutRefs,
				__brand: brand,
			},
			details: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} ecosystem alignment evaluation is ${rating.toLowerCase()}.`,
			),
			howToImprove: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} should improve support for EIPs rated PARTIAL or FAIL.`,
			),
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
}

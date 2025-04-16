import type { ResolvedFeatures } from '@/schema/features'
import { Rating, type Value, type Attribute, type Evaluation } from '@/schema/attributes'
import { pickWorstRating, unrated } from '../common'
import { markdown, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import type { AtLeastOneVariant } from '@/schema/variants'
import {
	SupplyChainFactoryType,
	type SupplyChainFactorySupport,
} from '@/schema/features/security/supply-chain-factory'
import { popRefs } from '@/schema/reference'
import { exampleRating } from '@/schema/attributes'
import { Variant } from '@/schema/variants'

const brand = 'attributes.supply_chain_factory'

export type SupplyChainFactoryValue = Value & {
	factoryOpsecDocs: SupplyChainFactoryType
	factoryOpsecAudit: SupplyChainFactoryType
	tamperEvidence: SupplyChainFactoryType
	hardwareVerification: SupplyChainFactoryType
	tamperResistance: SupplyChainFactoryType
	genuineCheck: SupplyChainFactoryType
	__brand: 'attributes.supply_chain_factory'
}

function evaluateSupplyChainFactory(features: SupplyChainFactorySupport): Rating {
	const ratings = [
		features.factoryOpsecDocs,
		features.factoryOpsecAudit,
		features.tamperEvidence,
		features.hardwareVerification,
		features.tamperResistance,
		features.genuineCheck,
	]
	const passCount = ratings.filter(r => r === SupplyChainFactoryType.PASS).length
	if (passCount >= 5) {
		return Rating.PASS
	}
	if (passCount >= 3) {
		return Rating.PARTIAL
	}
	return Rating.FAIL
}

export const supplyChainFactory: Attribute<SupplyChainFactoryValue> = {
	id: 'supply_chain_factory',
	icon: '🏭',
	displayName: 'Supply Chain (Factory)',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a factory wallet's supply chain evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve its factory supply chain?`,
	},
	question: sentence(
		(walletMetadata: WalletMetadata) =>
			`Does ${walletMetadata.displayName} have a secure and transparent factory supply chain?`,
	),
	why: markdown(
		`Factory supply chain criteria ensure that the device is manufactured, packaged, and delivered securely and transparently.`,
	),
	methodology: markdown(
		`Evaluated based on OPSEC documentation, audits, tamper evidence, hardware verification, tamper resistance, and genuine check.`,
	),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence(() => 'All sub-criteria are PASS.'),
				(v: SupplyChainFactoryValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence(() => 'Some sub-criteria are PASS.'),
				(v: SupplyChainFactoryValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence(() => 'Few or no sub-criteria are PASS.'),
				(v: SupplyChainFactoryValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<SupplyChainFactoryValue>>) => {
		return pickWorstRating<SupplyChainFactoryValue>(perVariant)
	},
	evaluate: (features: ResolvedFeatures): Evaluation<SupplyChainFactoryValue> => {
		if (!features.supplyChainFactory) {
			return unrated(supplyChainFactory, brand, {
				factoryOpsecDocs: SupplyChainFactoryType.FAIL,
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				tamperEvidence: SupplyChainFactoryType.FAIL,
				hardwareVerification: SupplyChainFactoryType.FAIL,
				tamperResistance: SupplyChainFactoryType.FAIL,
				genuineCheck: SupplyChainFactoryType.FAIL,
				__brand: brand,
			})
		}

		const { withoutRefs, refs: extractedRefs } = popRefs<SupplyChainFactorySupport>(
			features.supplyChainFactory,
		)
		const rating = evaluateSupplyChainFactory(withoutRefs)

		return {
			value: {
				id: 'supply_chain_factory',
				rating,
				displayName: 'Supply Chain (Factory)',
				shortExplanation: sentence(
					(walletMetadata: WalletMetadata) =>
						`${walletMetadata.displayName} has ${rating.toLowerCase()} factory supply chain.`,
				),
				...withoutRefs,
				__brand: brand,
			},
			details: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} factory supply chain evaluation is ${rating.toLowerCase()}.`,
			),
			howToImprove: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} should improve sub-criteria rated PARTIAL or FAIL.`,
			),
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
}

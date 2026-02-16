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
	type SupplyChainFactorySupport,
	SupplyChainFactoryType,
} from '@/schema/features/security/supply-chain-factory'
import { Variant } from '@/schema/variants'
import type { WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type SupplyChainFactoryValue = Value & {
	factoryOpsecDocs: SupplyChainFactoryType
	factoryOpsecAudit: SupplyChainFactoryType
	tamperEvidence: SupplyChainFactoryType
	hardwareVerification: SupplyChainFactoryType
	tamperResistance: SupplyChainFactoryType
	genuineCheck: SupplyChainFactoryType
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
	id: 'supplyChainFactory',
	icon: '🏭',
	displayName: 'Supply Chain Factory',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a factory wallet's supply chain evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve its factory supply chain?',
		),
	},
	question: sentence('Does {{WALLET_NAME}} have a secure and transparent factory supply chain?'),
	why: markdown(
		`Ensuring the security and transparency of the factory supply chain is vital to prevent tampering or compromise during manufacturing, packaging, and delivery.
		Users need confidence that the device they receive is genuine and hasn't been maliciously altered.`,
	),
	methodology: markdown(
		`Evaluated based on:

- **Factory Operational Security:** Availability and verification (audits, certifications) of documentation detailing security practices during manufacturing.

- **Tamper Evidence:** Effectiveness of physical seals or mechanisms to detect package tampering.

- **Hardware Verification:** Ease of verifying the received hardware against a Bill of Materials (BOM) or reference design.

- **Tamper Resistance:** Physical device protections (e.g., security mesh) against unauthorized modification.

- **Genuine Check:** Availability and reliability of software/hardware mechanisms to verify device authenticity before and during use.

- **Anti-Kleptography:** Measures to prevent cryptographic keys or randomness from being subtly leaked during operations.
	`,
	),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence('The hardware wallet passes all factory supply chain sub-criteria.'),
				(v: SupplyChainFactoryValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The hardware wallet passes some factory supply chain sub-criteria.'),
				(v: SupplyChainFactoryValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The hardware wallet fails most or all factory supply chain sub-criteria.'),
				(v: SupplyChainFactoryValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: pickWorstRating<SupplyChainFactoryValue>,
	exempted: (
		features: ResolvedFeatures,
		metadata: WalletMetadata,
	): ExemptEvaluation<SupplyChainFactoryValue> | null => {
		if (
			features.variant === Variant.HARDWARE &&
			metadata.hardwareWalletManufactureType === HardwareWalletManufactureType.DIY
		) {
			return exempt(
				supplyChainFactory,
				sentence('Attribute only applies to factory-made hardware wallets.'),
				{
					factoryOpsecDocs: SupplyChainFactoryType.FAIL,
					factoryOpsecAudit: SupplyChainFactoryType.FAIL,
					tamperEvidence: SupplyChainFactoryType.FAIL,
					hardwareVerification: SupplyChainFactoryType.FAIL,
					tamperResistance: SupplyChainFactoryType.FAIL,
					genuineCheck: SupplyChainFactoryType.FAIL,
				},
			)
		}

		return null
	},
	evaluate: (features: ResolvedFeatures): Evaluation<SupplyChainFactoryValue> => {
		if (features.type !== WalletType.HARDWARE) {
			return exempt(
				supplyChainFactory,
				sentence(
					'This attribute is not applicable for {{WALLET_NAME}} as it is not a hardware wallet.',
				),
				{
					factoryOpsecDocs: SupplyChainFactoryType.FAIL,
					factoryOpsecAudit: SupplyChainFactoryType.FAIL,
					tamperEvidence: SupplyChainFactoryType.FAIL,
					hardwareVerification: SupplyChainFactoryType.FAIL,
					tamperResistance: SupplyChainFactoryType.FAIL,
					genuineCheck: SupplyChainFactoryType.FAIL,
				},
			)
		}

		const factoryFeature = features.security.supplyChainFactory

		if (factoryFeature === null) {
			return unrated(supplyChainFactory, {
				factoryOpsecDocs: SupplyChainFactoryType.FAIL,
				factoryOpsecAudit: SupplyChainFactoryType.FAIL,
				tamperEvidence: SupplyChainFactoryType.FAIL,
				hardwareVerification: SupplyChainFactoryType.FAIL,
				tamperResistance: SupplyChainFactoryType.FAIL,
				genuineCheck: SupplyChainFactoryType.FAIL,
			})
		}

		const rating = evaluateSupplyChainFactory(factoryFeature)

		return {
			value: {
				id: 'Supply Chain Factory',
				rating,
				displayName: 'Supply Chain Factory',
				shortExplanation: sentence(
					`{{WALLET_NAME}} has ${rating.toLowerCase()} factory supply chain.`,
				),
				...factoryFeature, // TODO: Filter fields
			},
			details: paragraph(
				`{{WALLET_NAME}} factory supply chain evaluation is ${rating.toLowerCase()}.`,
			),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
			// TODO: Add references
		}
	},
}

import type { ResolvedFeatures } from '@/schema/features'
import { Rating, type Value, type Attribute, type Evaluation } from '@/schema/attributes'
import { pickWorstRating, unrated } from '../common'
import { markdown, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import type { AtLeastOneVariant } from '@/schema/variants'
import {
	KeysHandlingType,
	type KeysHandlingSupport,
} from '@/schema/features/security/keys-handling'
import { popRefs } from '@/schema/reference'
import { exampleRating } from '@/schema/attributes'
import { Variant } from '@/schema/variants'

const brand = 'attributes.keys_handling'

export type KeysHandlingValue = Value & {
	masterSecretGeneration: KeysHandlingType
	proprietaryKeyMechanisms: KeysHandlingType
	keyTransmission: KeysHandlingType
	physicalAttackResistance: KeysHandlingType
	__brand: 'attributes.keys_handling'
}

function evaluateKeysHandling(features: KeysHandlingSupport): Rating {
	const ratings = [
		features.masterSecretGeneration,
		features.proprietaryKeyMechanisms,
		features.keyTransmission,
		features.physicalAttackResistance,
	]
	const passCount = ratings.filter(r => r === KeysHandlingType.PASS).length
	if (passCount >= 3) {
		return Rating.PASS
	}
	if (passCount >= 1) {
		return Rating.PARTIAL
	}
	return Rating.FAIL
}

export const keysHandling: Attribute<KeysHandlingValue> = {
	id: 'keys_handling',
	icon: '🔑',
	displayName: 'Keys Handling',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's key handling evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve its key handling?`,
	},
	question: sentence(
		(walletMetadata: WalletMetadata) =>
			`Does ${walletMetadata.displayName} securely generate, protect, and handle keys?`,
	),
	why: markdown(`
		Secure key handling is fundamental to the security of user funds. This includes how the master secret (seed) is generated, stored, and used.
		The device must protect keys from extraction via software or physical attacks (both passive side-channels and active fault injection).
		It should also ensure that the manufacturer cannot access or recover user keys.
	`),
	methodology: markdown(`
		Evaluated based on:  
		- **Master Secret Generation:** Use of interoperable, well-documented standards for seed generation.  
		- **Key Secrecy:** Resistance against key extraction or recovery by the provider or third parties. Ensuring keys are not transmitted insecurely.  
		- **Proprietary Mechanisms:** Security implications of any non-standard key handling or backup procedures.  
		- **Physical Attack Resistance:** Protection against passive (side-channel analysis) and active (glitching) physical attacks.  
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence(() => 'The hardware wallet passes most keys handling sub-criteria.'),
				(v: KeysHandlingValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence(() => 'The hardware wallet passes some keys handling sub-criteria.'),
				(v: KeysHandlingValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence(() => 'The hardware wallet fails most or all keys handling sub-criteria.'),
				(v: KeysHandlingValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<KeysHandlingValue>>) => {
		return pickWorstRating<KeysHandlingValue>(perVariant)
	},
	evaluate: (features: ResolvedFeatures): Evaluation<KeysHandlingValue> => {
		if (features.variant !== Variant.HARDWARE) {
			return unrated(keysHandling, brand, {
				masterSecretGeneration: KeysHandlingType.FAIL,
				proprietaryKeyMechanisms: KeysHandlingType.FAIL,
				keyTransmission: KeysHandlingType.FAIL,
				physicalAttackResistance: KeysHandlingType.FAIL,
			})
		}
		const keysHandlingFeature = features.security.keysHandling
		if (!keysHandlingFeature) {
			return unrated(keysHandling, brand, {
				masterSecretGeneration: KeysHandlingType.FAIL,
				proprietaryKeyMechanisms: KeysHandlingType.FAIL,
				keyTransmission: KeysHandlingType.FAIL,
				physicalAttackResistance: KeysHandlingType.FAIL,
			})
		}

		const { withoutRefs, refs: extractedRefs } = popRefs<KeysHandlingSupport>(keysHandlingFeature)
		const rating = evaluateKeysHandling(withoutRefs)

		return {
			value: {
				id: 'keys_handling',
				rating,
				displayName: 'Keys Handling',
				shortExplanation: sentence(
					(walletMetadata: WalletMetadata) =>
						`${walletMetadata.displayName} has ${rating.toLowerCase()} key handling.`,
				),
				...withoutRefs,
				__brand: brand,
			},
			details: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} key handling evaluation is ${rating.toLowerCase()}.`,
			),
			howToImprove: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} should improve sub-criteria rated PARTIAL or FAIL.`,
			),
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
}

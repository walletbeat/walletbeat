import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import {
	type HardwarePrivacySupport,
	HardwarePrivacyType,
} from '@/schema/features/privacy/hardware-privacy'
import { popRefs } from '@/schema/reference'
import type { AtLeastOneVariant } from '@/schema/variants'
import { Variant } from '@/schema/variants'
import type { WalletMetadata } from '@/schema/wallet'
import { markdown, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.hardware_privacy'

export type HardwarePrivacyValue = Value & {
	phoningHome: HardwarePrivacyType
	inspectableRemoteCalls: HardwarePrivacyType
	wirelessPrivacy: HardwarePrivacyType
	__brand: 'attributes.hardware_privacy'
}

function evaluateHardwarePrivacy(features: HardwarePrivacySupport): Rating {
	const ratings = [features.phoningHome, features.inspectableRemoteCalls, features.wirelessPrivacy]
	const passCount = ratings.filter(r => r === HardwarePrivacyType.PASS).length
	if (passCount === 3) {
		return Rating.PASS
	}
	if (passCount >= 1) {
		return Rating.PARTIAL
	}
	return Rating.FAIL
}

export const hardwarePrivacy: Attribute<HardwarePrivacyValue> = {
	id: 'hardware_privacy',
	icon: '🔒',
	displayName: 'Hardware Privacy',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's hardware privacy evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve its hardware privacy?`,
	},
	question: sentence(
		(walletMetadata: WalletMetadata) =>
			`Does ${walletMetadata.displayName} protect user privacy at the hardware level?`,
	),
	why: markdown(
		`Hardware privacy ensures that the device itself does not leak sensitive user information (like IP address, public keys, or usage patterns) during setup, regular operation, or updates.
		This is distinct from the privacy features of the transactions created *using* the wallet.`,
	),
	methodology: markdown(
		`Evaluated based on:

- **Phoning Home:** Whether the device contacts manufacturer servers during setup, operation, or updates, and if these connections are necessary.

- **Inspectability:** Ability to monitor and understand data exchanged if the device does phone home.

- **Wireless Privacy:** Protection of data transmitted over wireless connections (e.g., BLE, WiFi) against local attackers.
	`,
	),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence(
					() =>
						'The hardware wallet passes all hardware privacy sub-criteria: No phoning home, inspectable remote calls, and encrypted wireless communication.',
				),
				(v: HardwarePrivacyValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence(() => 'The hardware wallet passes some hardware privacy sub-criteria.'),
				(v: HardwarePrivacyValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence(
					() =>
						'The hardware wallet fails all hardware privacy sub-criteria: Device leaks privacy in all aspects.',
				),
				(v: HardwarePrivacyValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<HardwarePrivacyValue>>) =>
		pickWorstRating<HardwarePrivacyValue>(perVariant),
	evaluate: (features: ResolvedFeatures): Evaluation<HardwarePrivacyValue> => {
		if (features.variant !== Variant.HARDWARE) {
			return unrated(hardwarePrivacy, brand, {
				phoningHome: HardwarePrivacyType.FAIL,
				inspectableRemoteCalls: HardwarePrivacyType.FAIL,
				wirelessPrivacy: HardwarePrivacyType.FAIL,
			})
		}
		const hwPrivacy = features.privacy.hardwarePrivacy
		if (hwPrivacy === null) {
			return unrated(hardwarePrivacy, brand, {
				phoningHome: HardwarePrivacyType.FAIL,
				inspectableRemoteCalls: HardwarePrivacyType.FAIL,
				wirelessPrivacy: HardwarePrivacyType.FAIL,
			})
		}

		const { withoutRefs, refs: extractedRefs } = popRefs<HardwarePrivacySupport>(hwPrivacy)
		const rating = evaluateHardwarePrivacy(withoutRefs)

		return {
			value: {
				id: 'hardware_privacy',
				rating,
				displayName: 'Hardware Privacy',
				shortExplanation: sentence(
					(walletMetadata: WalletMetadata) =>
						`${walletMetadata.displayName} has ${rating.toLowerCase()} hardware privacy.`,
				),
				...withoutRefs,
				__brand: brand,
			},
			details: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} hardware privacy evaluation is ${rating.toLowerCase()}.`,
			),
			howToImprove: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} should improve sub-criteria rated PARTIAL or FAIL.`,
			),
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
}

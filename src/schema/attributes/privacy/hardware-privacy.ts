import { type Attribute, type Evaluation, EvaluationContext, Rating } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import {
	type HardwarePrivacySupport,
	HardwarePrivacyType,
} from '@/schema/features/privacy/hardware-privacy'
import type { AtLeastOneVariant } from '@/schema/variants'
import { verifiabilityRequiresSourceCodeAccess } from '@/schema/verifiability'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type HardwarePrivacyOutcomeMetadata = {
	phoningHome: HardwarePrivacyType
	inspectableRemoteCalls: HardwarePrivacyType
	wirelessPrivacy: HardwarePrivacyType
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

type _EvaluationContext = EvaluationContext<HardwarePrivacyOutcomeMetadata>
type _Evaluation = Evaluation<HardwarePrivacyOutcomeMetadata>

export const hardwarePrivacy: Attribute<HardwarePrivacyOutcomeMetadata> = {
	id: 'hardwarePrivacy',
	icon: '🔒',
	displayName: 'Hardware Privacy',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's hardware privacy evaluated?",
		whatCanWalletDoAboutIts: sentence(
			'What can {{WALLET_NAME}} do to improve its hardware privacy?',
		),
	},
	question: sentence('Does {{WALLET_NAME}} protect user privacy at the hardware level?'),
	why: markdown(
		'Hardware privacy ensures that the device itself does not leak sensitive user information (like IP address, public keys, or usage patterns) during setup, regular operation, or updates.\nThis is distinct from the privacy features of the transactions created *using* the wallet.',
	),
	methodology: markdown(`
		Evaluated based on:

		- **Phoning Home:** Whether the device contacts manufacturer servers during setup, operation, or updates, and if these connections are necessary.

		- **Inspectability:** Ability to monitor and understand data exchanged if the device does phone home.

		- **Wireless Privacy:** Protection of data transmitted over wireless connections (e.g., BLE, WiFi) against local attackers.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence(
					'The hardware wallet passes all hardware privacy sub-criteria: No phoning home, inspectable remote calls, and encrypted wireless communication.',
				),
				v => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The hardware wallet passes some hardware privacy sub-criteria.'),
				v => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence(
					'The hardware wallet fails all hardware privacy sub-criteria: Device leaks privacy in all aspects.',
				),
				v => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<_Evaluation>) =>
		pickWorstRating<HardwarePrivacyOutcomeMetadata>(perVariant),
	evaluate: (ctx: _EvaluationContext): _Evaluation => {
		// Even with network capture data, we cannot guarantee exhaustiveness without source code access.
		ctx.setVerifiability(verifiabilityRequiresSourceCodeAccess({ coreOnlyIsSufficient: false }))

		if (ctx.features.type !== WalletType.HARDWARE) {
			return exempt(ctx, sentence('Only rated for hardware wallets'), {
				phoningHome: HardwarePrivacyType.FAIL,
				inspectableRemoteCalls: HardwarePrivacyType.FAIL,
				wirelessPrivacy: HardwarePrivacyType.FAIL,
			})
		}

		const hwPrivacy = ctx.features.privacy.hardwarePrivacy

		if (hwPrivacy === null) {
			return unrated(ctx, {
				phoningHome: HardwarePrivacyType.FAIL,
				inspectableRemoteCalls: HardwarePrivacyType.FAIL,
				wirelessPrivacy: HardwarePrivacyType.FAIL,
			})
		}

		const rating = evaluateHardwarePrivacy(hwPrivacy)

		return ctx.build({
			value: {
				id: 'hardware_privacy',
				rating,
				displayName: 'Hardware Privacy',
				shortExplanation: sentence(`{{WALLET_NAME}} has ${rating.toLowerCase()} hardware privacy.`),
				...hwPrivacy, // TODO: Filter fields
			},
			details: paragraph(`{{WALLET_NAME}} hardware privacy evaluation is ${rating.toLowerCase()}.`),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
		})
	},
}

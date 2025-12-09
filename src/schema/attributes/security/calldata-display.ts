import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { type CallDataDisplaySupport } from '@/schema/features/security/calldata-display'
import type { AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.calldata-display'

export type CalldataDisplayValue = Value & {
	__brand: 'attributes.security.calldata-display'
}

function evaluateCalldataDisplay(features: CallDataDisplaySupport): Rating {
	const ratings = [
		features.rawHex,
		features.copyHexToClipboard,
		features.formatted,
	]

	// If any rating is null (unreviewed), return UNRATED
	if (ratings.some(r => r === null)) {
		return Rating.UNRATED
	}

	const passCount = ratings.filter(r => r).length

	if (passCount >= 3) {
		return Rating.PASS
	}

	if (passCount >= 1) {
		return Rating.PARTIAL
	}

	return Rating.FAIL
}

export const callDataDisplay: Attribute<CalldataDisplayValue> = {
	id: 'calldata-display',
	icon: '💾',
	displayName: 'Calldata Display',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's calldata display evaluated?",
		whatCanWalletDoAboutIts: sentence('What can {{WALLET_NAME}} do to improve its calldata display?'),
	},
	question: sentence('Does {{WALLET_NAME}} have secure and open calldata display?'),
	why: markdown(`
		Firmware security and openness are critical for user trust, resistance against attacks, and ensuring the device can be safely upgraded.
		Users need assurance that the code running on their device is authentic and hasn't been tampered with.
		Openness allows for independent verification and community audit.
	`),
	methodology: markdown(`
		Evaluated based on several factors:
		- **Update Security:** Protection against silent/forced updates, authentication requirements for updates, and possibility of downgrades.
		- **Source Code Openness:** Availability and licensing of firmware source code (full or partial), and isolation between open/closed parts.
		- **Build Verifiability:** Ability to reproduce firmware builds from source and compare against official binaries (reproducible builds).
		- **Runtime Integrity:** Mechanisms to check the authenticity of the code running on the device.
		- **Custom Firmware:** Support for users loading custom firmware and its impact on device security/integrity.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence('The hardware wallet passes most calldata display sub-criteria.'),
				(v: CalldataDisplayValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The hardware wallet passes some calldata display sub-criteria.'),
				(v: CalldataDisplayValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The hardware wallet fails most or all calldata display sub-criteria.'),
				(v: CalldataDisplayValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<CalldataDisplayValue>>) =>
		pickWorstRating<CalldataDisplayValue>(perVariant),
	evaluate: (features: ResolvedFeatures): Evaluation<CalldataDisplayValue> => {
		if (features.type !== WalletType.HARDWARE) {
			return exempt(callDataDisplay, sentence('Call data display is only rated for hardware wallets'), brand, {
				rawHex: CallDataDisplayType.FAIL,
				copyHexToClipboard: CallDataDisplayType.FAIL,
				formatted: CallDataDisplayType.FAIL,
			})
		}

		const callDataDisplayFeature = features.security.callDataDisplay

		if (callDataDisplayFeature === null) {
			return unrated(callDataDisplay, brand, {
				rawHex: false,
				copyHexToClipboard: false,
				formatted: false,
			})
		}
		
		const rating = evaluateCalldataDisplay(callDataDisplayFeature)

		if (rating === Rating.UNRATED) {
			return unrated(callDataDisplay, brand, {
				rawHex: false,
				copyHexToClipboard: false,
				formatted: false,
			})
		}

		return {
			value: {
				id: 'call-data-display',
				rating,
				displayName: 'Call Data Display',
				shortExplanation: sentence(`{{WALLET_NAME}} has ${rating.toLowerCase()} call data display.`),
				...callDataDisplayFeature, // TODO: Filter fields.
				__brand: brand,
			},
			details: paragraph(`{{WALLET_NAME}} call data display evaluation is ${rating.toLowerCase()}.`),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
			// TODO: References.
		}
	},
}

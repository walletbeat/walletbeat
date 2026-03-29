import { type Attribute, type ExplicitRating, Rating, Verifiability } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import { type FirmwareSupport, FirmwareType } from '@/schema/features/security/firmware'
import { verifiabilityRequiresAtLeastOneReference } from '@/schema/verifiability'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type FirmwareMetadata = {
	silentUpdateProtection: FirmwareType | null
	firmwareOpenSource: FirmwareType | null
	reproducibleBuilds: FirmwareType | null
	customFirmware: FirmwareType | null
}

function evaluateFirmware(features: FirmwareSupport): ExplicitRating | Rating.UNRATED {
	const ratings = [
		features.silentUpdateProtection,
		features.firmwareOpenSource,
		features.reproducibleBuilds,
		features.customFirmware,
	]

	// If any rating is null (unreviewed), return UNRATED
	if (ratings.some(r => r === null)) {
		return Rating.UNRATED
	}

	const passCount = ratings.filter(r => r === FirmwareType.PASS).length

	if (passCount >= 3) {
		return Rating.PASS
	}

	if (passCount >= 1) {
		return Rating.PARTIAL
	}

	return Rating.FAIL
}

export const firmware: Attribute<FirmwareMetadata> = {
	id: 'firmware',
	icon: '💾',
	displayName: 'Firmware',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's firmware evaluated?",
		whatCanWalletDoAboutIts: sentence('What can {{WALLET_NAME}} do to improve its firmware?'),
	},
	question: sentence('Does {{WALLET_NAME}} have secure and open firmware?'),
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
				sentence('The hardware wallet passes most firmware sub-criteria.'),
				outcome => outcome.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The hardware wallet passes some firmware sub-criteria.'),
				outcome => outcome.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The hardware wallet fails most or all firmware sub-criteria.'),
				outcome => outcome.rating === Rating.FAIL,
			),
		],
	},
	aggregate: pickWorstRating,
	evaluate: ctx => {
		ctx.setVerifiability(
			verifiabilityRequiresAtLeastOneReference({
				referenceCountsAs: Verifiability.VERIFIABLE,
			}),
		)

		if (ctx.features.type !== WalletType.HARDWARE) {
			return exempt(ctx, sentence('Firmware is only rated for hardware wallets'), {
				silentUpdateProtection: FirmwareType.FAIL,
				firmwareOpenSource: FirmwareType.FAIL,
				reproducibleBuilds: FirmwareType.FAIL,
				customFirmware: FirmwareType.FAIL,
			})
		}

		const firmwareFeature = ctx.features.security.firmware

		if (firmwareFeature === null) {
			return unrated(ctx, {
				silentUpdateProtection: FirmwareType.FAIL,
				firmwareOpenSource: FirmwareType.FAIL,
				reproducibleBuilds: FirmwareType.FAIL,
				customFirmware: FirmwareType.FAIL,
			})
		}

		const rating = evaluateFirmware(firmwareFeature)

		if (rating === Rating.UNRATED) {
			return unrated(ctx, {
				silentUpdateProtection: FirmwareType.FAIL,
				firmwareOpenSource: FirmwareType.FAIL,
				reproducibleBuilds: FirmwareType.FAIL,
				customFirmware: FirmwareType.FAIL,
			})
		}

		return ctx.build({
			outcome: {
				id: 'firmware',
				rating,
				displayName: 'Firmware',
				shortExplanation: sentence(`{{WALLET_NAME}} has ${rating.toLowerCase()} firmware.`),
				metadata: {
					silentUpdateProtection: firmwareFeature.silentUpdateProtection,
					firmwareOpenSource: firmwareFeature.firmwareOpenSource,
					reproducibleBuilds: firmwareFeature.reproducibleBuilds,
					customFirmware: firmwareFeature.customFirmware,
				},
			},
			details: paragraph(`{{WALLET_NAME}} firmware evaluation is ${rating.toLowerCase()}.`),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
			// TODO: References.
		})
	},
}

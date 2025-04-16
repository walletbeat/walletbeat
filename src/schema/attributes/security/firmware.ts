import type { ResolvedFeatures } from '@/schema/features'
import { Rating, type Value, type Attribute, type Evaluation } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import { pickWorstRating, unrated } from '../common'
import { markdown, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import type { AtLeastOneVariant } from '@/schema/variants'
import { FirmwareType, type FirmwareSupport } from '@/schema/features/security/firmware'
import { popRefs } from '@/schema/reference'
import { Variant } from '@/schema/variants'

const brand = 'attributes.firmware'

export type FirmwareValue = Value & {
	silentUpdateProtection: FirmwareType
	firmwareOpenSource: FirmwareType
	reproducibleBuilds: FirmwareType
	customFirmware: FirmwareType
	__brand: 'attributes.firmware'
}

function evaluateFirmware(features: FirmwareSupport): Rating {
	const ratings = [
		features.silentUpdateProtection,
		features.firmwareOpenSource,
		features.reproducibleBuilds,
		features.customFirmware,
	]
	const passCount = ratings.filter(r => r === FirmwareType.PASS).length
	if (passCount >= 3) {
		return Rating.PASS
	}
	if (passCount >= 1) {
		return Rating.PARTIAL
	}
	return Rating.FAIL
}

export const firmware: Attribute<FirmwareValue> = {
	id: 'firmware',
	icon: '💾',
	displayName: 'Firmware',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's firmware evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve its firmware?`,
	},
	question: sentence(
		(walletMetadata: WalletMetadata) =>
			`Does ${walletMetadata.displayName} have secure and open firmware?`,
	),
	why: markdown(`Firmware security and openness are critical for trust and upgradability.`),
	methodology: markdown(
		`Evaluated based on silent update protection, open source status, reproducible builds, and custom firmware support.`,
	),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence(() => 'The hardware wallet passes most firmware sub-criteria.'),
				(v: FirmwareValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence(() => 'The hardware wallet passes some firmware sub-criteria.'),
				(v: FirmwareValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence(() => 'The hardware wallet fails most or all firmware sub-criteria.'),
				(v: FirmwareValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<FirmwareValue>>) => {
		return pickWorstRating<FirmwareValue>(perVariant)
	},
	evaluate: (features: ResolvedFeatures): Evaluation<FirmwareValue> => {
		if (features.variant !== Variant.HARDWARE) {
			return unrated(firmware, brand, {
				silentUpdateProtection: FirmwareType.FAIL,
				firmwareOpenSource: FirmwareType.FAIL,
				reproducibleBuilds: FirmwareType.FAIL,
				customFirmware: FirmwareType.FAIL,
			})
		}
		const firmwareFeature = features.security.firmware
		if (!firmwareFeature) {
			return unrated(firmware, brand, {
				silentUpdateProtection: FirmwareType.FAIL,
				firmwareOpenSource: FirmwareType.FAIL,
				reproducibleBuilds: FirmwareType.FAIL,
				customFirmware: FirmwareType.FAIL,
			})
		}

		const { withoutRefs, refs: extractedRefs } = popRefs<FirmwareSupport>(firmwareFeature)
		const rating = evaluateFirmware(withoutRefs)

		return {
			value: {
				id: 'firmware',
				rating,
				displayName: 'Firmware',
				shortExplanation: sentence(
					(walletMetadata: WalletMetadata) =>
						`${walletMetadata.displayName} has ${rating.toLowerCase()} firmware.`,
				),
				...withoutRefs,
				__brand: brand,
			},
			details: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} firmware evaluation is ${rating.toLowerCase()}.`,
			),
			howToImprove: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} should improve sub-criteria rated PARTIAL or FAIL.`,
			),
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
}

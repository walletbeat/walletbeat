import type { ResolvedFeatures } from '@/schema/features'
import { Rating, type Value, type Attribute, type Evaluation } from '@/schema/attributes'
import { pickWorstRating, unrated } from '../common'
import { markdown, paragraph, sentence } from '@/types/content'
import type { WalletMetadata } from '@/schema/wallet'
import type { AtLeastOneVariant } from '@/schema/variants'
import {
	MaintenanceType,
	type MaintenanceSupport,
} from '@/schema/features/transparency/maintenance'
import { popRefs } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import { exampleRating } from '@/schema/attributes'

const brand = 'attributes.maintenance'

export type MaintenanceValue = Value & {
	physicalDurability: MaintenanceType
	mtbfDocumentation: MaintenanceType
	repairability: MaintenanceType
	batteryHandling: MaintenanceType
	warrantyExtensions: MaintenanceType
	__brand: 'attributes.maintenance'
}

function evaluateMaintenance(features: MaintenanceSupport): Rating {
	const ratings = [
		features.physicalDurability,
		features.mtbfDocumentation,
		features.repairability,
		features.batteryHandling,
		features.warrantyExtensions,
	]
	const passCount = ratings.filter(r => r === MaintenanceType.PASS).length
	if (passCount >= 4) {
		return Rating.PASS
	}
	if (passCount >= 2) {
		return Rating.PARTIAL
	}
	return Rating.FAIL
}

export const maintenance: Attribute<MaintenanceValue> = {
	id: 'maintenance',
	icon: '🛠️',
	displayName: 'Maintenance',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's maintenance evaluated?",
		whatCanWalletDoAboutIts: (walletMetadata: WalletMetadata) =>
			`What can ${walletMetadata.displayName} do to improve its maintenance?`,
	},
	question: sentence(
		(walletMetadata: WalletMetadata) =>
			`Does ${walletMetadata.displayName} have good maintenance practices?`,
	),
	why: markdown(`Maintenance ensures long-term usability and reliability.`),
	methodology: markdown(
		`Evaluated based on durability, documentation, repairability, battery handling, and warranty.`,
	),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence(() => 'Most sub-criteria are PASS.'),
				(v: MaintenanceValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence(() => 'Some sub-criteria are PASS.'),
				(v: MaintenanceValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence(() => 'Few or no sub-criteria are PASS.'),
				(v: MaintenanceValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<MaintenanceValue>>) => {
		return pickWorstRating<MaintenanceValue>(perVariant)
	},
	evaluate: (features: ResolvedFeatures): Evaluation<MaintenanceValue> => {
		if (features.variant !== Variant.HARDWARE) {
			return unrated(maintenance, brand, {
				physicalDurability: MaintenanceType.FAIL,
				mtbfDocumentation: MaintenanceType.FAIL,
				repairability: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.FAIL,
				warrantyExtensions: MaintenanceType.FAIL,
			})
		}
		const maintenanceFeature = features.transparency.maintenance
		if (!maintenanceFeature) {
			return unrated(maintenance, brand, {
				physicalDurability: MaintenanceType.FAIL,
				mtbfDocumentation: MaintenanceType.FAIL,
				repairability: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.FAIL,
				warrantyExtensions: MaintenanceType.FAIL,
			})
		}

		const { withoutRefs, refs: extractedRefs } = popRefs<MaintenanceSupport>(maintenanceFeature)
		const rating = evaluateMaintenance(withoutRefs)

		return {
			value: {
				id: 'maintenance',
				rating,
				displayName: 'Maintenance',
				shortExplanation: sentence(
					(walletMetadata: WalletMetadata) =>
						`${walletMetadata.displayName} has ${rating.toLowerCase()} maintenance practices.`,
				),
				...withoutRefs,
				__brand: brand,
			},
			details: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} maintenance evaluation is ${rating.toLowerCase()}.`,
			),
			howToImprove: paragraph(
				({ wallet }) =>
					`${wallet.metadata.displayName} should improve sub-criteria rated PARTIAL or FAIL.`,
			),
			...(extractedRefs.length > 0 && { references: extractedRefs }),
		}
	},
}

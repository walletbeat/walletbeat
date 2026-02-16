import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import {
	type MaintenanceSupport,
	MaintenanceType,
} from '@/schema/features/transparency/maintenance'
import type { AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type MaintenanceValue = Value & {
	physicalDurability: MaintenanceType
	mtbfDocumentation: MaintenanceType
	repairability: MaintenanceType
	batteryHandling: MaintenanceType
	warrantyExtensions: MaintenanceType
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
		whatCanWalletDoAboutIts: sentence('What can {{WALLET_NAME}} do to improve its maintenance?'),
	},
	question: sentence('Does {{WALLET_NAME}} have good maintenance practices?'),
	why: markdown(`
		Good maintenance practices ensure the long-term usability, reliability, and physical durability of a hardware wallet.
		This includes the device's resistance to physical damage, the availability of repair information and parts, battery longevity and replaceability, and the manufacturer's warranty policy.
	`),
	methodology: markdown(
		`Evaluated based on:

- **Physical Durability:** Resistance to drops and environmental factors.

- **MTBF Documentation:** Availability and reliability of Mean Time Between Failures data.

- **Repairability:** Ease of repair, availability of parts and documentation, and potential security implications of repairs.

- **Battery:** Presence, replaceability, and device functionality if the battery dies.

- **Warranty:** Length of warranty period, coverage limitations, and possibility of extension.
	`,
	),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence('The wallet passes most maintenance sub-criteria.'),
				(v: MaintenanceValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The wallet passes some maintenance sub-criteria.'),
				(v: MaintenanceValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The wallet fails most or all maintenance sub-criteria.'),
				(v: MaintenanceValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<MaintenanceValue>>) =>
		pickWorstRating<MaintenanceValue>(perVariant),
	evaluate: (features: ResolvedFeatures): Evaluation<MaintenanceValue> => {
		if (features.type !== WalletType.HARDWARE) {
			return exempt(
				maintenance,
				sentence('These attributes only refer to hardware wallet maintenance'),
				{
					physicalDurability: MaintenanceType.FAIL,
					mtbfDocumentation: MaintenanceType.FAIL,
					repairability: MaintenanceType.FAIL,
					batteryHandling: MaintenanceType.FAIL,
					warrantyExtensions: MaintenanceType.FAIL,
				},
			)
		}

		const maintenanceFeature = features.transparency.maintenance

		if (maintenanceFeature === null) {
			return unrated(maintenance, {
				physicalDurability: MaintenanceType.FAIL,
				mtbfDocumentation: MaintenanceType.FAIL,
				repairability: MaintenanceType.FAIL,
				batteryHandling: MaintenanceType.FAIL,
				warrantyExtensions: MaintenanceType.FAIL,
			})
		}

		const rating = evaluateMaintenance(maintenanceFeature)

		return {
			value: {
				id: 'maintenance',
				rating,
				displayName: 'Maintenance',
				shortExplanation: sentence(
					`{{WALLET_NAME}} has ${rating.toLowerCase()} maintenance practices.`,
				),
				...maintenanceFeature, // TODO: Filter fields
			},
			details: paragraph(`{{WALLET_NAME}} maintenance evaluation is ${rating.toLowerCase()}.`),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
			// TODO: Add references
		}
	},
}

import { ratedSoftwareWallets } from '@/data/software-wallets'
import { Rating } from '@/schema/attributes'
import { slugifyCamelCase } from '@/types/utils/text'
import { getWalletUrl } from '@/utils/urls'

import {
	type FinderAssessment,
	finderCriteria,
	type FinderCriterionId,
	finderPlatforms,
	type FinderWallet,
} from './wallet-finder'

/** Build a compact snapshot so the questionnaire ships only the assessments it displays. */
export function finderWalletData(): FinderWallet[] {
	return Object.values(ratedSoftwareWallets).map(wallet => ({
		id: wallet.metadata.id,
		name: wallet.metadata.displayName,
		variants: finderPlatforms.flatMap(platform => {
			const variant = wallet.variants[platform]

			if (variant === undefined) {
				return []
			}

			const assessment = (id: FinderCriterionId): FinderAssessment => {
				const criterion = finderCriteria.find(criterion => criterion.id === id)

				if (criterion === undefined) {
					throw new Error(`Unknown wallet finder criterion ${id}`)
				}

				const outcome = variant.attributes[criterion.group][id]?.evaluation.outcome

				if (outcome === undefined) {
					throw new Error(
						`Missing wallet finder assessment ${wallet.metadata.id}/${platform}/${id}`,
					)
				}

				return {
					rating: outcome.rating,
					explanation: outcome.displayName,
					url: getWalletUrl(wallet, {
						variant: platform,
						attributeAnchor: outcome.rating === Rating.EXEMPT ? null : slugifyCamelCase(id),
					}),
				}
			}

			return [
				{
					platform,
					url: getWalletUrl(wallet, { variant: platform }),
					assessments: {
						hardwareWalletSupport: assessment('hardwareWalletSupport'),
						scamPrevention: assessment('scamPrevention'),
						transactionLegibility: assessment('transactionLegibility'),
						accountRecovery: assessment('accountRecovery'),
						addressCorrelation: assessment('addressCorrelation'),
						openSource: assessment('openSource'),
					},
				},
			]
		}),
	}))
}

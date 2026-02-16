import { type Attribute, type Evaluation, Rating, type Value } from '@/schema/attributes'
import { exampleRating } from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import { type ReputationSupport, ReputationType } from '@/schema/features/transparency/reputation'
import type { AtLeastOneVariant } from '@/schema/variants'
import { WalletType } from '@/schema/wallet-types'
import { markdown, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type ReputationValue = Value & {
	originalProduct: ReputationType
	availability: ReputationType
	warrantySupportRisk: ReputationType
	disclosureHistory: ReputationType
	bugBounty: ReputationType
}

function evaluateReputation(features: ReputationSupport): Rating {
	const ratings = [
		features.originalProduct,
		features.availability,
		features.warrantySupportRisk,
		features.disclosureHistory,
		features.bugBounty,
	]
	const passCount = ratings.filter(r => r === ReputationType.PASS).length

	if (passCount >= 4) {
		return Rating.PASS
	}

	if (passCount >= 2) {
		return Rating.PARTIAL
	}

	return Rating.FAIL
}

export const reputation: Attribute<ReputationValue> = {
	id: 'reputation',
	icon: '🌟',
	displayName: 'Reputation',
	wording: {
		midSentenceName: null,
		howIsEvaluated: "How is a wallet's reputation evaluated?",
		whatCanWalletDoAboutIts: sentence('What can {{WALLET_NAME}} do to improve its reputation?'),
	},
	question: sentence(
		'Does {{WALLET_NAME}} have a strong reputation for reliability and transparency?',
	),
	why: markdown(
		`A manufacturer's reputation reflects its track record in product design, long-term availability and support, handling of vulnerabilities, and engagement with the security community.
		A strong reputation builds user trust in the reliability and security of the hardware wallet.`,
	),
	methodology: markdown(
		`Evaluated based on an aggregate of factors:

- **Product Originality:** Degree of original design versus reliance on not-in-house components.

- **Availability & Support:** History of product availability, risk of discontinuation, and perceived ability to honor warranty/support.

- **Vulnerability History:** Track record of security vulnerabilities, their severity, and the transparency/quality of documentation and fixes.

- **Bug Bounty Program:** Scope and rewards of the manufacturer's bug bounty program compared to industry standards.
	`,
	),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				sentence('The wallet passes most reputation sub-criteria.'),
				(v: ReputationValue) => v.rating === Rating.PASS,
			),
		],
		partial: [
			exampleRating(
				sentence('The wallet passes some reputation sub-criteria.'),
				(v: ReputationValue) => v.rating === Rating.PARTIAL,
			),
		],
		fail: [
			exampleRating(
				sentence('The wallet fails most or all reputation sub-criteria.'),
				(v: ReputationValue) => v.rating === Rating.FAIL,
			),
		],
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<ReputationValue>>) =>
		pickWorstRating<ReputationValue>(perVariant),
	evaluate: (features: ResolvedFeatures): Evaluation<ReputationValue> => {
		if (features.type !== WalletType.HARDWARE) {
			return exempt(reputation, sentence('Only rated for hardware wallets'), {
				originalProduct: ReputationType.FAIL,
				availability: ReputationType.FAIL,
				warrantySupportRisk: ReputationType.FAIL,
				disclosureHistory: ReputationType.FAIL,
				bugBounty: ReputationType.FAIL,
			})
		}

		const reputationFeature = features.transparency.reputation

		if (reputationFeature === null) {
			return unrated(reputation, {
				originalProduct: ReputationType.FAIL,
				availability: ReputationType.FAIL,
				warrantySupportRisk: ReputationType.FAIL,
				disclosureHistory: ReputationType.FAIL,
				bugBounty: ReputationType.FAIL,
			})
		}

		const rating = evaluateReputation(reputationFeature)

		return {
			value: {
				id: 'reputation',
				rating,
				displayName: 'Reputation',
				shortExplanation: sentence(`{{WALLET_NAME}} has ${rating.toLowerCase()} reputation.`),
				...reputationFeature, // TODO: Filter fields
			},
			details: paragraph(`{{WALLET_NAME}} reputation evaluation is ${rating.toLowerCase()}.`),
			howToImprove: paragraph('{{WALLET_NAME}} should improve sub-criteria rated PARTIAL or FAIL.'),
			// TODO: Add references
		}
	},
}

import { Rating } from '@/schema/attributes'
import { Variant } from '@/schema/variants'

export const finderPlatforms = [Variant.BROWSER, Variant.MOBILE, Variant.DESKTOP] as const

export type FinderPlatform = (typeof finderPlatforms)[number]
export type FinderPriority = 'ignore' | 'prefer' | 'require'

export const finderCriteria = [
	{
		id: 'hardwareWalletSupport',
		group: 'security',
		label: 'Hardware wallet support',
		question: 'How important is direct hardware wallet support?',
	},
	{
		id: 'scamPrevention',
		group: 'security',
		label: 'Scam prevention',
		question: 'How important are scam warnings and prevention?',
	},
	{
		id: 'transactionLegibility',
		group: 'security',
		label: 'Transaction legibility',
		question: 'How important is understanding transactions before signing?',
	},
	{
		id: 'accountRecovery',
		group: 'security',
		label: 'Account recovery',
		question: 'How important are account recovery safeguards?',
	},
	{
		id: 'addressCorrelation',
		group: 'privacy',
		label: 'Wallet address privacy',
		question: 'How important is protecting information linked to your wallet address?',
	},
	{
		id: 'openSource',
		group: 'transparency',
		label: 'Open source',
		question: 'How important is open source software?',
	},
] as const

export type FinderCriterionId = (typeof finderCriteria)[number]['id']

export interface FinderAnswers {
	platform: FinderPlatform | 'any'
	priorities: Record<FinderCriterionId, FinderPriority>
}

export interface FinderAssessment {
	rating: Rating
	explanation: string
	url: string
}

export interface FinderVariant {
	platform: FinderPlatform
	url: string
	assessments: Record<FinderCriterionId, FinderAssessment>
}

export interface FinderWallet {
	id: string
	name: string
	variants: FinderVariant[]
}

export interface FinderMatch {
	wallet: FinderWallet
	variant: FinderVariant
	points: number
	unknowns: number
}

/** Fresh answers also reset every preference when the form is cleared. */
export function initialFinderAnswers(): FinderAnswers {
	return {
		platform: 'any',
		priorities: {
			hardwareWalletSupport: 'ignore',
			scamPrevention: 'ignore',
			transactionLegibility: 'ignore',
			accountRecovery: 'ignore',
			addressCorrelation: 'ignore',
			openSource: 'ignore',
		},
	}
}

/** Preference points are independent of Walletbeat's published rating scores. */
const preferencePoints: Record<Rating, number> = {
	[Rating.PASS]: 2,
	[Rating.PARTIAL]: 1,
	[Rating.FAIL]: 0,
	[Rating.UNRATED]: 0,
	[Rating.EXEMPT]: 0,
}

/** Apply all requirements within one platform before choosing a wallet's best match. */
export function findWallets(wallets: FinderWallet[], answers: FinderAnswers): FinderMatch[] {
	const selectedCriteria = finderCriteria.filter(({ id }) => answers.priorities[id] !== 'ignore')
	const matches: FinderMatch[] = []

	for (const wallet of wallets) {
		const candidates = wallet.variants
			.filter(variant => answers.platform === 'any' || variant.platform === answers.platform)
			.filter(variant =>
				selectedCriteria.every(
					({ id }) =>
						answers.priorities[id] !== 'require' || variant.assessments[id].rating === Rating.PASS,
				),
			)
			.map(variant => ({
				wallet,
				variant,
				points: selectedCriteria.reduce(
					(total, { id }) => total + preferencePoints[variant.assessments[id].rating],
					0,
				),
				unknowns: selectedCriteria.filter(
					({ id }) => variant.assessments[id].rating === Rating.UNRATED,
				).length,
			}))
			.sort((a, b) => b.points - a.points || a.unknowns - b.unknowns)

		const best = candidates[0]

		if (best !== undefined) {
			matches.push(best)
		}
	}

	return matches.sort(
		(a, b) =>
			b.points - a.points ||
			a.unknowns - b.unknowns ||
			a.wallet.name.localeCompare(b.wallet.name, 'en') ||
			a.wallet.id.localeCompare(b.wallet.id, 'en'),
	)
}

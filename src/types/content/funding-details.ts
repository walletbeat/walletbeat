import {
	type Monetization,
	monetizationStrategies,
	MonetizationStrategy,
	monetizationStrategyIsUserAligned,
	monetizationStrategyName,
} from '@/schema/features/transparency/monetization'

export interface FundingStrategyDetail {
	strategy: MonetizationStrategy

	userAligned: boolean
}

export interface FundingDetails {
	type: 'funding'
	strategies: FundingStrategyDetail[]

	revenueBreakdownIsPublic: boolean
}

export function buildFundingDetails(monetization: Monetization): FundingDetails {
	return {
		type: 'funding',
		strategies: monetizationStrategies(monetization)
			.filter(({ value }) => value === true)
			.map(({ strategy }) => ({
				strategy,
				userAligned: monetizationStrategyIsUserAligned(strategy),
			})),
		revenueBreakdownIsPublic: monetization.revenueBreakdownIsPublic,
	}
}

export function fundingSentence(details: FundingDetails): string {
	const sources =
		details.strategies.length === 0
			? 'unknown sources'
			: details.strategies.map(({ strategy }) => monetizationStrategyName(strategy)).join(', ')

	return `**{{WALLET_NAME}}** is funded by **${sources}**.`
}

import {
	type Monetization,
	monetizationStrategies,
	MonetizationStrategy,
	monetizationStrategyIsUserAligned,
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

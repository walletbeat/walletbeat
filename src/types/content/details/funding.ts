import type {
	type Monetization,
	monetizationStrategies,
	MonetizationStrategy,
	monetizationStrategyIsUserAligned,
} from '@/schema/features/transparency/monetization'

/** One funding strategy the wallet actively uses. */
export interface FundingStrategyDetail {
	strategy: MonetizationStrategy

	/** Whether this strategy aligns the wallet's incentives with its users'. */
	userAligned: boolean
}

/**
 * Canonical detail model for how a wallet is funded.
 *
 * Only active strategies are carried: the raw monetization blob, including
 * strategies explicitly marked as unused, is not evaluation meaning. Funding
 * references stay on the evaluation's flat reference list, so each reference is
 * owned in exactly one place.
 */
export interface FundingDetails {
	type: 'funding'
	strategies: FundingStrategyDetail[]

	/** Whether the wallet publishes a breakdown of where its revenue comes from. */
	revenueBreakdownIsPublic: boolean
}

/** Build the canonical funding details from resolved monetization features. */
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

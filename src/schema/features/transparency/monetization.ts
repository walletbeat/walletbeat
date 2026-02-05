import type { WithRef } from '../../reference'

/**
 * A set of possible ways by which a wallet may fund its development.
 *
 * This enum uses camelCase-style values because it is used as object key in
 * the wallet features.
 */
export enum MonetizationStrategy {
	SELF_FUNDED = 'selfFunded',
	DONATIONS = 'donations',
	ECOSYSTEM_GRANTS = 'ecosystemGrants',
	PUBLIC_OFFERING = 'publicOffering',
	VENTURE_CAPITAL = 'ventureCapital',
	TRANSPARENT_CONVENIENCE_FEES = 'transparentConvenienceFees',
	HIDDEN_CONVENIENCE_FEES = 'hiddenConvenienceFees',
	GOVERNANCE_TOKEN_LOW_FLOAT = 'governanceTokenLowFloat',
	GOVERNANCE_TOKEN_MOSTLY_DISTRIBUTED = 'governanceTokenMostlyDistributed',
}

/** Human-readable name for a monetization strategy. */
export function monetizationStrategyName(monetization: MonetizationStrategy): string {
	switch (monetization) {
		case MonetizationStrategy.SELF_FUNDED:
			return 'self-funding'
		case MonetizationStrategy.DONATIONS:
			return 'donations'
		case MonetizationStrategy.ECOSYSTEM_GRANTS:
			return 'ecosystem grants'
		case MonetizationStrategy.PUBLIC_OFFERING:
			return 'public offering'
		case MonetizationStrategy.VENTURE_CAPITAL:
			return 'venture capital'
		case MonetizationStrategy.HIDDEN_CONVENIENCE_FEES:
			return 'hidden fees'
		case MonetizationStrategy.TRANSPARENT_CONVENIENCE_FEES:
			return 'transparent fees'
		case MonetizationStrategy.GOVERNANCE_TOKEN_LOW_FLOAT:
			return 'a low-float governance token'
		case MonetizationStrategy.GOVERNANCE_TOKEN_MOSTLY_DISTRIBUTED:
			return 'a well-distributed governance token'
	}
}

/**
 * Whether a monetization strategy is user-aligned.
 *
 * The "user alignment" of a monetization strategy refers to whether the
 * funding that goes to the wallet development team grows as a function
 * of the user's own goals, rather than being uncorrelated or
 * anti-correlated.
 */
export function monetizationStrategyIsUserAligned(monetization: MonetizationStrategy): boolean {
	switch (monetization) {
		case MonetizationStrategy.SELF_FUNDED:
			return true
		case MonetizationStrategy.DONATIONS:
			return true
		case MonetizationStrategy.ECOSYSTEM_GRANTS:
			return true
		case MonetizationStrategy.PUBLIC_OFFERING:
			return true
		case MonetizationStrategy.VENTURE_CAPITAL:
			return true
		case MonetizationStrategy.TRANSPARENT_CONVENIENCE_FEES:
			return true
		case MonetizationStrategy.HIDDEN_CONVENIENCE_FEES:
			return false
		case MonetizationStrategy.GOVERNANCE_TOKEN_LOW_FLOAT:
			return false
		case MonetizationStrategy.GOVERNANCE_TOKEN_MOSTLY_DISTRIBUTED:
			return true
	}
}

export type Monetization = WithRef<{
	revenueBreakdownIsPublic: boolean
	strategies: Record<MonetizationStrategy, boolean | null>
}>

/**
 * Iterate over the monetization strategies in the given object.
 */
export function monetizationStrategies(monetization: Monetization) {
	return Object.entries(monetization.strategies).map(([strategy, value]) => ({
		strategy,
		value,
	}))
}

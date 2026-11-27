import { StageCriterionRating } from '@/schema/stages'
import {
	evaluateWalletOnWalkawayTest,
	type WalkawayTestResult,
	type WalletWalkawayEvaluation,
} from '@/schema/walkaway'
import { softwareWalletWalkawayTest } from '@/schema/walkaway/software-wallet-walkaway'
import type { RatedWalletStageSlice } from '@/utils/stage'

/** All walkaway tests, in display priority order. */
export const allWalkawayTests = [softwareWalletWalkawayTest] as const

/**
 * Evaluate a wallet on the first walkaway test that applies to it.
 * Returns `'NOT_APPLICABLE'` if no walkaway test applies.
 */
export function getWalletWalkawayEvaluation(
	wallet: RatedWalletStageSlice,
): WalletWalkawayEvaluation<string> | 'NOT_APPLICABLE' {
	for (const test of allWalkawayTests) {
		const evaluation = evaluateWalletOnWalkawayTest(wallet, test)

		if (evaluation !== 'NOT_APPLICABLE') {
			return evaluation
		}
	}

	return 'NOT_APPLICABLE'
}

/**
 * Walkaway-specific wording for each result.
 * Icons and colors come from `stageCriterionRatings`.
 */
export const walkawayTestResultLabels = {
	[StageCriterionRating.PASS]: {
		label: 'Pass',
		title: 'Passes the walkaway test',
	},
	[StageCriterionRating.FAIL]: {
		label: 'Fail',
		title: 'Fails the walkaway test',
	},
	[StageCriterionRating.UNRATED]: {
		label: 'Unrated',
		title: 'Not enough data to rate the walkaway test',
	},
} as const satisfies Record<WalkawayTestResult, { label: string; title: string }>

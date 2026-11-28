import type { Content } from '@/types/content'
import { getErrorMessage } from '@/types/errors'
import { type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty'
import { Enum } from '@/utils/enum'

import {
	type StageCriterionEvaluation,
	StageCriterionRating,
	type StageEvaluatableWallet,
	type WalletStageCriterion,
} from './stages'

/**
 * The walkaway test: whether a wallet keeps working, and keeps its users
 * safe and in control, if its development team and servers disappear.
 *
 * Unlike a stage, the walkaway test is a single flat list of criteria.
 */
export interface WalletWalkawayTest<_AttributeGroupId extends string> {
	/** An ID for this walkaway test. */
	id: `walkaway:${string}`

	/** A human-readable label for this walkaway test. */
	label: string

	/** A description of what this walkaway test represents. */
	description: Content

	/**
	 * The criteria for this walkaway test.
	 * Wallets must `PASS` all of these criteria in order to pass the test.
	 * Exempt criteria count as passing.
	 */
	criteria: NonEmptyArray<WalletStageCriterion<_AttributeGroupId>>

	/** Returns whether this walkaway test applies to the given wallet. */
	applicableTo: (wallet: StageEvaluatableWallet<_AttributeGroupId>) => boolean
}

/**
 * The overall result of a wallet on the walkaway test.
 * Uses the stage criterion ratings, except `EXEMPT`: a wallet that the test
 * does not apply to is not evaluated at all.
 */
export type WalkawayTestResult = Exclude<StageCriterionRating, StageCriterionRating.EXEMPT>

/** All walkaway test results, in display order. */
export const walkawayTestResults = new Enum<WalkawayTestResult>({
	[StageCriterionRating.PASS]: true,
	[StageCriterionRating.FAIL]: true,
	[StageCriterionRating.UNRATED]: true,
})

/** The evaluation of one walkaway test criterion for one wallet. */
export interface WalkawayCriterionEvaluation<_AttributeGroupId extends string> {
	criterion: WalletStageCriterion<_AttributeGroupId>
	evaluation: StageCriterionEvaluation
}

/** The result of evaluating a wallet on a walkaway test. */
export interface WalletWalkawayEvaluation<_AttributeGroupId extends string> {
	/** The walkaway test the wallet was evaluated on. */
	test: WalletWalkawayTest<_AttributeGroupId>

	/** The overall result. */
	result: WalkawayTestResult

	/** Per-criterion evaluations, in the order of `test.criteria`. */
	criteria: NonEmptyArray<WalkawayCriterionEvaluation<_AttributeGroupId>>
}

/**
 * Evaluate a wallet on a walkaway test.
 * A failed criterion makes the whole test fail, even if other criteria are
 * unrated. Returns `'NOT_APPLICABLE'` if the test does not apply to the wallet.
 */
export function evaluateWalletOnWalkawayTest<_AttributeGroupId extends string>(
	wallet: StageEvaluatableWallet<_AttributeGroupId>,
	test: WalletWalkawayTest<_AttributeGroupId>,
): WalletWalkawayEvaluation<_AttributeGroupId> | 'NOT_APPLICABLE' {
	if (!test.applicableTo(wallet)) {
		return 'NOT_APPLICABLE'
	}

	const criteria = nonEmptyMap(test.criteria, criterion => {
		try {
			return { criterion, evaluation: criterion.evaluate(wallet) }
		} catch (e) {
			throw new Error(
				`Walkaway test ${test.id}: criterion ${criterion.id}: ${getErrorMessage(e)}`,
				{
					cause: e,
				},
			)
		}
	})

	const hasRating = (rating: StageCriterionRating): boolean =>
		criteria.some(({ evaluation }) => evaluation.rating === rating)

	if (hasRating(StageCriterionRating.FAIL)) {
		return { test, result: StageCriterionRating.FAIL, criteria }
	}

	if (hasRating(StageCriterionRating.UNRATED)) {
		return { test, result: StageCriterionRating.UNRATED, criteria }
	}

	return { test, result: StageCriterionRating.PASS, criteria }
}

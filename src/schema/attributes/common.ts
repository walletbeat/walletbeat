import { type Sentence, sentence } from '@/types/content'
import { unratedAttributeContent } from '@/types/content/unrated-attribute'
import { isNonEmptyArray, type NonEmptyArray, nonEmptyValues } from '@/types/utils/non-empty'

import {
	type Evaluation,
	EvaluationContext,
	type ExemptEvaluation,
	type Outcome,
	type OutcomeMetadata,
	Rating,
	Verifiability,
	type WalletNameStrings,
} from '../attributes'
import type { AtLeastOneVariant, Variant } from '../variants'

/**
 * Helper for constructing Evaluation with "Unrated" Outcome.
 */
export function unrated(ctx: EvaluationContext): Evaluation
export function unrated<_OutcomeMetadata extends OutcomeMetadata>(
	ctx: EvaluationContext<_OutcomeMetadata>,
	metadata: Outcome<_OutcomeMetadata>['metadata'],
): Evaluation<_OutcomeMetadata>
export function unrated<_OutcomeMetadata extends OutcomeMetadata>(
	ctx: EvaluationContext<_OutcomeMetadata>,
	metadata?: Outcome<_OutcomeMetadata>['metadata'],
): Evaluation<_OutcomeMetadata> {
	return {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- `metadata` presence matches `_OutcomeMetadata`; TS cannot prove conditional `Outcome` merge
		outcome: {
			id: 'unrated',
			rating: Rating.UNRATED,
			verifiability: Verifiability.SELF_EVIDENT,
			displayName: `${ctx.attribute.displayName}: Unrated`,
			shortExplanation: sentence('Walletbeat lacks the information needed to determine this.'),
			...(metadata && { metadata }),
		} as unknown as Outcome<_OutcomeMetadata>,
		details: unratedAttributeContent<_OutcomeMetadata>(),
	}
}

/**
 * Helper for constructing Evaluation with "Exempt" Outcome.
 */
export function exempt(
	ctx: EvaluationContext<null>,
	whyExempt: Sentence<WalletNameStrings>,
): ExemptEvaluation<null>
export function exempt<_OutcomeMetadata extends OutcomeMetadata>(
	ctx: EvaluationContext<_OutcomeMetadata>,
	whyExempt: Sentence<WalletNameStrings>,
	metadata: Outcome<_OutcomeMetadata>['metadata'],
): ExemptEvaluation<_OutcomeMetadata>
export function exempt<_OutcomeMetadata extends OutcomeMetadata>(
	ctx: EvaluationContext<_OutcomeMetadata>,
	whyExempt: Sentence<WalletNameStrings>,
	metadata?: Outcome<_OutcomeMetadata>['metadata'],
): ExemptEvaluation<_OutcomeMetadata> {
	return {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- `metadata` presence matches `_OutcomeMetadata`; TS cannot prove conditional `Outcome` merge
		outcome: {
			id: 'exempt',
			rating: Rating.EXEMPT,
			verifiability: Verifiability.SELF_EVIDENT,
			displayName: `${ctx.attribute.displayName}: Exempt`,
			shortExplanation: whyExempt,
			...(metadata && { metadata }),
		} as unknown as Outcome<_OutcomeMetadata, Rating.EXEMPT>, // type assertion needed to enforce presence or non-presence of `metadata`
		details: whyExempt,
	}
}

/**
 * Evaluation aggregation function that picks the worst rating.
 * @param perVariant Evaluation for at least one variant.
 * @returns The evaluation with the lowest rating.
 */
export function pickWorstRating<_OutcomeMetadata extends OutcomeMetadata>(
	evaluations:
		| AtLeastOneVariant<Evaluation<_OutcomeMetadata>>
		| NonEmptyArray<Evaluation<_OutcomeMetadata>>,
): Evaluation<_OutcomeMetadata> {
	let worst: Evaluation<_OutcomeMetadata> | null = null
	const evaluationsArray =
		Array.isArray(evaluations) && isNonEmptyArray(evaluations)
			? evaluations
			: nonEmptyValues<Variant, Evaluation<_OutcomeMetadata>>(evaluations)

	for (const evaluation of evaluationsArray) {
		if (evaluation.outcome.rating === Rating.UNRATED) {
			// If any evaluation is UNRATED, then the aggregated rating also is.
			// So return it immediately.
			return evaluation
		}

		if (worst === null) {
			// The first rating sets the initial value of `worst`.
			worst = evaluation
			continue
		}

		if (evaluation.outcome.rating === Rating.EXEMPT) {
			// Exempt ratings are ignored, unless they are the only rating we have.
			continue
		}

		if (worst.outcome.rating === Rating.EXEMPT) {
			// Any non-EXEMPT rating takes precedence over an EXEMPT rating.
			worst = evaluation
			continue
		}

		if (worst.outcome.rating === Rating.PASS) {
			// Any non-EXEMPT, non-UNRATED rating is worse or equal to PASS, so pick it.
			worst = evaluation
			continue
		}

		if (worst.outcome.rating === Rating.PARTIAL && evaluation.outcome.rating === Rating.FAIL) {
			// If the worst rating is PARTIAL, pick FAIL over it.
			worst = evaluation
			continue
		}
	}

	return worst!
}

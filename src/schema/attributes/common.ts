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
 * Helper for constructing "Unrated" values.
 */
export function unrated<_OutcomeMetadata extends OutcomeMetadata>(
	ctx: EvaluationContext<_OutcomeMetadata>,
	extraProps: keyof _OutcomeMetadata extends never ? null : _OutcomeMetadata,
): Evaluation<_OutcomeMetadata> {
	const value = {
		id: 'unrated',
		rating: Rating.UNRATED,
		verifiability: Verifiability.SELF_EVIDENT,
		displayName: `${ctx.attribute.displayName}: Unrated`,
		shortExplanation: sentence('Walletbeat lacks the information needed to determine this.'),
		...(extraProps ? { metadata: extraProps } : {}),
	} as Outcome<_OutcomeMetadata>

	const v = value

	return {
		value: v,
		details: unratedAttributeContent<_OutcomeMetadata>(),
	}
}

export function exempt<_OutcomeMetadata extends OutcomeMetadata>(
	ctx: EvaluationContext<_OutcomeMetadata>,
	whyExempt: Sentence<WalletNameStrings>,
	extraProps: keyof _OutcomeMetadata extends never ? null : _OutcomeMetadata,
): ExemptEvaluation<_OutcomeMetadata> {
	const value: Outcome & { rating: Rating.EXEMPT } = {
		id: 'exempt',
		rating: Rating.EXEMPT,
		verifiability: Verifiability.SELF_EVIDENT,
		displayName: `${ctx.attribute.displayName}: Exempt`,
		shortExplanation: whyExempt,
	}
	const v = {
		...value,
		...(extraProps ? { metadata: extraProps } : {}),
	} as Outcome<_OutcomeMetadata> & { rating: Rating.EXEMPT }

	return {
		value: v,
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
		if (evaluation.value.rating === Rating.UNRATED) {
			// If any evaluation is UNRATED, then the aggregated rating also is.
			// So return it immediately.
			return evaluation
		}

		if (worst === null) {
			// The first rating sets the initial value of `worst`.
			worst = evaluation
			continue
		}

		if (evaluation.value.rating === Rating.EXEMPT) {
			// Exempt ratings are ignored, unless they are the only rating we have.
			continue
		}

		if (worst.value.rating === Rating.EXEMPT) {
			// Any non-EXEMPT rating takes precedence over an EXEMPT rating.
			worst = evaluation
			continue
		}

		if (worst.value.rating === Rating.PASS) {
			// Any non-EXEMPT, non-UNRATED rating is worse or equal to PASS, so pick it.
			worst = evaluation
			continue
		}

		if (worst.value.rating === Rating.PARTIAL && evaluation.value.rating === Rating.FAIL) {
			// If the worst rating is PARTIAL, pick FAIL over it.
			worst = evaluation
			continue
		}
	}

	return worst!
}

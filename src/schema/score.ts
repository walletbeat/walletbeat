import { type NonEmptyArray, nonEmptyMap } from '@/types/utils/non-empty';

/** Score is a score between 0.0 (lowest) and 1.0 (highest). */
export type Score = number;

/** A score and a weight. */
export interface WeightedScore {
	score: Score;
	weight: number;
}

/**
 * A score and a boolean indicating whether any component of it was unrated.
 * May also be null in case of complete exemption.
 */
export type MaybeUnratedScore = null | {
	score: Score;
	hasUnratedComponent: boolean;
};

/** Compute a weighted aggregate score. */
export function weightedScore(scores: NonEmptyArray<WeightedScore>): Score {
	let totalScore = 0.0;
	let totalWeight = 0.0;

	nonEmptyMap(scores, ({ score, weight }) => {
		totalScore += score * weight;
		totalWeight += weight;
	});

	return totalWeight === 0.0 ? 0.0 : totalScore / totalWeight;
}

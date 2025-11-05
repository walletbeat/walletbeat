import { type NonEmptyArray } from '@/types/utils/non-empty'

/** Score is a score between 0.0 (lowest) and 1.0 (highest). */
export type Score = number | null

/** A score and a weight. */
export interface WeightedScore {
	score: Score
	weight: number
}

/**
 * A score and a boolean indicating whether any component of it was unrated.
 * May also be null in case of complete exemption.
 */
export type MaybeUnratedScore = null | {
	score: Score
	hasUnratedComponent: boolean
}

/** Compute a weighted aggregate score. */
export const weightedScore = (scores: NonEmptyArray<WeightedScore>): Score => {
	if (scores.every(({ score }) => score === null)) {
		return null
	}

	const [totalScore, totalWeight] = scores.reduce(
		([totalScore, totalWeight], { score, weight }) => [
			totalScore + (score === null ? 0 : score) * weight,
			totalWeight + weight,
		],
		[0, 0] as [number, number],
	)

	return totalScore / totalWeight
}

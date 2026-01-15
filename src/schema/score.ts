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

/**
 * Format a score for display in the UI.
 * @param score The score to format, or null if not available.
 * @returns Formatted string: '❔' for null, '💀' for 0, '💯' for 1, percentage otherwise, with '*' suffix if hasUnratedComponent.
 */
export const formatScore = (score: MaybeUnratedScore): string =>
	score !== null && score.score !== null
		? `${
				score.score === 0 ? '💀' : score.score === 1 ? '💯' : (score.score * 100).toFixed(0)
			}${score.hasUnratedComponent ? '*' : ''}`
		: '❔'

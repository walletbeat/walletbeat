import { type NonEmptyArray } from '@/types/utils/non-empty'

/**
 * Score is a number between -0.5 (worst, for fully UNRATED) and 1.0 (best).
 * FAIL maps to 0.0; UNRATED maps to -0.5 to rank below FAIL.
 * null means the attribute is EXEMPT (excluded from scoring entirely).
 */
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
	const nonNullScores = scores.filter(
		(s): s is WeightedScore & { score: number } => s.score !== null,
	)

	if (nonNullScores.length === 0) {
		return null
	}

	const [totalScore, totalWeight] = nonNullScores.reduce(
		([totalScore, totalWeight], { score, weight }) => [
			totalScore + score * weight,
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
				score.score <= 0 ? '💀' : score.score === 1 ? '💯' : (score.score * 100).toFixed(0)
			}${score.hasUnratedComponent ? '*' : ''}`
		: '❔'

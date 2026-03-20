import type { Score } from '@/schema/score'

export const scoreToColor = (score: Score) => {
	if (score === null) {
		return 'var(--rating-unrated)'
	}

	const clamped = Math.max(0, score)

	return clamped <= 0.5
		? `color-mix(in oklch, var(--rating-fail), var(--rating-partial) ${clamped * 200}%)`
		: `color-mix(in oklch, var(--rating-partial), var(--rating-pass) ${(clamped - 0.5) * 200}%)`
}

/**
 * Get a color for a stage number using shades of --accent.
 * Higher stage numbers get lighter shades.
 * @param stageNumber 0-indexed stage number, or null for unrated/not applicable
 * @param maxStages Maximum number of stages in the ladder (for scaling)
 */
export const stageToColor = (stageNumber: number | null, maxStages: number = 3) =>
	stageNumber === null
		? 'var(--rating-unrated)'
		: `color-mix(in oklch, var(--accent-color) ${((stageNumber + 1) / maxStages) * 100}%, white)`

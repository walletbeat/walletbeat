import type { Score } from '@/schema/score'

export const scoreToColor = (score: Score) => (
	score !== undefined ?
		score <= 0.5 ?
			`color-mix(in oklch, var(--rating-fail), var(--rating-partial) ${score * 200}%)`
		:
			`color-mix(in oklch, var(--rating-partial), var(--rating-pass) ${(score - 0.5) * 200}%)`
	:
		'var(--rating-unrated)'
)

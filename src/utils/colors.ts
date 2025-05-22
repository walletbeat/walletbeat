export const percentageToColor = (percentage: number): string => {
	if (percentage >= 0.9) {
		return 'bg-green-500'
	}
	if (percentage >= 0.7) {
		return 'bg-orange-500'
	}
	if (percentage >= 0.3) {
		return 'bg-yellow-500'
	}
	return 'bg-red-500'
}

export const percentageToCSS = (percentage: number): string => (
	percentage >= 0.9 ?
		'var(--rating-pass)'
	: percentage >= 0.7 ?
		'var(--rating-partial)'
	: percentage >= 0.3 ?
		'var(--rating-partial)'
	:
		'var(--rating-fail)'
)

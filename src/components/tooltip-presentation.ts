/** The presentation selected by the tooltip's CSS; server rendering remains inline. */
export function tooltipUsesDrawer(): boolean {
	return (
		typeof document !== 'undefined' &&
		getComputedStyle(document.documentElement)
			.getPropertyValue('---tooltip-presentation')
			.trim() === 'drawer'
	)
}

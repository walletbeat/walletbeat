export async function finishPopoverExit(panel: HTMLElement): Promise<void> {
	const animations =
		getComputedStyle(panel).display === 'none'
			? []
			: panel
					.getAnimations({ subtree: true })
					.filter(
						animation =>
							animation.timeline instanceof DocumentTimeline &&
							Number.isFinite(animation.effect?.getComputedTiming().endTime),
					)

	await Promise.allSettled(animations.map(animation => animation.finished))
}

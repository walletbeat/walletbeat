const itemSelector = '[data-view-transition~="item"]'
const coordinateProperties = [
	'--layoutTransition-beforeX',
	'--layoutTransition-beforeY',
	'--layoutTransition-afterX',
	'--layoutTransition-afterY',
] as const

const measureItems = (scope: HTMLElement) =>
	new Map(
		[...scope.querySelectorAll<HTMLElement>(itemSelector)]
			.filter(item => {
				const ancestor = item.parentElement?.closest(itemSelector)

				return !ancestor || ancestor === scope || !scope.contains(ancestor)
			})
			.map(item => [item, item.getBoundingClientRect()] as const),
	)

/**
 * Prepare retained HTML items for a synchronous layout update. Native box
 * coordinates are CSS inputs; CSS owns their difference and interpolation.
 * Items and their ancestors use an unscaled, axis-aligned coordinate space.
 * Items reserve CSS translate for this motion.
 */
export function prepareItemReorder(
	scope: HTMLElement,
	update: () => void,
	interrupt: () => void,
): { finished: Promise<void>; cancel: () => void } {
	const before = measureItems(scope)

	interrupt()
	update()

	const after = measureItems(scope)
	const moving: HTMLElement[] = []
	const clean = () => {
		for (const item of moving) {
			item.removeAttribute('data-layout-transition')

			for (const property of coordinateProperties) {
				item.style.removeProperty(property)
			}
		}
	}

	try {
		for (const [item, end] of after) {
			const start = before.get(item)

			if (!start || (start.x === end.x && start.y === end.y)) {
				continue
			}

			moving.push(item)
			item.style.setProperty('--layoutTransition-beforeX', `${start.x}px`)
			item.style.setProperty('--layoutTransition-beforeY', `${start.y}px`)
			item.style.setProperty('--layoutTransition-afterX', `${end.x}px`)
			item.style.setProperty('--layoutTransition-afterY', `${end.y}px`)
			item.setAttribute('data-layout-transition', 'before')
		}

		// Commit the inverted positions before enabling their native transitions.
		if (moving[0]) {
			getComputedStyle(moving[0]).getPropertyValue('translate')
		}

		for (const item of moving) {
			item.setAttribute('data-layout-transition', 'after')
		}

		const animations = moving.flatMap(item =>
			item
				.getAnimations()
				.filter(
					animation =>
						animation instanceof CSSTransition && animation.transitionProperty === 'translate',
				),
		)

		return {
			finished: Promise.allSettled(animations.map(animation => animation.finished)).then(
				() => undefined,
			),
			cancel: clean,
		}
	} catch (error) {
		clean()
		throw error
	}
}

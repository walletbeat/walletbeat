const itemSelector = '[data-view-transition~="item"]'
const namedSelector = '[data-view-transition~="named"]'
const ownerByItem = new WeakMap<HTMLElement, () => void>()
const inputProperties = [
	'--layoutTransition-beforeX',
	'--layoutTransition-beforeY',
	'--layoutTransition-afterX',
	'--layoutTransition-afterY',
	'--layoutTransition-parentBeforeX',
	'--layoutTransition-parentBeforeY',
	'--layoutTransition-parentAfterX',
	'--layoutTransition-parentAfterY',
	'--layoutTransition-duration',
	'--layoutTransition-easing',
] as const

const cancelInputTransitions = (items: Iterable<HTMLElement>, layoutAnimations?: Animation[]) => {
	const transitions: Animation[] = []

	for (const item of items) {
		for (const animation of item.getAnimations()) {
			if (
				layoutAnimations &&
				animation instanceof CSSAnimation &&
				animation.animationName === 'layout-transition' &&
				animation.effect instanceof KeyframeEffect &&
				animation.effect.target === item &&
				animation.effect.pseudoElement === null
			) {
				layoutAnimations.push(animation)
			}

			if (
				animation instanceof CSSTransition &&
				(animation.transitionProperty === 'translate' ||
					inputProperties.some(property => property === animation.transitionProperty)) &&
				animation.effect instanceof KeyframeEffect &&
				animation.effect.target === item &&
				animation.effect.pseudoElement === null
			) {
				transitions.push(animation)
			}
		}
	}

	for (const transition of transitions) {
		transition.cancel()
	}
}

export const captureItemPositions = (scope: HTMLElement) => {
	const items = new Map<HTMLElement | string, HTMLElement>()
	const duplicates = new Set<string>()

	for (const item of scope.querySelectorAll(`${itemSelector}, ${namedSelector}`)) {
		if (!(item instanceof HTMLElement)) {
			continue
		}

		const name = item.matches(namedSelector)
			? getComputedStyle(item).getPropertyValue('--view-transition-name').trim()
			: undefined

		if (name === '' || name === 'none') {
			continue
		}

		const key = name ?? item

		if (typeof key === 'string' && items.has(key)) {
			duplicates.add(key)
		}

		items.set(key, item)
	}

	for (const name of duplicates) {
		items.delete(name)
	}

	return new Map(
		[...items].map(([key, item]) => [key, { item, box: item.getBoundingClientRect() }] as const),
	)
}

/**
 * Prepare retained items and uniquely named replacement HTML peers for a synchronous update. Native box
 * coordinates are CSS inputs; CSS owns their difference and interpolation.
 * Items and their ancestors use an unscaled, axis-aligned coordinate space.
 * Motion owners reserve CSS translate and their CSS animation list; animated controls belong inside them.
 */
export function prepareItemReorder(
	scope: HTMLElement,
	update: () => void,
	interrupt: () => void,
	before?: ReturnType<typeof captureItemPositions>,
): { finished: Promise<void>; cancel: () => void } {
	const style = getComputedStyle(scope)
	const duration = Number(style.getPropertyValue('--layoutTransition-duration'))
	const easing = style.getPropertyValue('--layoutTransition-easing').trim()
	const positions = before ?? captureItemPositions(scope)

	interrupt()

	const interruptedItems: HTMLElement[] = []

	for (const { item } of positions.values()) {
		const release = ownerByItem.get(item)

		if (release) {
			release()
			interruptedItems.push(item)
		}
	}
	cancelInputTransitions(interruptedItems)
	update()

	const after = captureItemPositions(scope)
	const pairs = new Map<HTMLElement, { start: DOMRect; end: DOMRect }>()

	for (const [key, { item, box }] of after) {
		const start = positions.get(key)

		if (start) {
			pairs.set(item, { start: start.box, end: box })
		}
	}

	const releases = new Map<HTMLElement, () => void>()
	const animations: Animation[] = []
	const clean = () => {
		const releasedItems: HTMLElement[] = []

		for (const [item, release] of releases) {
			if (ownerByItem.get(item) === release) {
				release()
				releasedItems.push(item)
			}
		}
		cancelInputTransitions(releasedItems)

		for (const animation of animations) {
			animation.cancel()
		}
	}

	try {
		if (!easing || !Number.isFinite(duration) || duration <= 0) {
			return { finished: Promise.resolve(), cancel: clean }
		}

		for (const [item, { start, end }] of pairs) {
			let ancestor = item.parentElement

			while (ancestor && !pairs.has(ancestor)) {
				ancestor = ancestor.parentElement
			}

			const parent = ancestor ? pairs.get(ancestor) : undefined

			if (
				start.x - end.x === (parent ? parent.start.x - parent.end.x : 0) &&
				start.y - end.y === (parent ? parent.start.y - parent.end.y : 0)
			) {
				continue
			}

			const release = () => {
				ownerByItem.delete(item)
				item.removeAttribute('data-layout-transition')

				for (const property of inputProperties) {
					item.style.removeProperty(property)
				}
			}

			releases.set(item, release)
			ownerByItem.set(item, release)
			item.style.setProperty('--layoutTransition-duration', String(duration))
			item.style.setProperty('--layoutTransition-easing', easing)
			item.style.setProperty('--layoutTransition-beforeX', `${start.x}px`)
			item.style.setProperty('--layoutTransition-beforeY', `${start.y}px`)
			item.style.setProperty('--layoutTransition-afterX', `${end.x}px`)
			item.style.setProperty('--layoutTransition-afterY', `${end.y}px`)

			if (parent) {
				item.style.setProperty('--layoutTransition-parentBeforeX', `${parent.start.x}px`)
				item.style.setProperty('--layoutTransition-parentBeforeY', `${parent.start.y}px`)
				item.style.setProperty('--layoutTransition-parentAfterX', `${parent.end.x}px`)
				item.style.setProperty('--layoutTransition-parentAfterY', `${parent.end.y}px`)
			}

			item.setAttribute('data-layout-transition', '')
		}

		const firstItem = releases.keys().next().value

		if (!firstItem) {
			return { finished: Promise.resolve(), cancel: clean }
		}

		// Commit the paused keyframe pose before starting the shared native clock.
		cancelInputTransitions(releases.keys(), animations)
		let frame: number | undefined
		let finish!: () => void
		const finished = new Promise<void>(resolve => {
			finish = resolve
			// A frame boundary refreshes the animation clock after synchronous layout work.
			frame = requestAnimationFrame(() => resolve())
		}).then(() => {
			if (frame === undefined) {
				return
			}

			frame = undefined

			const eligible = animations.filter(animation => {
				const item = animation.effect instanceof KeyframeEffect ? animation.effect.target : null

				return (
					item instanceof HTMLElement &&
					ownerByItem.get(item) === releases.get(item) &&
					animation.playState !== 'idle'
				)
			})
			const startTime = document.timeline.currentTime

			for (const animation of eligible) {
				animation.startTime = startTime
			}

			return Promise.allSettled(eligible.map(animation => animation.finished)).then(() => undefined)
		})

		return {
			finished,
			cancel: () => {
				if (frame !== undefined) {
					cancelAnimationFrame(frame)
					frame = undefined
					finish()
				}

				clean()
			},
		}
	} catch (error) {
		clean()
		throw error
	}
}

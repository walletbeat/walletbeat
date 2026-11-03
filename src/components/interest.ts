/** Native interest invokers own hover/focus when available. The fallback only
 * changes popover state; positioning and responsive presentation remain CSS. */
export const interestDelayMs = { start: 50, end: 200 } as const

const sourcesByTarget = new WeakMap<HTMLElement, Set<HTMLElement>>()
const interestSources = new WeakSet<HTMLElement>()

const isInterestBoundary = (element: EventTarget) =>
	element instanceof HTMLElement &&
	(interestSources.has(element) || (sourcesByTarget.get(element)?.size ?? 0) > 0)

const popoverInvoker = (node: HTMLElement, target: HTMLElement) =>
	(node instanceof HTMLLabelElement
		? node.control
		: [...node.querySelectorAll<HTMLElement>('[popovertarget]')].find(
				invoker => invoker.getAttribute('popovertarget') === target.id,
			)) ?? node

export function hasVisiblePopoverInvoker(node: HTMLElement, target: HTMLElement) {
	if (
		node instanceof HTMLLabelElement &&
		(!node.control || node.control.getAttribute('popovertarget') !== target.id)
	) {
		return false
	}

	const invoker = popoverInvoker(node, target)

	return (
		!invoker.matches(':disabled, [aria-disabled="true"]') &&
		invoker.checkVisibility({ visibilityProperty: true })
	)
}

export function interest(
	node: HTMLElement,
	{ id, hideDelay = interestDelayMs.end }: { id?: string; hideDelay?: number },
) {
	if (
		!id ||
		(node instanceof HTMLLabelElement && node.control?.getAttribute('popovertarget') !== id)
	) {
		return
	}

	const target = document.getElementById(id)

	if (!target) {
		return
	}

	interestSources.add(node)
	const sources = sourcesByTarget.get(target) ?? new Set<HTMLElement>()

	sources.add(node)
	sourcesByTarget.set(target, sources)

	// Firefox reflects `popover="hint"` but does not activate it from a
	// popovertarget button on touch. Capture the click so an interactive child
	// cannot suppress the actual around trigger by stopping propagation.
	const showOnClick = () => {
		if (!target.matches(':popover-open') && hasVisiblePopoverInvoker(node, target)) {
			target.showPopover({ source: node })
		}
	}
	const hasClickInvoker = node.matches('button[popovertarget]')

	if (hasClickInvoker) {
		node.addEventListener('click', showOnClick, { capture: true })
	}

	if (
		'interestForElement' in HTMLButtonElement.prototype &&
		node.matches('button[interestfor], a[interestfor]')
	) {
		const keepHoveredPress = (event: Event) => {
			if (event.cancelable && event.target === target && target.matches(':hover:active')) {
				event.preventDefault()
			}
		}

		target.addEventListener('loseinterest', keepHoveredPress)

		return {
			destroy() {
				target.removeEventListener('loseinterest', keepHoveredPress)
				interestSources.delete(node)
				sources.delete(node)

				if (hasClickInvoker) {
					node.removeEventListener('click', showOnClick, { capture: true })
				}
			},
		}
	}

	let timer: ReturnType<typeof setTimeout> | undefined

	const hasPointerInterest = () =>
		node.matches(':hover') &&
		!Array.from(node.querySelectorAll<HTMLElement>(':hover')).some(isInterestBoundary)

	const keepCompanionInterest = (event: Event) => {
		if (
			node instanceof HTMLLabelElement &&
			event.cancelable &&
			event.target === target &&
			hasPointerInterest() &&
			hasVisiblePopoverInvoker(node, target)
		) {
			event.preventDefault()
		}
	}

	const scheduleShow = (delay: number, source?: HTMLElement) => {
		clearTimeout(timer)
		timer = setTimeout(() => {
			if (
				(source !== undefined || hasPointerInterest()) &&
				hasVisiblePopoverInvoker(node, target)
			) {
				target.showPopover({ source: source ?? popoverInvoker(node, target) })
			}
		}, delay)
	}
	const show = (event: Event) => {
		clearTimeout(timer)

		const owner = event.composedPath().find(isInterestBoundary)

		if (owner !== node) {
			return
		}

		if (event instanceof PointerEvent && event.pointerType === 'touch') {
			return
		}

		if (
			event instanceof FocusEvent &&
			((event.target instanceof Element && !event.target.matches(':focus-visible')) ||
				(event.relatedTarget instanceof Element && target.contains(event.relatedTarget)))
		) {
			return
		}

		// Like native interest, passing the pointer over a trigger is not yet intent.
		scheduleShow(
			event instanceof PointerEvent ? interestDelayMs.start : 0,
			event instanceof FocusEvent && event.target instanceof HTMLElement ? event.target : undefined,
		)
	}
	const hide = () => {
		clearTimeout(timer)
		timer = setTimeout(() => {
			if (
				!target.matches(':hover, :focus-within') &&
				!Array.from(sources).some(source => source.matches(':hover, :focus-within'))
			) {
				target.hidePopover()
			}
		}, hideDelay)
	}
	const keepOpen = () => clearTimeout(timer)
	const resumePointerInterest = (event: PointerEvent) => {
		if (
			event.pointerType !== 'touch' &&
			event.composedPath().find(isInterestBoundary) !== node &&
			event.relatedTarget instanceof Element &&
			node.contains(event.relatedTarget)
		) {
			scheduleShow(interestDelayMs.start)
		}
	}

	target.addEventListener('beforetoggle', keepOpen)
	target.addEventListener('loseinterest', keepCompanionInterest)
	node.addEventListener('pointerout', resumePointerInterest)

	for (const element of [node, target]) {
		element.addEventListener('pointerenter', element === node ? show : keepOpen)
		element.addEventListener('pointerleave', hide)
		element.addEventListener('focusin', element === node ? show : keepOpen)
		element.addEventListener('focusout', hide)
	}

	// A pointer may already cover the SSR trigger before these listeners attach.
	if (hasPointerInterest()) {
		scheduleShow(interestDelayMs.start)
	}

	return {
		destroy() {
			clearTimeout(timer)
			interestSources.delete(node)
			sources.delete(node)
			target.removeEventListener('beforetoggle', keepOpen)
			target.removeEventListener('loseinterest', keepCompanionInterest)
			node.removeEventListener('pointerout', resumePointerInterest)

			if (hasClickInvoker) {
				node.removeEventListener('click', showOnClick, { capture: true })
			}

			for (const element of [node, target]) {
				element.removeEventListener('pointerenter', element === node ? show : keepOpen)
				element.removeEventListener('pointerleave', hide)
				element.removeEventListener('focusin', element === node ? show : keepOpen)
				element.removeEventListener('focusout', hide)
			}
		},
	}
}

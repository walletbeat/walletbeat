/** Native interest invokers own hover/focus when available. The fallback only
 * changes popover state; positioning and responsive presentation remain CSS. */
const sourcesByTarget = new WeakMap<HTMLElement, Set<HTMLElement>>()

export function hasVisiblePopoverInvoker(node: HTMLElement) {
	return (node.querySelector<HTMLElement>('[popovertarget]') ?? node).checkVisibility({
		visibilityProperty: true,
	})
}

export function interest(
	node: HTMLElement,
	{ id, hideDelay = 200 }: { id?: string; hideDelay?: number },
) {
	if (!id) {
		return
	}

	const target = document.getElementById(id)

	if (!target) {
		return
	}

	// Firefox reflects `popover="hint"` but does not activate it from a
	// popovertarget button on touch. Capture the click so an interactive child
	// cannot suppress the actual around trigger by stopping propagation.
	const showOnClick = () => {
		if (!target.matches(':popover-open') && hasVisiblePopoverInvoker(node)) {
			target.showPopover()
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
		return {
			destroy() {
				if (hasClickInvoker) {
					node.removeEventListener('click', showOnClick, { capture: true })
				}
			},
		}
	}

	let timer: ReturnType<typeof setTimeout> | undefined

	const sources = sourcesByTarget.get(target) ?? new Set<HTMLElement>()

	sources.add(node)
	sourcesByTarget.set(target, sources)

	const scheduleShow = (delay: number) => {
		clearTimeout(timer)
		timer = setTimeout(() => {
			if (hasVisiblePopoverInvoker(node)) {
				target.showPopover()
			}
		}, delay)
	}
	const show = (event: Event) => {
		if (event instanceof PointerEvent && event.pointerType === 'touch') {
			return
		}

		if (
			event instanceof FocusEvent &&
			event.target instanceof Element &&
			!event.target.matches(':focus-visible')
		) {
			return
		}

		// Like native interest, passing the pointer over a trigger is not yet intent.
		scheduleShow(event instanceof PointerEvent ? 500 : 0)
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

	target.addEventListener('beforetoggle', keepOpen)

	for (const element of [node, target]) {
		element.addEventListener('pointerenter', element === node ? show : keepOpen)
		element.addEventListener('pointerleave', hide)
		element.addEventListener('focusin', element === node ? show : keepOpen)
		element.addEventListener('focusout', hide)
	}

	// A pointer may already cover the SSR trigger before these listeners attach.
	if (node.matches(':hover')) {
		scheduleShow(500)
	}

	return {
		destroy() {
			clearTimeout(timer)
			sources.delete(node)
			target.removeEventListener('beforetoggle', keepOpen)

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

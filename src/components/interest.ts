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
	if (
		!id ||
		('interestForElement' in HTMLButtonElement.prototype &&
			node.matches('button[interestfor], a[interestfor]'))
	) {
		return
	}

	let timer: ReturnType<typeof setTimeout> | undefined
	const target = document.getElementById(id)

	if (!target) {
		return
	}

	const sources = sourcesByTarget.get(target) ?? new Set<HTMLElement>()

	sources.add(node)
	sourcesByTarget.set(target, sources)

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

		clearTimeout(timer)
		// Like native interest, passing the pointer over a trigger is not yet intent.
		timer = setTimeout(
			() => {
				if (hasVisiblePopoverInvoker(node)) {
					target.showPopover()
				}
			},
			event instanceof PointerEvent ? 500 : 0,
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

	target.addEventListener('beforetoggle', keepOpen)

	for (const element of [node, target]) {
		element.addEventListener('pointerenter', element === node ? show : keepOpen)
		element.addEventListener('pointerleave', hide)
		element.addEventListener('focusin', element === node ? show : keepOpen)
		element.addEventListener('focusout', hide)
	}

	return {
		destroy() {
			clearTimeout(timer)
			sources.delete(node)
			target.removeEventListener('beforetoggle', keepOpen)

			for (const element of [node, target]) {
				element.removeEventListener('pointerenter', element === node ? show : keepOpen)
				element.removeEventListener('pointerleave', hide)
				element.removeEventListener('focusin', element === node ? show : keepOpen)
				element.removeEventListener('focusout', hide)
			}
		},
	}
}

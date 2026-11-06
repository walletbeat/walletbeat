import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { interest, interestDelayMs } from './interest'

class TestElement extends EventTarget {
	id = 'details'
	popoverTarget: string | null = null
	hovered = false
	active = false
	nativeInterestInvoker = false
	focused = false
	focusVisible = false
	visible = true
	disabled = false
	ariaDisabled = false
	invoker: TestElement | null = null
	hoveredDescendants: TestElement[] = []
	showPopover = vi.fn()
	hidePopover = vi.fn()

	getAttribute(name: string) {
		return name === 'popovertarget' ? this.popoverTarget : null
	}

	querySelector() {
		return this.invoker
	}

	querySelectorAll(selector: string) {
		if (selector === '[popovertarget]') {
			return this.invoker ? [this.invoker] : []
		}

		return this.hoveredDescendants.filter(element => element.hovered)
	}

	override dispatchEvent(event: Event) {
		if (event.type === 'pointerenter') {
			this.hovered = true
		}

		if (event.type === 'pointerleave') {
			this.hovered = false
		}

		return super.dispatchEvent(event)
	}

	checkVisibility() {
		return this.visible
	}

	contains(element: TestElement) {
		return element === this || element === this.invoker
	}

	matches(selector: string) {
		if (selector === ':hover:active') {
			return this.hovered && this.active
		}

		if (selector === 'button[interestfor], a[interestfor]') {
			return this.nativeInterestInvoker
		}

		if (selector === ':disabled, [aria-disabled="true"]') {
			return this.disabled || this.ariaDisabled
		}

		return selector === ':focus-visible' ? this.focusVisible : this.hovered || this.focused
	}
}

class TestLabel extends TestElement {
	control: TestElement | null = null
}

class TestPointerEvent extends Event {
	constructor(
		type: string,
		public pointerType = 'mouse',
		readonly relatedTarget: TestElement | null = null,
		private readonly path?: EventTarget[],
	) {
		super(type)
	}

	override composedPath() {
		return this.path ?? super.composedPath()
	}
}

class TestFocusEvent extends Event {
	constructor(
		type: string,
		private readonly focusedElement?: TestElement,
		readonly relatedTarget: TestElement | null = null,
		private readonly path?: EventTarget[],
	) {
		super(type)
	}

	override get target() {
		return this.focusedElement ?? super.target
	}

	override composedPath() {
		return this.path ?? super.composedPath()
	}
}

function htmlElement(node: TestElement) {
	if (!(node instanceof HTMLElement)) {
		throw new TypeError('Expected an HTML element in the test environment')
	}

	return node
}

describe('interest fallback lifecycle', () => {
	let node: TestElement
	let target: TestElement
	let cleanup: ReturnType<typeof interest>

	beforeEach(() => {
		vi.useFakeTimers()
		node = new TestElement()
		target = new TestElement()
		vi.stubGlobal('Element', TestElement)
		vi.stubGlobal('HTMLElement', TestElement)
		vi.stubGlobal('HTMLLabelElement', TestLabel)
		vi.stubGlobal('PointerEvent', TestPointerEvent)
		vi.stubGlobal('FocusEvent', TestFocusEvent)
		vi.stubGlobal('HTMLButtonElement', class extends TestElement {})
		vi.stubGlobal('document', { getElementById: () => target })
		cleanup = interest(htmlElement(node), { id: 'details' })
	})

	afterEach(() => {
		cleanup?.destroy()
		vi.useRealTimers()
		vi.unstubAllGlobals()
	})

	it.each(['disabled', 'ariaDisabled'] as const)(
		'checks %s availability when delayed interest resolves for direct, descendant and label invokers',
		state => {
			for (const kind of ['direct', 'descendant', 'label']) {
				const invoker = kind === 'direct' ? node : new TestElement()

				invoker.popoverTarget = target.id

				if (kind === 'label') {
					cleanup?.destroy()
					const label = new TestLabel()

					label.control = invoker
					node = label
					cleanup = interest(htmlElement(node), { id: target.id })
				}

				node.invoker = kind === 'descendant' ? invoker : null
				node.dispatchEvent(new TestPointerEvent('pointerenter'))
				invoker[state] = true
				vi.advanceTimersByTime(interestDelayMs.start)
				expect(target.showPopover).not.toHaveBeenCalled()
				invoker[state] = false
				node.dispatchEvent(new TestPointerEvent('pointerenter'))
				vi.advanceTimersByTime(interestDelayMs.start)
				expect(target.showPopover).toHaveBeenCalledOnce()
				target.showPopover.mockClear()
			}
		},
	)

	it('requires sustained pointer interest rather than opening during a scroll crossing', () => {
		node.invoker = new TestElement()
		node.invoker.popoverTarget = target.id
		node.hovered = true
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		vi.advanceTimersByTime(interestDelayMs.start - 1)
		expect(target.showPopover).not.toHaveBeenCalled()
		vi.advanceTimersByTime(1)
		expect(target.showPopover).toHaveBeenCalledOnce()
		expect(target.showPopover).toHaveBeenCalledWith({ source: node.invoker })
	})

	it('honors existing hover during hydration with the ordinary pointer dwell', () => {
		cleanup?.destroy()
		node.hovered = true
		cleanup = interest(htmlElement(node), { id: 'details' })
		vi.advanceTimersByTime(interestDelayMs.start - 1)
		expect(target.showPopover).not.toHaveBeenCalled()
		vi.advanceTimersByTime(1)
		expect(target.showPopover).toHaveBeenCalledOnce()
	})

	it('checks pointer eligibility after boundary-event hover state settles', () => {
		EventTarget.prototype.dispatchEvent.call(node, new TestPointerEvent('pointerenter'))
		node.hovered = true
		vi.advanceTimersByTime(interestDelayMs.start)
		expect(target.showPopover).toHaveBeenCalledOnce()
	})

	it('cancels pending entry when the pointer leaves', () => {
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		vi.advanceTimersByTime(interestDelayMs.start / 2)
		node.dispatchEvent(new TestPointerEvent('pointerleave'))
		vi.runAllTimers()
		expect(target.showPopover).not.toHaveBeenCalled()
	})

	it('rechecks pointer interest when the dwell expires', () => {
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		node.hovered = false
		vi.advanceTimersByTime(interestDelayMs.start)
		expect(target.showPopover).not.toHaveBeenCalled()
	})

	it('preserves pointer interest through an unregistered descendant', () => {
		const child = new TestElement()

		child.hovered = true
		node.hoveredDescendants = [child]
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		vi.advanceTimersByTime(interestDelayMs.start)
		expect(target.showPopover).toHaveBeenCalledOnce()
	})

	it.each([false, true])(
		'leaves nested pointer entry with its nearest owner (native: %s)',
		native => {
			const inner = new TestElement()
			const innerTarget = new TestElement()

			inner.hovered = true
			node.hoveredDescendants = [inner]
			vi.stubGlobal('document', { getElementById: () => innerTarget })

			if (native) {
				Object.defineProperty(HTMLButtonElement.prototype, 'interestForElement', { value: null })
				vi.spyOn(inner, 'matches').mockImplementation(selector => selector.includes('button'))
			}

			const innerCleanup = interest(htmlElement(inner), { id: 'inner' })

			try {
				node.dispatchEvent(new TestPointerEvent('pointerenter'))
				inner.dispatchEvent(new TestPointerEvent('pointerenter'))
				vi.advanceTimersByTime(interestDelayMs.start)
				expect(target.showPopover).not.toHaveBeenCalled()

				if (!native) {
					expect(innerTarget.showPopover).toHaveBeenCalledOnce()
				}

				innerCleanup?.destroy()
				node.dispatchEvent(new TestPointerEvent('pointerenter'))
				vi.advanceTimersByTime(interestDelayMs.start)
				expect(target.showPopover).toHaveBeenCalledOnce()
			} finally {
				innerCleanup?.destroy()
			}
		},
	)

	it.each([false, true])(
		'yields hydration hover to a child registered during the dwell (native: %s)',
		native => {
			cleanup?.destroy()
			node.hovered = true
			cleanup = interest(htmlElement(node), { id: 'details' })
			vi.advanceTimersByTime(interestDelayMs.start / 2)
			const inner = new TestElement()

			inner.hovered = true
			node.hoveredDescendants = [inner]
			vi.stubGlobal('document', { getElementById: () => new TestElement() })

			if (native) {
				Object.defineProperty(HTMLButtonElement.prototype, 'interestForElement', { value: null })
				vi.spyOn(inner, 'matches').mockImplementation(selector => selector.includes('button'))
			}

			const innerCleanup = interest(htmlElement(inner), { id: 'inner' })

			try {
				vi.advanceTimersByTime(interestDelayMs.start)
				expect(target.showPopover).not.toHaveBeenCalled()
			} finally {
				innerCleanup?.destroy()
			}
		},
	)

	it.each([false, true])('resumes outer dwell when leaving a nested owner (native: %s)', native => {
		const inner = new TestElement()

		inner.hovered = true
		node.hoveredDescendants = [inner]
		vi.stubGlobal('document', { getElementById: () => new TestElement() })

		if (native) {
			Object.defineProperty(HTMLButtonElement.prototype, 'interestForElement', { value: null })
			vi.spyOn(inner, 'matches').mockImplementation(selector => selector.includes('button'))
		}

		const innerCleanup = interest(htmlElement(inner), { id: 'inner' })

		try {
			node.dispatchEvent(new TestPointerEvent('pointerenter'))
			inner.dispatchEvent(new TestPointerEvent('pointerenter'))
			vi.advanceTimersByTime(interestDelayMs.start)
			expect(target.showPopover).not.toHaveBeenCalled()
			node.dispatchEvent(new TestPointerEvent('pointerout', 'mouse', node, [inner, node]))
			inner.hovered = false
			vi.advanceTimersByTime(interestDelayMs.start - 1)
			expect(target.showPopover).not.toHaveBeenCalled()
			vi.advanceTimersByTime(1)
			expect(target.showPopover).toHaveBeenCalledOnce()
		} finally {
			innerCleanup?.destroy()
		}
	})

	it.each([false, true])(
		'preserves nested panel focus and hover ownership (native: %s)',
		native => {
			const inner = new TestElement()
			const panel = new TestElement()
			const link = new TestElement()

			panel.hovered = true
			link.focusVisible = true
			node.hoveredDescendants = [panel]
			vi.stubGlobal('document', { getElementById: () => panel })

			if (native) {
				Object.defineProperty(HTMLButtonElement.prototype, 'interestForElement', { value: null })
				vi.spyOn(inner, 'matches').mockImplementation(selector => selector.includes('button'))
			}

			const innerCleanup = interest(htmlElement(inner), { id: 'inner' })

			try {
				node.dispatchEvent(new TestPointerEvent('pointerenter'))
				node.dispatchEvent(new TestFocusEvent('focusin', link, null, [link, panel, node]))
				vi.runAllTimers()
				expect(target.showPopover).not.toHaveBeenCalled()
			} finally {
				innerCleanup?.destroy()
			}
		},
	)

	it.each(['visible', 'disabled', 'ariaDisabled'] as const)(
		'keeps wrapper interest independent from an unrelated descendant invoker state: %s',
		state => {
			node.invoker = new TestElement()
			node.invoker.popoverTarget = 'unrelated-details'

			if (state === 'visible') {
				node.invoker.visible = false
			} else {
				node.invoker[state] = true
			}

			node.dispatchEvent(new TestPointerEvent('pointerenter'))
			vi.advanceTimersByTime(interestDelayMs.start)

			expect(target.showPopover).toHaveBeenCalledWith({ source: node })
		},
	)

	it.each(['visible', 'disabled', 'ariaDisabled'] as const)(
		'uses the matching descendant after an unrelated invoker and rechecks its %s state',
		state => {
			const unrelated = new TestElement()

			unrelated.popoverTarget = 'unrelated-details'
			const matching = new TestElement()

			matching.popoverTarget = target.id
			vi.spyOn(node, 'querySelectorAll').mockReturnValue([unrelated, matching])

			node.dispatchEvent(new TestPointerEvent('pointerenter'))

			if (state === 'visible') {
				matching.visible = false
			} else {
				matching[state] = true
			}

			vi.advanceTimersByTime(interestDelayMs.start)
			expect(target.showPopover).not.toHaveBeenCalled()

			if (state === 'visible') {
				matching.visible = true
			} else {
				matching[state] = false
			}

			node.dispatchEvent(new TestPointerEvent('pointerenter'))
			vi.advanceTimersByTime(interestDelayMs.start)
			expect(target.showPopover).toHaveBeenCalledOnce()
		},
	)

	it('does not open a wrapper tooltip while CSS hides its native invoker', () => {
		node.invoker = new TestElement()
		node.invoker.popoverTarget = target.id
		node.invoker.visible = false
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		vi.advanceTimersByTime(interestDelayMs.start)
		expect(target.showPopover).not.toHaveBeenCalled()
		node.invoker.visible = true
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		vi.advanceTimersByTime(interestDelayMs.start)
		expect(target.showPopover).toHaveBeenCalledOnce()
	})

	it('checks native availability after the dwell, including a responsive layout change', () => {
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		node.visible = false
		vi.advanceTimersByTime(interestDelayMs.start)
		expect(target.showPopover).not.toHaveBeenCalled()
	})

	it.each([false, true])(
		'opens for visible keyboard focus (descendant: %s) without the pointer dwell',
		descendant => {
			const source = descendant ? new TestElement() : node

			source.focusVisible = true
			node.dispatchEvent(new TestFocusEvent('focusin', source))
			vi.advanceTimersByTime(0)
			expect(target.showPopover).toHaveBeenCalledOnce()
			expect(target.showPopover).toHaveBeenCalledWith({ source })
		},
	)

	it('ignores touch entry and focus that is not visibly keyboard-driven', () => {
		node.dispatchEvent(new TestPointerEvent('pointerenter', 'touch'))
		node.dispatchEvent(new TestFocusEvent('focusin'))
		vi.runAllTimers()
		expect(target.showPopover).not.toHaveBeenCalled()
	})

	it.each([false, true])('leaves nested interest with its nearest owner (native: %s)', native => {
		const inner = new TestElement()
		const innerTarget = new TestElement()
		const source = new TestElement()

		source.focusVisible = true
		vi.stubGlobal('document', { getElementById: () => innerTarget })

		if (native) {
			Object.defineProperty(HTMLButtonElement.prototype, 'interestForElement', { value: null })
			vi.spyOn(inner, 'matches').mockImplementation(selector => selector.includes('button'))
		}

		const innerCleanup = interest(htmlElement(inner), { id: 'inner' })

		try {
			node.dispatchEvent(new TestPointerEvent('pointerenter'))
			node.dispatchEvent(new TestFocusEvent('focusin', source, null, [source, inner, node]))
			vi.runAllTimers()
			expect(target.showPopover).not.toHaveBeenCalled()
			innerCleanup?.destroy()
			node.dispatchEvent(new TestFocusEvent('focusin', source, null, [source, inner, node]))
			vi.runAllTimers()
			expect(target.showPopover).toHaveBeenCalledWith({ source })
		} finally {
			innerCleanup?.destroy()
		}
	})

	it('preserves dismissal when focus returns from the panel, then accepts fresh focus', () => {
		const input = new TestElement()

		target.invoker = input
		node.focusVisible = true
		node.dispatchEvent(new TestFocusEvent('focusin', node, input))
		vi.advanceTimersByTime(0)
		expect(target.showPopover).not.toHaveBeenCalled()
		node.dispatchEvent(new TestFocusEvent('focusin', node, new TestElement()))
		vi.advanceTimersByTime(0)
		expect(target.showPopover).toHaveBeenCalledOnce()
	})

	it('preserves an open target when the pointer moves into its content', () => {
		node.dispatchEvent(new TestPointerEvent('pointerleave'))
		target.hovered = true
		target.dispatchEvent(new TestPointerEvent('pointerenter'))
		vi.runAllTimers()
		expect(target.hidePopover).not.toHaveBeenCalled()
		expect(target.showPopover).not.toHaveBeenCalled()
	})

	it('lets native toggling supersede pending hover so Escape cannot be followed by a reopen', () => {
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		target.dispatchEvent(new Event('beforetoggle'))
		vi.runAllTimers()
		expect(target.showPopover).not.toHaveBeenCalled()
	})

	it('preserves keyboard focus within the target after the pointer leaves', () => {
		target.focused = true
		node.dispatchEvent(new TestPointerEvent('pointerleave'))
		vi.runAllTimers()
		expect(target.hidePopover).not.toHaveBeenCalled()
	})

	it('keeps a shared panel open when moving between its header invokers', () => {
		const other = new TestElement()
		const otherCleanup = interest(htmlElement(other), { id: 'details' })

		try {
			node.hovered = true
			node.dispatchEvent(new TestPointerEvent('pointerenter'))
			vi.advanceTimersByTime(interestDelayMs.start)
			node.hovered = false
			node.dispatchEvent(new TestPointerEvent('pointerleave'))
			other.hovered = true
			other.dispatchEvent(new TestPointerEvent('pointerenter'))
			vi.advanceTimersByTime(interestDelayMs.end)
			expect(target.hidePopover).not.toHaveBeenCalled()
			other.hovered = false
			other.dispatchEvent(new TestPointerEvent('pointerleave'))
			vi.advanceTimersByTime(interestDelayMs.end)
			expect(target.hidePopover).toHaveBeenCalledOnce()
		} finally {
			otherCleanup?.destroy()
		}
	})

	it('leaves native interest ownership intact while repairing click activation', () => {
		cleanup?.destroy()
		Object.defineProperty(HTMLButtonElement.prototype, 'interestForElement', { value: null })
		vi.spyOn(node, 'matches').mockImplementation(selector => selector.includes('button'))
		cleanup = interest(htmlElement(node), { id: 'details' })
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		vi.runAllTimers()
		expect(target.showPopover).not.toHaveBeenCalled()
		node.dispatchEvent(new Event('click'))
		expect(target.showPopover).toHaveBeenCalledOnce()
		expect(target.showPopover).toHaveBeenCalledWith({ source: node })
		cleanup?.destroy()
		cleanup = undefined
		node.dispatchEvent(new Event('click'))
		expect(target.showPopover).toHaveBeenCalledOnce()
	})

	it.each([
		{ active: true, hovered: true, cancelable: true, prevented: true },
		{ active: false, hovered: true, cancelable: true, prevented: false },
		{ active: true, hovered: false, cancelable: true, prevented: false },
		{ active: false, hovered: false, cancelable: true, prevented: false },
		{ active: true, hovered: true, cancelable: false, prevented: false },
	])('guards only cancelable native loss during a hovered press: %j', state => {
		cleanup?.destroy()
		Object.defineProperty(HTMLButtonElement.prototype, 'interestForElement', { value: null })
		node.nativeInterestInvoker = true
		cleanup = interest(htmlElement(node), { id: target.id })
		target.active = state.active
		target.hovered = state.hovered
		const event = new Event('loseinterest', { cancelable: state.cancelable })

		target.dispatchEvent(event)
		expect(event.defaultPrevented).toBe(state.prevented)
		expect(vi.getTimerCount()).toBe(0)
		expect(target.showPopover).not.toHaveBeenCalled()
		expect(target.hidePopover).not.toHaveBeenCalled()
	})

	it('leaves unowned native loss and loss after destruction uncancelled', () => {
		cleanup?.destroy()
		Object.defineProperty(HTMLButtonElement.prototype, 'interestForElement', { value: null })
		node.nativeInterestInvoker = true
		cleanup = interest(htmlElement(node), { id: target.id })
		target.active = true
		target.hovered = true
		const foreign = new TestElement()

		class UnownedInterestEvent extends Event {
			override get target() {
				return foreign
			}
		}
		const unowned = new UnownedInterestEvent('loseinterest', { cancelable: true })

		target.dispatchEvent(unowned)
		expect(unowned.defaultPrevented).toBe(false)
		const owned = new Event('loseinterest', { cancelable: true })

		target.dispatchEvent(owned)
		expect(owned.defaultPrevented).toBe(true)
		cleanup?.destroy()
		cleanup = undefined
		const destroyed = new Event('loseinterest', { cancelable: true })

		target.dispatchEvent(destroyed)
		expect(destroyed.defaultPrevented).toBe(false)
	})

	it('cancels pending entry when the action is destroyed', () => {
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		cleanup?.destroy()
		cleanup = undefined
		vi.runAllTimers()
		expect(target.showPopover).not.toHaveBeenCalled()
	})
})

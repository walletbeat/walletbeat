import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { interest, interestDelayMs } from './interest'

class TestElement extends EventTarget {
	hovered = false
	focused = false
	focusVisible = false
	visible = true
	invoker: TestElement | null = null
	showPopover = vi.fn()
	hidePopover = vi.fn()

	querySelector() {
		return this.invoker
	}

	checkVisibility() {
		return this.visible
	}

	contains(element: TestElement) {
		return element === this || element === this.invoker
	}

	matches(selector: string) {
		return selector === ':focus-visible' ? this.focusVisible : this.hovered || this.focused
	}
}

class TestPointerEvent extends Event {
	constructor(
		type: string,
		public pointerType = 'mouse',
	) {
		super(type)
	}
}

class TestFocusEvent extends Event {
	constructor(
		type: string,
		private readonly focusedElement?: TestElement,
		readonly relatedTarget: TestElement | null = null,
	) {
		super(type)
	}

	override get target() {
		return this.focusedElement ?? super.target
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

	it('requires sustained pointer interest rather than opening during a scroll crossing', () => {
		node.invoker = new TestElement()
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

	it('cancels pending entry when the pointer leaves', () => {
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		vi.advanceTimersByTime(interestDelayMs.start / 2)
		node.dispatchEvent(new TestPointerEvent('pointerleave'))
		vi.runAllTimers()
		expect(target.showPopover).not.toHaveBeenCalled()
	})

	it('does not open a wrapper tooltip while CSS hides its native invoker', () => {
		node.invoker = new TestElement()
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

	it('cancels pending entry when the action is destroyed', () => {
		node.dispatchEvent(new TestPointerEvent('pointerenter'))
		cleanup?.destroy()
		cleanup = undefined
		vi.runAllTimers()
		expect(target.showPopover).not.toHaveBeenCalled()
	})
})

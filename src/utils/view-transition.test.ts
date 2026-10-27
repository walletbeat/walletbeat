import { afterEach, describe, expect, it, vi } from 'vitest'

import { startScopedViewTransition, viewTransitionName } from './view-transition'

const transition = ({
	finished: finishedOverride,
	ready = Promise.resolve(),
	updateCallbackDone = Promise.resolve(),
}: {
	finished?: Promise<void>
	ready?: Promise<void>
	updateCallbackDone?: Promise<void>
} = {}) => {
	let finish!: () => void
	const finished = new Promise<void>(resolve => {
		finish = resolve
	})

	return {
		finished: finishedOverride ?? finished,
		finish,
		ready,
		skipTransition: vi.fn(),
		types: new Set<string>() as ViewTransitionTypeSet,
		updateCallbackDone,
	} satisfies ViewTransition & { finish: () => void }
}

class TestScope {
	attributes = new Set<string>()
	layoutDuration = 250
	layoutEasing = 'ease-out'
	parentElement: TestScope | null = null
	scrollLeft = 0
	scrollWidth = 0
	clientWidth = 0
	removeAttribute = vi.fn((name: string) => this.attributes.delete(name))
	toggleAttribute = vi.fn((name: string, force?: boolean) => {
		if (force === false) {
			this.attributes.delete(name)
		} else {
			this.attributes.add(name)
		}
	})
}

class TestItemEffect {
	target: TestScope | null = null
	pseudoElement: string | null = null
}

class TestItemMotion {
	transitionProperty = ''
	animationName = 'layout-transition'
	startTime: Animation['startTime'] = null
	effect = new TestItemEffect()
	finish!: () => void
	finished = new Promise<void>(resolve => {
		this.finish = resolve
	})
	cancel = vi.fn(() => this.finish())
}

class TestLayoutItem extends TestScope {
	x = 0
	y = 0
	name: string | undefined
	motion = new TestItemMotion()
	extraMotions: TestItemMotion[] = []
	style = { setProperty: vi.fn(), removeProperty: vi.fn() }
	matches = () => this.name !== undefined
	setAttribute = (name: string) => this.attributes.add(name)
	getBoundingClientRect = () => ({ x: this.x, y: this.y })
	getAnimations = () => {
		this.motion.effect.target = this

		return [this.motion, ...this.extraMotions]
	}
}

const layoutStyle = (item: TestScope) => ({
	getPropertyValue: (name: string) => {
		if (name === '--layoutTransition-duration') {
			return String(item.layoutDuration)
		}

		if (name === '--layoutTransition-easing') {
			return item.layoutEasing
		}

		if (name === '--view-transition-name' && item instanceof TestLayoutItem) {
			return item.name ?? ''
		}

		return '0px'
	},
})

function htmlElement(node: TestScope) {
	if (!(node instanceof HTMLElement)) {
		throw new TypeError('Expected an HTML element in the test environment')
	}

	return node
}

const installEnvironment = ({ reducedMotion = false } = {}) => {
	const documentTransition = transition()

	vi.stubGlobal('CSS', { supports: () => true })
	vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }))
	vi.stubGlobal('HTMLElement', TestScope)
	vi.stubGlobal('KeyframeEffect', TestItemEffect)
	vi.stubGlobal('CSSAnimation', TestItemMotion)
	vi.stubGlobal('getComputedStyle', layoutStyle)
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		queueMicrotask(() => callback(0))

		return 1
	})
	vi.stubGlobal('cancelAnimationFrame', vi.fn())
	vi.stubGlobal('document', {
		timeline: { currentTime: 0 },
		startViewTransition: vi.fn((update: () => void) => {
			update()

			return documentTransition
		}),
	})

	return documentTransition
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('startScopedViewTransition', () => {
	it('composes nested replacement peers with one CSS-configured native clock', async () => {
		installEnvironment()
		vi.stubGlobal('CSSTransition', TestItemMotion)
		const root = new TestScope()
		const parent = new TestLayoutItem()

		parent.x = 10
		parent.y = 20
		let child = new TestLayoutItem()

		child.name = 'peer'
		child.x = 20
		child.y = 30
		child.parentElement = parent
		let leaf = new TestLayoutItem()

		leaf.name = 'leaf'
		leaf.x = 25
		leaf.y = 35
		leaf.parentElement = child
		const oldChild = child
		const unrelated = new TestItemMotion()

		unrelated.transitionProperty = 'translate'
		unrelated.effect.target = parent
		unrelated.effect.pseudoElement = '::before'
		parent.extraMotions.push(unrelated)
		Object.assign(root, { querySelectorAll: () => [parent, child, leaf] })

		startScopedViewTransition(
			htmlElement(root),
			() => {
				parent.x = 40
				parent.y = 120
				child = new TestLayoutItem()
				child.name = 'peer'
				child.x = 70
				child.y = 140
				child.parentElement = parent
				leaf = new TestLayoutItem()
				leaf.name = 'leaf'
				leaf.x = 25
				leaf.y = 35
				leaf.parentElement = child
			},
			'live',
		)

		expect(oldChild.style.setProperty).not.toHaveBeenCalled()
		expect(child.style.setProperty).toHaveBeenCalledWith('--layoutTransition-beforeX', '20px')
		expect(child.style.setProperty).toHaveBeenCalledWith('--layoutTransition-parentAfterY', '120px')
		expect(leaf.style.setProperty).toHaveBeenCalledWith('--layoutTransition-parentBeforeX', '20px')
		expect(leaf.style.setProperty).toHaveBeenCalledWith('--layoutTransition-parentAfterX', '70px')
		await Promise.resolve()
		await Promise.resolve()

		for (const item of [parent, child, leaf]) {
			expect(item.motion.startTime).toBe(0)
			expect(item.style.setProperty).toHaveBeenCalledWith('--layoutTransition-duration', '250')
			expect(item.style.setProperty).toHaveBeenCalledWith('--layoutTransition-easing', 'ease-out')
		}
		parent.motion.finish()
		child.motion.finish()
		leaf.motion.finish()
		await vi.waitFor(() => expect(leaf.attributes).not.toContain('data-layout-transition'))
		expect(unrelated.cancel).not.toHaveBeenCalled()
	})

	it('excludes ambiguous named peers and non-HTML nodes without losing retained items', async () => {
		installEnvironment()
		vi.stubGlobal('CSSTransition', TestItemMotion)
		const root = new TestScope()
		const retained = new TestLayoutItem()
		const first = new TestLayoutItem()

		first.name = 'duplicate'
		const second = new TestLayoutItem()

		second.name = 'duplicate'
		const replacement = new TestLayoutItem()

		replacement.name = 'duplicate'
		const foreign = { getBoundingClientRect: vi.fn() }
		let peers = [first, second]

		Object.assign(root, { querySelectorAll: () => [retained, ...peers, foreign] })

		startScopedViewTransition(
			htmlElement(root),
			() => {
				retained.y = 100
				peers = [replacement]
			},
			'live',
		)

		expect(retained.attributes).toContain('data-layout-transition')
		expect(replacement.style.setProperty).not.toHaveBeenCalled()
		expect(foreign.getBoundingClientRect).not.toHaveBeenCalled()
		retained.motion.finish()
		await vi.waitFor(() => expect(retained.attributes).not.toContain('data-layout-transition'))
	})

	it('cancels pending frame activation without losing either update', async () => {
		installEnvironment()
		vi.stubGlobal('CSSTransition', TestItemMotion)
		let activate!: FrameRequestCallback
		const cancelFrame = vi.fn()

		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			activate = callback

			return 7
		})
		vi.stubGlobal('cancelAnimationFrame', cancelFrame)
		const root = new TestScope()
		const item = new TestLayoutItem()
		const first = vi.fn(() => {
			item.y = 100
		})
		const direct = vi.fn()

		Object.assign(root, { querySelectorAll: () => [item] })
		startScopedViewTransition(htmlElement(root), first, 'live')
		expect(item.motion.startTime).toBeNull()
		vi.stubGlobal('matchMedia', () => ({ matches: true }))
		startScopedViewTransition(htmlElement(root), direct, 'none')
		activate(0)
		await Promise.resolve()
		await Promise.resolve()
		expect(first).toHaveBeenCalledOnce()
		expect(direct).toHaveBeenCalledOnce()
		expect(cancelFrame).toHaveBeenCalledWith(7)
		expect(item.motion.startTime).toBeNull()
		expect(item.attributes).not.toContain('data-layout-transition')
	})

	it('preserves live item motion during a direct update', async () => {
		installEnvironment()
		vi.stubGlobal('CSSTransition', TestItemMotion)
		const root = new TestScope()
		const item = new TestLayoutItem()
		const reorder = vi.fn(() => {
			item.y = 100
		})
		const direct = vi.fn()

		Object.assign(root, { querySelectorAll: () => [item] })
		startScopedViewTransition(htmlElement(root), reorder, 'live')
		startScopedViewTransition(htmlElement(root), direct, 'none')
		expect(reorder).toHaveBeenCalledOnce()
		expect(direct).toHaveBeenCalledOnce()
		expect(item.attributes).toContain('data-layout-transition')
		expect(item.style.removeProperty).not.toHaveBeenCalled()
		item.motion.finish()
		await vi.waitFor(() => expect(item.attributes).not.toContain('data-layout-transition'))
	})

	it('keeps a replacement live generation when an old completion arrives', async () => {
		installEnvironment()
		vi.stubGlobal('CSSTransition', TestItemMotion)
		const root = new TestScope()
		const item = new TestLayoutItem()
		const oldMotion = item.motion

		Object.assign(root, { querySelectorAll: () => [item] })
		startScopedViewTransition(
			htmlElement(root),
			() => {
				item.y = 100
			},
			'live',
		)
		startScopedViewTransition(
			htmlElement(root),
			() => {
				item.y = 200
				item.motion = new TestItemMotion()
			},
			'live',
		)
		const cleaned = item.style.removeProperty.mock.calls.length

		oldMotion.finish()
		await oldMotion.finished
		await Promise.resolve()
		await Promise.resolve()
		expect(item.attributes).toContain('data-layout-transition')
		expect(item.style.removeProperty).toHaveBeenCalledTimes(cleaned)
		item.motion.finish()
		await vi.waitFor(() => expect(item.attributes).not.toContain('data-layout-transition'))
	})

	it('uses live layout without depending on native capture support', async () => {
		installEnvironment()
		vi.stubGlobal('document', {})
		vi.stubGlobal('CSS', { supports: () => false })
		const root = new TestScope()
		const querySelectorAll = vi.fn(() => [])
		const update = vi.fn()

		Object.assign(root, { querySelectorAll })
		expect(startScopedViewTransition(htmlElement(root), update, 'live')).toBeUndefined()
		expect(update).toHaveBeenCalledOnce()
		expect(querySelectorAll).toHaveBeenCalled()
		expect(root.attributes).not.toContain('data-view-transition-active')
		await Promise.resolve()
	})

	it('does not measure live layout under reduced motion', () => {
		installEnvironment({ reducedMotion: true })
		const root = new TestScope()
		const update = vi.fn()

		expect(startScopedViewTransition(htmlElement(root), update, 'live')).toBeUndefined()
		expect(update).toHaveBeenCalledOnce()
	})

	it('propagates a live update failure without capturing or retaining state', () => {
		const native = installEnvironment()
		const root = new TestScope()
		const failure = new Error('Update failed')

		Object.assign(root, { querySelectorAll: () => [] })
		expect(() =>
			startScopedViewTransition(
				htmlElement(root),
				() => {
					throw failure
				},
				'live',
			),
		).toThrow(failure)
		expect(native.skipTransition).not.toHaveBeenCalled()
		expect(root.attributes).not.toContain('data-view-transition-active')
	})

	it('updates directly when reduced motion is requested', () => {
		installEnvironment({ reducedMotion: true })
		const root = new TestScope()
		const update = vi.fn()

		expect(startScopedViewTransition(htmlElement(root), update)).toBeUndefined()
		expect(update).toHaveBeenCalledOnce()
		expect(root.attributes).not.toContain('data-view-transition-active')
	})

	it('prefers an element-scoped transition and clears its active marker', async () => {
		installEnvironment()
		const root = new TestScope()
		const scopedTransition = transition()
		const update = vi.fn()

		Object.assign(root, {
			startViewTransition: vi.fn((callback: () => void) => {
				callback()

				return scopedTransition
			}),
		})

		expect(startScopedViewTransition(htmlElement(root), update)).toBe(scopedTransition)
		expect(update).toHaveBeenCalledOnce()
		expect(root.attributes).toContain('data-view-transition-active')
		scopedTransition.finish()
		await scopedTransition.finished
		await Promise.resolve()
		expect(root.attributes).not.toContain('data-view-transition-active')
	})

	it('falls back to a document transition with the same scoped marker', async () => {
		const documentTransition = installEnvironment()
		const root = new TestScope()
		const update = vi.fn()

		expect(startScopedViewTransition(htmlElement(root), update)).toBe(documentTransition)
		expect(update).toHaveBeenCalledOnce()
		expect(root.attributes).toContain('data-view-transition-active')
		documentTransition.finish()
		await documentTransition.finished
		await Promise.resolve()
		expect(root.attributes).not.toContain('data-view-transition-active')
	})

	it('does not measure scroll when only document transitions are supported', () => {
		const documentTransition = installEnvironment()
		const root = new TestScope()

		Object.defineProperty(root, 'scrollLeft', {
			get: () => {
				throw new Error('Unexpected layout read')
			},
		})

		expect(startScopedViewTransition(htmlElement(root), vi.fn())).toBe(documentTransition)
	})

	it('uses the document transition when an ancestor is horizontally scrolled', () => {
		const documentTransition = installEnvironment()
		const scrollContainer = new TestScope()

		scrollContainer.scrollWidth = 1653
		scrollContainer.clientWidth = 1280
		scrollContainer.scrollLeft = 373
		const root = new TestScope()

		root.parentElement = scrollContainer
		const scopedStart = vi.fn()

		Object.assign(root, { startViewTransition: scopedStart })
		const update = vi.fn()

		expect(startScopedViewTransition(htmlElement(root), update)).toBe(documentTransition)
		expect(scopedStart).not.toHaveBeenCalled()
		expect(update).toHaveBeenCalledOnce()
		expect(scrollContainer.scrollLeft).toBe(373)
	})

	it('applies both rapid element-scoped updates exactly once without starting a second transition', () => {
		installEnvironment()
		const root = new TestScope()
		const scopedTransition = transition()
		const firstUpdate = vi.fn()
		const secondUpdate = vi.fn()
		let deferredUpdate!: () => void
		const startViewTransition = vi.fn((update: () => void) => {
			deferredUpdate = update

			return scopedTransition
		})

		Object.assign(root, { startViewTransition })

		expect(startScopedViewTransition(htmlElement(root), firstUpdate)).toBe(scopedTransition)
		expect(firstUpdate).not.toHaveBeenCalled()
		expect(startScopedViewTransition(htmlElement(root), secondUpdate)).toBeUndefined()
		expect(scopedTransition.skipTransition).toHaveBeenCalledOnce()
		expect(startViewTransition).toHaveBeenCalledOnce()
		expect(firstUpdate).toHaveBeenCalledOnce()
		expect(secondUpdate).toHaveBeenCalledOnce()
		expect(root.attributes).not.toContain('data-view-transition-active')

		deferredUpdate()
		expect(firstUpdate).toHaveBeenCalledOnce()
	})

	it('applies both rapid document-scoped updates exactly once across scopes', () => {
		const documentTransition = installEnvironment()
		const firstRoot = new TestScope()
		const secondRoot = new TestScope()
		const firstUpdate = vi.fn()
		const secondUpdate = vi.fn()
		let deferredUpdate!: () => void
		const startViewTransition = vi.fn((update: () => void) => {
			deferredUpdate = update

			return documentTransition
		})

		Object.assign(document, { startViewTransition })

		expect(startScopedViewTransition(htmlElement(firstRoot), firstUpdate)).toBe(documentTransition)
		expect(firstUpdate).not.toHaveBeenCalled()
		expect(startScopedViewTransition(htmlElement(secondRoot), secondUpdate)).toBeUndefined()
		expect(documentTransition.skipTransition).toHaveBeenCalledOnce()
		expect(startViewTransition).toHaveBeenCalledOnce()
		expect(firstUpdate).toHaveBeenCalledOnce()
		expect(secondUpdate).toHaveBeenCalledOnce()
		expect(firstRoot.attributes).not.toContain('data-view-transition-active')
		expect(secondRoot.attributes).not.toContain('data-view-transition-active')

		deferredUpdate()
		expect(firstUpdate).toHaveBeenCalledOnce()
	})

	it('consumes expected interruption rejections from every transition promise', async () => {
		installEnvironment()
		const root = new TestScope()
		const interruptedTransition = transition({
			finished: Promise.reject(new DOMException('Skipped', 'AbortError')),
			ready: Promise.reject(new DOMException('Invalid capture', 'InvalidStateError')),
			updateCallbackDone: Promise.reject(new DOMException('Skipped', 'AbortError')),
		})

		Object.assign(root, {
			startViewTransition: (update: () => void) => {
				update()

				return interruptedTransition
			},
		})

		const reportError = vi.fn()

		vi.stubGlobal('reportError', reportError)
		startScopedViewTransition(htmlElement(root), vi.fn())
		startScopedViewTransition(htmlElement(root), vi.fn(), 'none')
		await Promise.resolve()
		await Promise.resolve()

		expect(root.attributes).not.toContain('data-view-transition-active')
		expect(reportError).not.toHaveBeenCalled()
	})

	it('forces document capture without reading element geometry', () => {
		const documentTransition = installEnvironment()
		const root = new TestScope()
		const scopedStart = vi.fn()

		Object.assign(root, { startViewTransition: scopedStart })
		Object.defineProperty(root, 'scrollLeft', {
			get: () => {
				throw new Error('Unexpected layout read')
			},
		})
		expect(startScopedViewTransition(htmlElement(root), vi.fn(), 'document')).toBe(
			documentTransition,
		)
		expect(scopedStart).not.toHaveBeenCalled()
	})

	it.each(['none', 'reduced-motion'] as const)(
		'flushes pending updates before disabling capture with %s',
		mode => {
			const nativeTransition = installEnvironment()
			const first = new TestScope()
			const second = new TestScope()
			const updates: string[] = []
			let deferred!: () => void

			Object.assign(document, {
				startViewTransition: vi.fn((callback: () => void) => {
					deferred = callback

					return nativeTransition
				}),
			})
			startScopedViewTransition(htmlElement(first), () => updates.push('first'))

			if (mode === 'reduced-motion') {
				vi.stubGlobal('matchMedia', () => ({ matches: true }))
			}

			startScopedViewTransition(
				htmlElement(second),
				() => updates.push('second'),
				mode === 'none' ? 'none' : 'auto',
			)
			deferred()
			expect(updates).toEqual(['first', 'second'])
			expect(nativeTransition.skipTransition).toHaveBeenCalledOnce()
			expect(first.attributes).not.toContain('data-view-transition-active')
			expect(second.attributes).not.toContain('data-view-transition-active')
		},
	)

	it('updates directly without starting capture when disabled', () => {
		installEnvironment()
		const update = vi.fn()
		const start = vi.fn()

		Object.assign(document, { startViewTransition: start })

		expect(startScopedViewTransition(htmlElement(new TestScope()), update, 'none')).toBeUndefined()
		expect(update).toHaveBeenCalledOnce()
		expect(start).not.toHaveBeenCalled()
	})

	it('reports a native layout rejection without converting readiness to success', async () => {
		installEnvironment()
		const failure = new DOMException('Layout capture failed', 'InvalidStateError')
		const nativeTransition = transition({ ready: Promise.reject(failure) })
		const root = new TestScope()
		const reportError = vi.fn()

		vi.stubGlobal('reportError', reportError)
		Object.assign(root, { startViewTransition: () => nativeTransition })
		const result = startScopedViewTransition(htmlElement(root), vi.fn())

		await expect(result?.ready).rejects.toBe(failure)
		expect(reportError).toHaveBeenCalledExactlyOnceWith(failure)
		nativeTransition.finish()
	})

	it('reports an unexpected transition failure once', async () => {
		installEnvironment()
		const reportError = vi.fn()
		const failure = new Error('Update failed')
		const root = new TestScope()
		const failedTransition = transition({
			finished: Promise.reject(failure),
			updateCallbackDone: Promise.reject(failure),
		})

		vi.stubGlobal('reportError', reportError)
		Object.assign(root, {
			startViewTransition: (update: () => void) => {
				update()

				return failedTransition
			},
		})

		startScopedViewTransition(htmlElement(root), vi.fn())
		await Promise.resolve()
		await Promise.resolve()

		expect(reportError).toHaveBeenCalledOnce()
		expect(reportError).toHaveBeenCalledWith(failure)
	})
})

describe('viewTransitionName', () => {
	it('returns stable custom identifiers without separator collisions', () => {
		expect(viewTransitionName('wallet', 'slice', 'security.one')).toBe(
			'vt-77_61_6c_6c_65_74--73_6c_69_63_65--73_65_63_75_72_69_74_79_2e_6f_6e_65',
		)
		expect(viewTransitionName('a-b', 'c')).not.toBe(viewTransitionName('a', 'b-c'))
		expect(viewTransitionName('a_b')).not.toBe(viewTransitionName('a', 'b'))
	})
})

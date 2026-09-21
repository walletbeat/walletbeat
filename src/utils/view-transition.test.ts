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
	removeAttribute = vi.fn((name: string) => this.attributes.delete(name))
	toggleAttribute = vi.fn((name: string, force?: boolean) => {
		if (force === false) {
			this.attributes.delete(name)
		} else {
			this.attributes.add(name)
		}
	})
}

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
	vi.stubGlobal('document', {
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

		startScopedViewTransition(htmlElement(root), vi.fn())
		await Promise.resolve()
		await Promise.resolve()

		expect(root.attributes).not.toContain('data-view-transition-active')
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

import { captureItemPositions, prepareItemReorder } from './layout-transition'

type TransitionScope = HTMLElement & {
	startViewTransition?: (update: () => void) => ViewTransition
}

type NativeActiveTransition = {
	kind: 'native'
	transition: ViewTransition
	update: () => void
	interrupted: boolean
}

type LiveActiveTransition = {
	kind: 'live'
	cancel: () => void
}

type ActiveTransition = NativeActiveTransition | LiveActiveTransition

export type ViewTransitionStrategy = 'auto' | 'document' | 'live' | 'none'

export type TransitionUpdateKind = 'sort' | 'columns' | 'filters'
export type TransitionUpdate<Kind extends TransitionUpdateKind = TransitionUpdateKind> = (
	update: () => void,
	kind?: Kind,
) => void

const activeByScope = new WeakMap<HTMLElement, ActiveTransition>()
let activeDocumentTransition:
	{ document: Document; scope: HTMLElement; active: NativeActiveTransition } | undefined

const interrupt = (owner: HTMLElement, active: ActiveTransition) => {
	if (active.kind === 'native') {
		active.interrupted = true
		active.transition.skipTransition()
		active.update()
	} else {
		active.cancel()
	}

	activeByScope.delete(owner)
	owner.removeAttribute('data-view-transition-active')

	if (activeDocumentTransition?.active === active) {
		activeDocumentTransition = undefined
	}
}

const canTransition = () =>
	typeof document !== 'undefined' &&
	typeof document.startViewTransition === 'function' &&
	CSS.supports('view-transition-name: match-element') &&
	!matchMedia('(prefers-reduced-motion: reduce)').matches

const isExpectedInterruption = (error: unknown, interrupted: boolean) =>
	error instanceof DOMException &&
	(error.name === 'AbortError' || (interrupted && error.name === 'InvalidStateError'))

const hasHorizontalScroll = (scope: HTMLElement) => {
	for (let element: HTMLElement | null = scope; element; element = element.parentElement) {
		if (element.scrollLeft !== 0 && element.scrollWidth > element.clientWidth) {
			return true
		}
	}

	return false
}

/** Build a deterministic, valid custom-ident without allowing part-boundary collisions. */
export const viewTransitionName = (...parts: (number | string)[]) =>
	`vt-${parts
		.map(part =>
			Array.from(String(part), character => character.codePointAt(0)?.toString(16) ?? '').join('_'),
		)
		.join('--')}`

/**
 * Run a synchronous UI update inside an element-scoped View Transition when
 * that does not risk clamping horizontal scroll. Otherwise, use a document
 * transition while the active marker keeps CSS capture local. Callers can force
 * document capture, use live position transitions for retained HTML items in an
 * unscaled axis-aligned scope, or disable capture while preserving update order.
 * Direct updates preserve existing live motion; pending native captures are canceled.
 */
export function startScopedViewTransition(
	scope: TransitionScope,
	update: () => void,
	strategy: ViewTransitionStrategy = 'auto',
): ViewTransition | undefined {
	return runScopedViewTransition(scope, update, strategy)
}

/**
 * Preserve live positions across a native popover update without taking control of its state.
 * Eligible items must remain laid out in both states and use unscaled, axis-aligned motion
 * owners. Keep scale and other visual effects on their children. CSS can opt out by resolving
 * named participants to `none`, so native CSS motion and this enhancement share one capability gate.
 */
export function livePopoverTransition(scope: HTMLElement) {
	let before: ReturnType<typeof captureItemPositions> | undefined
	let frame: number | undefined
	let queued = false
	let expectedOpen = false
	let initialOpen = false

	const apply = () => {
		if (frame !== undefined) {
			cancelAnimationFrame(frame)
			frame = undefined
		}

		const positions = before

		before = undefined

		if (positions && scope.matches(':popover-open') !== initialOpen) {
			runScopedViewTransition(scope, () => {}, 'live', positions)
		}
	}
	const capture = (event: Event) => {
		if (event.target !== scope || !(event instanceof ToggleEvent)) {
			return
		}

		const positions = before ?? captureItemPositions(scope)

		if (positions.size === 0) {
			return
		}

		if (!before) {
			initialOpen = scope.matches(':popover-open')
		}

		before = positions
		expectedOpen = event.newState === 'open'

		if (queued) {
			return
		}

		queued = true
		queueMicrotask(() => {
			queued = false

			if (!before) {
				return
			}

			// Native default actions can checkpoint microtasks before committing their state.
			if (scope.matches(':popover-open') === expectedOpen) {
				apply()
			} else if (frame === undefined) {
				frame = requestAnimationFrame(apply)
			}
		})
	}

	scope.addEventListener('beforetoggle', capture)

	return {
		destroy() {
			scope.removeEventListener('beforetoggle', capture)
			before = undefined

			if (frame !== undefined) {
				cancelAnimationFrame(frame)
			}

			const active = activeByScope.get(scope)

			if (active) {
				interrupt(scope, active)
			}
		},
	}
}

function runScopedViewTransition(
	scope: TransitionScope,
	update: () => void,
	strategy: ViewTransitionStrategy,
	before?: ReturnType<typeof captureItemPositions>,
): ViewTransition | undefined {
	let updated = false
	const applyUpdate = () => {
		if (updated) {
			return
		}

		updated = true
		update()
	}
	const previous = activeByScope.get(scope)

	if (
		previous?.kind === 'live' &&
		strategy === 'none' &&
		typeof document !== 'undefined' &&
		!matchMedia('(prefers-reduced-motion: reduce)').matches
	) {
		if (activeDocumentTransition?.document === document) {
			interrupt(activeDocumentTransition.scope, activeDocumentTransition.active)
		}

		applyUpdate()

		return
	}

	if (
		strategy === 'live' &&
		typeof document !== 'undefined' &&
		!matchMedia('(prefers-reduced-motion: reduce)').matches &&
		activeDocumentTransition?.document !== document &&
		(!previous || previous.kind === 'live')
	) {
		const live = prepareItemReorder(
			scope,
			applyUpdate,
			() => {
				if (previous) {
					interrupt(scope, previous)
				}
			},
			before,
		)
		const active: LiveActiveTransition = { kind: 'live', cancel: live.cancel }

		activeByScope.set(scope, active)
		void live.finished.finally(() => {
			if (activeByScope.get(scope) === active) {
				live.cancel()
				activeByScope.delete(scope)
			}
		})

		return
	}

	if (previous) {
		interrupt(scope, previous)
		applyUpdate()

		return
	}

	const enabled = strategy !== 'none' && strategy !== 'live' && canTransition()
	// Element capture can hide overflow and clamp a scrolling ancestor's position.
	const elementStart =
		enabled && strategy === 'auto' && scope.startViewTransition && !hasHorizontalScroll(scope)
			? scope.startViewTransition
			: undefined

	if (
		!elementStart &&
		typeof document !== 'undefined' &&
		activeDocumentTransition?.document === document
	) {
		interrupt(activeDocumentTransition.scope, activeDocumentTransition.active)
		applyUpdate()

		return
	}

	if (!enabled) {
		applyUpdate()

		return
	}

	scope.toggleAttribute('data-view-transition-active', true)

	let transition: ViewTransition

	try {
		transition = elementStart
			? elementStart.call(scope, applyUpdate)
			: document.startViewTransition(applyUpdate)
	} catch {
		scope.removeAttribute('data-view-transition-active')
		applyUpdate()

		return
	}

	const active: NativeActiveTransition = {
		kind: 'native',
		transition,
		update: applyUpdate,
		interrupted: false,
	}

	activeByScope.set(scope, active)

	if (!elementStart) {
		activeDocumentTransition = { document, scope, active }
	}

	let failureReported = false
	const reportUnexpectedFailure = (error: unknown, interrupted = false) => {
		if (failureReported || isExpectedInterruption(error, interrupted)) {
			return
		}

		failureReported = true
		const actionableError = error instanceof Error ? error : new Error(String(error))
		const reporter = (globalThis as typeof globalThis & { reportError?: (error: unknown) => void })
			.reportError

		if (reporter) {
			reporter(actionableError)
		} else {
			setTimeout(() => {
				throw actionableError
			}, 0)
		}
	}

	const finish = () => {
		if (activeByScope.get(scope) === active) {
			activeByScope.delete(scope)
			scope.removeAttribute('data-view-transition-active')
		}

		if (activeDocumentTransition?.active === active) {
			activeDocumentTransition = undefined
		}
	}

	void transition.ready.catch(error => reportUnexpectedFailure(error, active.interrupted))
	void transition.updateCallbackDone.catch(reportUnexpectedFailure)
	void transition.finished.then(finish, error => {
		finish()
		reportUnexpectedFailure(error)
	})

	return transition
}

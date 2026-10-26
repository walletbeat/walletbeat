import { prepareItemReorder } from './layout-transition'

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
	let updated = false
	const applyUpdate = () => {
		if (updated) {
			return
		}

		updated = true
		update()
	}
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
		const live = prepareItemReorder(scope, applyUpdate, () => {
			if (previous) {
				interrupt(scope, previous)
			}
		})
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

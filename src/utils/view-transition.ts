type TransitionScope = HTMLElement & {
	startViewTransition?: (update: () => void) => ViewTransition
}

type ActiveTransition = {
	transition: ViewTransition
	update: () => void
}

export type TransitionUpdateKind = 'sort' | 'columns' | 'filters'
export type TransitionUpdate<Kind extends TransitionUpdateKind = TransitionUpdateKind> = (
	update: () => void,
	kind?: Kind,
) => void

const activeByScope = new WeakMap<HTMLElement, ActiveTransition>()
let activeDocumentTransition:
	({ document: Document; scope: HTMLElement } & ActiveTransition) | undefined

const canTransition = () =>
	typeof document !== 'undefined' &&
	typeof document.startViewTransition === 'function' &&
	CSS.supports('view-transition-name: match-element') &&
	!matchMedia('(prefers-reduced-motion: reduce)').matches

const isExpectedInterruption = (error: unknown) =>
	error instanceof DOMException &&
	(error.name === 'AbortError' || error.name === 'InvalidStateError')

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
 * transition while the active marker keeps CSS capture local.
 */
export function startScopedViewTransition(
	scope: TransitionScope,
	update: () => void,
): ViewTransition | undefined {
	if (!canTransition()) {
		update()

		return
	}

	// An element-scoped capture can temporarily hide a descendant's overflow from
	// its scrolling ancestor, clamping that ancestor's horizontal position.
	const elementStart =
		scope.startViewTransition && !hasHorizontalScroll(scope) ? scope.startViewTransition : undefined
	const previous = activeByScope.get(scope)

	if (previous) {
		previous.transition.skipTransition()
		previous.update()
		activeByScope.delete(scope)
		scope.removeAttribute('data-view-transition-active')

		if (activeDocumentTransition?.transition === previous.transition) {
			activeDocumentTransition = undefined
		}

		update()

		return
	}

	if (!elementStart && activeDocumentTransition?.document === document) {
		const active = activeDocumentTransition

		active.transition.skipTransition()
		active.update()
		active.scope.removeAttribute('data-view-transition-active')
		activeByScope.delete(active.scope)
		activeDocumentTransition = undefined
		update()

		return
	}

	scope.toggleAttribute('data-view-transition-active', true)

	let updated = false
	const applyUpdate = () => {
		if (updated) {
			return
		}

		updated = true
		update()
	}
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

	const active = { transition, update: applyUpdate }

	activeByScope.set(scope, active)

	if (!elementStart) {
		activeDocumentTransition = { document, scope, ...active }
	}

	let failureReported = false
	const reportUnexpectedFailure = (error: unknown) => {
		if (failureReported || isExpectedInterruption(error)) {
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

		if (activeDocumentTransition?.transition === transition) {
			activeDocumentTransition = undefined
		}
	}

	void transition.ready.catch(reportUnexpectedFailure)
	void transition.updateCallbackDone.catch(reportUnexpectedFailure)
	void transition.finished.then(finish, error => {
		finish()
		reportUnexpectedFailure(error)
	})

	return transition
}

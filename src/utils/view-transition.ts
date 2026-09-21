type TransitionScope = HTMLElement & {
	startViewTransition?: (update: () => void) => ViewTransition
}

const activeByScope = new WeakMap<HTMLElement, ViewTransition>()
let activeDocumentTransition:
	{ document: Document; scope: HTMLElement; transition: ViewTransition } | undefined

const canTransition = () =>
	typeof document !== 'undefined' &&
	typeof document.startViewTransition === 'function' &&
	CSS.supports('view-transition-name: match-element') &&
	!matchMedia('(prefers-reduced-motion: reduce)').matches

/** Build a deterministic, valid custom-ident without allowing part-boundary collisions. */
export const viewTransitionName = (...parts: (number | string)[]) =>
	`vt-${parts
		.map(part =>
			Array.from(String(part), character => character.codePointAt(0)?.toString(16) ?? '').join('_'),
		)
		.join('--')}`

/**
 * Run a synchronous UI update inside the narrowest supported same-document
 * view-transition scope. Browsers without element-scoped transitions fall
 * back to the document while the active marker keeps CSS capture local.
 */
export function startScopedViewTransition(
	scope: TransitionScope,
	update: () => void,
): ViewTransition | undefined {
	if (!canTransition()) {
		update()

		return
	}

	const elementStart = scope.startViewTransition
	const previous = activeByScope.get(scope)

	previous?.skipTransition()
	activeByScope.delete(scope)

	if (!elementStart && activeDocumentTransition?.document === document) {
		activeDocumentTransition.transition.skipTransition()
		activeDocumentTransition.scope.removeAttribute('data-view-transition-active')
		activeByScope.delete(activeDocumentTransition.scope)
		activeDocumentTransition = undefined
	}

	scope.toggleAttribute('data-view-transition-active', true)

	let transition: ViewTransition

	try {
		transition = elementStart
			? elementStart.call(scope, update)
			: document.startViewTransition(update)
	} catch {
		scope.removeAttribute('data-view-transition-active')
		update()

		return
	}

	activeByScope.set(scope, transition)

	if (!elementStart) {
		activeDocumentTransition = { document, scope, transition }
	}

	const finish = () => {
		if (activeByScope.get(scope) === transition) {
			activeByScope.delete(scope)
			scope.removeAttribute('data-view-transition-active')
		}

		if (activeDocumentTransition?.transition === transition) {
			activeDocumentTransition = undefined
		}
	}

	void transition.finished.then(finish, finish)

	return transition
}

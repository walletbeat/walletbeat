export const withViewTransition = <T extends (...args: any) => void>(fn: T): T => (
	globalThis?.document?.startViewTransition ?
		(...args) => document.startViewTransition(() => fn(...args))
	:
		fn
)

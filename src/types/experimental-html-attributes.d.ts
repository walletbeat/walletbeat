import 'svelte/elements'

declare module 'svelte/elements' {
	export interface HTMLAnchorAttributes {
		/** ID of the element targeted by the experimental interest invoker API. */
		interestfor?: string | null
	}
}

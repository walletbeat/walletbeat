import 'svelte/elements'

declare module 'svelte/elements' {
	interface HTMLButtonAttributes {
		interestfor?: string
	}

	interface HTMLAnchorAttributes {
		interestfor?: string
	}
}

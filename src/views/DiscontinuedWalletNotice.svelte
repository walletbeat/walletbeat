<script lang="ts">
	// Types/constants
	import type { WalletDiscontinuation } from '@/schema/wallet'


	// Functions
	import { refs } from '@/schema/reference'


	// Props
	const {
		displayName,
		discontinued,
	}: {
		displayName: string
		discontinued: WalletDiscontinuation
	} = $props()


	// (Derived)
	const references = $derived(refs(discontinued))


	// Components
	import ReferenceLinks from '@/views/ReferenceLinks.svelte'
</script>


<aside
	class="discontinued-notice"
	aria-label="Discontinued wallet"
	data-card="secondary padding-5 border-accent"
	data-column="gap-3"
	style:--accent="#f59e0b"
>
	<p>
		<strong>{displayName} has been discontinued</strong>
		(since <time datetime={discontinued.date}>{discontinued.date}</time>).
		It is no longer offered as a product, so it is not listed in the wallet tables.
		This page is kept for reference, and its data and ratings may be out of date.
	</p>

	{#if references.length > 0}
		<ReferenceLinks {references} />
	{/if}
</aside>

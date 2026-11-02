<script module lang="ts">
	const insideEipLinkContextKey = Symbol('insideEipLink')
</script>


<script lang="ts">
	// Props
	const {
		eipNumber,
		url,
		labelHtml,
	}: {
		eipNumber: number
		url: string
		labelHtml: string
	} = $props()


	// Functions
	import { getContext, setContext } from 'svelte'
	import { lookupEip } from '@/data/eips'


	// Context
	// EIP links inside EIP details render as plain links.
	const isNested = getContext<boolean | undefined>(insideEipLinkContextKey) === true
	setContext(insideEipLinkContextKey, true)


	// Derived
	const eip = $derived(lookupEip(eipNumber))


	// Components
	import Tooltip from '@/components/Tooltip.svelte'
	import EipDetails from '@/views/EipDetails.svelte'
</script>


{#if eip && !isNested}
	<!-- `hoverTriggerPlacement="button"` keeps the trigger's own positioning. -->
	<Tooltip
		placement="block-end"
		hoverTriggerPlacement="button"
	>
		<span class="eip-link-label" data-link>{@html labelHtml}</span>

		{#snippet TooltipContent()}
			<div class="eip-tooltip-content">
				<EipDetails {eip} />
			</div>
		{/snippet}
	</Tooltip>
{:else}
	<a href={url}>{@html labelHtml}</a>
{/if}


<style>
	/* Buttons center their text; keep long labels aligned with the surrounding text when they wrap. */
	:global([data-tooltip-trigger]):has(> .eip-link-label) {
		text-align: inherit;
	}

	.eip-tooltip-content {
		width: 34rem;
		max-width: 100%;
	}
</style>

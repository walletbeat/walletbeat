<script lang="ts">
	import Tooltip from '@/components/Tooltip.svelte'

	let directCount = $state(0)
	let wrapperCount = $state(0)
</script>

<div data-column="gap-6" data-tag-composition>
	<div data-row="start gap-2 wrap" data-tag-palette>
		{#each ['', 'wallet-type', 'account-type', 'eip', 'eip-status', 'manufacture-type', 'eoa'] as token}
			<span data-tag={token}>{token || 'Default'}</span>
		{/each}
	</div>
	<section data-tag-case="direct" data-row="start gap-2 wrap">
		<button data-tag="account-type" onclick={() => directCount++}>Filter EOA</button>
		<output aria-label="Direct filter count">{directCount}</output>
	</section>
	<section data-tag-case="native" data-row="start gap-2 wrap">
		<Tooltip title="Native tag details">
			<span data-tag="eip">EIP-7702</span>
			{#snippet TooltipContent()}<a href="#tag-destination">Native details link</a>{/snippet}
		</Tooltip>
	</section>
	<section data-tag-case="wrapper" data-row="start gap-2 wrap">
		<Tooltip title="Wrapper tag details" buttonTriggerPlacement="behind" hoverTriggerPlacement="around">
			<button data-tag="eip" onclick={() => wrapperCount++}>Filter EIP-7702</button>
			{#snippet TooltipContent()}<a href="#tag-destination">Wrapper details link</a>{/snippet}
		</Tooltip>
		<output aria-label="Wrapper filter count">{wrapperCount}</output>
	</section>
	<button data-input-reference>Reference input</button>
	<button data-tag-outside>Outside controls</button>
	<p id="tag-destination">Tag details destination</p>
</div>

<style>
	[data-tag-composition] {
		padding: 2rem;
		font-size: 0.85em;
	}
</style>

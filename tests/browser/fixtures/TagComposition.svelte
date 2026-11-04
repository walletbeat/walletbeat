<script lang="ts">
	import Tooltip from '@/components/Tooltip.svelte'

	let directCount = $state(0)
	let wrapperCount = $state(0)
	let denseCount = $state(0)
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
	<section data-tag-case="link" data-row="start gap-2 wrap">
		<a data-tag="eip" data-tag-link="default" href="#tag-destination">Read Ethereum account implementation details and compatibility information</a>
		<a
			data-tag="eip"
			data-tag-link="override"
			href="#tag-destination"
			style="--tag-backgroundColor: var(--text-primary); --tag-textColor: var(--background-primary); --tag-borderColor: var(--text-primary); --tag-hover-backgroundColor: var(--background-primary); --tag-hover-textColor: var(--text-primary); --tag-hover-borderColor: var(--text-primary);"
		>Read overridden EIP details</a>
		<span data-tag="eip" data-tag-link-reference>Reference EIP label</span>
	</section>
	<section data-tag-case="density" data-column="gap-1">
		<div data-row="start gap-1 wrap">
			<button data-tag="account-type" data-tag-dense-action onclick={() => denseCount++}>Filter EOA</button>
			<a data-tag="eip" href="#tag-destination">ERC-4337</a>
			<span data-tag="wallet-type">Software</span>
			<span data-tag="eip">EthereumAccountImplementationCompatibilityInformation</span>
		</div>
		<!-- cspell:ignore تفاصيل حساب إيثريوم محفظة برمجية -->
		<div dir="rtl" lang="ar" data-row="start gap-1 wrap">
			<a data-tag="eip" href="#tag-destination">تفاصيل حساب إيثريوم</a>
			<span data-tag="wallet-type">محفظة برمجية</span>
		</div>
		<div style="font-size: 1.25em;" data-row="start gap-1 wrap">
			<a data-tag="eip" href="#tag-destination"><em>Read</em> <code>ERC-4337</code></a>
			<span style="font-size: smaller;"><span data-tag="eip">Nested label</span></span>
		</div>
		<output aria-label="Dense action count">{denseCount}</output>
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

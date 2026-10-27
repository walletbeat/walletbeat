<script lang="ts">
	import Tooltip from '@/components/Tooltip.svelte'
	import TooltipOrAccordion from '@/components/TooltipOrAccordion.svelte'
</script>

<section data-timing-case="native">
	<Tooltip>
		<span>Native hover</span>
		{#snippet TooltipContent()}<a href="#timing-end">Native target link</a>{/snippet}
	</Tooltip>
</section>
<section data-timing-case="wrapper">
	<Tooltip title="Wrapper details" buttonTriggerPlacement="behind" hoverTriggerPlacement="around">
		<a href="#timing-end">Wrapper hover</a>
		{#snippet TooltipContent()}<a href="#timing-end">Wrapper target link</a>{/snippet}
	</Tooltip>
</section>
<section data-timing-case="stacked">
	<TooltipOrAccordion isExpanded={false}>
		<span>Stacked hover</span>
		{#snippet ExpandedContent()}<a href="#timing-end">Stacked target link</a>{/snippet}
	</TooltipOrAccordion>
</section>
<p id="timing-end">Timing destination</p>

<style>
	section { margin: 4rem; inline-size: fit-content; }
</style>

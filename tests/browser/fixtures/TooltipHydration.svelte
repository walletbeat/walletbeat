<script lang="ts">
	import TooltipOrAccordion from '@/components/TooltipOrAccordion.svelte'

	let expanded = $state({ closed: false, open: true })
	const groups = ['closed', 'open'] as const
</script>

<main>
	<h1>Native disclosure hydration</h1>
	{#each groups as group (group)}
		<section data-disclosure-group={group}>
			<h2>Initially {group}</h2>
			<button onclick={() => expanded[group] = !expanded[group]}>Toggle {group} group</button>
			<output>{String(expanded[group])}</output>
			{#each [0, 1] as index (index)}
				<TooltipOrAccordion
					id={index === 1 ? `${group}-explicit` : undefined}
					bind:isExpanded={expanded[group]}
					showAccordionMarker
				>
					{group} disclosure {index + 1}
					{#snippet ExpandedContent()}
						<p>Native disclosure content {group} {index + 1}.</p>
					{/snippet}
				</TooltipOrAccordion>
			{/each}
		</section>
	{/each}
	<section data-foreground-controls>
		<h2>Foreground actions</h2>
		<TooltipOrAccordion
			id="foreground-disclosure"
			isExpanded={false}
			tooltipButtonTriggerPlacement="behind"
		>
			<span data-row="center gap-3 wrap">
				<span data-foreground-summary>Foreground summary</span>
				<a href="#foreground-destination">Foreground link</a>
				<button type="button" popovertarget="foreground-independent-popover">Foreground command</button>
				<label><input type="checkbox" /> Foreground option</label>
			</span>
			{#snippet ExpandedContent()}
				<p>Foreground disclosure content.</p>
				<a href="#foreground-destination" data-drawer-link>Drawer link</a>
			{/snippet}
		</TooltipOrAccordion>
		<div id="foreground-independent-popover" popover="auto">Independent native command.</div>
		<p id="foreground-destination">Foreground destination.</p>
	</section>
</main>

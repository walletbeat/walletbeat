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
</main>

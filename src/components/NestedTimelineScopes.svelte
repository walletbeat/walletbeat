<script lang="ts">
	import type { Snippet } from 'svelte'

	const {
		timelines,
		children,
	}: {
		timelines: string[]
		children: Snippet
	} = $props()
</script>


{#snippet scope(index: number)}
	{#if index < timelines.length}
		<div
			class="timeline-scope"
			style:---timeline={timelines[index]}
		>
			{@render scope(index + 1)}
		</div>
	{:else}
		{@render children()}
	{/if}
{/snippet}


{@render scope(0)}


<style>
	@supports ((animation-timeline: scroll()) and (animation-range: 0% 100%)) {
		.timeline-scope {
			display: contents;
			timeline-scope: var(---timeline);
		}
	}
</style>

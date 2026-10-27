<script lang="ts">
	import { onMount } from 'svelte'
	import Pie from '@/components/Pie.svelte'
	import { PieLayout, type LevelConfig, type Slice } from '@/components/pie-geometry'

	let changed = $state(false)
	let ready = $state(false)
	onMount(() => { ready = true })
	const slices: Slice[] = $derived([
		{ id: 'security', color: 'teal', weight: changed ? 4 : 1, arcLabel: 'S', ariaLabel: 'Security' },
		{ id: 'privacy', color: 'purple', weight: changed ? 1 : 4, arcLabel: 'P', ariaLabel: 'Privacy' },
	])
	const levels: LevelConfig[] = [{ outerRadiusFraction: 1, innerRadiusFraction: 0.2, gap: 2, angleGap: 5, outerCornerRadius: 4, innerCornerRadius: 4 }]
	let activations = $state(0)
</script>

<button id="change-pie-weights" disabled={!ready} onclick={() => { changed = !changed }}>Change weights</button>
<output>Activations: {activations}</output>
<div class="cases">
	{#each Object.values(PieLayout) as layout (layout)}
		{#each ['link', 'button', 'static'] as kind (kind)}
			<section data-pie-case={`${layout}-${kind}`}>
				<h2>{layout} {kind}</h2>
				<Pie
					slices={slices.map(slice => ({ ...slice, href: kind === 'link' ? '#pie-destination' : undefined }))}
					{layout} {levels} radius={40} padding={4}
					onSliceClick={kind === 'button' ? () => { activations++ } : undefined}
				/>
			</section>
		{/each}
	{/each}
</div>
<p id="pie-destination">Pie destination</p>

<style>
	.cases { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
	h2 { font-size: 1rem; }
</style>

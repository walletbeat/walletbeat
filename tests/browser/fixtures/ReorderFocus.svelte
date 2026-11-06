<script lang="ts">
	import { flushSync, onMount } from 'svelte'
	import { startScopedViewTransition, type ViewTransitionStrategy } from '@/utils/view-transition'

	let scope: HTMLDivElement
	let outside: HTMLButtonElement
	let interactive = $state(false)
	let rows = $state([1, 2, 3, 4])
	let invalidated = $state<number | null>(null)
	let behavior = $state('move')
	let strategy: ViewTransitionStrategy = $state('live')
	onMount(() => { interactive = true })

	const reorder = (id: number) => {
		const focused = document.activeElement

		startScopedViewTransition(scope, () => {
			if (behavior === 'blur-before' && focused instanceof HTMLElement) focused.blur()

			if (behavior === 'outside-before') outside.focus()

			flushSync(() => {
				rows = [...rows.slice(1), ...rows.slice(0, 1)]

				if (behavior === 'remove') rows = rows.filter(row => row !== id)

				if (['disable', 'hide', 'inert'].includes(behavior)) invalidated = id
			})

			if (behavior === 'outside-after') outside.focus()
		}, strategy)
	}
</script>

<label>Transition strategy
	<select bind:value={strategy}>
		<option value="live">Live</option><option value="none">None</option><option value="document">Document</option>
	</select>
</label>
<label>Update behavior
	<select bind:value={behavior}>
		{#each ['move', 'blur-before', 'outside-before', 'outside-after', 'remove', 'disable', 'hide', 'inert'] as value (value)}
			<option {value}>{value}</option>
		{/each}
	</select>
</label>
<button onclick={() => { rows = [1, 2, 3, 4]; invalidated = null }}>Reset rows</button>
<div bind:this={scope} data-focus-scope style="--layoutTransition-duration: 150; --layoutTransition-easing: linear">
	{#each rows as row (row)}
		<div data-view-transition="item" data-focus-row={row} hidden={invalidated === row && behavior === 'hide'} inert={invalidated === row && behavior === 'inert'}>
			<button disabled={!interactive || (invalidated === row && behavior === 'disable')} onclick={() => reorder(row)}>Move row {row}</button>
		</div>
	{/each}
</div>
<button bind:this={outside}>Outside control</button>

<script lang="ts">
	import { onMount } from 'svelte'
	import Table, { type Column, SortDirection } from '@/components/Table.svelte'
	import { startScopedViewTransition } from '@/utils/view-transition'
	let { deep = false }: { deep?: boolean } = $props()
	let viewport: HTMLDivElement | undefined
	let ready = $state(false)
	let extraCount = $state(0)
	onMount(() => { ready = true })

	type Row = { name: string; value: number }
	const rows: Row[] = [{ name: 'First wallet', value: 1 }, { name: 'Second wallet', value: 2 }]
	const columns: Column<Row>[] = [
		{ id: 'name', name: 'Wallet', value: row => row.name, isSticky: true },
		{
			id: 'attributes', name: 'Attributes', value: row => row.value,
			sort: { isDefault: true, defaultDirection: SortDirection.Ascending }, isDefaultExpanded: true,
			subcolumns: Array.from({ length: 12 }, (_, index) => ({
				id: `attribute-${index}`, name: `Attribute ${index + 1}`, value: (row: Row) => row.value,
			})),
		},
	]
</script>

{#snippet extraControl({ column }: { column: Column<Row> })}
	<button type="button" class="expansion-button" aria-label={`${column.name} action`} disabled={!ready} onclick={() => { extraCount += 1 }}></button>
{/snippet}

{#snippet tableContent()}
	<Table {rows} rowId={row => row.name} columns={[...columns, {
		id: 'custom', name: 'Custom', value: row => row.value, HeaderExtra: extraControl,
		sort: { defaultDirection: SortDirection.Ascending },
	}]} tableId="header-controls" transitionUpdate={update => {
		if (viewport) startScopedViewTransition(viewport, update, 'live')
		else update()
	}} />
{/snippet}

<div class="viewport" bind:this={viewport} data-header-controls data-scroll-container data-sticky-container>
	{#if deep}
		<div data-sticky-container>
			<div data-sticky-container>
				<div data-sticky-container>
					<div data-sticky-container>{@render tableContent()}</div>
				</div>
			</div>
		</div>
	{:else}
		{@render tableContent()}
	{/if}
	<output aria-label="Extra action count">{extraCount}</output>
</div>

<style>
	.viewport {
		inline-size: min(1000px, 100%);
		block-size: 300px;
		overflow: auto;
		--sticky-marginBlockStart: 3rem;
		--layoutTransition-duration: 1000;
	}
	.viewport :global(td:not([data-sticky])) { min-inline-size: 210px; }
</style>

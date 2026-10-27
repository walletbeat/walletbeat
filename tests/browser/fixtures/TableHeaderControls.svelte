<script lang="ts">
	import Table, { type Column, SortDirection } from '@/components/Table.svelte'
	import { startScopedViewTransition } from '@/utils/view-transition'
	let viewport: HTMLDivElement | undefined

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

<div class="viewport" bind:this={viewport} data-header-controls data-scroll-container data-sticky-container>
	<Table {rows} rowId={row => row.name} {columns} tableId="header-controls" transitionUpdate={update => {
		if (viewport) startScopedViewTransition(viewport, update, 'live')
		else update()
	}} />
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

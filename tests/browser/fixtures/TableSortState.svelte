<script lang="ts">
	import Table, { TableState, SortDirection, type Column } from '@/components/Table.svelte'

	const rows = [2, 1, 3]
	const fallback: Column<number> = {
		id: 'fallback', name: 'Fallback', value: row => -row,
		sort: { isDefault: true, defaultDirection: SortDirection.Ascending },
	}
	const selected: Column<number> = {
		id: 'selected', name: 'Selected', value: row => row,
		sort: { defaultDirection: SortDirection.Ascending },
	}
	const group: Column<number> = {
		id: 'group', name: 'Group', value: row => row, subcolumns: [selected], isDefaultExpanded: true,
	}
	const table = new TableState({ rows, columns: [fallback, group] })
</script>

<button onclick={() => table.sortState = { columnId: 'selected', direction: SortDirection.Ascending }}>Ascending</button>
<button onclick={() => table.sortState = { columnId: 'selected', direction: SortDirection.Descending }}>Descending</button>
<button onclick={() => table.columns = [fallback]}>Remove selected</button>
<button onclick={() => table.columns = [group]}>Remove default</button>
<button onclick={() => table.columns = []}>Remove all</button>
<button onclick={() => table.columns = [fallback, group]}>Restore</button>
<button onclick={() => table.expandedColumnIds.clear()}>Collapse state</button>
<output data-sort>{table.sortState?.columnId ?? 'none'}:{table.sortState?.direction ?? 'none'}</output>
<output data-column>{table.sortedColumn?.id ?? 'none'}</output>
<output data-rows>{table.rowsSorted.join(',')}</output>
<output data-visible>{table.columnsVisible.map(column => column.id).join(',')}</output>

<Table {rows} rowId={row => String(row)} columns={table.columns} tableId="sort-state" rowIsDisabled={(row, state) =>
	state.sortedColumn?.id === 'selected' ? row === 2 : state.sortedColumn?.id === 'fallback' && row === 1
}>
	{#snippet Cell({ row })}{row}{/snippet}
</Table>

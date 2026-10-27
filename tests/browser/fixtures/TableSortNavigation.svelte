<script module lang="ts">
	export const modes = ['default', 'wallet-asc', 'wallet-desc', 'stage-asc', 'stage-desc', 'attributes-asc', 'missing', 'baseline'] as const
	export type Mode = (typeof modes)[number]
</script>

<script lang="ts">
	import Table, { type Column } from '@/components/Table.svelte'
	import { SortDirection, type SortState } from '@/components/table-sort'

	let { mode }: { mode: Mode } = $props()
	type Row = { id: string; wallet: string; stage: number | undefined; attributes: number | undefined }
	type ColumnId = 'wallet' | 'stage' | 'attributes'
	const rows: Row[] = [
		{ id: 'c', wallet: 'Cedar', stage: 3, attributes: 50 },
		{ id: 'a', wallet: 'Aster', stage: 2, attributes: 20 },
		{ id: 'd', wallet: 'Dune', stage: undefined, attributes: undefined },
		{ id: 'b', wallet: 'Birch', stage: 1, attributes: 90 },
	]
	const columns: Column<Row, string | number | undefined, ColumnId>[] = [
		{ id: 'wallet', name: 'Wallet', value: row => row.wallet, sort: { defaultDirection: SortDirection.Ascending } },
		{ id: 'stage', name: 'Stage', value: row => row.stage, sort: { defaultDirection: SortDirection.Descending } },
		{ id: 'attributes', name: 'Attributes', value: row => row.attributes, sort: { isDefault: true, defaultDirection: SortDirection.Descending } },
	]
	const requests: Record<Mode, SortState<ColumnId> | undefined> = {
		default: undefined,
		'wallet-asc': { columnId: 'wallet', direction: SortDirection.Ascending },
		'wallet-desc': { columnId: 'wallet', direction: SortDirection.Descending },
		'stage-asc': { columnId: 'stage', direction: SortDirection.Ascending },
		'stage-desc': { columnId: 'stage', direction: SortDirection.Descending },
		'attributes-asc': { columnId: 'attributes', direction: SortDirection.Ascending },
		missing: { columnId: 'stage', direction: SortDirection.Ascending },
		baseline: undefined,
	}
	const action = (columnId: ColumnId, sort: SortState<ColumnId> | undefined) => {
		const id = `sort-navigation-${columnId}`
		const nextMode = !sort || (sort.columnId === 'attributes' && sort.direction === SortDirection.Descending)
			? 'default' : `${sort.columnId}-${sort.direction}`

		return { id, url: `/__table-sort-navigation/${nextMode}/#${id}` }
	}
</script>

<form hidden id="sort-navigation-form" method="get" action="/__table-sort-navigation/default/">
	<input type="hidden" name="witness" value="native" />
	<input hidden disabled required name="excluded" aria-label="Required witness" />
</form>

<Table
	{rows}
	rowId={row => row.id}
	columns={mode === 'missing' ? columns.filter(column => column.id !== 'stage') : columns}
	initialSort={requests[mode]}
	sortNavigation={mode === 'baseline' ? undefined : { form: 'sort-navigation-form', action }}
	tableId="sort-navigation"
	displaceDisabledRows
	rowIsDisabled={(row, table) => table.sortedColumn?.value(row) === undefined}
>
	{#snippet Cell({ value })}{value ?? 'Unknown'}{/snippet}
</Table>

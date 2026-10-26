<script lang="ts">
	import Table, { type Column, SortDirection } from '@/components/Table.svelte'

	type Row = { name: string; stage: number; security: string; privacy: string }
	const rows: Row[] = [{ name: 'Wallet', stage: 1, security: 'Supported', privacy: 'Supported' }]
	const longRows = Array.from({ length: 100 }, () => ({ ...rows[0] }))
	const columns: Column<Row>[] = [
		{ id: 'name', name: 'Wallet', value: (row: Row) => row.name, isSticky: true },
		{ id: 'stage', name: 'Stage', value: (row: Row) => row.stage, sort: { defaultDirection: SortDirection.Ascending } },
		{
			id: 'attributes', name: 'Attributes', value: () => '', isDefaultExpanded: true,
			subcolumns: [
				{ id: 'security', name: 'Security', value: (row: Row) => row.security },
				{ id: 'privacy', name: 'Privacy', value: (row: Row) => row.privacy },
			],
		},
	]
	const unsupportedColumns: Column<Row>[] = [
		{ ...columns[0], id: 'walletGroup', name: 'Wallet group', isDefaultExpanded: true, subcolumns: [columns[0]] },
		{ ...columns[1], isSticky: true },
		columns[2],
	]
</script>

{#each ['first', 'second', 'known-zero', 'unsupported'] as name (name)}
	<div class="viewport" data-fixture={name} data-scroll-container style:---table-sticky-size={name === 'known-zero' ? '123px' : undefined}>
		<Table rows={name === 'first' ? longRows : rows} rowId={(_: Row, index: number) => index} columns={name === 'unsupported' ? unsupportedColumns : name === 'known-zero' ? columns.map(column => ({ ...column, isSticky: false })) : columns} tableId={`sticky-size-${name}`} />
	</div>
{/each}

<style>
	.viewport {
		inline-size: min(1000px, 100%);
		block-size: 250px;
		overflow: auto;
		margin-block: 2rem;
		--table-inlineSize: 1600px;
	}
	.viewport + .viewport { inline-size: min(850px, 100%); }
</style>

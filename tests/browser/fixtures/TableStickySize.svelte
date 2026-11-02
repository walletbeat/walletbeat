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
	const expandedLeafColumns: Column<Row>[] = [
		{
			id: 'identity', name: 'Identity', value: () => '', isSticky: true, isDefaultExpanded: true,
			subcolumns: [columns[0], { id: 'model', name: 'Model', value: () => 'Hardware model and variant' }],
		},
		...columns.slice(1),
	]
	const leafCases = [
		{ name: 'flat', columns },
		{ name: 'expanded', columns: expandedLeafColumns },
		{ name: 'unsupported', columns: unsupportedColumns },
		{ name: 'empty', columns: [] },
	]
</script>

{#each ['first', 'second', 'known-zero', 'unsupported'] as name (name)}
	<div class="viewport" data-fixture={name} data-scroll-container style:---table-sticky-size={name === 'known-zero' ? '123px' : undefined}>
		<Table rows={name === 'first' ? longRows : rows} rowId={(_: Row, index: number) => index} columns={name === 'unsupported' ? unsupportedColumns : name === 'known-zero' ? columns.map(column => ({ ...column, isSticky: false })) : columns} tableId={`sticky-size-${name}`} />
	</div>
{/each}

{#each leafCases as fixture (fixture.name)}
	{#each [false, true] as enabled (enabled)}
		<div class="viewport" data-leaf-fixture={fixture.name} data-measure-leaf={enabled} data-scroll-container>
			<Table rows={rows} columns={fixture.columns} stickyLeafInlineSize={enabled ? '6rem' : undefined} />
		</div>
	{/each}
{/each}

<style>
	.viewport {
		inline-size: min(1000px, 100%);
		block-size: 250px;
		overflow: auto;
		margin-block: 2rem;
		--table-inlineSize: 1600px;
	}
	[data-leaf-fixture] :global([data-table-column='name']) { min-inline-size: 22.75rem; }
	[data-leaf-fixture] :global([data-table-column='model']) { min-inline-size: 12rem; }
	.viewport + .viewport { inline-size: min(850px, 100%); }
</style>

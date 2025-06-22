<script lang="ts" generics="
	_DataTable extends DataTable,
	RowId
">
	// Types
	import { DataTable, type Column } from '@/lib/DataTable.svelte'
	import type { Snippet } from 'svelte'

	type _RowValue = _DataTable extends DataTable<infer RowValue, any, any> ? RowValue : any
	type _CellValue = _DataTable extends DataTable<any, infer CellValue, any> ? CellValue : any
	type _ColumnId = _DataTable extends DataTable<any, any, infer ColumnId> ? ColumnId : string
	type _Column = Column<_RowValue, _CellValue, _ColumnId>


	// IDs
	const id = $props.id()


	// Inputs
	let {
		tableId = `table_${id}`,
		columns,
		defaultSort,
		rows,
		getId,
		isRowDisabled,
		getCellVerticalAlign,
		cellSnippet,
		headerCellSnippet,
		expandHeaderCells = true,
		onRowClick,
		displaceDisabledRows = false,
		sortedColumn = $bindable(),
		...restProps
	}: {
		tableId?: string
		columns: _Column[]
		defaultSort?: NonNullable<ConstructorParameters<typeof DataTable<_RowValue, _CellValue, _ColumnId>>[0]['defaultSort']>
		rows: _RowValue[]
		getId?: (row: _RowValue, index: number) => RowId
		isRowDisabled: (row: _RowValue, table: DataTable<_RowValue, _CellValue, _ColumnId>) => boolean
		getCellVerticalAlign?: (args: {
			row: _RowValue
			column: _Column
			value: _CellValue
		}) => 'top' | 'middle' | 'bottom' | 'baseline' | undefined
		cellSnippet?: Snippet<[{
			row: _RowValue
			column: _Column
			value: _CellValue
		}]>
		headerCellSnippet?: Snippet<[{
			column: _Column
		}]>
		onRowClick?: (row: _RowValue, rowId?: RowId) => void
		displaceDisabledRows?: boolean
		expandHeaderCells?: boolean
		sortedColumn?: _Column | undefined
	} = $props()

	// (Derived)
	let columnsById = $derived.by(() => {
		const columnsById = new Map<_ColumnId, _Column>()
		
		const addColumns = (columns: _Column[]) => {
			for (const column of columns) {
				columnsById.set(column.id, column)

				if(column.children?.length)
					addColumns(column.children)
			}
		}
		
		addColumns(columns)

		return columnsById
	})

	let maxHeaderLevel = $derived.by(() => {
		const getMaxLevel = (columns: _Column[]): number => (
			Math.max(
				1,
				...columns.map(column => (
					!column.children?.length ?
						1
					:
						1 + getMaxLevel(column.children)
				))
			)
		)
		return (
			expandHeaderCells ?
				getMaxLevel(columns)
			:
				1
		)
	})

	$effect(() => {
		sortedColumn = (
			table.columnSort?.columnId && (
				columnsById.get(table.columnSort.columnId)
			)
		)
	})


	// State
	let table = $state(
		new DataTable({
			data: rows,
			columns,
			defaultSort,
			isRowDisabled,
			displaceDisabledRows,
		})
	)

	$effect(() => {
		table = new DataTable({
			data: rows,
			columns,
			defaultSort,
			isRowDisabled,
			displaceDisabledRows,
		})
	})


	// Functions
	const getColumnSpan = (column: _Column): number => (
		!column.children?.length ?
			1
		:
			column.children
				.reduce(
					(sum, childColumn) => (
						!childColumn.children?.length ?
							sum + 1
						:
							sum + getColumnSpan(childColumn)
					),
					0
				)
	)


	// Transitions/animations
	import { flip } from 'svelte/animate'
	import { fade, fly } from 'svelte/transition'
	import { expoOut } from 'svelte/easing'
</script>


<div
	{...restProps}
	id={tableId}
	 class="container {'class' in restProps ? restProps.class : ''}"
>
	<table>
		<colgroup>
			{#each table.columnsVisible as column (column.id)}
				{@const columnSpan = getColumnSpan(column)}
				{@const isSortable = column.isSortable !== false}

				<col
					span={columnSpan}
					data-sortable={isSortable ? '' : undefined}
					data-sort={table.columnSort?.columnId === column.id ? table.columnSort?.direction : undefined}
				/>
			{/each}
		</colgroup>

		<thead>
			{@render headerRows(table.columns, 0)}

			{#snippet headerRows(columns: (_Column | undefined)[], level: number)}
				{@const nextLevelColumns = (
					columns
						.flatMap(column => (
							!column ?
								[undefined]
							: column.children?.length && table.isColumnExpanded(column.id) ?
								column.children
							:
								Array.from({ length: getColumnSpan(column) }, () => undefined)
						))
				)}

				<tr in:fly={{ y: '-50%', duration: 300, easing: expoOut }}>
					{#each columns as column, index (column?.id ?? `blank-${level}-${index}`)}
						{#if column}
							{@render headerCell(column, level)}
						{:else if !expandHeaderCells}
							<th class="blank-cell"></th>
						{/if}
					{/each}
				</tr>

				{#if nextLevelColumns.some(column => column)}
					{@render headerRows(nextLevelColumns, level + 1)}
				{/if}
			{/snippet}

			{#snippet headerCell(column: _Column, level: number)}
				{@const colspan = getColumnSpan(column)}
				{@const isSortable = column.isSortable !== false}
				{@const isExpandable = !!column.children?.length}
				{@const isExpanded = table.isColumnExpanded(column.id)}

				<th
					{colspan}
					rowspan={
						expandHeaderCells && (!isExpandable || !isExpanded) ?
							maxHeaderLevel - level
						:
							undefined
					}
					data-header-level={level}
					data-sortable={isSortable ? '' : undefined}
					data-sort={table.columnSort?.columnId === column.id ? table.columnSort?.direction : undefined}
					data-is-sticky={column.isSticky ? '' : undefined}
					data-expandable={isExpandable ? '' : undefined}
					data-expanded={isExpandable && isExpanded ? '' : undefined}
				>
					<div class="header-cell-content">
						{#if isSortable}
							<label class="sort-label">
								{#if headerCellSnippet}
									{@render headerCellSnippet({ column })}
								{:else}
									<span>{column.name}</span>
								{/if}

								<button
									type="button"
									aria-label={`Sort by ${column.name}`}
									class="sort-button"
									onclick={() => {
										table.toggleColumnSort(column.id)
									}}
									disabled={column.isSortable === false}
								></button>
							</label>
						{:else}
							{#if headerCellSnippet}
								{@render headerCellSnippet({ column })}
							{:else}
								<span>{column.name}</span>
							{/if}
						{/if}

						{#if isExpandable}
							<button 
								type="button"
								class="expansion-button"
								onclick={() => {
									table.toggleIsColumnExpanded(column.id)
								}}
								title={isExpanded ? 'Collapse' : 'Expand'}
								aria-label={isExpanded ? 'Collapse' : 'Expand'}
							></button>
						{/if}
					</div>
				</th>
			{/snippet}
		</thead>

		<tbody>
			{#each table.rowsVisible as row, index (getId?.(row, index))}
				{@const rowId = getId?.(row, index)}

				<tr
					tabIndex={0}
					onclick={e => {
						e.stopPropagation()
						onRowClick?.(row, rowId)
					}}
					onkeypress={e => {
						if(e.code === 'Enter' || e.code === 'Space'){
							e.stopPropagation()
							onRowClick?.(row, rowId)
						}
					}}
					onkeyup={e => {
						if(e.code === 'ArrowUp'){
							e.preventDefault()

							const row = e.currentTarget.previousElementSibling ?? e.currentTarget.parentElement?.lastElementChild
							if(row instanceof HTMLElement)
								row.focus()
						}
						else if(e.code === 'ArrowDown'){
							e.preventDefault()

							const row = e.currentTarget.nextElementSibling ?? e.currentTarget.parentElement?.firstElementChild
							if(row instanceof HTMLElement)
								row.focus()
						}
					}}
					animate:flip={{ duration: 300, easing: expoOut }}
					data-disabled={isRowDisabled?.(row, table) ? '' : undefined}
				>
					{#each table.columnsVisible as column (column.id)}
						{@const isSortable = column.isSortable !== false}
						{@const value = column.getValue?.(row)}
						{@const columnSpan = getColumnSpan(column)}

						<td
							colspan={columnSpan}
							data-column={column.id}
							data-row={rowId}
							data-sortable={isSortable ? '' : undefined}
							data-sort={table.columnSort?.columnId === column.id ? table.columnSort?.direction : undefined}
							data-is-sticky={column.isSticky ? '' : undefined}
							style:--table-cell-verticalAlign={
								getCellVerticalAlign?.({
									row,
									column,
									value,
								})
							}
							animate:flip={{ duration: 300, easing: expoOut }}
							in:fade={{ duration: 300, easing: expoOut }}
						>
							{#if cellSnippet}
								{@render cellSnippet({
									row,
									column,
									value,
								})}
							{:else}
								{value}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>


<style>	
	.container {
		--table-backgroundColor: #22242b;
		--table-outerBorderColor: rgba(20, 21, 25, 1);
		--table-innerBorderColor: rgba(20, 21, 25, 1);
		--table-borderWidth: 1px;
		--table-cornerRadius: 1rem;
		--table-cell-verticalAlign: middle;
		--table-cell-padding: 0.75em;

		scroll-padding: var(--table-borderWidth);

		background-color: var(--table-backgroundColor);
		box-shadow: 0 0 0 var(--table-borderWidth) var(--table-outerBorderColor) inset;
		border-radius: var(--table-cornerRadius);

		clip-path: inset(
			calc(-1 * var(--table-borderWidth))
			calc(-1 * var(--table-borderWidth))
			calc(-1 * var(--table-borderWidth))
			calc(-1 * var(--table-borderWidth))
			round var(--table-cornerRadius)
		);
	}

	table {
		min-width: 100%;
		width: max-content;
		margin-inline: calc(-1 * var(--table-borderWidth));

		border-collapse: separate;
		border-spacing: var(--table-borderWidth);

		thead {
			font-size: 0.75em;
			text-wrap: nowrap;

			position: sticky;
			top: 0;
			z-index: 1;

			tr {
				th {
					&:not(:empty) {
						backdrop-filter: blur(20px);
					}

					&[data-header-level='0'] {
						font-weight: 700;
						font-size: 1.1em;
						background-color: color-mix(in oklch, var(--table-backgroundColor), rgba(255, 255, 255, 0.02));
					}
					&[data-header-level='1'] {
						font-weight: 600;
						font-size: 0.825em;
						background-color: color-mix(in oklch, var(--table-backgroundColor), rgba(255, 255, 255, 0.01));
					}
					&[data-header-level='2'] {
						font-weight: 500;
						font-size: 0.7em;
						background-color: color-mix(in oklch, var(--table-backgroundColor), rgba(255, 255, 255, 0.005));
					}
					&[data-header-level='3'] {
						font-weight: 400;
						font-size: 0.7em;
						background-color: color-mix(in oklch, var(--table-backgroundColor), rgba(255, 255, 255, 0.0025));
					}

					> .header-cell-content {
						display: grid;
						grid-auto-flow: column;
						grid-template-columns: 1fr;
						grid-auto-columns: auto;
						align-items: center;
						gap: 0.25em;
					}

					&[data-sortable] {
						--column-sortIndicator-transform: perspective(1000px) scale(0);
						--column-sortIndicator-fontSize: 0;

						&[data-sort='asc'] {
							--column-sortIndicator-transform: perspective(1000px);
							--column-sortIndicator-fontSize: 1em;
						}

						&[data-sort='desc'] {
							--column-sortIndicator-transform: perspective(1000px) rotateX(180deg);
							--column-sortIndicator-fontSize: 1em;
						}

						&[data-sort] {
							filter: brightness(150%);
						}

						.sort-label {
							display: flex;
							align-items: center;
							justify-content: center;
							cursor: pointer;

							.sort-button {
								margin-inline-start: 0.5em;
								display: inline-block;
								padding: 0;

								background-color: transparent;
								border: none;
								outline: none;

								&::after {
									content: '↑';

									display: inline-block;

									font-size: var(--column-sortIndicator-fontSize);
									font-family: system-ui;

									transform: var(--column-sortIndicator-transform);

									transition-property: transform, font-size;
								}
							}
						}

						&:has(.sort-button:focus) {
							outline: 1px solid var(--accent);
							border-radius: 0.5em;
						}
					}

					&[data-expandable] {
						--isExpanded: 0;

						cursor: pointer;

						&[data-expanded] {
							--isExpanded: 1;
						}

						.expansion-button {
							background-color: transparent;

							flex: 0 0 auto;
							font-size: 0.75em;
							padding: 0.33em;
							border: none;
							margin-inline-end: -0.25em;

							transition-property: background-color, transform, opacity;

							&:hover {
								background-color: rgba(255, 255, 255, 0.15);
							}

							&:after {
								content: '';
								width: 1em;
								height: 1em;
								background-color: currentColor;
								mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 3 3'%3E%3Cpath d='m.5 1 1 1 1-1' fill='none' stroke='black' stroke-width='0.5' stroke-linecap='round' stroke-linejoin='round' /%3E%3C/svg%3E");
								transform: perspective(100px) rotateX(calc(var(--isExpanded) * -180deg));
								transition-property: transform;
							}
						}
					}
				}
			}
		}

		tbody {
			isolation: isolate;

			counter-reset: TableRowCount;

			tr {
				--table-row-backgroundColor: light-dark(rgba(0, 0, 0, 0.03), rgba(255, 255, 255, 0.03));

				&:not([data-disabled]) {
					counter-increment: TableRowCount;
				}

				counter-reset: TableColumnCount;

				box-shadow:
					0 var(--table-borderWidth) var(--table-outerBorderColor),
					0 calc(-1 * var(--table-borderWidth)) var(--table-outerBorderColor);

				&:nth-of-type(odd) {
					background-color: var(--table-row-backgroundColor);
				}

				&[tabIndex='0'] {
					cursor: pointer;

					transition: var(--active-transitionOutDuration) var(--transition-easeOutExpo);

					& td.sticky {
						transition: var(--active-transitionOutDuration) var(--active-transitionOutDuration)
							var(--transition-easeOutExpo);
					}

					&:hover {
						--table-row-backgroundColor: light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.05));
					}

					&:active:not(:has([tabindex='0']:active)) {
						transition-duration: var(--active-transitionInDuration);
						opacity: var(--active-opacity);
						scale: var(--active-scale);

						&:active {
							--borderColor: transparent;
						}

						box-shadow: none;

						& td.sticky {
							backdrop-filter: none;
							transition:
								all var(--active-transitionInDuration),
								backdrop-filter none;
							opacity: 0;
							scale: 0.9;
						}
					}
				}

				&[data-disabled] {
					filter: grayscale();
					opacity: 0.3;
				}

				> td {
					box-shadow: var(--table-borderWidth) 0 var(--table-row-backgroundColor);
					vertical-align: var(--table-cell-verticalAlign);

					counter-increment: TableColumnCount;

					/* When sorting a non-sticky column, fade cells from other non-sticky columns */
					tr:has(:not([data-is-sticky])[data-sort]) &:not([data-sort], [data-is-sticky], :hover, :focus-within) {
						opacity: 0.66;
					}
				}
			}
		}

		th,
		td {
			padding: var(--table-cell-padding);

			&[data-align='start'] {
				text-align: start;
				align-items: start;
				transform-origin: left;
			}
			&[data-align='end'] {
				text-align: end;
				align-items: end;
				transform-origin: right;
			}

			/* &[data-is-sticky],
			&[data-sort]:not([data-is-sticky]) { */
			&[data-is-sticky] {
				position: sticky;
				backdrop-filter: blur(20px);
				z-index: 1;
				inset-inline-start: 0;
				inset-inline-end: 0;
			}
		}
	}
</style>

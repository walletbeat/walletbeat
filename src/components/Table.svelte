<script lang="ts" generics="
	_TableState extends TableState,
	RowId
">
	// Types
	import type { SvelteHTMLElements } from 'svelte/elements'
	import type { Snippet } from 'svelte'
	import { type Column,TableState } from '@/components/TableState.svelte'

	type _RowValue = _TableState extends TableState<infer RowValue, any, any> ? RowValue : any
	type _CellValue = _TableState extends TableState<any, infer CellValue, any> ? CellValue : any
	type _ColumnId = _TableState extends TableState<any, any, infer ColumnId> ? ColumnId : string
	type _Column = Column<_RowValue, _CellValue, _ColumnId>


	// IDs
	const id = $props.id()


	// Inputs
	let {
		tableId = `table_${id}`,

		rows,
		rowId: getRowId,
		rowIsDisabled,
		displaceDisabledRows = false,
		onRowClick,

		columns,
		sortedColumn = $bindable(),

		expandHeaderCells = true,

		cellVerticalAlign,
		Cell,

		...restProps
	}: SvelteHTMLElements['div'] & {
		tableId?: string

		rows: _RowValue[]

		rowId?: (row: _RowValue, index: number) => RowId
		rowIsDisabled?: (row: _RowValue, table: TableState<_RowValue, _CellValue, _ColumnId>) => boolean
		onRowClick?: (row: _RowValue, rowId?: RowId) => void
		displaceDisabledRows?: boolean

		columns: _Column[]
		sortedColumn?: _Column | undefined

		expandHeaderCells?: boolean

		Cell?: Snippet<[{
			row: _RowValue
			column: _Column
			value: _CellValue
		}]>
		cellVerticalAlign?: (args: {
			row: _RowValue
			column: _Column
			value: _CellValue
		}) => 'top' | 'middle' | 'bottom' | 'baseline' | undefined
	} = $props()


	// State
	let table = $state(
		new TableState({
			data: rows,
			columns,
			rowIsDisabled,
			displaceDisabledRows,
		})
	)

	$effect(() => {
		table = new TableState({
			data: rows,
			columns,
			rowIsDisabled,
			displaceDisabledRows,
		})
	})

	$effect(() => {
		sortedColumn = table.sortedColumn
	})


	// Functions
	const getColumnSpan = (column: _Column): number => (
		!column.subcolumns?.length ?
			1
		:
			column.subcolumns
				.reduce(
					(sum, childColumn) => (
						!childColumn.subcolumns?.length ?
							sum + 1
						:
							sum + getColumnSpan(childColumn)
					),
					0
				)
	)


	// Transitions/animations
	import { flip } from 'svelte/animate'
	import { expoOut } from 'svelte/easing'
	import { fade, fly } from 'svelte/transition'
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
				{@const isSortable = !!column.sort}

				<col
					span={columnSpan}
					data-sortable={isSortable ? '' : undefined}
					data-sort={table.sortState?.columnId === column.id ? table.sortState?.direction : undefined}
				/>
			{/each}
		</colgroup>

		<thead data-sticky="block">
			{@render headerRows(table.columns, 0)}

			{#snippet headerRows(columns: (_Column | undefined)[], level: number)}
				{@const nextLevelColumns =
					columns
						.flatMap(column => (
							!column ?
								[undefined]
							: column.subcolumns?.length && table.isColumnExpanded(column.id) ?
								column.subcolumns
							:
								Array.from({ length: getColumnSpan(column) }, () => undefined)
						))
				}

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
				{@const isSortable = !!column.sort}
				{@const isExpandable = !!column.subcolumns?.length}
				{@const isExpanded = table.isColumnExpanded(column.id)}

				<th
					{colspan}
					rowspan={
						expandHeaderCells && (!isExpandable || !isExpanded) ?
							table.maxHeaderLevel - level
						:
							undefined
					}
					data-header-level={level}
					data-sortable={isSortable ? '' : undefined}
					data-sort={table.sortState?.columnId === column.id ? table.sortState?.direction : undefined}
					data-sticky={column.isSticky ? 'inline' : undefined}
					data-expandable={isExpandable ? '' : undefined}
					data-expanded={isExpandable && isExpanded ? '' : undefined}
				>
					<div
						class="header-cell-content"
						data-sticky-container
					>
						{#snippet HeaderTitle()}
							<span
								class="header-title"
							>
								{#if column.HeaderTitle}
									{@render column.HeaderTitle({ column })}
								{:else}
									{column.name}
								{/if}
							</span>
						{/snippet}

						<div data-sticky-container>
							{#if isSortable}
								<label class="sort-label" data-pressable="to-containing">
									<span data-sticky="no-backdrop">
										{@render HeaderTitle()}

										<button
											type="button"
											aria-label={`Sort by ${column.name}`}
											class="sort-button"
											onclick={() => {
												table.toggleColumnSort(column.id)
											}}
											disabled={!column.sort}
										></button>
									</span>
								</label>
							{:else}
								<span data-sticky>
									{@render HeaderTitle()}
								</span>
							{/if}
						</div>

						{#if isExpandable}
							<button
								type="button"
								class="expansion-button"
								data-sticky
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
			{#each table.rowsVisible as row, index (getRowId?.(row, index))}
				{@const rowId = getRowId?.(row, index)}

				<tr
					tabIndex={onRowClick ? 0 : undefined}
					data-pressable={onRowClick ? '' : undefined}
					onclick={e => {
						// e.stopPropagation()
						onRowClick?.(row, rowId)
					}}
					onkeypress={e => {
						if(e.code === 'Enter' || e.code === 'Space'){
							// e.stopPropagation()
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
					data-disabled={rowIsDisabled?.(row, table) ? '' : undefined}
				>
					{#each table.columnsVisible as column (column.id)}
						{@const isSortable = !!column.sort}
						{@const value = column.value?.(row)}
						{@const columnSpan = getColumnSpan(column)}

						<td
							colspan={columnSpan}
							data-sortable={isSortable ? '' : undefined}
							data-sort={table.sortState?.columnId === column.id ? table.sortState?.direction : undefined}
							data-sticky={column.isSticky ? 'inline' : undefined}
							style:--table-cell-verticalAlign={
								cellVerticalAlign?.({
									row,
									column,
									value,
								})
							}
							animate:flip={{ duration: 300, easing: expoOut }}
							in:fade={{ duration: 300, easing: expoOut }}
						>
							{#if column.Cell}
								{@render column.Cell({
									row,
									column,
									value,
								})}
							{:else if Cell}
								{@render Cell({
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
		--table-backgroundColor: light-dark(#fdfdfd, #22242b);
		--table-outerBorderColor: var(--border-color);
		--table-innerBorderColor: color-mix(in oklch, var(--border-color) 50%, transparent);
		--table-outerBorderWidth: 1px;
		--table-innerBorderWidth: 1px;
		--table-cornerRadius: 1rem;
		--table-cell-verticalAlign: middle;
		--table-cell-padding: 0.75em;

		scroll-padding: var(--table-outerBorderWidth);

		background-color: var(--table-backgroundColor);
		box-shadow: 0 0 0 var(--table-outerBorderWidth) var(--table-outerBorderColor) inset;
		border-radius: calc(var(--table-cornerRadius) + var(--table-outerBorderWidth));

		clip-path: inset(
			0 0 0 0
			round calc(var(--table-cornerRadius) + var(--table-outerBorderWidth))
		);
	}

	:where(table) {
		min-width: 100%;
		width: max-content;
		/* margin-inline: calc(-1 * var(--table-borderWidth)); */

		border-collapse: separate;
		border-spacing: var(--table-innerBorderWidth);

		:where(thead) {
			font-size: 0.75em;
			text-wrap: nowrap;

			position: sticky;
			top: 0;
			z-index: 1;

			border-start-start-radius: calc(var(--table-cornerRadius) + var(--table-outerBorderWidth));
			border-start-end-radius: calc(var(--table-cornerRadius) + var(--table-outerBorderWidth));

			@container not scroll-state(stuck: none) {
				border-start-start-radius: 0;
				border-start-end-radius: 0;
			}

			:where(tr) {
				:where(th) {
					/* &:not(:empty) {
						backdrop-filter: blur(20px);
					} */

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

						&[data-sticky-container] {
							--sticky-paddingInlineEnd: 0.5em;
						}

						> [data-sticky-container] {
							--sticky-paddingInlineEnd: 1em;
						}
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

							padding: var(--table-cell-padding);

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
							outline: var(--table-outerBorderWidth) solid var(--accent);
							outline-offset: calc(-1 * var(--table-outerBorderWidth));
							border-radius: 0.5em;
						}

						.header-title {
							white-space: wrap;
							flex: 0 0 0;
							width: 0;
							min-width: fit-content;
						}
					}

					&[data-expandable] {
						--isExpanded: 0;

						cursor: pointer;

						&[data-expanded] {
							--isExpanded: 1;
						}

						.expansion-button {
							margin: var(--table-cell-padding);
							margin-inline-start: calc(-2 * var(--table-cell-padding));

							background-color: transparent;

							flex: 0 0 auto;
							font-size: 0.75em;
							padding: 0.33em;
							border: none;

							transition-property: background-color, transform, opacity;

							&:hover {
								background-color: rgba(255, 255, 255, 0.15);
							}

							&:after {
								content: '';
								width: 1em;
								height: 1em;
								background-color: currentColor;
								mask-image: var(--icon-chevron);
								transform: perspective(100px) rotateX(calc(var(--isExpanded) * -180deg));
								transition-property: transform;
							}
						}
					}
				}

				&:first-child {
					border-start-start-radius: var(--table-cornerRadius) !important;
					border-start-end-radius: var(--table-cornerRadius) !important;

					:where(th) {
						&:first-child {
							border-start-start-radius: var(--table-cornerRadius) !important;
						}
						&:last-child {
							border-start-end-radius: var(--table-cornerRadius) !important;
						}
					}
				}

				@container not scroll-state(stuck: none) {
					&:first-child {
						border-start-start-radius: 0.5em !important;
						border-start-end-radius: 0.5em !important;

						:where(th) {
							&:first-child {
								border-start-start-radius: 0.5em !important;
							}
							&:last-child {
								border-start-end-radius: 0.5em !important;
							}
						}
					}
				}
			}
		}

		:where(tbody) {
			isolation: isolate;

			border-end-start-radius: calc(var(--table-cornerRadius) + var(--table-outerBorderWidth));
			border-end-end-radius: calc(var(--table-cornerRadius) + var(--table-outerBorderWidth));

			counter-reset: TableRowCount;

			:where(tr) {
				--table-row-backgroundColor: light-dark(rgba(0, 0, 0, 0.03), rgba(255, 255, 255, 0.03));

				&:not([data-disabled]) {
					counter-increment: TableRowCount;
				}

				counter-reset: TableColumnCount;

				box-shadow:
					0 var(--table-innerBorderWidth) var(--table-innerBorderColor),
					0 calc(-1 * var(--table-innerBorderWidth)) var(--table-innerBorderColor);

				&:nth-of-type(odd) {
					background-color: var(--table-row-backgroundColor);
				}

				&[data-pressable] {
					cursor: pointer;

					& td.sticky {
						transition: var(--pressable-transitionOutDuration) var(--pressable-transitionOutDuration)
							var(--transition-easeOutExpo);
					}

					&:hover {
						--table-row-backgroundColor: light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.05));
					}

					&:active:not(:has([tabindex='0']:active)) {
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

				> :where(td) {
					box-shadow: var(--table-innerBorderWidth) 0 var(--table-row-backgroundColor);
					vertical-align: var(--table-cell-verticalAlign);

					counter-increment: TableColumnCount;

					/* When sorting a non-sticky column, fade cells from other non-sticky columns */
					tr:has(:not([data-sticky])[data-sort]) &[data-sortable]:not([data-sort], [data-sticky], :hover, :focus-within) {
						opacity: 0.66;
					}
				}
			}

			/* &:last-child {
				:where(tr):last-child {
					border-end-start-radius: var(--table-cornerRadius);
					border-end-end-radius: var(--table-cornerRadius);

					:where(td) {
						&:first-child {
							border-end-start-radius: var(--table-cornerRadius);
						}
						&:last-child {
							border-end-end-radius: var(--table-cornerRadius);
						}
					}
				}
			} */
		}

		:where(
			th,
			td
		) {
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

			/* &[data-sticky],
			&[data-sort]:not([data-sticky]) { */
			/* &[data-sticky] {
				position: sticky;
				backdrop-filter: blur(20px);
				z-index: 1;
				inset-inline-start: 0;
				inset-inline-end: 0;
			} */
		}

		:where(th) {
			position: relative;
		}

		:where(td) {
			padding: var(--table-cell-padding);
		}
	}
</style>

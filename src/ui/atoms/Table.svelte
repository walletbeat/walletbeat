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


	// Inputs
	let {
		columns,
		defaultSort,
		rows,
		getId,
		isRowDisabled,
		cellSnippet,
		headerCellSnippet,
		onRowClick,
		displaceDisabledRows = false,
		...restProps
	}: {
		columns: _Column[]
		defaultSort?: NonNullable<ConstructorParameters<typeof DataTable<_RowValue, _CellValue, _ColumnId>>[0]['defaultSort']>
		rows: _RowValue[]
		getId?: (row: _RowValue, index: number) => RowId
		isRowDisabled: (row: _RowValue, table: DataTable<_RowValue, _CellValue, _ColumnId>) => boolean
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
	} = $props()


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


	// Transitions/animations
	import { flip } from 'svelte/animate'
	import { fade } from 'svelte/transition'
	import { expoOut } from 'svelte/easing'
</script>


<div
	{...restProps}
	 class="container {'class' in restProps ? restProps.class : ''}"
>
	<table>
		<thead>
			<tr>
				{#each columns as column, index (column.id)}
					{@const isSortable = column.isSortable !== false}

					<th
						data-sortable={isSortable ? '' : undefined}
						data-sort={table.columnSort?.columnId === column.id ? table.columnSort?.direction : undefined}
						data-is-sticky={column.isSticky ? '' : undefined}
						animate:flip={{ duration: 300, easing: expoOut }}
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
						</div>
					</th>
				{/each}
			</tr>
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

						<td
							data-sortable={isSortable ? '' : undefined}
							data-sort={table.columnSort?.columnId === column.id ? table.columnSort?.direction : undefined}
							data-is-sticky={column.isSticky ? '' : undefined}
							animate:flip={{ duration: 250, easing: expoOut }}
							in:fade={{ duration: 250, easing: expoOut }}
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
		--table-cell-verticalAlign: top;
		--table-cell-padding: 0.5em 1em;

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
									transition-duration: 0.2s;
									transition-timing-function: ease-out;
								}
							}
						}

						&:has(.sort-button:focus) {
							outline: 1px solid var(--accent);
							border-radius: 0.5em;
						}
					}
				}
			}
		}

		tbody {
			isolation: isolate;

			tr {
				--table-row-backgroundColor: light-dark(rgba(0, 0, 0, 0.03), rgba(255, 255, 255, 0.03));

				box-shadow:
					0 var(--table-borderWidth) var(--table-outerBorderColor),
					0 calc(-1 * var(--table-borderWidth)) var(--table-outerBorderColor);

				&:nth-of-type(odd) {
					background-color: var(--table-row-backgroundColor);

					> td {
						box-shadow: var(--table-borderWidth) 0 var(--table-row-backgroundColor);
						vertical-align: var(--table-cell-verticalAlign);
					}
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

			&[data-is-sticky],
			&[data-sort]:not([data-is-sticky]) {
				position: sticky;
				backdrop-filter: blur(20px);
				z-index: 1;
				inset-inline-start: 0;
				inset-inline-end: 0;
			}
		}
	}
</style>

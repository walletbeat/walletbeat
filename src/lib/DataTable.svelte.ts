/* eslint-disable */

// Types
export type Column<
	RowValue = any,
	CellValue = any,
	ColumnId extends string = string
> = {
	id: ColumnId
	name: string
	isSticky?: boolean
	isSortable?: boolean
	defaultSortDirection?: SortDirection
	getValue: (row: RowValue) => CellValue
	sorter?: (a: CellValue, b: CellValue, rowA: RowValue, rowB: RowValue) => number
}

type SortDirection = 'asc' | 'desc'

type SortState<
	ColumnId extends string = string
> = {
	columnId: ColumnId
	direction: SortDirection
}

import { SvelteSet, SvelteMap } from 'svelte/reactivity'


// State
export class DataTable<
	RowValue = any,
	CellValue = any,
	ColumnId extends string = string
> {
	columns: Column<RowValue, CellValue, ColumnId>[] = $state(
		[]
	)

	#columnsById = $derived(
		new SvelteMap(
			this.columns
				.map(column => [
					column.id,
					column
				])
		)
	)

	#isColumnExpanded = $state(
		new SvelteSet<ColumnId>()
	)

	rows = $state<RowValue[]>(
		[]
	)

	pageSize: number = $state(
		10
	)
	currentPage = $state(
		1
	)

	#defaultColumnSort?: SortState<ColumnId>
	columnSort?: SortState<ColumnId> = $state(
		this.#defaultColumnSort
	)

	#isRowDisabled?: (row: RowValue, table: DataTable<RowValue, CellValue, ColumnId>) => boolean
	#displaceDisabledRows: boolean

	rowsSorted = $derived.by(() => {
		if(!this.columnSort)
			return this.rows

		const { columnId, direction } = this.columnSort

		const column = this.#columnsById.get(columnId)

		return (
			this.rows
				.toSorted((a, b) => {
					if (this.#displaceDisabledRows && this.#isRowDisabled) {
						const isRowADisplaced = this.#isRowDisabled(a, this)
						const isRowBDisplaced = this.#isRowDisabled(b, this)

						if(isRowADisplaced || isRowBDisplaced)
							return (
								isRowADisplaced && isRowBDisplaced ?
									0
								: isRowADisplaced ?
									1
								:
									-1
							)
					}

					const aVal = column?.getValue(a)
					const bVal = column?.getValue(b)

					return (
						aVal === undefined || aVal === null ?
							direction === 'asc' ? 1 : -1

						: bVal === undefined || bVal === null ?
							direction === 'asc' ? -1 : 1

						: column?.sorter ?
							direction === 'asc' ?
								column.sorter(aVal, bVal, a, b)
							:
								column.sorter(bVal, aVal, b, a)

						: typeof aVal === 'string' && typeof bVal === 'string' ?
							direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)

						: aVal < bVal ?
							direction === 'asc' ? -1 : 1

						: aVal > bVal ?
							direction === 'asc' ? 1 : -1

						:
							0
					)
				})
		)
	})

	rowsVisible = $derived(
		this.rowsSorted
			.slice(
				(this.currentPage - 1) * this.pageSize,
				(this.currentPage - 1) * this.pageSize + this.pageSize
			)
	)

	totalPages = $derived(
		Math.max(1, Math.ceil(this.rows.length / this.pageSize))
	)

	canGoBack = $derived(
		this.rows.length > 0 && this.currentPage > 1
	)

	canGoForward = $derived(
		this.rows.length > 0 && this.currentPage < this.totalPages
	)

	columnsVisible = $derived(
		[...this.#columnsById.values()]
			.filter(column => (
				!column.children?.length || !this.#isColumnExpanded.has(column.id)
			))
	)

	constructor({
		data,
		columns,
		pageSize,
		defaultSort,
		isRowDisabled,
		displaceDisabledRows,
	}: {
		data: RowValue[]
		columns: Column<RowValue, CellValue, ColumnId>[]
		pageSize?: number
		defaultSort?: SortState<ColumnId>
		isRowDisabled?: (row: RowValue, table: DataTable<RowValue, CellValue, ColumnId>) => boolean
		displaceDisabledRows?: boolean
	}) {
		this.rows = [...data]
		this.columns = columns
		this.pageSize = pageSize || 10
		this.#defaultColumnSort = defaultSort
		this.#isRowDisabled = isRowDisabled
		this.#displaceDisabledRows = displaceDisabledRows ?? false
	}

	toggleColumnSort = (columnId: ColumnId) => {
		const column = this.#columnsById.get(columnId)

		if (!column || !(column.isSortable ?? true))
			return false

		const defaultSortDirection = column.defaultSortDirection ?? 'asc'

		this.columnSort = (
			this.columnSort?.columnId !== columnId ?
				{
					columnId,
					direction: defaultSortDirection,
				}
			: this.columnSort?.direction === defaultSortDirection ?
				{
					columnId,
					direction: defaultSortDirection === 'asc' ? 'desc' : 'asc',
				}
			:
				this.#defaultColumnSort
		)

		return true
	}
}

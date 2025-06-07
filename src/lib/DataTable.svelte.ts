type ValueGetter<
	RowValue = any,
	CellValue = any
> = (
	(row: RowValue) => CellValue
)

type Sorter<
	RowValue = any,
	CellValue = any
> = (
	(a: CellValue, b: CellValue, rowA: RowValue, rowB: RowValue) => number
)

type Filter<
	RowValue = any,
	CellValue = any
> = (
	(value: CellValue, filterValue: CellValue, row: RowValue) => boolean
)

export interface ColumnDef<
	RowValue = any,
	CellValue = any,
	ColumnId extends string = string
> {
	id: ColumnId
	name: string
	sortable?: boolean
	defaultSortDirection?: SortDirection
	getValue: ValueGetter<RowValue, CellValue>
	sorter?: Sorter<RowValue, CellValue>
	filter?: Filter<RowValue, CellValue>
}

type SortDirection = 'asc' | 'desc'

type SortState<
	ColumnId extends string = string
> = {
	columnId: ColumnId
	direction: SortDirection
}

type TableConfig<
	RowValue = any,
	CellValue = any,
	ColumnId extends string = string
> = {
	data: RowValue[]
	columns: ColumnDef<RowValue, CellValue, ColumnId>[]
	pageSize?: number
	defaultSort?: SortState<ColumnId>
	initialFilters?: { [key in ColumnId]?: any[] }
	getDisabled?: (row: RowValue, table: DataTable<RowValue, CellValue, ColumnId>) => boolean
	displaceDisabledRows?: boolean
}

/**
 * Represents a data table with sorting, filtering, and pagination capabilities.
 * @template RowValue The type of data items in the table.
 */
export class DataTable<
	RowValue = any,
	CellValue = any,
	ColumnId extends string = string
> {
	#columns: ColumnDef<RowValue, CellValue, ColumnId>[]
	#pageSize: number
	#defaultSort?: SortState<ColumnId>
	#getDisabled?: (row: RowValue, table: DataTable<RowValue, CellValue, ColumnId>) => boolean
	#displaceDisabledRows: boolean

	#originalData = $state<RowValue[]>([])
	#currentPage = $state(1)
	#sortState?: SortState<ColumnId> = $state()
	#filterState = $state<{
		[key in ColumnId]?: Set<CellValue>
	}>({})
	#globalFilter = $state<string>('')

	#globalFilterRegex: RegExp | null = null

	#filteredData = $derived(
		this.#originalData.filter(row => this.#matchesGlobalFilter(row) && this.#matchesFilters(row)),
	)

	#sortedData = $derived.by(() => {
		if (this.#sortState) {
			const { columnId, direction } = this.#sortState

			const colDef = this.#getColumnDef(columnId)

			return [...this.#filteredData].sort((a, b) => {
				if (this.#displaceDisabledRows && this.#getDisabled) {
					const isRowADisplaced = this.#getDisabled(a, this)
					const isRowBDisplaced = this.#getDisabled(b, this)

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

				const aVal = this.#getValue(a, columnId)
				const bVal = this.#getValue(b, columnId)

				if (aVal === undefined || aVal === null) return direction === 'asc' ? 1 : -1
				if (bVal === undefined || bVal === null) return direction === 'asc' ? -1 : 1

				if (colDef && colDef.sorter) {
					return direction === 'asc'
						? colDef.sorter(aVal, bVal, a, b)
						: colDef.sorter(bVal, aVal, b, a)
				}

				if (typeof aVal === 'string' && typeof bVal === 'string') {
					return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
				}

				if (aVal < bVal) return direction === 'asc' ? -1 : 1
				if (aVal > bVal) return direction === 'asc' ? 1 : -1
				return 0
			})
		} else {
			return this.#filteredData
		}
	})

	/**
	 * Creates a new DataTable instance.
	 * @param {TableConfig<RowValue>} config - The configuration object for the data table.
	 */
	constructor(config: TableConfig<RowValue, CellValue, ColumnId>) {
		this.#originalData = [...config.data]
		this.#columns = config.columns
		this.#pageSize = config.pageSize || 10
		this.#defaultSort = config.defaultSort
		this.#getDisabled = config.getDisabled
		this.#displaceDisabledRows = config.displaceDisabledRows ?? false
		this.#initializeFilterState(config.initialFilters)
	}

	#initializeFilterState(initialFilters?: { [key in ColumnId]?: any[] }) {
		this.#columns.forEach(column => {
			const initialFilterValues = initialFilters?.[column.id]

			if (initialFilterValues) {
				this.#filterState[column.id] = new Set(initialFilterValues)
			} else {
				this.#filterState[column.id] = new Set()
			}
		})
	}

	#getColumnDef(id: ColumnId): ColumnDef<RowValue, CellValue, ColumnId> {
		const column = this.#columns.find(col => col.id === id)

		if (!column)
			throw new Error(`Column "${id}" was not found`)

		return column
	}

	#getValue(row: RowValue, columnId: ColumnId): CellValue {
		const colDef = this.#getColumnDef(columnId)

		return colDef.getValue(row)
	}

	#matchesGlobalFilter = (row: RowValue): boolean => {
		if (!this.#globalFilterRegex) {
			return true
		}

		return this.#columns.some(col => {
			const value = this.#getValue(row, col.id)

			return typeof value === 'string' && this.#globalFilterRegex!.test(value)
		})
	}

	#matchesFilters = (row: RowValue): boolean => {
		return Object.entries(this.#filterState).every(([columnId, filterSet]) => {
			if (!filterSet || filterSet.size === 0) {
				return true
			}

			const colDef = this.#getColumnDef(columnId)

			if (!colDef) {
				return true
			}

			const value = this.#getValue(row, columnId)

			if (colDef.filter) {
				for (const filterValue of filterSet) {
					if (colDef.filter(value, filterValue, row)) {
						return true
					}
				}

				return false
			}

			return filterSet.has(value)
		})
	}

	/**
	 * Gets or sets the base data rows without any filtering or sorting applied.
	 * @returns {RowValue[]} An array of all rows.
	 */
	get baseRows() {
		return this.#originalData
	}

	/**
	 * @param {RowValue[]} rows - The array of rows to reset the base data to.
	 */
	set baseRows(rows: RowValue[]) {
		this.#currentPage = 1
		this.#originalData = [...rows]
	}

	/**
	 * Returns all filtered and sorted rows without pagination.
	 * @returns {RowValue[]} An array of all filtered and sorted rows.
	 */
	get allRows() {
		return this.#sortedData
	}

	/**
	 * The current page of rows based on applied filters and sorting.
	 * @returns {RowValue[]} An array of rows for the current page.
	 */
	get rows() {
		const startIndex = (this.#currentPage - 1) * this.#pageSize
		const endIndex = startIndex + this.#pageSize

		return this.allRows.slice(startIndex, endIndex)
	}

	/**
	 * The column definitions for the table.
	 * @returns {ColumnDef<RowValue>[]} An array of column definitions.
	 */
	get columns() {
		return this.#columns
	}

	/**
	 * The current filter state for all columns.
	 * @returns {{ [K in keyof RowValue]: Set<any> }} An object representing the filter state that maps column keys to filter values.
	 */
	get filterState() {
		return this.#filterState
	}

	/**
	 * The current sort state for the table.
	 * @returns {{ column: keyof RowValue | null direction: SortDirection }} An object representing the sort state with a column key and direction.
	 */
	get sortState() {
		return this.#sortState
	}

	/**
	 * The total number of pages based on the current filters and page size.
	 * @returns {number} The total number of pages.
	 */
	get totalPages() {
		return Math.max(1, Math.ceil(this.#filteredData.length / this.#pageSize))
	}

	/**
	 * Gets or sets the current page number.
	 * @returns {number} The current page number.
	 */
	get currentPage() {
		return this.#currentPage
	}

	/**
	 * @param {number} page - The page number to set.
	 */
	set currentPage(page: number) {
		this.#currentPage = Math.max(1, Math.min(page, this.totalPages))
	}

	/**
	 * Indicates whether the user can navigate to the previous page.
	 * @returns {boolean} True if there's a previous page available, false otherwise.
	 */
	get canGoBack() {
		return this.currentPage > 1 && this.#filteredData.length > 0
	}

	/**
	 * Indicates whether the user can navigate to the next page.
	 * @returns {boolean} True if there's a next page available, false otherwise.
	 */
	get canGoForward() {
		return this.currentPage < this.totalPages && this.#filteredData.length > 0
	}

	/**
	 * Gets or sets the global filter string.
	 * @returns {string} The current global filter string.
	 */
	get globalFilter() {
		return this.#globalFilter
	}

	/**
	 * @param {string} value - The global filter string to set.
	 */
	set globalFilter(value: string) {
		this.#globalFilter = value

		try {
			this.#globalFilterRegex = value.trim() !== '' ? new RegExp(`(?:${value})`, 'i') : null
		} catch (error) {
			console.error('Invalid regex pattern:', error)
			this.#globalFilterRegex = null
		}

		this.#currentPage = 1
	}

	/**
	 * Toggles the sort direction for the specified column.
	 * @param {string} columnId - The column id to toggle sorting for.
	 */
	toggleSort = (columnId: ColumnId) => {
		const colDef = this.#getColumnDef(columnId)

		if (!colDef || colDef.sortable === false) {
			return
		}

		const defaultSortDirection = colDef.defaultSortDirection ?? 'asc'
		const currentDirection = this.#sortState?.direction

		if (this.#sortState?.columnId !== columnId) {
			this.#sortState = {
				columnId,
				direction: defaultSortDirection,
			}
		} else if (currentDirection === defaultSortDirection) {
			this.#sortState = {
				columnId,
				direction: defaultSortDirection === 'asc' ? 'desc' : 'asc',
			}
		} else {
			this.#sortState = this.#defaultSort
		}
	}

	/**
	 * Gets the current sort state for the specified column.
	 * @param {string} columnId - The column id to get the sort state for.
	 */
	getSortState = (columnId: ColumnId) => {
		return this.#sortState?.columnId === columnId ? this.#sortState.direction : undefined
	}

	/**
	 * Indicates whether the specified column is sortable.
	 * @param {string} columnId - The column id to check.
	 */
	isSortable = (columnId: ColumnId): boolean => {
		const colDef = this.#getColumnDef(columnId)

		return colDef?.sortable !== false
	}

	/**
	 * Sets the filter values for the specified column.
	 * @param {string} columnId - The column id to set the filter values for.
	 * @param {any[]} values - The filter values to set.
	 */
	setFilter = (columnId: ColumnId, values: any[]) => {
		this.#filterState = { ...this.#filterState, [columnId]: new Set(values) }
		this.#currentPage = 1
	}

	/**
	 * Clears the filter values for the specified column.
	 * @param {string} columnId - The column id to clear the filter values for.
	 */
	clearFilter = (columnId: ColumnId) => {
		this.#filterState = { ...this.#filterState, [columnId]: new Set() }
		this.#currentPage = 1
	}

	/**
	 * Toggles the filter value for the specified column.
	 * @param {string} columnId - The column id to toggle the filter value for.
	 * @param {any} value - The filter value to toggle.
	 */
	toggleFilter = (columnId: ColumnId, value: any) => {
		this.#filterState = {
			...this.#filterState,
			[columnId]: this.isFilterActive(columnId, value)
				? new Set([...this.#filterState[columnId]].filter(v => v !== value))
				: new Set([...this.#filterState[columnId], value]),
		}

		this.#currentPage = 1
	}

	/**
	 * Indicates whether the specified filter value is active for the specified column.
	 * @param {string} columnId - The column id to check.
	 * @param {any} value - The filter value to check.
	 */
	isFilterActive = (columnId: ColumnId, value: any): boolean => {
		return this.#filterState[columnId]?.has(value) ?? false
	}
}

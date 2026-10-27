export enum SortDirection {
	Ascending = 'asc',
	Descending = 'desc',
}

export type SortState<ColumnId extends TableValue = TableValue> = {
	columnId: ColumnId
	direction: SortDirection
}
export type TableValue = object | string | number | bigint | boolean | undefined | null

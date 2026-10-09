export enum SortDirection {
	Ascending = 'asc',
	Descending = 'desc',
}

/** A value rows are ordered by. `null` and `undefined` mean the row has none. */
export type SortKey = string | number | bigint | boolean | null | undefined

export type SortOptions<_RowValue, _CellValue> = {
	direction: SortDirection
	value: (row: _RowValue) => _CellValue

	/**
	 * Maps a cell value to the value that gets ordered.
	 * Returning `null` or `undefined` places the row last in either direction.
	 */
	rank?: (value: _CellValue) => SortKey

	/** Ascending comparison of two present values. */
	compare?: (a: _CellValue, b: _CellValue, rowA: _RowValue, rowB: _RowValue) => number
}

const isMissing = <T>(value: T | null | undefined): value is null | undefined =>
	value === null || value === undefined

/** Ascending comparison used when a column has no `compare` of its own. */
export const compareCellValues = <T>(a: T, b: T): number =>
	typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : a < b ? -1 : a > b ? 1 : 0

/**
 * Sorts rows by one column.
 * Missing values (`null`/`undefined`) sort last in both directions, and rows
 * that compare equal keep their original order.
 */
export const sortRows = <_RowValue, _CellValue>(
	rows: _RowValue[],
	{ direction, value, rank, compare }: SortOptions<_RowValue, _CellValue>,
): _RowValue[] => {
	const sign = direction === SortDirection.Descending ? -1 : 1

	return rows.toSorted((rowA, rowB) => {
		const a = value(rowA)
		const b = value(rowB)
		const rankA = rank ? rank(a) : a
		const rankB = rank ? rank(b) : b

		if (isMissing(rankA) || isMissing(rankB)) {
			return Number(isMissing(rankA)) - Number(isMissing(rankB))
		}

		return sign * (compare ? compare(a, b, rowA, rowB) : compareCellValues(rankA, rankB))
	})
}

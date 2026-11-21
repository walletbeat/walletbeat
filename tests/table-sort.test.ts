import { describe, expect, it } from 'vitest'

import { SortDirection, sortRows } from '@/components/table-sort'
import { Rating, ratingSortRank } from '@/schema/attributes'

type Row = { id: string; value: number | string | null | undefined }

const ids = (rows: Row[]): string[] => rows.map(row => row.id)

const sortBy = (rows: Row[], direction: SortDirection): string[] =>
	ids(sortRows(rows, { direction, value: row => row.value }))

describe('sortRows', () => {
	const numbers: Row[] = [
		{ id: 'null', value: null },
		{ id: 'two', value: 2 },
		{ id: 'undefined', value: undefined },
		{ id: 'zero', value: 0 },
		{ id: 'one', value: 1 },
	]

	it('sorts numbers with missing values last when ascending', () => {
		expect(sortBy(numbers, SortDirection.Ascending)).toEqual([
			'zero',
			'one',
			'two',
			'null',
			'undefined',
		])
	})

	it('keeps missing values last when descending', () => {
		expect(sortBy(numbers, SortDirection.Descending)).toEqual([
			'two',
			'one',
			'zero',
			'null',
			'undefined',
		])
	})

	it('sorts strings by locale', () => {
		const rows: Row[] = [
			{ id: 'b', value: 'beta' },
			{ id: 'a', value: 'Alpha' },
			{ id: 'c', value: 'gamma' },
		]

		expect(sortBy(rows, SortDirection.Ascending)).toEqual(['a', 'b', 'c'])
		expect(sortBy(rows, SortDirection.Descending)).toEqual(['c', 'b', 'a'])
	})

	it('keeps the original order of ties in both directions', () => {
		const rows: Row[] = [
			{ id: 'first', value: 1 },
			{ id: 'high', value: 2 },
			{ id: 'second', value: 1 },
		]

		expect(sortBy(rows, SortDirection.Ascending)).toEqual(['first', 'second', 'high'])
		expect(sortBy(rows, SortDirection.Descending)).toEqual(['high', 'first', 'second'])
	})

	it('uses a custom ascending comparison and never passes it missing values', () => {
		const rows: Row[] = [
			{ id: 'short', value: 'zz' },
			{ id: 'missing', value: undefined },
			{ id: 'long', value: 'aaaa' },
		]
		const compare = (a: Row['value'], b: Row['value']): number => {
			expect(a).toBeTypeOf('string')
			expect(b).toBeTypeOf('string')

			return String(a).length - String(b).length
		}

		expect(
			ids(sortRows(rows, { direction: SortDirection.Ascending, value: row => row.value, compare })),
		).toEqual(['short', 'long', 'missing'])
		expect(
			ids(
				sortRows(rows, { direction: SortDirection.Descending, value: row => row.value, compare }),
			),
		).toEqual(['long', 'short', 'missing'])
	})
})

describe('sorting ratings', () => {
	type RatingRow = { id: string; rating: Rating | undefined }

	const rows: RatingRow[] = [
		{ id: 'unrated', rating: Rating.UNRATED },
		{ id: 'fail', rating: Rating.FAIL },
		{ id: 'pass', rating: Rating.PASS },
		{ id: 'exempt', rating: Rating.EXEMPT },
		{ id: 'missing', rating: undefined },
		{ id: 'partial', rating: Rating.PARTIAL },
	]

	const sortRatings = (direction: SortDirection): string[] =>
		sortRows(rows, { direction, value: row => row.rating, rank: ratingSortRank }).map(row => row.id)

	it('ranks PASS > PARTIAL > FAIL when descending, with UNRATED, EXEMPT and missing last', () => {
		expect(sortRatings(SortDirection.Descending)).toEqual([
			'pass',
			'partial',
			'fail',
			'unrated',
			'exempt',
			'missing',
		])
	})

	it('keeps UNRATED, EXEMPT and missing last when ascending', () => {
		expect(sortRatings(SortDirection.Ascending)).toEqual([
			'fail',
			'partial',
			'pass',
			'unrated',
			'exempt',
			'missing',
		])
	})
})

import { describe, expect, expectTypeOf, it } from 'vitest'

import { allWalletSecurityNews } from '@/data/news'
import { allWallets } from '@/data/wallets'
import { assertCalendarDate, type CalendarDate, isCalendarDate } from '@/types/date'

import { commonExclusions, getCodebaseIndex } from './utils/codebase'

/*
 * `CalendarDate` constrains only its month and day segments; the year segment is `${number}`, so
 * '20260-09-10' and '20.5-09-10' type-check, and leap years are invisible to it ('2023-02-29'
 * type-checks too). Committed data therefore needs the runtime checks below.
 */

/** Keys typed as `CalendarDate` that wallet or news data populates. */
const dataDateKeys = new Set([
	'auditDate',
	'date',
	'dateStarted',
	'lastRetrieved',
	'lastUpdated',
	'publishedAt',
	'updatedAt',
])

/**
 * Keys typed as `CalendarDate` that no data populates: tooling types, and schema fields no wallet
 * fills in yet. Asserted to stay empty below, so populating one has to move it to `dataDateKeys`
 * instead of quietly skipping validation.
 */
const nonDataDateKeys = new Set(['Date', 'fixedDate', 'pageLastUpdated'])

const allDateKeys = new Set([...dataDateKeys, ...nonDataDateKeys])

interface CollectedDate {
	fieldPath: string
	key: string
	value: unknown
}

/** Recursively collect the value of every `CalendarDate`-typed key in a data object. */
function collectDates(roots: Record<string, unknown>): CollectedDate[] {
	const results: CollectedDate[] = []

	const findDates = (path: string[], x: unknown): void => {
		if (x === undefined || x === null) {
			return
		}

		if (Array.isArray(x)) {
			for (let i = 0; i < x.length; i++) {
				findDates(path.concat([`[${i}]`]), x[i])
			}

			return
		}

		if (typeof x !== 'object') {
			return
		}

		for (const [key, val] of Object.entries(x)) {
			const childPath = path.concat([`.${key}`])

			if (allDateKeys.has(key)) {
				results.push({ fieldPath: childPath.join(''), key, value: val })
			}

			findDates(childPath, val)
		}
	}

	for (const [rootName, root] of Object.entries(roots)) {
		findDates([rootName], root)
	}

	return results
}

const collectedDates = collectDates({
	wallets: allWallets,
	news: Object.fromEntries(allWalletSecurityNews.map(news => [news.slug, news])),
})

const pathsEndingIn = (suffix: string): string[] =>
	collectedDates.map(({ fieldPath }) => fieldPath).filter(fieldPath => fieldPath.endsWith(suffix))

describe('CalendarDate', () => {
	it('retains static month and day validation', () => {
		expectTypeOf<'2026-09-10'>().toExtend<CalendarDate>()
		expectTypeOf<'2026-13-10'>().not.toExtend<CalendarDate>()
		expectTypeOf<'2026-09-32'>().not.toExtend<CalendarDate>()
	})

	it('validates the exact YYYY-MM-DD format at runtime', () => {
		expect(assertCalendarDate('2024-02-29')).toBe('2024-02-29')
		expect(() => assertCalendarDate('2023-02-29')).toThrow('Invalid calendar date')
		expect(() => assertCalendarDate('20260-09-10')).toThrow('Invalid calendar date')
	})
})

describe('calendar dates in wallet and news data', () => {
	// `lastUpdated` and `publishedAt` are required fields, so these counts pin that the walk
	// reaches every wallet and every news item instead of silently collecting a subset.
	it('reaches every wallet and news item', () => {
		expect(pathsEndingIn('.metadata.lastUpdated')).toHaveLength(Object.keys(allWallets).length)
		expect(pathsEndingIn('.publishedAt')).toHaveLength(allWalletSecurityNews.length)
	})

	it('has no data under the keys listed as unpopulated', () => {
		expect(collectedDates.filter(({ key }) => nonDataDateKeys.has(key))).toEqual([])
	})

	it.each(collectedDates)('$fieldPath is a real YYYY-MM-DD date', ({ value }) => {
		if (typeof value !== 'string') {
			expect.fail(`Expected a string, got ${typeof value}.`)
		}

		expect(isCalendarDate(value), `'${value}' is not a real date in YYYY-MM-DD format`).toBe(true)
	})
})

interface SourceDateLiteral {
	/** `path/to/file.ts:12` */
	location: string
	key: string
	value: string
}

interface SourceDateIndex {
	/** Keys declared as `CalendarDate` anywhere in the schema. */
	declaredKeys: Set<string>

	/** Every date written as a literal in source, including files the data walk cannot reach. */
	literals: SourceDateLiteral[]
}

async function indexSourceDates(): Promise<SourceDateIndex> {
	const declaredKeys = new Set<string>()
	const literals: SourceDateLiteral[] = []

	await getCodebaseIndex({
		ignore: commonExclusions,
		indexFn: (filePath, fileContents) => {
			const isSrc = filePath.startsWith('src/')

			if (!filePath.endsWith('.ts') || !(isSrc || filePath.startsWith('data/'))) {
				return { keys: [], fileLiterals: [] }
			}

			// Declarations only live in the schema; the pattern also matches function parameters on
			// their own line, which is harmless because a stray key only makes the check stricter.
			const keys = isSrc
				? [...fileContents.matchAll(/^\s*(?:readonly\s+)?(\w+)\??: CalendarDate\b/gm)].map(
						match => match[1],
					)
				: []

			const fileLiterals = [...fileContents.matchAll(/^\s*(?:readonly\s+)?(\w+)\??: '([^']*)'/gm)]
				.filter(match => allDateKeys.has(match[1]))
				.map(match => ({
					location: `${filePath}:${fileContents.slice(0, match.index).split('\n').length}`,
					key: match[1],
					value: match[2],
				}))

			return { keys, fileLiterals }
		},
		aggregateFn: ({ keys, fileLiterals }) => {
			for (const key of keys) {
				declaredKeys.add(key)
			}

			literals.push(...fileLiterals)
		},
	})

	return { declaredKeys, literals }
}

const sourceDates = await indexSourceDates()

describe('calendar dates in source', () => {
	it('covers every key declared as CalendarDate in the schema', () => {
		// Guards against a crawl that silently finds nothing.
		expect(sourceDates.declaredKeys).toContain('lastUpdated')
		expect([...sourceDates.declaredKeys].filter(key => !allDateKeys.has(key))).toEqual([])
	})

	// Catches authored literals the data walk never reaches: the wallet template, schema example
	// fixtures, and tooling defaults.
	it('has a real YYYY-MM-DD value at every literal', () => {
		expect(sourceDates.literals.length).toBeGreaterThanOrEqual(collectedDates.length)
		expect(sourceDates.literals.filter(({ value }) => !isCalendarDate(value))).toEqual([])
	})
})

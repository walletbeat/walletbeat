import { describe, expect, it } from 'vitest'

import {
	applyFilterSets,
	changeFilterChoice,
	type FilterChoice,
	type FilterSet,
	resetFilterSets,
} from './filters'

type Item = {
	id: string
	tags: string[]
}

const items: Item[] = [
	{ id: 'browser-eoa', tags: ['browser', 'eoa'] },
	{ id: 'mobile-smart', tags: ['mobile', 'smart'] },
	{ id: 'hybrid', tags: ['browser', 'mobile'] },
	{ id: 'unclassified', tags: [] },
]

const matches = (tag: string): FilterChoice<Item> => ({
	id: tag,
	label: tag,
	matches: item => item.tags.includes(tag),
})

const all: FilterChoice<Item> = { id: '', label: 'All' }
const browser = matches('browser')
const mobile = matches('mobile')

const exclusive: FilterSet<Item> = {
	id: 'platform',
	label: 'Platform',
	cardinality: 'exclusive',
	match: 'union',
	defaultChoice: '',
	choices: [all, browser, mobile],
}

describe('filter-set selection semantics', () => {
	const eoa = matches('eoa')
	const account: FilterSet<Item> = {
		id: 'account',
		label: 'Account',
		cardinality: 'inclusive',
		match: 'union',
		choices: [eoa, matches('smart')],
	}

	it('composes independent sets regardless of their owning panel', () => {
		expect(
			applyFilterSets(items, [exclusive, account], new Set([browser, eoa])).map(item => item.id),
		).toEqual(['browser-eoa'])
		expect(applyFilterSets(items, [exclusive, account], new Set([mobile, eoa]))).toEqual([])
	})

	it('resets only the sets owned by the requested group', () => {
		expect(resetFilterSets([exclusive], new Set([browser, eoa]))).toEqual(new Set([all, eoa]))
		expect(resetFilterSets([account], new Set([browser, eoa]))).toEqual(new Set([browser]))
		expect(resetFilterSets([exclusive, account], new Set([browser, eoa]))).toEqual(new Set([all]))
	})

	it('initializes a non-neutral exclusive default without changing another group on reset', () => {
		const defaultBrowser: FilterSet<Item> = { ...exclusive, defaultChoice: browser.id }
		const defaults = resetFilterSets([defaultBrowser, account], new Set())

		expect(defaults).toEqual(new Set([browser]))
		expect(applyFilterSets(items, [defaultBrowser, account], defaults)).toEqual([
			items[0],
			items[2],
		])
		expect(resetFilterSets([account], new Set([mobile, eoa]))).toEqual(new Set([mobile]))
		expect(resetFilterSets([defaultBrowser], new Set([mobile, eoa]))).toEqual(
			new Set([browser, eoa]),
		)
	})

	it('preserves other sets when a row shortcut forces one choice', () => {
		expect(changeFilterChoice([exclusive, account], new Set([browser, eoa]), mobile, true)).toEqual(
			new Set([mobile, eoa]),
		)
	})

	it('treats no exclusive selection and its All sentinel as the same no-restriction state', () => {
		expect(applyFilterSets(items, [exclusive], new Set())).toEqual(items)
		expect(applyFilterSets(items, [exclusive], new Set([all]))).toEqual(items)
	})

	it('applies the one selected predicate in an exclusive set', () => {
		expect(applyFilterSets(items, [exclusive], new Set([browser])).map(item => item.id)).toEqual([
			'browser-eoa',
			'hybrid',
		])
	})

	it('treats no inclusive selection as unrestricted but all union selections as covered values only', () => {
		const inclusiveUnion: FilterSet<Item> = {
			id: 'platform',
			label: 'Platform',
			cardinality: 'inclusive',
			match: 'union',
			choices: [browser, mobile],
		}

		expect(applyFilterSets(items, [inclusiveUnion], new Set())).toEqual(items)
		expect(
			applyFilterSets(items, [inclusiveUnion], new Set([browser, mobile])).map(item => item.id),
		).toEqual(['browser-eoa', 'mobile-smart', 'hybrid'])
	})

	it('requires every selected predicate when all filters in an intersection set are selected', () => {
		const inclusiveIntersection: FilterSet<Item> = {
			id: 'platform',
			label: 'Platform',
			cardinality: 'inclusive',
			match: 'intersection',
			choices: [browser, mobile],
		}

		expect(
			applyFilterSets(items, [inclusiveIntersection], new Set([browser, mobile])).map(
				item => item.id,
			),
		).toEqual(['hybrid'])
	})

	it('enforces exclusive cardinality independently from match composition', () => {
		expect(changeFilterChoice([exclusive], new Set([browser]), mobile)).toEqual(new Set([mobile]))
		expect(changeFilterChoice([exclusive], new Set([mobile]), mobile)).toEqual(new Set())
	})

	it('keeps exclusive All explicit while preserving its neutral meaning', () => {
		const selectedAll = changeFilterChoice([exclusive], new Set([browser]), all)

		expect(selectedAll).toEqual(new Set([all]))
		expect(applyFilterSets(items, [exclusive], selectedAll)).toEqual(items)

		const selectedConcrete = changeFilterChoice([exclusive], selectedAll, mobile)

		expect(selectedConcrete).toEqual(new Set([mobile]))
	})
})

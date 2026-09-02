import { describe, expect, it } from 'vitest'

import { exampleNodeCompany } from '@/data/entities/example'
import type { DataSource } from '@/schema/data-sources'
import { coinspectDataSource, coinspectRef } from '@/schema/data-sources/coinspect'
import type { FullyQualifiedReference } from '@/schema/reference'
import { computeDataSourceCredits } from '@/utils/data-source-credits'

const REPORT_DATE = '2026-01-12T17:52:05.136Z'

const unstampedRef: FullyQualifiedReference = {
	urls: [{ url: 'https://example.com/docs', label: 'Docs' }],
	explanation: 'Unstamped documentation.',
}

const otherDataSource: DataSource = {
	entity: exampleNodeCompany,
	license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
	attributionText: 'Adapted from example research notes.',
}

describe('computeDataSourceCredits', () => {
	it('returns an empty list when there are no references', () => {
		expect(computeDataSourceCredits([])).toEqual([])
	})

	it('builds one credit from a single stamped ref', () => {
		const ref = coinspectRef({
			check: 'WSR-001.v1',
			note: 'Warns on new recipients.',
			report: { date: REPORT_DATE, walletUID: 'metamask-browser' },
		})
		const credits = computeDataSourceCredits([ref])

		expect(credits).toHaveLength(1)
		expect(credits[0]?.source).toBe(coinspectDataSource)
		expect(credits[0]?.reportUrls).toEqual([{ label: 'Coinspect report', url: ref.urls[0].url }])
	})

	it('merges multiple refs from the same source into one credit with unique URLs and a generic report label', () => {
		const first = coinspectRef({
			check: 'WSR-001.v1',
			note: 'First finding.',
			report: { date: REPORT_DATE, walletUID: 'metamask-browser' },
		})
		const secondSameUrl = coinspectRef({
			check: 'WSR-002.v1',
			note: 'Second finding, same report.',
			report: { date: REPORT_DATE, walletUID: 'metamask-browser' },
		})
		const thirdOtherUrl = coinspectRef({
			check: 'WSR-001.v1',
			note: 'Third finding, other report.',
			report: { date: REPORT_DATE, walletUID: 'metamask-ios' },
		})
		const credits = computeDataSourceCredits([first, secondSameUrl, thirdOtherUrl])

		expect(credits).toHaveLength(1)
		expect(credits[0]?.source.entity.id).toBe('coinspect')
		expect(credits[0]?.reportUrls).toEqual([
			{ label: 'Coinspect report', url: first.urls[0].url },
			{ label: 'Coinspect report', url: thirdOtherUrl.urls[0].url },
		])
	})

	it('excludes unstamped refs', () => {
		const stamped = coinspectRef({
			check: 'WSR-001.v1',
			note: 'Stamped finding.',
			report: { date: REPORT_DATE, walletUID: 'metamask-browser' },
		})
		const credits = computeDataSourceCredits([unstampedRef, stamped])

		expect(credits).toHaveLength(1)
		expect(credits[0]?.source.entity.id).toBe('coinspect')
	})

	it('keeps multiple sources as separate credits in first-seen order', () => {
		const coinspectFirst = coinspectRef({
			check: 'WSR-001.v1',
			note: 'Coinspect finding.',
			report: { date: REPORT_DATE, walletUID: 'metamask-browser' },
		})
		const other: FullyQualifiedReference = {
			urls: [{ url: 'https://example.com/other-report.json', label: 'Other check' }],
			explanation: 'Other finding.',
			source: otherDataSource,
		}
		const coinspectAgain = coinspectRef({
			check: 'WSR-001.v1',
			note: 'Another Coinspect finding.',
			report: { date: REPORT_DATE, walletUID: 'metamask-ios' },
		})
		const credits = computeDataSourceCredits([coinspectFirst, other, coinspectAgain])

		expect(credits.map(credit => credit.source.entity.id)).toEqual([
			'coinspect',
			'exampleNodeCompany',
		])
		expect(credits[0]?.reportUrls.map(url => url.url)).toEqual([
			coinspectFirst.urls[0].url,
			coinspectAgain.urls[0].url,
		])
		expect(credits[1]?.reportUrls).toEqual([
			{ label: 'Example RPC Company report', url: 'https://example.com/other-report.json' },
		])
	})
})

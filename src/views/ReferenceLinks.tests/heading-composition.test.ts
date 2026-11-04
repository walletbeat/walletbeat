import { DOMParser } from '@xmldom/xmldom'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import { exampleSecurityAuditor } from '@/data/entities/example'
import type { SecurityAuditsMetadata } from '@/schema/attributes/security/security-audits-bounties'
import {
	ImpactCategory,
	IncidentStatus,
	NewsType,
	Severity,
	type WalletSecurityNews,
} from '@/types/content/news'
import { assertCalendarDate } from '@/types/date'

import HeadingComposition from './fixtures/HeadingComposition.svelte'

const date = assertCalendarDate('2026-01-01')
const news: WalletSecurityNews[] = [1, 2].map(index => ({
	slug: `incident-${index}`,
	title: `Incident ${index}`,
	summary: `Description of incident ${index}.`,
	type: NewsType.DATA_BREACH,
	severity: Severity.LOW,
	status: IncidentStatus.RESOLVED,
	wallets: [],
	impact: { category: ImpactCategory.PRIVACY_LEAK, fundsImpacted: false },
	publishedAt: date,
	updatedAt: date,
	ref: { url: `https://example.com/incident-${index}`, label: `Incident evidence ${index}` },
}))
const audits: SecurityAuditsMetadata = {
	securityAudits: [1, 2].map(index => ({
		auditor: { ...exampleSecurityAuditor, id: `auditor-${index}`, name: `Auditor ${index}` },
		auditDate: date,
		variantsScope: 'ALL_VARIANTS',
		unpatchedFlaws: 'NONE_FOUND',
		ref: { url: `https://example.com/audit-${index}`, label: `Audit evidence ${index}` },
	})),
}

describe('reference heading composition', () => {
	it.each([1, 2, 3, 4] as const)(
		'derives subject and source headings from enclosing level %i during SSR',
		parentHeadingLevel => {
			const { body } = render(HeadingComposition, { props: { parentHeadingLevel, news, audits } })
			const document = new DOMParser().parseFromString(`<html>${body}</html>`, 'text/html')
			const sections = Array.from(document.getElementsByTagName('section'))

			for (const [id, recordTag, subject, evidence, url] of [
				['news-composition', 'article', 'Incident', 'Incident evidence', 'incident'],
				['audit-composition', 'details', 'Auditor', 'Audit evidence', 'audit'],
			] as const) {
				const composition = sections.find(section => section.getAttribute('id') === id)!
				const headings = Array.from(composition.getElementsByTagName('*')).filter(element =>
					/^h[1-6]$/.test(element.tagName),
				)

				expect(headings.map(heading => heading.tagName)).toEqual([
					`h${parentHeadingLevel}`,
					`h${parentHeadingLevel + 1}`,
					`h${parentHeadingLevel + 2}`,
					`h${parentHeadingLevel + 1}`,
					`h${parentHeadingLevel + 2}`,
				])

				const records = Array.from(composition.getElementsByTagName(recordTag))

				expect(records).toHaveLength(2)

				for (const [index, record] of records.entries()) {
					const subjectHeading = record.getElementsByTagName(`h${parentHeadingLevel + 1}`)
					const sourceHeading = record.getElementsByTagName(`h${parentHeadingLevel + 2}`)
					const citation = Array.from(record.getElementsByTagName('a')).find(
						link => link.getAttribute('href') === `https://example.com/${url}-${index + 1}`,
					)

					expect(subjectHeading.length).toBe(1)
					expect(subjectHeading[0].textContent).toContain(`${subject} ${index + 1}`)
					expect(sourceHeading.length).toBe(1)
					expect(sourceHeading[0].textContent?.trim()).toBe('Source')
					expect(citation?.getElementsByTagName('cite')[0]?.textContent).toBe(
						`${evidence} ${index + 1}`,
					)
				}
			}
		},
	)
})

import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import { allRatedWallets } from '@/data/wallets'
import { coinspectDataSource } from '@/schema/data-sources'
import type { FullyQualifiedReference } from '@/schema/reference'
import { toFullyQualified } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { ResolvedWallet } from '@/schema/wallet'
import { isTypographicContent } from '@/types/content'
import { evaluationDetailRenderData } from '@/types/content/evaluation-details'
import { assertCalendarDate } from '@/types/date'
import { nonEmptyMap, nonEmptyValues } from '@/types/utils/non-empty'
import SecurityAuditsDetails from '@/views/attributes/security/SecurityAuditsDetails.svelte'
import ReferenceLinks from '@/views/ReferenceLinks.svelte'

function records(body: string): string[] {
	const document = new DOMParser().parseFromString(`<html>${body}</html>`, 'text/html')

	return Array.from(document.getElementsByTagName('li'))
		.filter(
			item =>
				item.parentNode?.nodeType === 1 &&
				Array.from(document.getElementsByTagName('ul')).some(
					list =>
						list === item.parentNode &&
						list.getAttribute('class')?.split(' ').includes('references-list'),
				),
		)
		.map(item =>
			JSON.stringify({
				text: item.textContent?.replace(/\s+/g, ' ').trim(),
				links: Array.from(item.getElementsByTagName('a')).map(link => [
					link.getAttribute('href'),
					link.textContent,
				]),
				dates: Array.from(item.getElementsByTagName('time')).map(time =>
					time.getAttribute('datetime'),
				),
			}),
		)
}
function referenceRecords(references: FullyQualifiedReference[]): string[] {
	return records(render(ReferenceLinks, { props: { references, parentHeadingLevel: 3 } }).body)
}

describe('custom audit reference completeness', () => {
	for (const [name, wallet] of Object.entries(allRatedWallets)) {
		const evaluations = [
			wallet.overall.security?.securityAuditsAndBounties?.evaluation,
			...nonEmptyValues<Variant, ResolvedWallet<string>>(wallet.variants).map(
				variant => variant.attributes.security?.securityAuditsAndBounties?.evaluation,
			),
		]

		it(`preserves canonical and subject-specific records for ${name}`, () => {
			for (const evaluation of evaluations) {
				if (!evaluation?.details || isTypographicContent(evaluation.details)) {
					continue
				}

				const data = evaluationDetailRenderData(evaluation.details.component, evaluation.outcome)

				if (data.component !== 'SecurityAuditsDetails') {
					continue
				}

				const references = toFullyQualified(evaluation.references ?? [])
				const rendered = render(SecurityAuditsDetails, {
					props: {
						wallet,
						...data.componentProps,
						metadata: data.outcome.metadata,
						references,
						parentHeadingLevel: 3,
					},
				}).body
				const actual = records(rendered)
				const document = new DOMParser().parseFromString(`<html>${rendered}</html>`, 'text/html')

				for (const audit of data.outcome.metadata.securityAudits) {
					const disclosure = Array.from(document.getElementsByTagName('details')).find(
						detail =>
							detail.getElementsByTagName('h4')[0]?.textContent?.includes(audit.auditor.name) &&
							detail.getElementsByTagName('time')[0]?.getAttribute('datetime') === audit.auditDate,
					)

					expect(disclosure).toBeDefined()

					for (const expected of referenceRecords(toFullyQualified(audit.ref))) {
						expect(records(new XMLSerializer().serializeToString(disclosure!))).toContain(expected)
					}
				}

				for (const expected of referenceRecords(references)) {
					expect(actual).toContain(expected)
				}
				const audits = data.outcome.metadata.securityAudits.flatMap(audit =>
					toFullyQualified(audit.ref),
				)

				for (const expected of referenceRecords(audits)) {
					expect(actual).toContain(expected)
				}
				const additional: FullyQualifiedReference[] = audits.flatMap(reference => [
					{ ...reference, explanation: 'Independent evidence context.' },
					{
						...reference,
						lastRetrieved: assertCalendarDate(
							reference.lastRetrieved === '2026-01-01' ? '2026-01-02' : '2026-01-01',
						),
					},
					{
						...reference,
						source: {
							...coinspectDataSource,
							entity: { ...coinspectDataSource.entity, id: 'independent-test-source' },
						},
					},
					{
						...reference,
						urls: nonEmptyMap(reference.urls, url => ({
							...url,
							label: 'Independent citation label',
						})),
					},
					{
						...reference,
						urls: [
							...reference.urls,
							{ url: 'https://example.com/related', label: 'Related evidence' },
						],
					},
				])
				const augmented = records(
					render(SecurityAuditsDetails, {
						props: {
							wallet,
							...data.componentProps,
							metadata: data.outcome.metadata,
							references: [...audits, ...additional],
							parentHeadingLevel: 3,
						},
					}).body,
				)

				expect(augmented).toHaveLength(referenceRecords([...audits, ...additional]).length)

				for (const expected of referenceRecords(additional)) {
					expect(augmented).toContain(expected)
				}
			}
		})
	}
})

import { DOMParser } from '@xmldom/xmldom'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import { coinspectDataSource } from '@/schema/data-sources'
import { dataCreditAnchorId, type FullyQualifiedReference } from '@/schema/reference'
import { assertCalendarDate } from '@/types/date'

import ReferenceLinks from '../ReferenceLinks.svelte'

describe('static reference evidence', () => {
	it.each([2, 3, 4, 5, 6] as const)('uses the caller heading level %i', headingLevel => {
		const references: FullyQualifiedReference[] = [
			{ urls: [{ url: 'https://example.com', label: 'Source' }] },
		]
		const { body } = render(ReferenceLinks, { props: { references, headingLevel } })
		const document = new DOMParser().parseFromString(`<html>${body}</html>`, 'text/html')

		expect(document.getElementsByTagName(`h${headingLevel}`).length).toBe(1)
	})

	it.each([0, 1, 2, 3, 4, 8, 20])('renders every record in a list of %i', count => {
		const references: FullyQualifiedReference[] = Array.from({ length: count }, (_, index) => ({
			urls: [{ url: `https://example.com/source-${index}`, label: `Source ${index}` }],
			explanation: `Evidence ${index}.`,
			lastRetrieved: assertCalendarDate('2026-10-01'),
			source: coinspectDataSource,
		}))
		const { body } = render(ReferenceLinks, { props: { references, headingLevel: 3 } })
		const document = new DOMParser().parseFromString(`<html>${body}</html>`, 'text/html')
		const links = Array.from(document.getElementsByTagName('a'))

		expect(document.getElementsByTagName('li').length).toBe(count)
		expect(document.getElementsByTagName('h3').length).toBe(count === 0 ? 0 : 1)

		for (const reference of references) {
			const citation = links.find(link => link.getAttribute('href') === reference.urls[0].url)

			expect(citation?.getElementsByTagName('cite')[0].textContent).toBe(reference.urls[0].label)
			expect(document.documentElement?.textContent).toContain(reference.explanation)
		}
		expect(
			links.filter(
				link => link.getAttribute('href') === `#${dataCreditAnchorId(coinspectDataSource.entity)}`,
			),
		).toHaveLength(count)
		expect(
			Array.from(document.getElementsByTagName('*')).some(element =>
				element.hasAttribute('hidden'),
			),
		).toBe(false)
	})

	it.each([1, 2])('embeds only local images with %i local image sources', count => {
		const references: FullyQualifiedReference[] = [
			{ urls: [{ url: 'https://example.com/remote.png', label: 'Remote image' }] },
			...Array.from({ length: count }, (_, index): FullyQualifiedReference => ({
				urls: [{ url: `/references/local-${index}.png`, label: `Local image ${index}` }],
			})),
		]
		const { body } = render(ReferenceLinks, { props: { references } })
		const document = new DOMParser().parseFromString(`<html>${body}</html>`, 'text/html')

		expect(
			Array.from(document.getElementsByTagName('img')).map(image => image.getAttribute('src')),
		).toEqual(Array.from({ length: count }, (_, index) => `/references/local-${index}.png`))
		expect(
			Array.from(document.getElementsByTagName('a')).some(
				link => link.getAttribute('href') === 'https://example.com/remote.png',
			),
		).toBe(true)
	})
})

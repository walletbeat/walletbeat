import { DOMParser } from '@xmldom/xmldom'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import { type EipStatusSupportCard, EipSupportStatus } from '@/schema/eip-support'
import { Variant } from '@/schema/variants'
import EipStatusSupportCards from '@/views/EipStatusSupportCards.svelte'

const cards: EipStatusSupportCard[] = [
	EipSupportStatus.SUPPORTED,
	EipSupportStatus.NOT_SUPPORTED,
	EipSupportStatus.UNKNOWN,
].map((status, index) => ({
	id: `wallet-${index}`,
	displayName: `Wallet ${index}`,
	iconExtension: 'svg',
	url: `/wallet-${index}/`,
	status,
	variants: [Variant.BROWSER],
	references: [
		{ urls: [{ url: `https://example.com/evidence-${index}`, label: `Evidence ${index}` }] },
	],
}))

describe('EIP reference caller composition', () => {
	it.each([undefined, 'Wallet support'])(
		'nests Sources under its actual wallet heading with title %s',
		title => {
			const { body } = render(EipStatusSupportCards, { props: { cards, title } })
			const document = new DOMParser().parseFromString(`<html>${body}</html>`, 'text/html')
			const details = Array.from(document.getElementsByTagName('details'))

			expect(details).toHaveLength(cards.length)

			for (const [index, detail] of details.entries()) {
				expect(
					detail.getElementsByTagName(title === undefined ? 'h3' : 'h4')[0]?.textContent,
				).toContain(cards[index].displayName)
				expect(
					detail.getElementsByTagName(title === undefined ? 'h4' : 'h5')[0]?.textContent?.trim(),
				).toBe('Source')
				const links = Array.from(detail.getElementsByTagName('a'))

				expect(
					links.some(link => link.getAttribute('href') === cards[index].references[0].urls[0].url),
				).toBe(true)
			}
		},
	)
})

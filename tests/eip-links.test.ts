import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import Typography from '@/components/Typography.svelte'
import { eips } from '@/data/eips'
import {
	eipMarkdownLink,
	eipMarkdownLinkAndTitle,
	eipMarkdownShortLink,
	parseEipMagicUrl,
	stripEipMagicUrls,
} from '@/schema/eips'
import { ContentType } from '@/types/content'
import { splitEipLinks } from '@/utils/markdown-eip-links'

const eip712 = eips['712']
const erc7828 = eips['7828']

function renderMarkdown(markdown: string): string {
	return render(Typography, {
		props: { content: { contentType: ContentType.MARKDOWN, markdown } },
	}).body
}

describe('EIP magic URLs', () => {
	it('parses magic URLs', () => {
		expect(parseEipMagicUrl('https://eips.ethereum.org/EIPS/eip-712#wb-format=short')).toEqual({
			eipNumber: 712,
			url: 'https://eips.ethereum.org/EIPS/eip-712',
		})
		expect(parseEipMagicUrl('https://eips.ethereum.org/EIPS/eip-7828#wb-format=long')).toEqual({
			eipNumber: 7828,
			url: 'https://eips.ethereum.org/EIPS/eip-7828',
		})
		expect(parseEipMagicUrl('https://eips.ethereum.org/EIPS/eip-712')).toBeNull()
		expect(parseEipMagicUrl('https://example.com/#wb-format=short')).toBeNull()
	})

	it('strips magic URLs from Markdown', () => {
		const md = `See ${eipMarkdownLink(eip712)} and ${eipMarkdownLinkAndTitle(erc7828)}.`
		const stripped = stripEipMagicUrls(md)

		expect(stripped).not.toContain('wb-format')
		expect(stripped).toContain('(https://eips.ethereum.org/EIPS/eip-712)')
		expect(stripped).toContain('(https://eips.ethereum.org/EIPS/eip-7828)')
	})
})

describe('splitEipLinks', () => {
	it('keeps HTML without EIP links as a single node', () => {
		const html = '<p>Hello <a href="https://example.com">world</a> &amp; <code>x</code></p>\n'

		expect(splitEipLinks(html)).toEqual([{ type: 'html', html }])
	})

	it('isolates nested EIP links', () => {
		const html =
			'<ul>\n<li>A <a href="https://eips.ethereum.org/EIPS/eip-712#wb-format=short"><strong>EIP-712</strong></a> b</li>\n<li>c</li>\n</ul>'

		expect(splitEipLinks(html)).toEqual([
			{
				type: 'element',
				tag: 'ul',
				attributes: {},
				children: [
					{ type: 'html', html: '\n' },
					{
						type: 'element',
						tag: 'li',
						attributes: {},
						children: [
							{ type: 'html', html: 'A ' },
							{
								type: 'eipLink',
								eipNumber: 712,
								url: 'https://eips.ethereum.org/EIPS/eip-712',
								labelHtml: '<strong>EIP-712</strong>',
							},
							{ type: 'html', html: ' b' },
						],
					},
					{ type: 'html', html: '\n<li>c</li>\n' },
				],
			},
		])
	})
})

describe('Typography EIP links', () => {
	it('renders EIP links with an EIP tooltip', () => {
		const html = renderMarkdown(`See ${eipMarkdownShortLink(eip712)} for details.`)

		expect(html).not.toContain('wb-format')
		expect(html).toContain('popovertarget=')
		expect(html).toContain(eip712.formalTitle)
		expect(html).toContain('href="https://eips.ethereum.org/EIPS/eip-712"')
	})

	it('renders Markdown without EIP links unchanged', () => {
		expect(renderMarkdown('Some *text* with a [link](https://example.com).')).toContain(
			'<p>Some <em>text</em> with a <a href="https://example.com">link</a>.</p>',
		)
	})
})

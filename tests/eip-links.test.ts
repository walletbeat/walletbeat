import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import Typography from '@/components/Typography.svelte'
import { eips } from '@/data/eips'
import { embeddedWalletAttributeTree } from '@/data/embedded-wallets'
import { hardwareWalletAttributeTree } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree } from '@/data/software-wallets'
import {
	allRatedWallets,
	isEmbeddedRatedWallet,
	isHardwareRatedWallet,
	isSoftwareRatedWallet,
} from '@/data/wallets'
import { attributeTree } from '@/schema/attribute-tree'
import {
	eipMarkdownLink,
	eipMarkdownLinkAndTitle,
	eipMarkdownShortLink,
	parseEipMagicUrl,
	stripEipMagicUrls,
} from '@/schema/eips'
import { ContentType, type MarkdownContent } from '@/types/content'
import type { Strings } from '@/types/utils/string-templates'
import { getWalletEvalStrings } from '@/utils/evaluation-content'
import { splitEipLinks } from '@/utils/markdown-eip-links'
import { methodologyPageMarkdown } from '@/utils/methodology-markdown'
import { ratedWalletJsonExport } from '@/utils/wallet-json-export'
import { walletPageMarkdown } from '@/utils/wallet-page-markdown'

const SITE_URL = 'http://localhost:4321'
const eip712 = eips['712']
const erc7828 = eips['7828']

function renderMarkdown(markdown: string, strings?: Record<string, string | null>): string {
	return render(Typography, {
		props: { content: { contentType: ContentType.MARKDOWN, markdown }, strings },
	}).body
}

/** Collect all typographic content reachable from `root`, split by content type. */
function collectTypographicContent(root: unknown): {
	markdown: Array<MarkdownContent<Strings>>
	text: string[]
} {
	const markdown: Array<MarkdownContent<Strings>> = []
	const text: string[] = []
	const seen = new Set<object>()
	const visit = (value: unknown): void => {
		if (typeof value !== 'object' || value === null || seen.has(value)) {
			return
		}

		seen.add(value)

		if ('contentType' in value) {
			if (
				value.contentType === ContentType.MARKDOWN &&
				'markdown' in value &&
				typeof value.markdown === 'string'
			) {
				markdown.push({ contentType: ContentType.MARKDOWN, markdown: value.markdown })
			} else if (
				value.contentType === ContentType.TEXT &&
				'text' in value &&
				typeof value.text === 'string'
			) {
				text.push(value.text)
			}
		}

		for (const child of Object.values(value)) {
			visit(child)
		}
	}

	visit(root)

	return { markdown, text }
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

	it('never renders magic URLs for attribute content', () => {
		const contents = collectTypographicContent(attributeTree).markdown.filter(content =>
			content.markdown.includes('wb-format'),
		)

		expect(contents.length).toBeGreaterThan(0)

		for (const content of contents) {
			const html = render(Typography, {
				props: { content, strings: { WALLET_NAME: 'Example Wallet' } },
			}).body

			expect(html).not.toContain('wb-format')
		}

		for (const content of collectTypographicContent(attributeTree).text) {
			expect(content).not.toContain('wb-format')
		}
	})

	for (const wallet of Object.values(allRatedWallets)) {
		it(`never renders magic URLs for ${wallet.metadata.displayName}`, () => {
			const strings = getWalletEvalStrings(wallet)

			const { markdown, text } = collectTypographicContent(wallet)

			for (const content of markdown) {
				if (content.markdown.includes('wb-format')) {
					expect(renderMarkdown(content.markdown, strings)).not.toContain('wb-format')
				}
			}

			// Plain-text content cannot render links, so EIP links must use Markdown content.
			for (const content of text) {
				expect(content).not.toContain('wb-format')
			}
		})
	}
})

describe('Markdown and JSON exports', () => {
	it('methodology Markdown contains no magic URLs', () => {
		expect(methodologyPageMarkdown(attributeTree, SITE_URL)).not.toContain('wb-format')
	})

	for (const wallet of Object.values(allRatedWallets)) {
		it(`${wallet.metadata.displayName} page Markdown and JSON contain no magic URLs`, () => {
			const [md, json] = isSoftwareRatedWallet(wallet)
				? [
						walletPageMarkdown(softwareWalletAttributeTree, wallet, SITE_URL),
						ratedWalletJsonExport(softwareWalletAttributeTree, wallet),
					]
				: isHardwareRatedWallet(wallet)
					? [
							walletPageMarkdown(hardwareWalletAttributeTree, wallet, SITE_URL),
							ratedWalletJsonExport(hardwareWalletAttributeTree, wallet),
						]
					: isEmbeddedRatedWallet(wallet)
						? [
								walletPageMarkdown(embeddedWalletAttributeTree, wallet, SITE_URL),
								ratedWalletJsonExport(embeddedWalletAttributeTree, wallet),
							]
						: (() => {
								throw new Error('Wallet has no recognized type')
							})()

			expect(md).not.toContain('wb-format')
			expect(JSON.stringify(json)).not.toContain('wb-format')
		})
	}
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { type HastNode, htmlToHast } from 'satteri'
import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'

import type { NavigationItem } from '@/constants/navigation'
import { nativeWalletRenderer } from '@/tests/utils/native-wallet-content'
import { contentWallets, selectedWalletContent } from '@/tests/utils/wallet-page-content'
import { fragmentContent, reportContent } from '@/tests/utils/wallet-report-content'
import { getRepositoryRoot } from '@/utils/codebase'
import NavigationItems from '@/views/NavigationItems.svelte'

describe('complete static wallet reports', () => {
	for (const wallet of contentWallets) {
		it(`${wallet.metadata.id} publishes canonical aggregate citations and hardware badges without JavaScript`, () => {
			const emitted = reportContent(
				readFileSync(join(getRepositoryRoot(), 'dist', wallet.metadata.id, 'index.html'), 'utf8'),
			)
			const expected = selectedWalletContent(wallet, null, null)
			const urls = new Set(emitted.links.map(link => link.href))
			const missingCitations = [
				...new Set(expected.attributes.flatMap(attribute => attribute.citations)),
			].filter(url => !urls.has(url))

			expect.soft(missingCitations).toEqual([])
			expect
				.soft(emitted.links.filter(link => /^\/[^/]+\/\?model=/.test(link.href)))
				.toEqual(expected.badges.map(({ href, text }) => ({ href, text })))
		})
		it(`${wallet.metadata.id} preserves the direct canonical report without JavaScript`, async () => {
			const renderNative = await nativeWalletRenderer(wallet)
			const body = renderNative()
			const emitted = readFileSync(
				join(getRepositoryRoot(), 'dist', wallet.metadata.id, 'index.html'),
				'utf8',
			)

			expect(reportContent(emitted)).toEqual(reportContent(body))
		})
	}
})

describe('canonical navigation inputs', () => {
	const items: NavigationItem[] = [
		{
			id: 'docs',
			title: 'Documentation',
			href: '/docs/',
			children: [{ id: 'features', title: 'Features', href: '/docs/features/' }],
		},
	]
	const primaryLinks = [
		{ href: '/docs/', text: 'Documentation' },
		{ href: '/docs/features/', text: 'Features' },
	]

	for (const { name, props } of [
		{ name: 'primary items', props: { items } },
		{ name: 'grouped items', props: { groups: [{ items }] } },
	]) {
		it(`${name} renders the complete native navigation tree`, () => {
			const body = render(NavigationItems, {
				props: { ...props, currentHref: '/docs/features/' },
			}).body
			const content = fragmentContent(body)
			const currentLinks: string[] = []
			const openGroups: string[] = []
			const visit = (node: HastNode): void => {
				if (node.type === 'element') {
					if (node.tagName === 'a' && node.properties.ariaCurrent === 'page') {
						currentLinks.push(String(node.properties.href))
					}

					if (node.tagName === 'details' && node.properties.open === true) {
						openGroups.push(String(node.properties.dataNavigationItem))
					}
				}

				if (node.type === 'root' || node.type === 'element') {
					node.children.forEach(visit)
				}
			}

			visit(htmlToHast(body))
			expect(content.links).toEqual(primaryLinks)
			expect(content.disclosures).toEqual(['Documentation'])
			expect(currentLinks).toEqual(['/docs/features/'])
			expect(openGroups).toEqual(['docs'])
		})
	}

	it('renders every group from one canonical grouped input', () => {
		const body = render(NavigationItems, {
			props: {
				groups: [{ items }, { items: [{ id: 'about', title: 'About', href: '/about/' }] }],
			},
		}).body

		expect(fragmentContent(body).links).toEqual([
			...primaryLinks,
			{ href: '/about/', text: 'About' },
		])
	})

	it('publishes site navigation without a second copy of its primary tree', () => {
		const props: unknown[] = []
		const visit = (node: HastNode): void => {
			if (node.type === 'element') {
				if (
					node.tagName === 'astro-island' &&
					String(node.properties['component-url']).includes('NavigationItems')
				) {
					props.push(JSON.parse(String(node.properties.props)))
				}
			}

			if (node.type === 'root' || node.type === 'element') {
				node.children.forEach(visit)
			}
		}

		visit(htmlToHast(readFileSync(join(getRepositoryRoot(), 'dist/index.html'), 'utf8')))
		expect(props).toHaveLength(1)
		expect(props[0]).toHaveProperty('groups')
		expect(props[0]).not.toHaveProperty('items')
	})
})

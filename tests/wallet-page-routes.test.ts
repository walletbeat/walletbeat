import type { GetStaticPaths, PaginateFunction } from 'astro'
import { describe, expect, it } from 'vitest'

import { allRatedWallets } from '@/data/wallets'
import { getStaticPaths as htmlMdGetStaticPaths } from '@/pages/[walletName]/index.html.md'
import { getStaticPaths as jsonGetStaticPaths } from '@/pages/[walletName]/index.json'
import { getWalletUrl } from '@/utils/urls'

/** Extract the `walletName` slug segment from a `/slug/` wallet URL. */
const slugFromUrl = (url: string): string => url.replace(/^\/|\/$/g, '')

/** These routes prerender static pages and ignore the `paginate` option. */
const paginate: PaginateFunction = () => []

/** Collect the `walletName` params produced by a route's `getStaticPaths`. */
const collectSlugs = async (getStaticPaths: GetStaticPaths): Promise<Set<string>> => {
	const paths = await getStaticPaths({ paginate, routePattern: '/[walletName]' })

	return new Set(
		paths.map(({ params }) => params.walletName).filter((s): s is string => typeof s === 'string'),
	)
}

describe('wallet page routes', async () => {
	const jsonSlugs = await collectSlugs(jsonGetStaticPaths)
	const htmlMdSlugs = await collectSlugs(htmlMdGetStaticPaths)

	for (const wallet of Object.values(allRatedWallets)) {
		describe(wallet.metadata.displayName, () => {
			const slug = slugFromUrl(getWalletUrl(wallet))

			it('getWalletUrl resolves to a generated JSON route path (no 404)', () => {
				expect(jsonSlugs).toContain(slug)
			})

			it('getWalletUrl resolves to a generated Markdown route path (no 404)', () => {
				expect(htmlMdSlugs).toContain(slug)
			})
		})
	}
})

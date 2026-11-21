import { describe, expect, it } from 'vitest'

import { allRatedWalletsBySlug } from '@/data/wallets'
import { getWalletLinkGroups, urlKey } from '@/utils/wallet-links'

const ratedWallets = Object.values(allRatedWalletsBySlug)

describe('getWalletLinkGroups', () => {
	it.each(ratedWallets.map(wallet => [wallet.metadata.id, wallet] as const))(
		'%s: leads with the website and lists each URL once',
		(_id, wallet) => {
			const groups = getWalletLinkGroups(wallet)
			const links = groups.flatMap(group => group.links)
			const keys = links.map(link => urlKey(link.url))

			expect(groups[0]?.id).toBe('wallet')
			expect(links[0]?.label).toBe('Website')
			expect(new Set(keys).size).toBe(keys.length)
			expect(groups.every(group => group.links.length > 0)).toBe(true)
			expect(links.every(link => /^https?:\/\//.test(link.url))).toBe(true)
		},
	)
})

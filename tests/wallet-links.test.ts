import { describe, expect, it } from 'vitest'

import { allRatedWalletsBySlug } from '@/data/wallets'
import { getWalletLinkGroups } from '@/utils/wallet-links'

const ratedWallets = Object.values(allRatedWalletsBySlug)

function walletById(id: string): (typeof ratedWallets)[number] {
	const wallet = allRatedWalletsBySlug[id] as (typeof ratedWallets)[number] | undefined

	if (wallet === undefined) {
		throw new Error(`No wallet with ID ${id}`)
	}

	return wallet
}

describe('getWalletLinkGroups', () => {
	it.each(ratedWallets.map(wallet => [wallet.metadata.id, wallet] as const))(
		'%s: leads with the website and lists each URL once',
		(_id, wallet) => {
			const groups = getWalletLinkGroups(wallet)
			const links = groups.flatMap(group => group.links)
			const keys = links.map(link => {
				const url = new URL(link.url)

				return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}${url.search}`
			})

			expect(groups[0]?.id).toBe('wallet')
			expect(links[0]?.label).toBe('Website')
			expect(new Set(keys).size).toBe(keys.length)
			expect(groups.every(group => group.links.length > 0)).toBe(true)
			expect(links.every(link => /^https?:\/\//.test(link.url))).toBe(true)
		},
	)

	it('groups store, privacy policy and social links', () => {
		const groups = getWalletLinkGroups(walletById('metamask'))
		const labelsByGroup = Object.fromEntries(
			groups.map(group => [group.id, group.links.map(link => link.label)]),
		)

		expect(labelsByGroup).toEqual({
			wallet: ['Website', 'Documentation', 'Source code'],
			download: ['Chrome Web Store'],
			developer: ['Privacy policy'],
			social: ['X', 'Farcaster', 'Reddit', 'LinkedIn', 'TikTok'],
		})
		expect(groups[0]?.links[2]?.hint).toBe('MetaMask/metamask-extension')
	})

	it("drops the developer's website when it is the wallet's website", () => {
		const links = getWalletLinkGroups(walletById('ambire')).flatMap(group => group.links)

		expect(links.map(link => link.label)).toContain('Website')
		expect(links.map(link => link.label)).not.toContain('Ambire Tech Ltd.')
	})
})

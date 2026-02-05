import { describe, expect, it } from 'vitest'

import { allWalletSecurityNews, getNewsForWallet } from '@/data/news'
import { allWallets } from '@/data/wallets'

describe('wallet security news', () => {
	for (const news of allWalletSecurityNews) {
		describe(`news item "${news.slug}"`, () => {
			it('has unique slug', () => {
				const matchingNews = allWalletSecurityNews.filter(n => n.slug === news.slug)

				expect(matchingNews.length).toBe(1)
			})

			it('references only valid wallet IDs', () => {
				for (const walletId of news.wallets) {
					const walletExists = Object.values(allWallets).some(w => w.metadata.id === walletId)

					expect(walletExists, `Wallet ID "${walletId}" not found in allWallets`).toBe(true)
				}
			})

			it('has publishedAt not after updatedAt', () => {
				expect(news.publishedAt <= news.updatedAt).toBe(true)
			})
		})
	}
})

describe('getNewsForWallet', () => {
	it('returns news items that include the wallet', () => {
		for (const news of allWalletSecurityNews) {
			for (const walletId of news.wallets) {
				const newsForWallet = getNewsForWallet(walletId)

				expect(newsForWallet).toContain(news)
			}
		}
	})

	it('returns empty array for wallet with no news', () => {
		const walletsWithNews = new Set(allWalletSecurityNews.flatMap(n => n.wallets))
		const walletWithoutNews = Object.values(allWallets).find(
			w => !walletsWithNews.has(w.metadata.id),
		)

		if (walletWithoutNews !== undefined) {
			const result = getNewsForWallet(walletWithoutNews.metadata.id)

			expect(result).toEqual([])
		}
	})

	it('returns news sorted by date (newest first)', () => {
		for (const wallet of Object.values(allWallets)) {
			const newsForWallet = getNewsForWallet(wallet.metadata.id)

			for (let i = 1; i < newsForWallet.length; i++) {
				expect(newsForWallet[i - 1].publishedAt >= newsForWallet[i].publishedAt).toBe(true)
			}
		}
	})
})

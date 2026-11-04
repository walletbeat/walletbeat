import { describe, expect, it } from 'vitest'

import { eips } from '@/data/eips'
import { unratedSoftwareWallet } from '@/data/software-wallets'
import { allRatedWallets } from '@/data/wallets'
import { EipSupportStatus, ratedWalletEipSupportByStatus } from '@/schema/eip-support'
import type { RatedWallet } from '@/schema/wallet'
import { eipStatusSupportCards } from '@/utils/eip-support-cards'

describe('EIP wallet card ordering', () => {
	it('orders names and equal-name wallet IDs independently of input order', () => {
		const wallets = [
			{ id: 'z-wallet', displayName: 'Same name' },
			{ id: 'a-wallet', displayName: 'Same name' },
			{ id: 'b-wallet', displayName: 'Alphabetical first' },
		].map(metadata => ({
			...unratedSoftwareWallet,
			metadata: { ...unratedSoftwareWallet.metadata, ...metadata },
		}))

		for (const input of [wallets, wallets.toReversed()]) {
			const cards = eipStatusSupportCards('5792', input)

			expect(cards.map(card => card.id)).toEqual(['b-wallet', 'a-wallet', 'z-wallet'])
			expect(cards.every(card => card.status === EipSupportStatus.UNKNOWN)).toBe(true)
		}
	})

	it('preserves every wallet/status group, platform sequence and citation across the EIP inventory', () => {
		const wallets: Array<RatedWallet<string>> = Object.values(allRatedWallets)

		for (const eip of Object.values(eips)) {
			const cards = eipStatusSupportCards(eip.number, wallets)
			const byKey = new Map(cards.map(card => [`${card.id}/${card.status}`, card]))
			let expectedCount = 0

			expect(byKey.size).toBe(cards.length)

			for (const wallet of wallets) {
				const statuses = ratedWalletEipSupportByStatus(wallet, eip.number)

				for (const status of Object.values(EipSupportStatus)) {
					const entry = statuses[status]

					if (entry === undefined) {
						continue
					}

					expectedCount++
					const card = byKey.get(`${wallet.metadata.id}/${status}`)

					expect(card?.variants).toEqual(entry.variants)
					expect(card?.references).toEqual(entry.references)
					expect(card?.displayName).toBe(wallet.metadata.displayName)
				}
			}
			expect(cards).toHaveLength(expectedCount)
		}
	})
})

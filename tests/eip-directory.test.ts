import { describe, expect, it } from 'vitest'

import { eips } from '@/data/eips'
import { allRatedWallets } from '@/data/wallets'
import { lucideNavigationIcons } from '@/icons/lucide-navigation-icons'
import { EipSupportStatus, eipSupportStatus, ratedWalletEipSupport } from '@/schema/eip-support'
import type { RatedWallet } from '@/schema/wallet'
import { wbIconEmojiSequences } from '@/styles/wbicons'
import { eipDirectoryEntries } from '@/utils/eip-directory'
import { getWalletUrl } from '@/utils/urls'

describe('EIP directory', () => {
	const entries = eipDirectoryEntries(eips)
	const wallets: Array<RatedWallet<string>> = Object.values(allRatedWallets)

	for (const entry of Object.values(entries)) {
		describe(entry.number, () => {
			it('has a renderable icon', () => {
				expect(
					Object.hasOwn(lucideNavigationIcons, entry.icon) ||
						Object.hasOwn(wbIconEmojiSequences, entry.icon),
				).toBe(true)
			})

			it('lists exactly the rated wallets that implement it, sorted by name', () => {
				const expected = wallets
					.filter(
						wallet =>
							eipSupportStatus(ratedWalletEipSupport(wallet, entry.number).overall) ===
							EipSupportStatus.SUPPORTED,
					)
					.map(wallet => wallet.metadata.displayName)
					.sort((a, b) => a.localeCompare(b))

				expect(entry.implementers.map(wallet => wallet.displayName)).toEqual(expected)
			})

			it('links implementers to their wallet pages', () => {
				for (const implementer of entry.implementers) {
					expect(implementer.url).toBe(getWalletUrl({ metadata: { id: implementer.id } }))
				}
			})
		})
	}

	it('finds implementers for widely supported EIPs', () => {
		expect(entries['1193'].implementers.length).toBeGreaterThan(0)
	})
})

import { describe, it } from 'vitest'

import { hardwareWallets } from '@/data/hardware-wallets'
import { softwareWallets } from '@/data/software-wallets'
import { type BaseWallet, rateWallet } from '@/schema/wallet'

describe('wallets', () => {
	const walletMaps: { walletMap: { [K: string]: BaseWallet }; walletMapName: string }[] = [
		{
			walletMap: softwareWallets,
			walletMapName: 'software wallets',
		},
		{
			walletMap: hardwareWallets,
			walletMapName: 'hardware wallets',
		},
		// TODO: Add embedded wallets here once we have some.
	]

	for (const { walletMap, walletMapName } of walletMaps) {
		describe(walletMapName, () => {
			for (const wallet of Object.values(walletMap)) {
				it(`can rate ${wallet.metadata.displayName}`, () => {
					rateWallet(wallet)
				})
			}
		})
	}
})

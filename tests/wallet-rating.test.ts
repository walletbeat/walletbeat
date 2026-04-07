import { describe, it } from 'vitest'

import { attributeGroupById } from '@/data/attribute-groups'
import { hardwareWallets } from '@/data/hardware-wallets'
import { softwareWallets } from '@/data/software-wallets'
import { softwareLadders } from '@/schema/ladders'
import type { BaseWallet } from '@/schema/wallet'
import { rateWallet } from '@/schema/wallet'

describe('wallets', () => {
	const walletMaps: {
		walletMap: Record<string, BaseWallet<string>>
		walletMapName: string
	}[] = [
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
					rateWallet(attributeGroupById, softwareLadders, wallet)
				})
			}
		})
	}
})

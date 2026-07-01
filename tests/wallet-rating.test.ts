import { describe, it } from 'vitest'

import { hardwareWalletAttributeTree, hardwareWallets } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree, softwareWallets } from '@/data/software-wallets'
import type { AttributeTree } from '@/schema/attribute-groups'
import { hardwareLadders, type Ladders, softwareLadders } from '@/schema/ladders'
import { type BaseWallet, rateWallet } from '@/schema/wallet'

type WalletMapTestCase = {
	attributeTree: AttributeTree<string>
	ladders: Ladders<string>
	title: string
	walletMap: Record<string, BaseWallet<string>>
}

const walletMaps: WalletMapTestCase[] = [
	{
		attributeTree: softwareWalletAttributeTree,
		ladders: softwareLadders,
		title: 'software wallets',
		walletMap: softwareWallets,
	},
	{
		attributeTree: hardwareWalletAttributeTree,
		ladders: hardwareLadders,
		title: 'hardware wallets',
		walletMap: hardwareWallets,
	},
]

describe('wallets', () => {
	for (const { attributeTree, ladders, title, walletMap } of walletMaps) {
		describe(title, () => {
			for (const walletName in walletMap) {
				const wallet = walletMap[walletName]

				it(`can rate ${walletName}`, () => {
					rateWallet(attributeTree, ladders, wallet)
				})
			}
		})
	}

	// TODO: Add embedded wallets here once we have some.
})

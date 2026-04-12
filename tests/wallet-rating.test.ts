import { describe, it } from 'vitest'

import { hardwareWalletAttributeTree, hardwareWallets } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree, softwareWallets } from '@/data/software-wallets'
import { softwareLadders } from '@/schema/ladders'
import { rateWallet } from '@/schema/wallet'

describe('wallets', () => {
	describe('software wallets', () => {
		for (const wallet of Object.values(softwareWallets)) {
			it(`can rate ${wallet.metadata.displayName}`, () => {
				rateWallet(softwareWalletAttributeTree, softwareLadders, wallet)
			})
		}
	})

	describe('hardware wallets', () => {
		for (const wallet of Object.values(hardwareWallets)) {
			it(`can rate ${wallet.metadata.displayName}`, () => {
				rateWallet(hardwareWalletAttributeTree, softwareLadders, wallet)
			})
		}
	})

	// TODO: Add embedded wallets here once we have some.
})

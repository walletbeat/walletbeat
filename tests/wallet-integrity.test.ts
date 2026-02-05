import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { hardwareWallets } from '@/data/hardware-wallets'
import { softwareWallets } from '@/data/software-wallets'
import { allWallets, isValidWalletName } from '@/data/wallets'
import type { BaseWallet } from '@/schema/wallet'

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
			for (const walletKey of Object.keys(walletMap)) {
				it(`is the only wallet map that has key ${walletKey}`, () => {
					for (const {
						walletMap: otherWalletMap,
						walletMapName: otherWalletMapName,
					} of walletMaps) {
						if (walletMapName === otherWalletMapName) {
							continue
						}

						expect(otherWalletMap[walletKey]).toBeUndefined()

						if (typeof walletKey !== 'string' || !isValidWalletName(walletKey)) {
							throw new Error('unexpected wallet key')
						}

						expect(allWallets[walletKey]).toBe(walletMap[walletKey])
					}
				})
			}
		})
	}

	for (const { walletMap, walletMapName } of walletMaps.concat([
		{
			walletMap: allWallets,
			walletMapName: 'all wallets',
		},
	])) {
		describe(walletMapName, () => {
			for (const [walletKey, wallet] of Object.entries(walletMap)) {
				it(`has the correct key for ${wallet.metadata.displayName}`, () => {
					expect(walletKey).toBe(wallet.metadata.id)
				})
			}
		})
	}

	for (const wallet of Object.values(allWallets)) {
		describe(`wallet ${wallet.metadata.displayName}`, () => {
			it('has valid icon', () => {
				expect(
					fs.existsSync(
						path.resolve(
							__dirname,
							`../public/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`,
						),
					),
				).toBe(true)
			})
		})
	}
})

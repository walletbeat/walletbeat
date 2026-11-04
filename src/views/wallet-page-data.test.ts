import { describe, expect, it } from 'vitest'

import { unratedEmbeddedWallet } from '@/data/embedded-wallets'
import { unratedEmbeddedTemplate } from '@/data/embedded-wallets/unrated.tmpl'
import { allRatedWalletsBySlug, allWallets, attributeTreeForWallet } from '@/data/wallets'
import { allWalletLadders } from '@/schema/ladders'
import { evaluateWalletOnLadder } from '@/schema/stages'
import { variantEnum } from '@/schema/variants'
import { walletSupportedAccountTypes } from '@/schema/wallet'

import { restoreWalletPageData, walletPageAttributeTree, walletPageData } from './wallet-page-data'

describe('wallet page facts', () => {
	for (const wallet of [...Object.values(allRatedWalletsBySlug), unratedEmbeddedWallet]) {
		it(`preserves the native consumer data for ${wallet.metadata.id}`, () => {
			const source = [...Object.values(allWallets), unratedEmbeddedTemplate].find(
				entry => entry.metadata.id === wallet.metadata.id,
			)

			if (!source) {
				throw new Error(`Missing wallet source: ${wallet.metadata.id}`)
			}

			const data = structuredClone(walletPageData(wallet, source))
			const restored = restoreWalletPageData(data)

			expect(restored).toEqual(wallet)
			expect(walletPageAttributeTree(data)).toEqual(attributeTreeForWallet(wallet))

			for (const variant of ['ALL_VARIANTS' as const, ...variantEnum.items]) {
				expect(walletSupportedAccountTypes(restored, variant)).toEqual(
					walletSupportedAccountTypes(wallet, variant),
				)
			}

			for (const ladder of Object.values(allWalletLadders)) {
				expect(evaluateWalletOnLadder(restored, ladder)).toEqual(
					evaluateWalletOnLadder(wallet, ladder),
				)
			}
		})
	}
})

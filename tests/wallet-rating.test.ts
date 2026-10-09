import { describe, expect, it } from 'vitest'

import { hardwareWalletAttributeTree, hardwareWallets } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree, softwareWallets } from '@/data/software-wallets'
import { type AttributeTree, evaluateAttributes } from '@/schema/attribute-groups'
import { resolveFeatures } from '@/schema/features'
import { hardwareLadders, type Ladders, softwareLadders } from '@/schema/ladders'
import type { Variant } from '@/schema/variants'
import { type BaseWallet, rateWallet, type ResolvedWallet } from '@/schema/wallet'
import { nonEmptyValues } from '@/types/utils/non-empty'

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

				it(`can rate ${walletName} without modifying its per-variant evaluations`, () => {
					const rated = rateWallet(attributeTree, ladders, wallet)

					for (const resolved of nonEmptyValues<Variant, ResolvedWallet<string>>(rated.variants)) {
						const features = resolveFeatures(wallet.features, wallet.variants, resolved.variant)

						expect(resolved.attributes, `variant ${resolved.variant}`).toEqual(
							evaluateAttributes(attributeTree, features, wallet.metadata),
						)
					}
				})
			}
		})
	}

	// TODO: Add embedded wallets here once we have some.
})

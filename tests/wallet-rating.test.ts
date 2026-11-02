import { describe, expect, it } from 'vitest'

import { hardwareWalletAttributeTree, hardwareWallets } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree, softwareWallets } from '@/data/software-wallets'
import {
	type AttributeTree,
	evaluateAttributes,
	mapAttributesGetter,
} from '@/schema/attribute-groups'
import { Rating } from '@/schema/attributes'
import { resolveFeatures } from '@/schema/features'
import { hardwareLadders, type Ladders, softwareLadders } from '@/schema/ladders'
import type { Variant } from '@/schema/variants'
import { type BaseWallet, rateWallet, type ResolvedWallet } from '@/schema/wallet'
import { nonEmptyEntries, nonEmptyValues } from '@/types/utils/non-empty'

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

				it(`${walletName} variants sharing an outcome ID have the same evaluation`, () => {
					const rated = rateWallet(attributeTree, ladders, wallet)
					const variants = nonEmptyEntries<Variant, ResolvedWallet<string>>(rated.variants)

					for (const [i, [variantA, walletA]] of variants.entries()) {
						for (const [variantB, walletB] of variants.slice(i + 1)) {
							mapAttributesGetter(walletA.attributes, getter => {
								const evalA = getter(walletA.attributes)?.evaluation
								const evalB = getter(walletB.attributes)?.evaluation

								if (
									evalA === undefined ||
									evalB === undefined ||
									evalA.outcome.rating === Rating.EXEMPT ||
									evalA.outcome.id !== evalB.outcome.id
								) {
									return
								}

								const visibleContent = ({ details, impact, howToImprove }: typeof evalA) => ({
									details,
									impact,
									howToImprove,
								})

								expect
									.soft(visibleContent(evalB), `${evalA.outcome.id} (${variantA} vs ${variantB})`)
									.toStrictEqual(visibleContent(evalA))
							})
						}
					}
				})
			}
		})
	}

	// TODO: Add embedded wallets here once we have some.
})

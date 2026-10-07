import { describe, expect, it } from 'vitest'

import { hardwareWalletAttributeTree, hardwareWallets } from '@/data/hardware-wallets'
import { softwareWalletAttributeTree, softwareWallets } from '@/data/software-wallets'
import type { AttributeTree } from '@/schema/attribute-groups'
import { Rating } from '@/schema/attributes'
import { transactionInclusion } from '@/schema/attributes/self-sovereignty/transaction-inclusion'
import { hardwareLadders, type Ladders, softwareLadders } from '@/schema/ladders'
import { Variant } from '@/schema/variants'
import {
	attributeVariantSpecificity,
	type BaseWallet,
	rateWallet,
	VariantSpecificity,
} from '@/schema/wallet'

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
	it('distinguishes L1 broadcast support even when both Rabby variants fail transaction inclusion', () => {
		const wallet = rateWallet(softwareWalletAttributeTree, softwareLadders, softwareWallets.rabby)
		const mobile = wallet.variants[Variant.MOBILE]
		const browser = wallet.variants[Variant.BROWSER]

		if (mobile === undefined || browser === undefined) {
			throw new Error('Rabby must have mobile and browser variants')
		}

		const mobileEvaluation = mobile.attributes.selfSovereignty.transactionInclusion.evaluation
		const browserEvaluation = browser.attributes.selfSovereignty.transactionInclusion.evaluation

		expect(mobileEvaluation.outcome.rating).toBe(Rating.FAIL)
		expect(browserEvaluation.outcome.rating).toBe(Rating.FAIL)
		expect(wallet.overall.selfSovereignty.transactionInclusion.evaluation.outcome.rating).toBe(
			Rating.FAIL,
		)
		expect(mobileEvaluation.details).toMatchObject({
			component: { componentProps: { supportsL1Broadcast: 'NO' } },
		})
		expect(browserEvaluation.details).toMatchObject({
			component: { componentProps: { supportsL1Broadcast: 'OWN_NODE' } },
		})
		expect(browserEvaluation.outcome.id).not.toBe(mobileEvaluation.outcome.id)

		for (const variant of [Variant.MOBILE, Variant.BROWSER]) {
			expect(attributeVariantSpecificity(wallet, variant, transactionInclusion)).toBe(
				VariantSpecificity.UNIQUE_TO_VARIANT,
			)
		}
	})

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

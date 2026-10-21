import type { WalletEmbeddedFeatures } from '@/schema/features'
import { embeddedLadders } from '@/schema/ladders'
import type { Variant } from '@/schema/variants'
import { type BaseWallet, rateWallet } from '@/schema/wallet'

import { type EmbeddedAttributeGroupId, embeddedWalletAttributeTree } from './attribute-trees'
import { unratedEmbeddedTemplate } from './embedded-wallets/unrated.tmpl'

export { type EmbeddedAttributeGroupId, embeddedWalletAttributeTree } from './attribute-trees'

/**
 * The interface used to describe embedded wallets.
 * This should only be used for data entry and in attribute rating logic,
 * never in UI code. UI code should only deal with fully-rated wallet data.
 * See `RatedWallet` instead.
 */
export type EmbeddedWallet = BaseWallet<EmbeddedAttributeGroupId> & {
	features: WalletEmbeddedFeatures
	variants: {
		[Variant.EMBEDDED]: true
	}
}

export const embeddedWallets: Record<string, EmbeddedWallet> = {}

export const ratedEmbeddedWallets = Object.fromEntries(
	Object.entries(embeddedWallets).map(([name, wallet]) => [
		name,
		rateWallet(embeddedWalletAttributeTree, embeddedLadders, wallet),
	]),
)

/** The unrated embedded wallet as a rated wallet. */
export const unratedEmbeddedWallet = rateWallet(
	embeddedWalletAttributeTree,
	embeddedLadders,
	unratedEmbeddedTemplate,
)

import type { AttributeTree } from '@/schema/attribute-groups'
import type { WalletEmbeddedFeatures } from '@/schema/features'
import { softwareLadders } from '@/schema/ladders'
import type { Variant } from '@/schema/variants'
import { type BaseWallet, rateWallet } from '@/schema/wallet'

import { AttributeGroupId, attributeTreeForIds } from './attribute-groups'
import { unratedEmbeddedTemplate } from './embedded-wallets/unrated.tmpl'

export const embeddedWalletAttributeGroupIds = [
	AttributeGroupId.Security,
	AttributeGroupId.Privacy,
	AttributeGroupId.SelfSovereignty,
	AttributeGroupId.Transparency,
	AttributeGroupId.Ecosystem,
	AttributeGroupId.Maintenance,
] as const

export type EmbeddedAttributeGroupId = (typeof embeddedWalletAttributeGroupIds)[number]

export const embeddedWalletAttributeTree = attributeTreeForIds(
	embeddedWalletAttributeGroupIds,
) satisfies AttributeTree<EmbeddedAttributeGroupId>

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
		rateWallet(embeddedWalletAttributeTree, softwareLadders, wallet),
	]),
)

/** The unrated embedded wallet as a rated wallet. */
export const unratedEmbeddedWallet = rateWallet(
	embeddedWalletAttributeTree,
	softwareLadders,
	unratedEmbeddedTemplate,
)

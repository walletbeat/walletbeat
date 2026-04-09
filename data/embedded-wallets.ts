import type { AttributeTree } from '@/schema/attribute-groups'
import { allWalletLadders } from '@/schema/ladders'
import {
	type BaseWallet,
	type RatedWallet,
	rateWallet,
	sliceCanonicalWalletForType,
} from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'

import { AttributeGroupId, attributeTreeForIds } from './attribute-groups'
import { canonicalWallets } from './canonical-wallets'
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

export const embeddedWallets = Object.entries(canonicalWallets).reduce<
	Record<string, BaseWallet<EmbeddedAttributeGroupId>>
>((acc, [name, wallet]) => {
	const embeddedWallet = sliceCanonicalWalletForType<EmbeddedAttributeGroupId>(
		wallet,
		WalletType.EMBEDDED,
	)

	return embeddedWallet === null
		? acc
		: {
				...acc,
				[name]: embeddedWallet,
			}
}, {})

export const ratedEmbeddedWallets = Object.fromEntries(
	Object.entries(embeddedWallets).map(([name, wallet]) => [
		name,
		rateWallet(embeddedWalletAttributeTree, allWalletLadders, wallet),
	]),
) satisfies Record<string, RatedWallet<string>>

/** The unrated embedded wallet as a rated wallet. */
export const unratedEmbeddedWallet = rateWallet(
	embeddedWalletAttributeTree,
	allWalletLadders,
	sliceCanonicalWalletForType(unratedEmbeddedTemplate, WalletType.EMBEDDED)!,
)

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
import { unratedTemplate as unratedSoftwareTemplate } from './software-wallets/unrated.tmpl'

export const softwareWalletAttributeGroupIds = [
	AttributeGroupId.Security,
	AttributeGroupId.Privacy,
	AttributeGroupId.SelfSovereignty,
	AttributeGroupId.Transparency,
	AttributeGroupId.Ecosystem,
] as const

export type SoftwareAttributeGroupId = (typeof softwareWalletAttributeGroupIds)[number]

export const softwareWalletAttributeTree = attributeTreeForIds(
	softwareWalletAttributeGroupIds,
) satisfies AttributeTree<SoftwareAttributeGroupId>

/** Set of all known software wallets. */
export const softwareWallets = Object.entries(canonicalWallets).reduce<
	Record<string, BaseWallet<SoftwareAttributeGroupId>>
>((acc, [name, wallet]) => {
	const softwareWallet = sliceCanonicalWalletForType<SoftwareAttributeGroupId>(
		wallet,
		WalletType.SOFTWARE,
	)

	return softwareWallet === null
		? acc
		: {
				...acc,
				[name]: softwareWallet,
			}
}, {})

/** A valid software wallet name. */
export type SoftwareWalletName = keyof typeof softwareWallets

/** Type predicate for SoftwareWalletName. */
export function isValidSoftwareWalletName(name: string): name is SoftwareWalletName {
	return Object.prototype.hasOwnProperty.call(softwareWallets, name)
}

/** All rated software wallets. */
export const ratedSoftwareWallets = Object.fromEntries(
	Object.entries(softwareWallets).map(([name, wallet]) => [
		name,
		rateWallet(softwareWalletAttributeTree, allWalletLadders, wallet),
	]),
) satisfies Record<string, RatedWallet<string>>

/**
 * Map the given function to all rated software wallets.
 */
export function mapSoftwareWallets<T>(fn: (wallet: RatedWallet<string>, index: number) => T): T[] {
	return Object.values(ratedSoftwareWallets).map(fn)
}

/** The unrated software wallet as a rated wallet. */
export const unratedSoftwareWallet = rateWallet(
	softwareWalletAttributeTree,
	allWalletLadders,
	sliceCanonicalWalletForType(unratedSoftwareTemplate, WalletType.SOFTWARE)!,
)

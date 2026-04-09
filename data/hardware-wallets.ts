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
import { unratedHardwareTemplate } from './hardware-wallets/unrated.tmpl'

export const hardwareWalletAttributeGroupIds = [
	AttributeGroupId.Security,
	AttributeGroupId.Privacy,
	AttributeGroupId.SelfSovereignty,
	AttributeGroupId.Transparency,
	AttributeGroupId.Ecosystem,
	AttributeGroupId.Maintenance,
] as const

export type HardwareAttributeGroupId = (typeof hardwareWalletAttributeGroupIds)[number]

export const hardwareWalletAttributeTree = attributeTreeForIds(
	hardwareWalletAttributeGroupIds,
) satisfies AttributeTree<HardwareAttributeGroupId>

/** Set of all known hardware wallets. */
export const hardwareWallets = Object.entries(canonicalWallets).reduce<
	Record<string, BaseWallet<HardwareAttributeGroupId>>
>((acc, [name, wallet]) => {
	const hardwareWallet = sliceCanonicalWalletForType<HardwareAttributeGroupId>(
		wallet,
		WalletType.HARDWARE,
	)

	return hardwareWallet === null
		? acc
		: {
				...acc,
				[name]: hardwareWallet,
			}
}, {})

/** A valid hardware wallet name. */
export type HardwareWalletName = keyof typeof hardwareWallets

/** Type predicate for HardwareWalletName. */
export function isValidHardwareWalletName(name: string): name is HardwareWalletName {
	return Object.prototype.hasOwnProperty.call(hardwareWallets, name)
}

/** Rated hardware wallets. */
export const ratedHardwareWallets = Object.fromEntries(
	Object.entries(hardwareWallets).map(([name, wallet]) => [
		name,
		rateWallet(hardwareWalletAttributeTree, allWalletLadders, wallet),
	]),
) satisfies Record<string, RatedWallet<string>>

/**
 * Map the given function to all rated hardware wallets.
 */
export function mapHardwareWallets<T>(fn: (wallet: RatedWallet<string>, index: number) => T): T[] {
	return Object.values(ratedHardwareWallets).map(fn)
}

/** The unrated hardware wallet as a rated wallet. */
export const unratedHardwareWallet = rateWallet<HardwareAttributeGroupId>(
	hardwareWalletAttributeTree,
	allWalletLadders,
	sliceCanonicalWalletForType(unratedHardwareTemplate, WalletType.HARDWARE)!,
)

export type HardwareModel = {
	id: string
	brandId: string
	brandName: string
	iconUrl: string
	isFlagship?: boolean
	modelId: string
	modelName: string
	url?: string
}

export const allHardwareModels = Object.values(hardwareWallets)
	.flatMap(
		wallet =>
			wallet.metadata.hardwareWalletModels?.map(
				(model): HardwareModel => ({
					id: `${wallet.metadata.id}.${model.id}`,
					brandId: wallet.metadata.id,
					brandName: wallet.metadata.tableName ?? wallet.metadata.displayName,
					iconUrl: `/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`,
					isFlagship: model.isFlagship ?? false,
					modelId: model.id,
					modelName: model.name,
					url: model.url ?? undefined,
				}),
			) ?? [],
	)
	.sort(
		(a, b) =>
			a.brandName.localeCompare(b.brandName) ||
			(b.isFlagship ? 1 : 0) - (a.isFlagship ? 1 : 0) ||
			a.modelName.localeCompare(b.modelName),
	)

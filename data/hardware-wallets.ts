import type { AttributeTree } from '@/schema/attribute-groups'
import type { WalletHardwareFeatures } from '@/schema/features'
import { softwareLadders } from '@/schema/ladders'
import type { Variant } from '@/schema/variants'
import { type BaseWallet, type RatedWallet, rateWallet } from '@/schema/wallet'

import { AttributeGroupId, attributeTreeForIds } from './attribute-groups'
import { bitboxWallet } from './hardware-wallets/bitbox'
import { cypherockWallet } from './hardware-wallets/cypherock'
import { fireflyWallet } from './hardware-wallets/firefly'
import { gridplusWallet } from './hardware-wallets/gridplus'
import { imkeyWallet } from './hardware-wallets/imkey'
import { keycardShell } from './hardware-wallets/keycard-shell'
import { keystoneWallet } from './hardware-wallets/keystone'
import { ledgerWallet } from './hardware-wallets/ledger'
import { ngrave } from './hardware-wallets/ngrave'
import { onekeyWallet } from './hardware-wallets/onekey'
import { trezorWallet } from './hardware-wallets/trezor'
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

/**
 * The interface used to describe hardware wallets.
 * This should only be used for data entry and in attribute rating logic,
 * never in UI code. UI code should only deal with fully-rated wallet data.
 * See `RatedWallet` instead.
 */
export type HardwareWallet = BaseWallet<HardwareAttributeGroupId> & {
	features: WalletHardwareFeatures
	variants: {
		[Variant.HARDWARE]: true
	}
}

/** Set of all known hardware wallets. */
export const hardwareWallets = {
	bitbox: bitboxWallet,
	cypherock: cypherockWallet,
	firefly: fireflyWallet,
	gridplus: gridplusWallet,
	imkey: imkeyWallet,
	keycardShell: keycardShell,
	keystone: keystoneWallet,
	ledger: ledgerWallet,
	ngrave: ngrave,
	onekey: onekeyWallet,
	trezor: trezorWallet,
} as const satisfies Record<string, HardwareWallet>

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
		rateWallet<HardwareAttributeGroupId>(hardwareWalletAttributeTree, softwareLadders, wallet),
	]),
) satisfies Record<string, RatedWallet<HardwareAttributeGroupId>>

/**
 * Map the given function to all rated hardware wallets.
 */
export function mapHardwareWallets<T>(
	fn: (wallet: RatedWallet<HardwareAttributeGroupId>, index: number) => T,
): T[] {
	return Object.values(ratedHardwareWallets).map(fn)
}

/** The unrated hardware wallet as a rated wallet. */
export const unratedHardwareWallet = rateWallet<HardwareAttributeGroupId>(
	hardwareWalletAttributeTree,
	softwareLadders,
	unratedHardwareTemplate,
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
		(wallet: HardwareWallet) =>
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

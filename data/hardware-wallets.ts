import type { AttributeTree } from '@/schema/attribute-groups'
import { AttributeGroupId, attributeTreeForIds } from '@/schema/attribute-tree'
import type { WalletHardwareFeatures } from '@/schema/features'
import { hardwareLadders } from '@/schema/ladders'
import type { Variant } from '@/schema/variants'
import { type BaseWallet, type RatedWallet, rateWallet } from '@/schema/wallet'

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

const hardwareWalletAttributeGroupIds = [
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
	keycardShell,
	keystone: keystoneWallet,
	ledger: ledgerWallet,
	ngrave,
	onekey: onekeyWallet,
	trezor: trezorWallet,
} as const satisfies Record<string, HardwareWallet>

/** Type predicate for hardware wallet names. */
export function isValidHardwareWalletName(name: string): name is keyof typeof hardwareWallets {
	return Object.prototype.hasOwnProperty.call(hardwareWallets, name)
}

/** Rated hardware wallets. */
export const ratedHardwareWallets = Object.fromEntries(
	Object.entries(hardwareWallets).map(([name, wallet]) => [
		name,
		rateWallet<HardwareAttributeGroupId>(hardwareWalletAttributeTree, hardwareLadders, wallet),
	]),
) satisfies Record<string, RatedWallet<HardwareAttributeGroupId>>

/** The unrated hardware wallet as a rated wallet. */
export const unratedHardwareWallet = rateWallet<HardwareAttributeGroupId>(
	hardwareWalletAttributeTree,
	hardwareLadders,
	unratedHardwareTemplate,
)

export const allHardwareModels = Object.values(hardwareWallets)
	.flatMap(
		(wallet: HardwareWallet) =>
			wallet.metadata.hardwareWalletModels?.map(model => ({
				id: `${wallet.metadata.id}.${model.id}`,
				brandId: wallet.metadata.id,
				brandName: wallet.metadata.tableName ?? wallet.metadata.displayName,
				iconUrl: `/images/wallets/${wallet.metadata.id}.${wallet.metadata.iconExtension}`,
				isFlagship: model.isFlagship ?? false,
				modelId: model.id,
				modelName: model.name,
				url: model.url ?? undefined,
			})) ?? [],
	)
	.sort(
		(a, b) =>
			a.brandName.localeCompare(b.brandName) ||
			(b.isFlagship ? 1 : 0) - (a.isFlagship ? 1 : 0) ||
			a.modelName.localeCompare(b.modelName),
	)

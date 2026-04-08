import type { AttributeTree } from '@/schema/attribute-groups'
import type { WalletSoftwareFeatures } from '@/schema/features'
import { allWalletLadders } from '@/schema/ladders'
import { type AtLeastOneTrueVariant, Variant } from '@/schema/variants'
import { type BaseWallet, type RatedWallet, rateWallet } from '@/schema/wallet'

import { AttributeGroupId, attributeTreeForIds } from './attribute-groups'
import { ambire } from './software-wallets/ambire'
import { baseApp } from './software-wallets/base-app'
import { bitget } from './software-wallets/bitget'
import { daimo } from './software-wallets/daimo'
import { elytro } from './software-wallets/elytro'
import { family } from './software-wallets/family'
import { frame } from './software-wallets/frame'
import { gemwallet } from './software-wallets/gem'
import { imtoken } from './software-wallets/imtoken'
import { ledgerLive } from './software-wallets/ledger'
import { metamask } from './software-wallets/metamask'
import { mtpelerin } from './software-wallets/mtpelerin'
import { nufi } from './software-wallets/nufi'
import { okx } from './software-wallets/okx'
import { phantom } from './software-wallets/phantom'
import { pillarx } from './software-wallets/pillarx'
import { rabby } from './software-wallets/rabby'
import { rainbow } from './software-wallets/rainbow'
import { safe } from './software-wallets/safe'
import { uniswapWallet } from './software-wallets/uniswap-wallet'
import { unratedTemplate as unratedSoftwareTemplate } from './software-wallets/unrated.tmpl'
import { zerion } from './software-wallets/zerion'
import { zeus } from './software-wallets/zeus'

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

/**
 * The interface used to describe software wallets.
 * This should only be used for data entry and in attribute rating logic,
 * never in UI code. UI code should only deal with fully-rated wallet data.
 * See `RatedWallet` instead.
 */
export type SoftwareWallet = BaseWallet<SoftwareAttributeGroupId> & {
	features: WalletSoftwareFeatures
	variants: AtLeastOneTrueVariant &
		(
			| {
					[Variant.BROWSER]: true
			  }
			| {
					[Variant.DESKTOP]: true
			  }
			| {
					[Variant.MOBILE]: true
			  }
		)
}

/** Set of all known software wallets. */
export const softwareWallets = {
	ambire,
	baseApp,
	bitget,
	daimo,
	elytro,
	family,
	frame,
	gemwallet,
	imtoken,
	ledgerLive,
	metamask,
	mtpelerin,
	nufi,
	okx,
	phantom,
	pillarx,
	rabby,
	rainbow,
	safe,
	uniswapWallet,
	zerion,
	zeus,
} as const satisfies Record<string, SoftwareWallet>

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
	unratedSoftwareTemplate,
)

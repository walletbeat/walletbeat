import type { AttributeTree } from '@/schema/attribute-groups'
import { type AttributeGroupId } from '@/schema/attribute-tree'
import { type BaseWallet, type RatedWallet, type WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'

import {
	type EmbeddedAttributeGroupId,
	embeddedWalletAttributeTree,
	embeddedWallets,
	ratedEmbeddedWallets,
	unratedEmbeddedWallet,
} from './embedded-wallets'
import {
	type HardwareAttributeGroupId,
	hardwareWalletAttributeTree,
	hardwareWallets,
	isValidHardwareWalletName,
	ratedHardwareWallets,
	unratedHardwareWallet,
} from './hardware-wallets'
import {
	isValidSoftwareWalletName,
	ratedSoftwareWallets,
	type SoftwareAttributeGroupId,
	softwareWalletAttributeTree,
	softwareWallets,
	unratedSoftwareWallet,
} from './software-wallets'

/** Set of all known wallets. */
export const allWallets = {
	...softwareWallets,
	...hardwareWallets,
	...embeddedWallets,
} as const satisfies Record<string, BaseWallet<AttributeGroupId>>

/** A valid wallet name. */
export type WalletName = keyof typeof allWallets

/** Type predicate for WalletName. */
export function isValidWalletName(name: string): name is WalletName {
	return isValidSoftwareWalletName(name) || isValidHardwareWalletName(name)
}

/** Assert that `name` is a valid `WalletName`. */
export function assertValidWalletName(name: string): WalletName {
	if (!isValidWalletName(name)) {
		throw new Error(
			`invalid wallet ID "${name}" (did you add it to \`/data/{software,hardware,...}-wallets.ts\`?)`,
		)
	}

	return name
}

/** All rated wallets (each rated with the attribute tree for its wallet class). */
export const allRatedWallets = {
	...ratedSoftwareWallets,
	...ratedHardwareWallets,
	...ratedEmbeddedWallets,
} as const satisfies Record<WalletName, RatedWallet<string>>

/** All rated wallets keyed by their slug (metadata.id). */
export const allRatedWalletsBySlug: Record<string, RatedWallet<string>> = Object.fromEntries(
	Object.values(allRatedWallets).map(wallet => [wallet.metadata.id, wallet]),
)

/** Check if a string is a valid wallet slug (metadata.id). */
export function isValidWalletSlug(slug: string): slug is keyof typeof allRatedWalletsBySlug {
	return Object.prototype.hasOwnProperty.call(allRatedWalletsBySlug, slug)
}

/**
 * Map the given function to all rated wallets.
 */
export function mapWallets<T>(fn: (wallet: RatedWallet<string>, index: number) => T): T[] {
	return Object.values(allRatedWallets).map(fn)
}

/**
 * Given a specific wallet type, return a RatedWallet of that type.
 */
export function representativeWalletForType(walletType: WalletType) {
	switch (walletType) {
		case WalletType.SOFTWARE:
			return unratedSoftwareWallet
		case WalletType.HARDWARE:
			return unratedHardwareWallet
		case WalletType.EMBEDDED:
			return unratedEmbeddedWallet
	}
}

export function isSoftwareRatedWallet(
	wallet: RatedWallet<string>,
): wallet is RatedWallet<SoftwareAttributeGroupId> {
	return wallet.types[WalletType.SOFTWARE] === true
}

export function isHardwareRatedWallet(
	wallet: RatedWallet<string>,
): wallet is RatedWallet<HardwareAttributeGroupId> {
	return wallet.types[WalletType.HARDWARE] === true
}

export function isEmbeddedRatedWallet(
	wallet: RatedWallet<string>,
): wallet is RatedWallet<EmbeddedAttributeGroupId> {
	return wallet.types[WalletType.EMBEDDED] === true
}

export function walletAttributeTree(
	wallet: Pick<RatedWallet<SoftwareAttributeGroupId>, 'types'>,
): typeof softwareWalletAttributeTree
export function walletAttributeTree(
	wallet: Pick<RatedWallet<HardwareAttributeGroupId>, 'types'>,
): typeof hardwareWalletAttributeTree
export function walletAttributeTree(
	wallet: Pick<RatedWallet<EmbeddedAttributeGroupId>, 'types'>,
): typeof embeddedWalletAttributeTree
export function walletAttributeTree(
	wallet: Pick<RatedWallet<string>, 'types'>,
): AttributeTree<string> {
	switch (true) {
		case wallet.types[WalletType.SOFTWARE] === true:
			return softwareWalletAttributeTree
		case wallet.types[WalletType.HARDWARE] === true:
			return hardwareWalletAttributeTree
		case wallet.types[WalletType.EMBEDDED] === true:
			return embeddedWalletAttributeTree
		default:
			throw new Error('Invalid wallet type')
	}
}

/**
 * Get wallet metadata by ID, or undefined if not found.
 */
export function getWalletMetadataById(id: string): WalletMetadata | undefined {
	const wallet = Object.values(allWallets).find(w => w.metadata.id === id)

	return wallet?.metadata
}

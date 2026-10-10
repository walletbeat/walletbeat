import { type AttributeGroupId } from '@/schema/attribute-tree'
import { type BaseWallet, type RatedWallet, type WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'

import { embeddedWallets, ratedEmbeddedWallets, unratedEmbeddedWallet } from './embedded-wallets'
import {
	hardwareWallets,
	isValidHardwareWalletName,
	ratedHardwareWallets,
	unratedHardwareWallet,
} from './hardware-wallets'
import {
	isValidSoftwareWalletName,
	ratedSoftwareWallets,
	softwareWallets,
	unratedSoftwareWallet,
} from './software-wallets'
import { type WalletOfType } from './wallet-rating'

export {
	attributeTreeForWallet,
	isEmbeddedRatedWallet,
	isHardwareRatedWallet,
	isSoftwareRatedWallet,
} from './wallet-rating'

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
} as const satisfies Record<WalletName, RatedWallet<any>>

/** All rated wallets keyed by their slug (metadata.id). */
export const allRatedWalletsBySlug: Record<string, RatedWallet<string>> = Object.fromEntries(
	Object.values(allRatedWallets).map(wallet => [wallet.metadata.id, wallet]),
)

/** Check if a string is a valid wallet slug (metadata.id). */
export function isValidWalletSlug(slug: string): slug is keyof typeof allRatedWalletsBySlug {
	return Object.prototype.hasOwnProperty.call(allRatedWalletsBySlug, slug)
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

/**
 * Get wallet metadata by ID, or undefined if not found.
 */
export function getWalletMetadataById(id: string): WalletMetadata | undefined {
	return Object.values(allWallets).find(w => w.metadata.id === id)?.metadata
}

/**
 * Get a wallet's unrated data and the list it belongs to by slug
 * (metadata.id), or undefined if not found. Pass the result to
 * `rateWalletOfType` to rate it.
 */
export function walletOfTypeBySlug(slug: string): WalletOfType | undefined {
	const software = Object.values(softwareWallets).find(wallet => wallet.metadata.id === slug)

	if (software !== undefined) {
		return { type: WalletType.SOFTWARE, wallet: software }
	}

	const hardware = Object.values(hardwareWallets).find(wallet => wallet.metadata.id === slug)

	if (hardware !== undefined) {
		return { type: WalletType.HARDWARE, wallet: hardware }
	}

	const embedded = Object.values(embeddedWallets).find(wallet => wallet.metadata.id === slug)

	if (embedded !== undefined) {
		return { type: WalletType.EMBEDDED, wallet: embedded }
	}

	return undefined
}

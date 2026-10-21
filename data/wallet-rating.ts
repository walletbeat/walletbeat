import { embeddedLadders, hardwareLadders, softwareLadders } from '@/schema/ladders'
import { type RatedWallet, rateWallet } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'

import {
	type EmbeddedAttributeGroupId,
	embeddedWalletAttributeTree,
	type HardwareAttributeGroupId,
	hardwareWalletAttributeTree,
	type SoftwareAttributeGroupId,
	softwareWalletAttributeTree,
} from './attribute-trees'
import type { EmbeddedWallet } from './embedded-wallets'
import type { HardwareWallet } from './hardware-wallets'
import type { SoftwareWallet } from './software-wallets'

/*
 * Helpers that work on a single wallet. Unlike `wallets.ts`, this module does
 * not import the wallet lists, so browser code can use it without loading
 * every wallet's data.
 */

/** A wallet's unrated data, tagged with the list it belongs to. */
export type WalletOfType =
	| { type: WalletType.SOFTWARE; wallet: SoftwareWallet }
	| { type: WalletType.HARDWARE; wallet: HardwareWallet }
	| { type: WalletType.EMBEDDED; wallet: EmbeddedWallet }

/**
 * Rate a single wallet with the attribute tree and ladders of its type. The
 * result is the same as the wallet's entry in `allRatedWallets`.
 */
export function rateWalletOfType(entry: WalletOfType): RatedWallet<string> {
	switch (entry.type) {
		case WalletType.SOFTWARE:
			return rateWallet(softwareWalletAttributeTree, softwareLadders, entry.wallet)
		case WalletType.HARDWARE:
			return rateWallet(hardwareWalletAttributeTree, hardwareLadders, entry.wallet)
		case WalletType.EMBEDDED:
			return rateWallet(embeddedWalletAttributeTree, embeddedLadders, entry.wallet)
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

export function attributeTreeForWallet(wallet: RatedWallet<string>) {
	if (isSoftwareRatedWallet(wallet)) {
		return softwareWalletAttributeTree
	}

	if (isHardwareRatedWallet(wallet)) {
		return hardwareWalletAttributeTree
	}

	if (isEmbeddedRatedWallet(wallet)) {
		return embeddedWalletAttributeTree
	}

	throw new Error('Wallet has no valid type')
}

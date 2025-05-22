import { type BaseWallet, type RatedWallet, rateWallet } from '@/schema/wallet';
import { WalletType } from '@/schema/wallet-types';

import { unratedEmbeddedWallet } from './embedded-wallets';
import {
	type HardwareWalletName,
	hardwareWallets,
	isValidHardwareWalletName,
	unratedHardwareWallet,
} from './hardware-wallets';
import {
	isValidSoftwareWalletName,
	type SoftwareWalletName,
	softwareWallets,
	unratedSoftwareWallet,
} from './software-wallets';

/** Set of all known software wallets. */
export const allWallets = Object.fromEntries(
	([] as Array<[string, BaseWallet]>).concat(
		Object.entries(softwareWallets),
		Object.entries(hardwareWallets),
	),
);

/** A valid wallet name. */
export type WalletName = SoftwareWalletName | HardwareWalletName;

/** Type predicate for WalletName. */
export function isValidWalletName(name: string): name is WalletName {
	return isValidSoftwareWalletName(name) || isValidHardwareWalletName(name);
}

/** All rated wallets. */

export const allRatedWallets: Record<WalletName, RatedWallet> = Object.fromEntries(
	Object.entries(allWallets).map(([name, wallet]) => [name, rateWallet(wallet)]),
) as Record<WalletName, RatedWallet>;

/**
 * Map the given function to all rated wallets.
 */
export function mapWallets<T>(fn: (wallet: RatedWallet, index: number) => T): T[] {
	return Object.values(allRatedWallets).map(fn);
}

/**
 * Given a specific wallet type, return a RatedWallet of that type.
 */
export function representativeWalletForType(walletType: WalletType): RatedWallet {
	switch (walletType) {
		case WalletType.SOFTWARE:
			return unratedSoftwareWallet;
		case WalletType.HARDWARE:
			return unratedHardwareWallet;
		case WalletType.EMBEDDED:
			return unratedEmbeddedWallet;
	}
}

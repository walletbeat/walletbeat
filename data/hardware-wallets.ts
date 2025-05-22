import { type RatedWallet, rateWallet } from '@/schema/wallet';

import { fireflyWallet } from './hardware-wallets/firefly';
import { gridplusWallet } from './hardware-wallets/gridplus';
import { keystoneWallet } from './hardware-wallets/keystone';
import { ledgerWallet } from './hardware-wallets/ledger';
import { trezorWallet } from './hardware-wallets/trezor';
import { unratedHardwareTemplate } from './hardware-wallets/unrated.tmpl';

/** Set of all known hardware wallets. */
export const hardwareWallets = {
	firefly: fireflyWallet,
	gridplus: gridplusWallet,
	keystone: keystoneWallet,
	ledger: ledgerWallet,
	trezor: trezorWallet,
};

/** A valid hardware wallet name. */
export type HardwareWalletName = keyof typeof hardwareWallets;

/** Type predicate for HardwareWalletName. */
export function isValidHardwareWalletName(name: string): name is HardwareWalletName {
	return Object.prototype.hasOwnProperty.call(hardwareWallets, name);
}

/** Rated hardware wallets. */

export const ratedHardwareWallets: Record<HardwareWalletName, RatedWallet> = Object.fromEntries(
	Object.entries(hardwareWallets).map(([name, wallet]) => [name, rateWallet(wallet)]),
) as Record<HardwareWalletName, RatedWallet>;

/**
 * Map the given function to all rated hardware wallets.
 */
export function mapHardwareWallets<T>(fn: (wallet: RatedWallet, index: number) => T): T[] {
	return Object.values(ratedHardwareWallets).map(fn);
}

/** The unrated hardware wallet as a rated wallet. */
export const unratedHardwareWallet = rateWallet(unratedHardwareTemplate);

import { type RatedWallet, rateWallet } from '@/schema/wallet'
import { ledgerWallet } from './hardware-wallets/ledger'
import { trezorWallet } from './hardware-wallets/trezor'
import { gridplusWallet } from './hardware-wallets/gridplus'
import { keystoneWallet } from './hardware-wallets/keystone'
import { fireflyWallet } from './hardware-wallets/firefly'

/** Set of all known hardware wallets. */
export const hardwareWallets = {
	ledger: ledgerWallet,
	trezor: trezorWallet,
	gridplus: gridplusWallet,
	keystone: keystoneWallet,
	firefly: fireflyWallet,
}

/** A valid hardware wallet name. */
export type HardwareWalletName = keyof typeof hardwareWallets

/** Type predicate for HardwareWalletName. */
export function isValidHardwareWalletName(name: string): name is HardwareWalletName {
	return Object.prototype.hasOwnProperty.call(hardwareWallets, name)
}

/** Rated hardware wallets. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we map from `hardwareWallets`.
export const ratedHardwareWallets: Record<HardwareWalletName, RatedWallet> = Object.fromEntries(
	Object.entries(hardwareWallets).map(([name, wallet]) => [name, rateWallet(wallet)]),
) as Record<HardwareWalletName, RatedWallet>

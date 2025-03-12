import { type RatedWallet, rateWallet } from '@/schema/wallet'
import { ledgerWallet } from './hardware wallets/ledger'
import { trezorWallet } from './hardware wallets/trezor'
import { gridplusWallet } from './hardware wallets/gridplus'
import { keystoneWallet } from './hardware wallets/keystone'

/** Set of all known hardware wallets. */
export const hardwareWallets = {
  ledger: ledgerWallet,
  trezor: trezorWallet,
  gridplus: gridplusWallet,
  keystone: keystoneWallet,
}

/** A valid hardware wallet name. */
export type HardwareWalletName = keyof typeof hardwareWallets

/** Type predicate for HardwareWalletName. */
export function IsValidHardwareWalletName(name: string): name is HardwareWalletName {
  return Object.hasOwn(hardwareWallets, name)
}

/** All rated hardware wallets. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we map from `hardwareWallets`.
export const ratedHardwareWallets: Record<HardwareWalletName, RatedWallet> = Object.fromEntries(
  Object.entries(hardwareWallets).map(([name, wallet]) => [name, rateWallet(wallet)]),
) as Record<HardwareWalletName, RatedWallet> 
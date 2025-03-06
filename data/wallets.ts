import { type RatedWallet, rateWallet } from '@/schema/wallet'
import { rabby } from './wallets/rabby'
import { daimo } from './wallets/daimo'
import { metamask } from './wallets/metamask'
import { phantom } from './wallets/phantom'
import { rainbow } from './wallets/rainbow'
import { coinbase } from './wallets/coinbase'

/** Set of all known wallets. */
export const wallets = {
	coinbase,
	daimo,
	metamask,
	phantom,
	rabby,
	rainbow,
}

/** A valid wallet name. */
export type WalletName = keyof typeof wallets

/** Type predicate for WalletName. */
export function IsValidWalletName(name: string): name is WalletName {
	return Object.hasOwn(wallets, name)
}

/** All rated wallets. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we map from `wallets`.
export const ratedWallets: Record<WalletName, RatedWallet> = Object.fromEntries(
	Object.entries(wallets).map(([name, wallet]) => [name, rateWallet(wallet)]),
) as Record<WalletName, RatedWallet>

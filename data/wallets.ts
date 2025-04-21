import { type RatedWallet, rateWallet } from '@/schema/wallet'
import { rabby } from './wallets/rabby'
import { daimo } from './wallets/daimo'
import { metamask } from './wallets/metamask'
import { phantom } from './wallets/phantom'
import { rainbow } from './wallets/rainbow'
import { coinbase } from './wallets/coinbase'
import { frame } from './wallets/frame'
import { safe } from './wallets/safe'
import { elytro } from './wallets/elytro'
import { ambire } from './wallets/ambire'
import { unratedTemplate } from './wallets/unrated.tmpl'

/** Set of all known wallets. */
export const wallets = {
	ambire,
	coinbase,
	daimo,
	elytro,
	frame,
	metamask,
	phantom,
	rabby,
	rainbow,
	safe,
}

/** A valid wallet name. */
export type WalletName = keyof typeof wallets

/** Type predicate for WalletName. */
export function isValidWalletName(name: string): name is WalletName {
	return Object.prototype.hasOwnProperty.call(wallets, name)
}

/** All rated wallets. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we map from `wallets`.
export const ratedWallets: Record<WalletName, RatedWallet> = Object.fromEntries(
	Object.entries(wallets).map(([name, wallet]) => [name, rateWallet(wallet)]),
) as Record<WalletName, RatedWallet>

/**
 * Map the given function to all rated wallets.
 */
export function mapWallets<T>(fn: (wallet: RatedWallet, index: number) => T): T[] {
	return Object.values(ratedWallets).map(fn)
}

/** The unrated wallet as a rated wallet. */
export const unratedWallet = rateWallet(unratedTemplate)

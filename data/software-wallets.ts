import { type RatedWallet, rateWallet } from '@/schema/wallet'

import { ambire } from './software-wallets/ambire'
import { coinbase } from './software-wallets/coinbase'
import { daimo } from './software-wallets/daimo'
import { elytro } from './software-wallets/elytro'
import { family } from './software-wallets/family'
import { frame } from './software-wallets/frame'
import { metamask } from './software-wallets/metamask'
import { phantom } from './software-wallets/phantom'
import { rabby } from './software-wallets/rabby'
import { rainbow } from './software-wallets/rainbow'
import { safe } from './software-wallets/safe'
import { unratedTemplate } from './software-wallets/unrated.tmpl'
import { zerion } from './software-wallets/zerion'

/** Set of all known software wallets. */
export const wallets = {
	ambire,
	coinbase,
	daimo,
	elytro,
	family,
	frame,
	metamask,
	phantom,
	rabby,
	rainbow,
	safe,
	zerion,
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

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
import { unratedTemplate as unratedSoftwareTemplate } from './software-wallets/unrated.tmpl'
import { zerion } from './software-wallets/zerion'

/** Set of all known software wallets. */
export const softwareWallets = {
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

/** A valid software wallet name. */
export type SoftwareWalletName = keyof typeof softwareWallets

/** Type predicate for SoftwareWalletName. */
export function isValidSoftwareWalletName(name: string): name is SoftwareWalletName {
	return Object.prototype.hasOwnProperty.call(softwareWallets, name)
}

/** All rated software wallets. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we map from `softwareWallets`.
export const ratedSoftwareWallets: Record<SoftwareWalletName, RatedWallet> = Object.fromEntries(
	Object.entries(softwareWallets).map(([name, wallet]) => [name, rateWallet(wallet)]),
) as Record<SoftwareWalletName, RatedWallet>

/**
 * Map the given function to all rated software wallets.
 */
export function mapSoftwareWallets<T>(fn: (wallet: RatedWallet, index: number) => T): T[] {
	return Object.values(ratedSoftwareWallets).map(fn)
}

/** The unrated software wallet as a rated wallet. */
export const unratedSoftwareWallet = rateWallet(unratedSoftwareTemplate)

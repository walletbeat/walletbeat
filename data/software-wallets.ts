import { type RatedWallet, rateWallet } from '@/schema/wallet'

import { ambire } from './software-wallets/ambire'
import { bitget } from './software-wallets/bitget'
import { daimo } from './software-wallets/daimo'
import { elytro } from './software-wallets/elytro'
import { family } from './software-wallets/family'
import { frame } from './software-wallets/frame'
import { gemwallet } from './software-wallets/gem'
import { imtoken } from './software-wallets/imtoken'
import { metamask } from './software-wallets/metamask'
import { mtpelerin } from './software-wallets/mtpelerin'
import { nufi } from './software-wallets/nufi'
import { okxWallet } from './software-wallets/okx'
import { phantom } from './software-wallets/phantom'
import { pillarx } from './software-wallets/pillarx'
import { rabby } from './software-wallets/rabby'
import { rainbow } from './software-wallets/rainbow'
import { safe } from './software-wallets/safe'
import { unratedTemplate as unratedSoftwareTemplate } from './software-wallets/unrated.tmpl'
import { zerion } from './software-wallets/zerion'
import { zeus } from './software-wallets/zeus'

/** Set of all known software wallets. */
export const softwareWallets = {
	ambire,
	bitget,
	daimo,
	elytro,
	family,
	frame,
	gemwallet,
	imtoken,
	metamask,
	mtpelerin,
	nufi,
	okxWallet,
	phantom,
	pillarx,
	rabby,
	rainbow,
	safe,
	zerion,
	zeus,
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

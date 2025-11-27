import { type RatedWallet, rateWallet } from '@/schema/wallet'

import { bitboxWallet } from './hardware-wallets/bitbox'
import { cypherockWallet } from './hardware-wallets/cypherock'
import { fireflyWallet } from './hardware-wallets/firefly'
import { gridplusWallet } from './hardware-wallets/gridplus'
import { imkeyWallet } from './hardware-wallets/imkey'
import { keystoneWallet } from './hardware-wallets/keystone'
import { ledgerWallet } from './hardware-wallets/ledger'
import { ngrave } from './hardware-wallets/ngrave'
import { onekeyWallet } from './hardware-wallets/onekey'
import { trezorWallet } from './hardware-wallets/trezor'
import { unratedHardwareTemplate } from './hardware-wallets/unrated.tmpl'

/** Set of all known hardware wallets. */
export const hardwareWallets = {
	bitbox: bitboxWallet,
	cypherock: cypherockWallet,
	firefly: fireflyWallet,
	gridplus: gridplusWallet,
	imkey: imkeyWallet,
	keystone: keystoneWallet,
	ledger: ledgerWallet,
	ngrave: ngrave,
	onekey: onekeyWallet,
	trezor: trezorWallet,
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

/**
 * Map the given function to all rated hardware wallets.
 */
export function mapHardwareWallets<T>(fn: (wallet: RatedWallet, index: number) => T): T[] {
	return Object.values(ratedHardwareWallets).map(fn)
}

/** The unrated hardware wallet as a rated wallet. */
export const unratedHardwareWallet = rateWallet(unratedHardwareTemplate)

export type HardwareModel = {
	id: string
	brandId: string
	brandName: string
	iconUrl: string
	isFlagship?: boolean
	modelId: string
	modelName: string
	url?: string
}

export const allHardwareModels: HardwareModel[] = Object.values(hardwareWallets)
	.flatMap(brand =>
		(brand.metadata.hardwareWalletModels ?? []).map(model => ({
			id: `${brand.metadata.id}.${model.id}`,
			brandId: brand.metadata.id,
			brandName: brand.metadata.tableName ?? brand.metadata.displayName,
			iconUrl: `/images/wallets/${brand.metadata.id}.${brand.metadata.iconExtension}`,
			isFlagship: model.isFlagship ?? false,
			modelId: model.id,
			modelName: model.name,
			url: model.url ?? undefined,
		})),
	)
	.sort(
		(a, b) =>
			a.brandName.localeCompare(b.brandName) ||
			(b.isFlagship ? 1 : 0) - (a.isFlagship ? 1 : 0) ||
			a.modelName.localeCompare(b.modelName),
	)

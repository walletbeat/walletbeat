import { type BaseWallet, type RatedWallet, type WalletMetadata } from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import {
	assertNonEmptyArray,
	type NonEmptyArray,
	nonEmptyMap,
	setUnion,
} from '@/types/utils/non-empty'

import { type AttributeGroupId } from './attribute-groups'
import { embeddedWallets, ratedEmbeddedWallets, unratedEmbeddedWallet } from './embedded-wallets'
import {
	hardwareWallets,
	isValidHardwareWalletName,
	ratedHardwareWallets,
	unratedHardwareWallet,
} from './hardware-wallets'
import {
	isValidSoftwareWalletName,
	ratedSoftwareWallets,
	softwareWallets,
	unratedSoftwareWallet,
} from './software-wallets'

/** Set of all known wallets. */
export const allWallets = {
	...softwareWallets,
	...hardwareWallets,
	...embeddedWallets,
} as const satisfies Record<string, BaseWallet<AttributeGroupId>>

/** A valid wallet name. */
export type WalletName = keyof typeof allWallets

/** Type predicate for WalletName. */
export function isValidWalletName(name: string): name is WalletName {
	return isValidSoftwareWalletName(name) || isValidHardwareWalletName(name)
}

/** Assert that `name` is a valid `WalletName`. */
export function assertValidWalletName(name: string): WalletName {
	if (!isValidWalletName(name)) {
		throw new Error(
			`invalid wallet ID "${name}" (did you add it to \`/data/{software,hardware,...}-wallets.ts\`?)`,
		)
	}

	return name
}

/** All rated wallet entries keyed by their source-data key. */
export const allRatedWalletEntries = {
	...ratedSoftwareWallets,
	...ratedHardwareWallets,
	...ratedEmbeddedWallets,
} as const satisfies Record<WalletName, RatedWallet<string>>

export interface DisplayRatedWallet extends Omit<RatedWallet<string>, 'types' | 'stagesByType'> {
	stagesByType: RatedWallet<string>['stagesByType']
	types: RatedWallet<string>['types']
	walletsByType: Partial<Record<WalletType, RatedWallet<string>>>
}

const walletTypePriority = [WalletType.SOFTWARE, WalletType.HARDWARE, WalletType.EMBEDDED] as const

const walletsBySlug = Object.values(allRatedWalletEntries).reduce<
	Record<string, RatedWallet<string>[]>
>(
	(acc, wallet) => ({
		...acc,
		[wallet.metadata.id]: [...(acc[wallet.metadata.id] ?? []), wallet],
	}),
	{},
)

const displayWalletForEntries = (
	wallets: NonEmptyArray<RatedWallet<string>>,
): DisplayRatedWallet => {
	const walletsByType = wallets.reduce<DisplayRatedWallet['walletsByType']>(
		(acc, wallet) => ({
			...acc,
			...Object.fromEntries(
				Object.values(WalletType)
					.filter(walletType => wallet.types[walletType] === true)
					.map(walletType => [walletType, wallet] as const),
			),
		}),
		{},
	)
	const primaryWallet =
		walletTypePriority
			.map(walletType => walletsByType[walletType])
			.find(wallet => wallet !== undefined) ?? wallets[0]

	return {
		...primaryWallet,
		stagesByType: {
			[WalletType.SOFTWARE]:
				walletsByType[WalletType.SOFTWARE]?.stagesByType[WalletType.SOFTWARE] ?? null,
			[WalletType.HARDWARE]:
				walletsByType[WalletType.HARDWARE]?.stagesByType[WalletType.HARDWARE] ?? null,
			[WalletType.EMBEDDED]:
				walletsByType[WalletType.EMBEDDED]?.stagesByType[WalletType.EMBEDDED] ?? null,
		},
		types: setUnion(nonEmptyMap(wallets, wallet => wallet.types)),
		walletsByType,
	}
}

const displayWalletForType = (wallet: RatedWallet<string>): DisplayRatedWallet => {
	const aggregateWallet = allRatedWalletsBySlug[wallet.metadata.id]

	return {
		...wallet,
		stagesByType: aggregateWallet.stagesByType,
		types: aggregateWallet.types,
		walletsByType: aggregateWallet.walletsByType,
	}
}

/** Canonical display wallets keyed by public wallet slug (`metadata.id`). */
export const allRatedWalletsBySlug: Record<string, DisplayRatedWallet> = Object.fromEntries(
	Object.entries(walletsBySlug).map(([slug, wallets]) => [
		slug,
		displayWalletForEntries(assertNonEmptyArray(wallets)),
	]),
)

/** All canonical display wallets keyed by public wallet slug (`metadata.id`). */
export const allRatedWallets = allRatedWalletsBySlug

export const displayRatedSoftwareWallets: Record<string, DisplayRatedWallet> = Object.fromEntries(
	Object.entries(ratedSoftwareWallets).map(([name, wallet]) => [
		name,
		displayWalletForType(wallet),
	]),
)

export const displayRatedHardwareWallets: Record<string, DisplayRatedWallet> = Object.fromEntries(
	Object.entries(ratedHardwareWallets).map(([name, wallet]) => [
		name,
		displayWalletForType(wallet),
	]),
)

export const displayRatedEmbeddedWallets: Record<string, DisplayRatedWallet> = Object.fromEntries(
	Object.entries(ratedEmbeddedWallets).map(([name, wallet]) => [
		name,
		displayWalletForType(wallet),
	]),
)

/** Check if a string is a valid wallet slug (metadata.id). */
export function isValidWalletSlug(slug: string): boolean {
	return Object.prototype.hasOwnProperty.call(allRatedWalletsBySlug, slug)
}

export function assertValidWalletSlug(slug: string): string {
	if (!isValidWalletSlug(slug)) {
		throw new Error(`invalid wallet slug "${slug}"`)
	}

	return slug
}

/**
 * Map the given function to all rated wallets.
 */
export function mapWallets<T>(fn: (wallet: DisplayRatedWallet, index: number) => T): T[] {
	return Object.values(allRatedWallets).map(fn)
}

/**
 * Given a specific wallet type, return a RatedWallet of that type.
 */
export function representativeWalletForType(walletType: WalletType) {
	switch (walletType) {
		case WalletType.SOFTWARE:
			return unratedSoftwareWallet
		case WalletType.HARDWARE:
			return unratedHardwareWallet
		case WalletType.EMBEDDED:
			return unratedEmbeddedWallet
	}
}

/**
 * Get wallet metadata by ID, or undefined if not found.
 */
export function getWalletMetadataById(id: string): WalletMetadata | undefined {
	const wallet = Object.values(allWallets).find(w => w.metadata.id === id)

	return wallet?.metadata
}

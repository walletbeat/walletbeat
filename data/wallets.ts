import { completeWalletFeatures } from '@/schema/features'
import { allWalletLadders } from '@/schema/ladders'
import {
	type CanonicalWallet,
	type RatedWallet,
	rateWallet,
	type WalletMetadata,
} from '@/schema/wallet'
import { WalletType } from '@/schema/wallet-types'
import { nonEmptySetFromArray } from '@/types/utils/non-empty'

import { attributeGroupById } from './attribute-groups'
import { canonicalWallets } from './canonical-wallets'
import { ratedEmbeddedWallets, unratedEmbeddedWallet } from './embedded-wallets'
import { ratedHardwareWallets, unratedHardwareWallet } from './hardware-wallets'
import { ratedSoftwareWallets, unratedSoftwareWallet } from './software-wallets'

/** A valid wallet name. */
export type WalletName = keyof typeof canonicalWallets

/** Set of all known wallets. */
export const allWallets: Record<WalletName, CanonicalWallet> = canonicalWallets

/** Type predicate for WalletName. */
export function isValidWalletName(name: string): name is WalletName {
	return Object.prototype.hasOwnProperty.call(allWallets, name)
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

/** All rated wallet slices keyed by wallet type and public wallet slug. */
export const ratedWalletsByType = {
	[WalletType.SOFTWARE]: ratedSoftwareWallets,
	[WalletType.HARDWARE]: ratedHardwareWallets,
	[WalletType.EMBEDDED]: ratedEmbeddedWallets,
} as const satisfies Record<WalletType, Partial<Record<WalletName, RatedWallet<string>>>>

export interface DisplayRatedWallet extends Omit<RatedWallet<string>, 'types' | 'stagesByType'> {
	stagesByType: RatedWallet<string>['stagesByType']
	types: RatedWallet<string>['types']
	walletsByType: Partial<Record<WalletType, RatedWallet<string>>>
}

export const canonicalRatedWallets = Object.fromEntries(
	Object.entries(allWallets).map(([name, wallet]) => [
		name,
		rateWallet(attributeGroupById, allWalletLadders, {
			metadata: wallet.metadata,
			features: completeWalletFeatures(wallet.features),
			overrides: wallet.overrides,
			variants: nonEmptySetFromArray(wallet.variants),
		}),
	]),
) satisfies Record<WalletName, RatedWallet<string>>

/** Canonical display wallets keyed by public wallet slug (`metadata.id`). */
export const allRatedWalletsBySlug: Record<string, DisplayRatedWallet> = Object.fromEntries(
	Object.keys(allWallets).map(walletName => {
		const ratedWallet = canonicalRatedWallets[walletName]

		return [
			walletName,
			{
				...ratedWallet,
				stagesByType: {
					[WalletType.SOFTWARE]:
						ratedWalletsByType[WalletType.SOFTWARE][walletName]?.stagesByType[
							WalletType.SOFTWARE
						] ?? null,
					[WalletType.HARDWARE]:
						ratedWalletsByType[WalletType.HARDWARE][walletName]?.stagesByType[
							WalletType.HARDWARE
						] ?? null,
					[WalletType.EMBEDDED]:
						ratedWalletsByType[WalletType.EMBEDDED][walletName]?.stagesByType[
							WalletType.EMBEDDED
						] ?? null,
				},
				walletsByType: {
					[WalletType.SOFTWARE]: ratedWalletsByType[WalletType.SOFTWARE][walletName],
					[WalletType.HARDWARE]: ratedWalletsByType[WalletType.HARDWARE][walletName],
					[WalletType.EMBEDDED]: ratedWalletsByType[WalletType.EMBEDDED][walletName],
				},
			},
		]
	}),
)

/** All canonical display wallets keyed by public wallet slug (`metadata.id`). */
export const allRatedWallets = allRatedWalletsBySlug

export const displayRatedSoftwareWallets: Record<string, DisplayRatedWallet> = Object.fromEntries(
	Object.entries(ratedSoftwareWallets).map(([name, wallet]) => {
		const aggregateWallet = allRatedWalletsBySlug[name]

		return [
			name,
			{
				...wallet,
				stagesByType: aggregateWallet.stagesByType,
				types: aggregateWallet.types,
				walletsByType: aggregateWallet.walletsByType,
			},
		]
	}),
)

export const displayRatedHardwareWallets: Record<string, DisplayRatedWallet> = Object.fromEntries(
	Object.entries(ratedHardwareWallets).map(([name, wallet]) => {
		const aggregateWallet = allRatedWalletsBySlug[name]

		return [
			name,
			{
				...wallet,
				stagesByType: aggregateWallet.stagesByType,
				types: aggregateWallet.types,
				walletsByType: aggregateWallet.walletsByType,
			},
		]
	}),
)

export const displayRatedEmbeddedWallets: Record<string, DisplayRatedWallet> = Object.fromEntries(
	Object.entries(ratedEmbeddedWallets).map(([name, wallet]) => {
		const aggregateWallet = allRatedWalletsBySlug[name]

		return [
			name,
			{
				...wallet,
				stagesByType: aggregateWallet.stagesByType,
				types: aggregateWallet.types,
				walletsByType: aggregateWallet.walletsByType,
			},
		]
	}),
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
	return isValidWalletName(id) ? allWallets[id].metadata : undefined
}

import {
	type NonEmptyRecord,
	type NonEmptySet,
	nonEmptyFilter,
	nonEmptyKeys,
	nonEmptyMap,
	nonEmptySetFromArray,
} from '@/types/utils/non-empty'

import { Variant, allVariants } from './variants'
import { type BaseWallet, type RatedWallet, getWalletVariants } from './wallet'

/**
 * A high-level wallet "type".
 *
 * Broadly corresponds to the set of expectations and limitations of a given
 * wallet type. Each WalletType maps to one or more Variants, and each Variant
 * maps to a single WalletType.
 *
 * A single wallet may belong to multiple types. For example, a hardware
 * wallet that comes with integrated software to use it as a software wallet
 * (e.g. Ledger Live) would be both a hardware and software wallet.
 */
export enum WalletType {
	/** Software wallet. */
	SOFTWARE = 'SOFTWARE',

	/** Hardware wallet. */
	HARDWARE = 'HARDWARE',

	/** Embedded wallet. */
	EMBEDDED = 'EMBEDDED',
}

/**
 * Map over all possible wallet types.
 */
export function mapWalletTypes<T>(
	fn: (walletType: WalletType) => T,
): Record<WalletType, T> & NonEmptyRecord<WalletType, T> {
	return {
		[WalletType.SOFTWARE]: fn(WalletType.SOFTWARE),
		[WalletType.HARDWARE]: fn(WalletType.HARDWARE),
		[WalletType.EMBEDDED]: fn(WalletType.EMBEDDED),
	}
}

/**
 * Return the URL slug for a wallet type.
 */
export function walletTypeToUrlSlug(walletType: WalletType): string {
	switch (walletType) {
		case WalletType.SOFTWARE:
			return 'wallet'
		case WalletType.HARDWARE:
			return 'hww'
		case WalletType.EMBEDDED:
			return 'embedded'
	}
}

/**
 * Look up the wallet type for a given URL slug.
 */
export function urlSlugToWalletType(slug: string): WalletType | null {
	const found = Object.values(
		mapWalletTypes(walletType => (walletTypeToUrlSlug(walletType) === slug ? walletType : null)),
	).filter(val => val !== null)

	return found.length === 0 ? null : found[0]
}

/**
 * Type predicate for WalletType.
 */
export function isWalletType(str: string): str is WalletType {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- Comparing string to enum to see if the string is indeed one of the enum values.
	return Object.values(mapWalletTypes(walletType => str === walletType)).some(val => val)
}

/**
 * Given a wallet type, return the set of variants it may have.
 * A wallet of the given type must have at least one variant from the
 * returned set.
 */
export function walletTypeToVariants(walletType: WalletType): NonEmptySet<Variant> {
	return nonEmptySetFromArray(
		nonEmptyFilter(allVariants, variant => variantToWalletType(variant) === walletType),
	)
}

/**
 * Given a wallet variant, return the type that the wallet is expected to
 * have if it implements that variant.
 */
export function variantToWalletType(variant: Variant): WalletType {
	switch (variant) {
		case Variant.BROWSER:
			return WalletType.SOFTWARE
		case Variant.DESKTOP:
			return WalletType.SOFTWARE
		case Variant.MOBILE:
			return WalletType.SOFTWARE
		case Variant.EMBEDDED:
			return WalletType.EMBEDDED
		case Variant.HARDWARE:
			return WalletType.HARDWARE
	}
}

/**
 * Returns the types of a given wallet.
 */
export function walletTypes(wallet: BaseWallet | RatedWallet): NonEmptySet<WalletType> {
	return nonEmptySetFromArray(
		nonEmptyMap(nonEmptyKeys(getWalletVariants(wallet)), variantToWalletType),
	)
}

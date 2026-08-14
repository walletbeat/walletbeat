import type { WalletName } from '@/data/wallets'
import { Variant } from '@/schema/variants'

/** How each Coinspect `platform` string resolves to a Walletbeat `Variant`. */
export const COINSPECT_PLATFORM_TO_VARIANT = {
	Browser: Variant.BROWSER,
	Android: Variant.MOBILE,
	Ios: Variant.MOBILE,
} as const satisfies Record<string, Variant>

export type CoinspectPlatform = keyof typeof COINSPECT_PLATFORM_TO_VARIANT

export enum CoinspectUnmappedReason {
	/** The wallet exists on Coinspect but Walletbeat does not track it yet. */
	NOT_IN_WALLETBEAT = 'NOT_IN_WALLETBEAT',
}

/**
 * Maps a Coinspect `walletMakerUID` to a Walletbeat wallet.
 *
 * `skipPlatforms` skips variant coverage checks for specific Coinspect platforms
 * while keeping the brand mapped (e.g. Walletbeat tracks only some variants).
 */
export type CoinspectMapping =
	| { skipPlatforms?: readonly CoinspectPlatform[]; walletbeatId: WalletName }
	| { note?: string; reason: CoinspectUnmappedReason; walletbeatId: null }

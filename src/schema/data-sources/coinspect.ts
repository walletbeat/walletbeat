import type { WalletName } from '@/data/wallets'
import { Variant } from '@/schema/variants'
import { Enum } from '@/utils/enum'

/** Platforms that appear in Coinspect report `platform` strings. */
export enum CoinspectPlatform {
	BROWSER = 'Browser',
	ANDROID = 'Android',
	IOS = 'Ios',
}

export const coinspectPlatformEnum = new Enum<CoinspectPlatform>({
	[CoinspectPlatform.BROWSER]: true,
	[CoinspectPlatform.ANDROID]: true,
	[CoinspectPlatform.IOS]: true,
})

/** How each Coinspect platform resolves to a Walletbeat `Variant`. */
export function coinspectPlatformToVariant(coinspectPlatform: CoinspectPlatform): Variant {
	switch (coinspectPlatform) {
		case CoinspectPlatform.BROWSER:
			return Variant.BROWSER
		case CoinspectPlatform.ANDROID:
			return Variant.MOBILE
		case CoinspectPlatform.IOS:
			return Variant.MOBILE
	}
}

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

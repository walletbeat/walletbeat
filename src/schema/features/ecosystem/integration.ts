import {
	type AtLeastOneTrueVariant,
	type ResolvedFeature,
	resolveFeature,
	type Variant,
	type VariantFeature,
} from '@/schema/variants'

import type { WithRef } from '../../reference'
import { notSupported, type Support } from '../support'

/**
 * EIPs related to web browser integration standards.
 */
export type BrowserIntegrationEip = '1193' | '2700' | '6963'

/**
 * Level of integration of a wallet within browsers, mobile phones, etc.
 */
export interface WalletIntegration {
	/**
	 * Browser-level integrations.
	 * Should be set to 'NOT_A_BROWSER_WALLET' if the wallet has no browser
	 * version.
	 *
	 * Use the Walletbeat test page to verify support: https://beta.walletbeat.eth.limo/test/
	 * It tests EIP-1193, EIP-2700, and EIP-6963 directly in the browser.
	 */
	browser: 'NOT_A_BROWSER_WALLET' | WithRef<Record<BrowserIntegrationEip, Support | null>>

	/**
	 * EIP-5792: Wallet Call API support.
	 * The wallet must support all of the following calls:
	 *  - wallet_sendCalls
	 *  - wallet_getCallsStatus
	 *  - wallet_showCallsStatus
	 *  - wallet_getCapabilities
	 *
	 * Use the Walletbeat test page to verify support: https://beta.walletbeat.eth.limo/test/
	 */
	walletCall: VariantFeature<Support<WithRef<WalletCallIntegration>>>
}

/** Variant-specific resolution of `WalletIntegration`. */
export interface ResolvedWalletIntegration {
	browser: WalletIntegration['browser']
	walletCall: ResolvedFeature<Support<WithRef<WalletCallIntegration>>>
}

/** EIP-5792 Wallet Call API support. */
export interface WalletCallIntegration {
	/**
	 * `atomic` capability as reported by wallet_getCapabilities.
	 * This allows apps to execute multiple transactions atomically.
	 * https://eips.ethereum.org/EIPS/eip-5792#atomic-capability
	 * For the purpose of this attribute, we only look at support on L1.
	 * A reported value of 'ready' or 'supported' qualifies as supported.
	 */
	atomicMultiTransactions: Support
}

/** A WalletIntegration stand-in used for non-software wallets. */
export const notApplicableWalletIntegration: WalletIntegration = {
	browser: 'NOT_A_BROWSER_WALLET',
	walletCall: notSupported,
}

export function resolveWalletIntegrationFeatures(
	walletIntegration: WalletIntegration,
	expectedVariants: AtLeastOneTrueVariant,
	variant: Variant,
): ResolvedWalletIntegration {
	return {
		browser: walletIntegration.browser,
		walletCall: resolveFeature(walletIntegration.walletCall, expectedVariants, variant),
	}
}

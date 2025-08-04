import {
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
	 * Protip to test support:
	 *   - EIP-1193: Type `window.ethereum` in the console.
	 *   - EIP-2700: Type `window.ethereum.on` and `window.ethereum.removeListener` in the console.
	 *   - EIP-6963: Check https://eip6963.org/
	 */
	browser: 'NOT_A_BROWSER_WALLET' | WithRef<Record<BrowserIntegrationEip, Support | null>>

	/**
	 * EIP-5792: Wallet Call API support.
	 * The wallet must support all of the following calls:
	 *  - wallet_sendCalls
	 *  - wallet_getCallsStatus
	 *  - wallet_showCallsStatus
	 *  - wallet_getCapabilities
	 */
	walletCall: VariantFeature<WithRef<Support<WalletCallIntegration>>>
}

/** Variant-specific resolution of `WalletIntegration`. */
export interface ResolvedWalletIntegration {
	browser: WalletIntegration['browser']
	walletCall: ResolvedFeature<Support<WalletCallIntegration>>
}

/** EIP-5792 Wallet Call API support. */
export interface WalletCallIntegration {
	/**
	 * `atomic` capability as reported by wallet_getCapabilities.
	 * This allows dapps to execute multiple transactions atomically.
	 * https://eips.ethereum.org/EIPS/eip-5792#atomic-capability
	 * For the purpose of this attribute, we only look at support on L1.
	 * A reported value of 'ready' or 'supported' qualifies as supported.
	 */
	atomicMultiTransactions: WithRef<Support>
}

/** A WalletIntegration stand-in used for non-software wallets. */
export const notApplicableWalletIntegration: WalletIntegration = {
	browser: 'NOT_A_BROWSER_WALLET',
	walletCall: notSupported,
}

export function resolveWalletIntegrationFeatures(
	walletIntegration: WalletIntegration,
	variant: Variant,
): ResolvedWalletIntegration {
	return {
		browser: walletIntegration.browser,
		walletCall: resolveFeature(walletIntegration.walletCall, variant),
	}
}

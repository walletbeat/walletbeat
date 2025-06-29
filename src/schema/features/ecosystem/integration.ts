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

	/** EIP-5792: Wallet Call API support for transaction batching. */
	eip5792: VariantFeature<Support>
}

/** Variant-specific resolution of `WalletIntegration`. */
export interface ResolvedWalletIntegration {
	browser: WalletIntegration['browser']
	eip5792: ResolvedFeature<Support>
}

/** A WalletIntegration stand-in used for non-software wallets. */
export const notApplicableWalletIntegration: WalletIntegration = {
	browser: 'NOT_A_BROWSER_WALLET',
	eip5792: notSupported,
}

export function resolveWalletIntegrationFeatures(
	walletIntegration: WalletIntegration,
	variant: Variant,
): ResolvedWalletIntegration {
	return {
		browser: walletIntegration.browser,
		eip5792: resolveFeature(walletIntegration.eip5792, variant),
	}
}

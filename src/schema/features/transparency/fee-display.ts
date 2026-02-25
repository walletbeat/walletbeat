import type { WithRef } from '@/schema/reference'

import { type Support } from '../support'

/**
 * What level of information is shown about fees.
 */
export enum FeeDisplayLevel {
	/**
	 * No fee information is shown at all.
	 * (e.g. The wallet silently takes a spread on a swap without showing any
	 * fee line item; the user only sees the input and output amounts.)
	 * To identify: go through the full transaction approval flow and confirm
	 * that no fee, gas, or cost figure appears anywhere on screen.
	 */
	NONE = 'NONE',

	/**
	 * A single total fee number is shown, with no breakdown of where it goes.
	 * (e.g. The wallet shows "Network fee: 0.002 ETH" but does not distinguish
	 * between the gas cost and any wallet/protocol fee taken on top.)
	 * To identify: a fee amount is visible, but all costs are collapsed into
	 * one line with no itemization of individual fee recipients.
	 */
	AGGREGATED = 'AGGREGATED',

	/**
	 * A full fee breakdown is shown: separate line items for each fee and who
	 * receives it.
	 * (e.g. The wallet shows "Gas: 0.001 ETH", "Protocol fee: 0.05%",
	 * "Wallet fee: 0.1%" as distinct line items.)
	 * To identify: the transaction approval screen lists each fee component
	 * separately, making it clear how much goes to the network, the protocol,
	 * and/or the wallet.
	 */
	COMPREHENSIVE = 'COMPREHENSIVE',
}

/** How much fee information is displayed by default and after an action. */
export interface FeeDisplay {
	/**
	 * Level of fee information shown with default wallet settings and zero
	 * fee-specific interactions on the transaction approval screen.
	 * To test: initiate the transaction on a freshly installed wallet with no
	 * settings changed. Record the fee display level visible on the approval
	 * screen before clicking anything fee-related.
	 */
	byDefault: FeeDisplayLevel

	/**
	 * Level of fee information shown after at most one additional
	 * click/tap on the transaction approval screen (e.g. tapping a fee row,
	 * an info icon, or a "show details" chevron), with no settings changed.
	 * To test: from the same default approval screen, make exactly one
	 * fee-related interaction and record the highest level of detail then shown.
	 * If `byDefault` is already `COMPREHENSIVE`, this should be the same value.
	 */
	afterSingleAction: FeeDisplayLevel

	/**
	 * Whether the wallet fully sponsors these fees on behalf of the user,
	 * so the user pays nothing.
	 * To test: complete the transaction and verify that no gas or protocol fee
	 * is deducted from the user's balance. Check the wallet's documentation
	 * or source code to confirm sponsorship is intentional and not a test-net
	 * artifact.
	 */
	fullySponsored: boolean
}

/** Shorthand for fees that are comprehensive by default. */
export const comprehensiveFeesShownByDefault: WithRef<FeeDisplay> = {
	byDefault: FeeDisplayLevel.COMPREHENSIVE,
	afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
	fullySponsored: false,
	ref: [],
}

/** Shorthand for fees that are fully sponsored and not shown. */
export const fullySponsoredFees: WithRef<FeeDisplay> = {
	byDefault: FeeDisplayLevel.NONE,
	afterSingleAction: FeeDisplayLevel.NONE,
	fullySponsored: true,
	ref: [],
}

/**
 * Details about how the wallet displays fees for basic operations.
 */
export interface BasicOperationFees {
	/**
	 * How does the wallet display fees for a simple ETH transfer on L1?
	 * To test: initiate a send of any ETH amount to a different address on
	 * Ethereum mainnet and evaluate the fee display on the approval screen.
	 */
	ethL1Transfer: Support<WithRef<FeeDisplay>>

	/**
	 * How does the wallet display fees for a simple ERC-20 transfer on L1?
	 * To test: initiate a send of any ERC-20 token (e.g. USDC) to a different
	 * address on Ethereum mainnet and evaluate the fee display on the approval screen.
	 */
	erc20L1Transfer: Support<WithRef<FeeDisplay>>

	/**
	 * If the wallet has a built-in ERC-20 swap feature, how are fees displayed?
	 * To test: use the wallet's own swap UI (not a third-party dapp) to swap
	 * one ERC-20 token for another (e.g. USDC → DAI) and evaluate the fee
	 * display on the approval screen. Set to not supported if the wallet has
	 * no built-in swap feature.
	 */
	builtInErc20Swap: Support<WithRef<FeeDisplay>>

	/**
	 * For a Uniswap transaction exchanging USDC for Ether, initiated through
	 * the Uniswap frontend (not the wallet's built-in swap feature, if any),
	 * how are fees displayed in the wallet's transaction approval dialog?
	 * To test: go to app.uniswap.org, connect the wallet, set up a USDC→ETH
	 * swap, and evaluate the fee display shown in the wallet's approval popup
	 * — not the Uniswap UI itself.
	 */
	uniswapUSDCToEtherSwap: Support<WithRef<FeeDisplay>>

	// Private token transfer transactions are already encoded in their
	// respective types, so no need to redeclare them here.
	// Same for native cross-chain bridging.
}

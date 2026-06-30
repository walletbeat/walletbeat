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

/**
 * How wallet service fees (platform fees on built-in swap or bridge flows)
 * are denominated when shown in a comprehensive fee breakdown.
 *
 * Only built-in swap and cross-chain bridging flows are evaluated on this
 * field. Other flows use `NOT_APPLICABLE` when no wallet service fee exists.
 */
export enum WalletServiceFeeDenomination {
	/** Wallet service fee line item(s) use % or bps. */
	PERCENTAGE_OR_BPS = 'PERCENTAGE_OR_BPS',

	/** Wallet service fee shown in flat $, fixed token amount, etc. */
	ABSOLUTE_OR_OTHER = 'ABSOLUTE_OR_OTHER',

	/**
	 * No wallet service fee exists on this flow. The user may still pay network
	 * gas or external protocol fees, but the wallet itself does not charge a
	 * platform fee whose units would be rated.
	 */
	NOT_APPLICABLE = 'NOT_APPLICABLE',
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

	/**
	 * How wallet service fees are denominated when a comprehensive breakdown
	 * is available. Only evaluated on built-in swap (`builtInErc20Swap`) and
	 * cross-chain bridging (`feesLargerThan1bps`) flows where the wallet
	 * charges an order-size-sensitive service fee.
	 *
	 * - `PERCENTAGE_OR_BPS` — wallet service fee line item(s) use % or bps.
	 * - `ABSOLUTE_OR_OTHER` — wallet service fee shown in flat $, fixed token
	 *   amount, etc.
	 * - `NOT_APPLICABLE` — no wallet service fee on this flow. Use for L1
	 *   transfers, external app transactions, relayer fees, and other flows
	 *   where only network or external protocol fees apply.
	 * - `null` — not yet researched (required on in-scope swap/bridge flows).
	 */
	walletServiceFeeDenomination: WalletServiceFeeDenomination | null
}

export function validateFeeDisplay(feeDisplay: FeeDisplay) {
	if (
		(feeDisplay.byDefault === FeeDisplayLevel.AGGREGATED ||
			feeDisplay.byDefault === FeeDisplayLevel.COMPREHENSIVE) &&
		feeDisplay.afterSingleAction === FeeDisplayLevel.NONE
	) {
		throw new Error(
			'Invalid fee display: Cannot have afterSingleAction=NONE if the default behavior is not NONE',
		)
	}

	if (
		feeDisplay.byDefault === FeeDisplayLevel.COMPREHENSIVE &&
		feeDisplay.afterSingleAction !== FeeDisplayLevel.COMPREHENSIVE
	) {
		throw new Error(
			'Invalid fee display: Cannot have byDefault=COMPREHENSIVE if the afterSingleAction behavior is not also comprehensive',
		)
	}

	if (
		(feeDisplay.walletServiceFeeDenomination === WalletServiceFeeDenomination.PERCENTAGE_OR_BPS ||
			feeDisplay.walletServiceFeeDenomination === WalletServiceFeeDenomination.ABSOLUTE_OR_OTHER) &&
		feeDisplay.afterSingleAction !== FeeDisplayLevel.COMPREHENSIVE
	) {
		throw new Error(
			'Invalid fee display: PERCENTAGE_OR_BPS and ABSOLUTE_OR_OTHER require afterSingleAction=COMPREHENSIVE',
		)
	}

	if (
		feeDisplay.afterSingleAction !== FeeDisplayLevel.COMPREHENSIVE &&
		feeDisplay.walletServiceFeeDenomination !== WalletServiceFeeDenomination.NOT_APPLICABLE &&
		feeDisplay.walletServiceFeeDenomination !== null
	) {
		throw new Error(
			'Invalid fee display: when afterSingleAction is not COMPREHENSIVE, walletServiceFeeDenomination must be NOT_APPLICABLE or null',
		)
	}
}

/**
 * Shorthand for comprehensive fee display on flows with no wallet service fee
 * (e.g. L1 transfers, Uniswap approval popups). Do not use on `builtInErc20Swap`
 * or `feesLargerThan1bps` without explicit denomination research.
 */
export const comprehensiveGasOrExternalFees: WithRef<FeeDisplay> = {
	byDefault: FeeDisplayLevel.COMPREHENSIVE,
	afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
	fullySponsored: false,
	walletServiceFeeDenomination: WalletServiceFeeDenomination.NOT_APPLICABLE,
	ref: [],
}

/**
 * Shorthand for fully sponsored fees with no user-visible fee line items.
 * `NOT_APPLICABLE` because there is no wallet service fee to denominate.
 */
export const fullySponsoredFees: WithRef<FeeDisplay> = {
	byDefault: FeeDisplayLevel.NONE,
	afterSingleAction: FeeDisplayLevel.NONE,
	fullySponsored: true,
	walletServiceFeeDenomination: WalletServiceFeeDenomination.NOT_APPLICABLE,
	ref: [],
}

/**
 * Shorthand for comprehensive built-in swap or cross-chain bridging fee display
 * pending wallet service fee denomination research. Use on `builtInErc20Swap` and
 * `feesLargerThan1bps` when display levels are known to be comprehensive but
 * whether wallet service fees use %/bps vs flat amounts is not yet researched.
 */
export const comprehensiveWalletServiceFeesUnresearched: WithRef<FeeDisplay> = {
	byDefault: FeeDisplayLevel.COMPREHENSIVE,
	afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
	fullySponsored: false,
	walletServiceFeeDenomination: null,
	ref: [],
}

/**
 * Shorthand for fully researched built-in swap or bridge fee display where
 * wallet service fees are shown as a percentage or basis points.
 */
export const comprehensiveWalletServiceFeesPercentage: WithRef<FeeDisplay> = {
	byDefault: FeeDisplayLevel.COMPREHENSIVE,
	afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
	fullySponsored: false,
	walletServiceFeeDenomination: WalletServiceFeeDenomination.PERCENTAGE_OR_BPS,
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
	 * To test: use the wallet's own swap UI (not an external app) to swap
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

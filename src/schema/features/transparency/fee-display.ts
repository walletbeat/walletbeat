import { type FullyQualifiedReference, mergeRefs, refs, type WithRef } from '@/schema/reference'
import { type NonEmptySet, setContains } from '@/types/utils/non-empty'

import { isSupported, type Support } from '../support'

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
 * A unit that a wallet service fee (platform fee on built-in swap or bridge
 * flows) line item may be displayed in, within a comprehensive fee breakdown.
 * A single fee line item may show more than one of these at once (e.g. a
 * percentage next to its fiat-equivalent amount).
 */
export enum WalletServiceFeeDisplayUnit {
	/** Wallet service fee line item shows a percentage (e.g. "0.3%"). */
	PERCENTAGE = 'PERCENTAGE',

	/** Wallet service fee line item shows basis points (e.g. "30 bps"). */
	BASIS_POINTS = 'BASIS_POINTS',

	/** Wallet service fee line item shows a flat fiat-currency amount (e.g. "$1.24"). */
	FIAT = 'FIAT',

	/**
	 * Wallet service fee line item shows a fixed amount of an onchain asset,
	 * native or ERC-20 (e.g. "0.001 ETH", "0.5 USDC").
	 */
	TOKEN_AMOUNT = 'TOKEN_AMOUNT',
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
	 *
	 * This field describes payment (whether the user pays nothing), while
	 * `byDefault` and `afterSingleAction` describe UI visibility. Orderflow
	 * prominence comparison uses the recorded display levels as-is; if no
	 * fee-related copy appears on the approval screen, set both levels to
	 * `NONE` even when the wallet fully sponsors fees.
	 */
	fullySponsored: boolean

	/**
	 * Which unit(s) the wallet service fee line item(s) are shown in, when a
	 * comprehensive breakdown is available. Meaningful when the flow includes
	 * a wallet-charged platform fee line item in the breakdown (e.g. built-in
	 * swap or cross-chain bridging).
	 *
	 * - A `NonEmptySet` of `WalletServiceFeeDisplayUnit` — every distinct unit
	 *   shown on the wallet service fee line item(s) (e.g. a wallet showing
	 *   both a percentage and its fiat equivalent would use both units here).
	 * - `'NOT_APPLICABLE'` — no wallet-charged platform fee exists on this
	 *   flow. Use for L1 transfers, external app transactions, relayer fees,
	 *   and other flows where only network or external protocol fees apply.
	 * - `null` — not yet researched (required on in-scope swap/bridge flows).
	 */
	walletServiceFeeDisplayUnits: NonEmptySet<WalletServiceFeeDisplayUnit> | 'NOT_APPLICABLE' | null
}

/**
 * Validates that `FeeDisplay` fields are consistent.
 *
 * @throws When fee display level pairs violate the by-default / after-action rules,
 *   or when `walletServiceFeeDisplayUnits` is set without a comprehensive breakdown.
 */
export function validateFeeDisplay(feeDisplay: FeeDisplay): void {
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
		feeDisplay.afterSingleAction !== FeeDisplayLevel.COMPREHENSIVE &&
		feeDisplay.walletServiceFeeDisplayUnits !== 'NOT_APPLICABLE' &&
		feeDisplay.walletServiceFeeDisplayUnits !== null
	) {
		throw new Error(
			'Invalid fee display: when afterSingleAction is not COMPREHENSIVE, walletServiceFeeDisplayUnits must be NOT_APPLICABLE or null',
		)
	}
}

/**
 * Shorthand for fully sponsored fees with no user-visible fee line items.
 * `NOT_APPLICABLE` because there is no wallet service fee to denominate.
 */
export const fullySponsoredFees: WithRef<FeeDisplay> = {
	byDefault: FeeDisplayLevel.NONE,
	afterSingleAction: FeeDisplayLevel.NONE,
	fullySponsored: true,
	walletServiceFeeDisplayUnits: 'NOT_APPLICABLE',
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

/**
 * Whether the given set of wallet service fee display units includes at
 * least one unit that expresses a rate (as opposed to a flat amount),
 * making it possible to compare the effective cost across order sizes.
 */
export function hasRelativeWalletServiceFeeUnit(
	units: NonEmptySet<WalletServiceFeeDisplayUnit>,
): boolean {
	return (
		setContains<WalletServiceFeeDisplayUnit>(units, WalletServiceFeeDisplayUnit.PERCENTAGE) ||
		setContains<WalletServiceFeeDisplayUnit>(units, WalletServiceFeeDisplayUnit.BASIS_POINTS)
	)
}

/**
 * Tiebreaker for `compareFeeDisplay` when display level and sponsorship match.
 * Returns 1 if units1 is better, 0 if equal, -1 if units2 is better.
 * Ranking: NOT_APPLICABLE and any set containing a relative unit (tied) >
 * a set with only absolute units > null.
 */
function compareWalletServiceFeeDisplayUnits(
	units1: NonEmptySet<WalletServiceFeeDisplayUnit> | 'NOT_APPLICABLE' | null,
	units2: NonEmptySet<WalletServiceFeeDisplayUnit> | 'NOT_APPLICABLE' | null,
): -1 | 0 | 1 {
	const rank = (
		units: NonEmptySet<WalletServiceFeeDisplayUnit> | 'NOT_APPLICABLE' | null,
	): number => {
		if (units === null) {
			return 1
		}

		if (units === 'NOT_APPLICABLE' || hasRelativeWalletServiceFeeUnit(units)) {
			return 3
		}

		return 2
	}

	const rank1 = rank(units1)
	const rank2 = rank(units2)

	if (rank1 > rank2) {
		return 1
	}

	if (rank1 < rank2) {
		return -1
	}

	return 0
}

/**
 * Returns;
 *   * 1 if feeDisplay1 is better
 *   * 0 if feeDisplay1 and feeDisplay2 are completely equal
 *   * -1 if feeDisplay2 is better
 */
export function compareFeeDisplay(feeDisplay1: FeeDisplay, feeDisplay2: FeeDisplay): -1 | 0 | 1 {
	validateFeeDisplay(feeDisplay1)
	validateFeeDisplay(feeDisplay2)

	if (
		feeDisplay1.byDefault === feeDisplay2.byDefault &&
		feeDisplay1.afterSingleAction === feeDisplay2.afterSingleAction &&
		feeDisplay1.fullySponsored === feeDisplay2.fullySponsored
	) {
		return compareWalletServiceFeeDisplayUnits(
			feeDisplay1.walletServiceFeeDisplayUnits,
			feeDisplay2.walletServiceFeeDisplayUnits,
		)
	}

	if (feeDisplay1.fullySponsored !== feeDisplay2.fullySponsored) {
		return feeDisplay1.fullySponsored ? 1 : -1
	}

	const compareFeeDisplayLevel = (
		displayLevel1: FeeDisplayLevel,
		displayLevel2: FeeDisplayLevel,
	): -1 | 0 | 1 => {
		if (displayLevel1 === FeeDisplayLevel.COMPREHENSIVE) {
			return 1
		}

		if (displayLevel2 === FeeDisplayLevel.COMPREHENSIVE) {
			return -1
		}

		if (displayLevel1 === FeeDisplayLevel.AGGREGATED) {
			return 1
		}

		if (displayLevel2 === FeeDisplayLevel.AGGREGATED) {
			return -1
		}

		throw new Error('Unreachable')
	}

	if (feeDisplay1.byDefault !== feeDisplay2.byDefault) {
		return compareFeeDisplayLevel(feeDisplay1.byDefault, feeDisplay2.byDefault)
	}

	if (feeDisplay1.afterSingleAction !== feeDisplay2.afterSingleAction) {
		return compareFeeDisplayLevel(feeDisplay1.afterSingleAction, feeDisplay2.afterSingleAction)
	}

	throw new Error('Unreachable')
}

/** Worst basic-operation fee display with contributing research refs. */
export type WorstOperationFees = {
	feeDisplay: FeeDisplay
	references: FullyQualifiedReference[]
}

/** Worst-case fee display among basic operation fees, with contributing refs. */
export function computeWorstOperationFees(
	operationFees: BasicOperationFees,
): WorstOperationFees | null {
	const supportedOperationFees = [
		operationFees.ethL1Transfer,
		operationFees.erc20L1Transfer,
		operationFees.builtInErc20Swap,
		operationFees.uniswapUSDCToEtherSwap,
	].filter(isSupported)

	if (supportedOperationFees.length === 0) {
		return null
	}

	let worstOperationFees: WorstOperationFees = {
		feeDisplay: supportedOperationFees[0],
		references: refs(supportedOperationFees[0]),
	}

	for (const feeDisplay of supportedOperationFees.slice(1)) {
		switch (compareFeeDisplay(worstOperationFees.feeDisplay, feeDisplay)) {
			case -1:
				break
			case 0:
				worstOperationFees = {
					feeDisplay: worstOperationFees.feeDisplay,
					references: mergeRefs(worstOperationFees.references, refs(feeDisplay)),
				}
				break
			case 1:
				worstOperationFees = {
					feeDisplay,
					references: refs(feeDisplay),
				}
		}
	}

	return worstOperationFees
}

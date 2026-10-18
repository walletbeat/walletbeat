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
 * A unit that a fee amount may be displayed in. A single fee figure may show
 * more than one of these at once (e.g. a percentage next to its
 * fiat-equivalent amount).
 */
export enum WalletServiceFeeDisplayUnit {
	/** The fee is shown as a percentage (e.g. "0.3%"). */
	PERCENTAGE = 'PERCENTAGE',

	/** The fee is shown in basis points (e.g. "30 bps"). */
	BASIS_POINTS = 'BASIS_POINTS',

	/** The fee is shown as a flat fiat-currency amount (e.g. "$1.24"). */
	FIAT = 'FIAT',

	/**
	 * The fee is shown as a fixed amount of an onchain asset, native or ERC-20
	 * (e.g. "0.001 ETH", "0.5 USDC").
	 */
	TOKEN_AMOUNT = 'TOKEN_AMOUNT',
}

/** How fees are presented to the user at a given depth of the interface. */
export interface FeeDisplayAtDepth {
	/** Level of fee information shown at this depth. */
	comprehensiveness: FeeDisplayLevel

	/**
	 * Every distinct unit that the fee figures shown at this depth use,
	 * whichever type of fee they represent and whether they are itemized or
	 * aggregated (e.g. a wallet showing a fee as both a percentage and its
	 * fiat equivalent uses both units here).
	 * `null` if not yet researched, or if `comprehensiveness` is `NONE`.
	 */
	units: NonEmptySet<WalletServiceFeeDisplayUnit> | null
}

/** Fees that may be charged during a transaction or operation. */
export enum FeeType {
	/** Blockchain fees for transaction inclusion/processing. */
	NETWORK_FEE = 'NETWORK_FEE',

	/** Fees charged by the onchain app, e.g. liquidity provider fees during swap. */
	ONCHAIN_APP_FEE = 'ONCHAIN_APP_FEE',

	/** Fees charged by the wallet or wallet provider. */
	WALLET_FEE = 'WALLET_FEE',
}

/** What fees are involved in an operation and how they are displayed. */
export interface FeeDisplay {
	/** Which fees are involved in this operation? At least one must be true. */
	feesInvolved: Exclude<Record<FeeType, boolean>, Record<FeeType, false>>

	/**
	 * How are fees presented to the user by default?
	 * To test: initiate the transaction on a freshly installed wallet with no
	 * settings changed. Record what the transaction approval screen shows
	 * before any fee-related interaction.
	 */
	shownByDefault: FeeDisplayAtDepth

	/**
	 * How are fees presented after one action?
	 * Things that count as "actions":
	 *
	 * - Any tap or click, e.g. modal dialog, "Show more", etc.
	 * - Any amount of scrolling or other interface manipulation that
	 *   confirming the transaction doesn't itself already require.
	 * - Changing wallet configuration from the default settings, even if
	 *   this only needs to be done once in the wallet settings.
	 *
	 * `NO_ACTION_POSSIBLE` if no action reveals any more fee information.
	 */
	shownAfterSingleAction: FeeDisplayAtDepth | 'NO_ACTION_POSSIBLE'
}

/**
 * How fees are presented after at most one action: the default
 * presentation if no action is possible.
 */
export function feeDisplayAfterSingleAction(feeDisplay: FeeDisplay): FeeDisplayAtDepth {
	return feeDisplay.shownAfterSingleAction === 'NO_ACTION_POSSIBLE'
		? feeDisplay.shownByDefault
		: feeDisplay.shownAfterSingleAction
}

function feeDisplayLevelRank(level: FeeDisplayLevel): number {
	switch (level) {
		case FeeDisplayLevel.NONE:
			return 0
		case FeeDisplayLevel.AGGREGATED:
			return 1
		case FeeDisplayLevel.COMPREHENSIVE:
			return 2
	}
}

/**
 * Validates that `FeeDisplay` fields are consistent.
 *
 * @throws When no fee type is involved, when one action shows less fee
 *   information than the default presentation, or when units are set at a
 *   depth that shows no fee information.
 */
export function validateFeeDisplay(feeDisplay: FeeDisplay): void {
	if (!Object.values(feeDisplay.feesInvolved).includes(true)) {
		throw new Error('Invalid fee display: at least one fee type must be involved')
	}

	const afterSingleAction = feeDisplayAfterSingleAction(feeDisplay)

	if (
		feeDisplayLevelRank(afterSingleAction.comprehensiveness) <
		feeDisplayLevelRank(feeDisplay.shownByDefault.comprehensiveness)
	) {
		throw new Error(
			'Invalid fee display: shownAfterSingleAction cannot be less comprehensive than shownByDefault',
		)
	}

	for (const atDepth of [feeDisplay.shownByDefault, afterSingleAction]) {
		if (atDepth.comprehensiveness === FeeDisplayLevel.NONE && atDepth.units !== null) {
			throw new Error('Invalid fee display: units must be null when comprehensiveness is NONE')
		}
	}
}

/** How fees are displayed for a basic operation. */
export type OperationFeeDisplay = WithRef<{
	/** How are fees displayed when performing this operation? */
	fees: FeeDisplay | 'NO_FEES_CHARGED'
}>

/**
 * Details about how the wallet displays fees for basic operations.
 */
export interface BasicOperationFees {
	/**
	 * How does the wallet display fees for a simple ETH transfer on L1?
	 * To test: initiate a send of any ETH amount to a different address on
	 * Ethereum mainnet and evaluate the fee display on the approval screen.
	 */
	ethL1Transfer: Support<OperationFeeDisplay>

	/**
	 * How does the wallet display fees for a simple ERC-20 transfer on L1?
	 * To test: initiate a send of any ERC-20 token (e.g. USDC) to a different
	 * address on Ethereum mainnet and evaluate the fee display on the approval screen.
	 */
	erc20L1Transfer: Support<OperationFeeDisplay>

	/**
	 * If the wallet has a built-in ERC-20 swap feature, how are fees displayed?
	 * To test: use the wallet's own swap UI (not an external app) to swap
	 * one ERC-20 token for another (e.g. USDC → DAI) and evaluate the fee
	 * display on the approval screen. Set to not supported if the wallet has
	 * no built-in swap feature.
	 */
	builtInErc20Swap: Support<OperationFeeDisplay>

	/**
	 * For a Uniswap transaction exchanging USDC for Ether, initiated through
	 * the Uniswap frontend (not the wallet's built-in swap feature, if any),
	 * how are fees displayed in the wallet's transaction approval dialog?
	 * To test: go to app.uniswap.org, connect the wallet, set up a USDC→ETH
	 * swap, and evaluate the fee display shown in the wallet's approval popup
	 * — not the Uniswap UI itself.
	 */
	uniswapUSDCToEtherSwap: Support<OperationFeeDisplay>

	// Private token transfer transactions are already encoded in their
	// respective types, so no need to redeclare them here.
	// Same for native cross-chain bridging.
}

/**
 * Whether the given set of fee display units includes at least one unit
 * that expresses a rate (as opposed to a flat amount), making it possible
 * to compare the effective cost across order sizes.
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
 * Tiebreaker for `compareFees` when display levels match.
 * Ranking: no wallet fee involved, or units after at most one action that
 * include a relative unit (tied) > units with only absolute units > `null`.
 */
function walletFeeUnitsRank(feeDisplay: FeeDisplay): number {
	if (!feeDisplay.feesInvolved[FeeType.WALLET_FEE]) {
		return 3
	}

	const units = feeDisplayAfterSingleAction(feeDisplay).units

	if (units === null) {
		return 1
	}

	return hasRelativeWalletServiceFeeUnit(units) ? 3 : 2
}

function compareRanks(rank1: number, rank2: number): -1 | 0 | 1 {
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
 *   * 1 if fees1 is better
 *   * 0 if fees1 and fees2 are equally good
 *   * -1 if fees2 is better
 *
 * `NO_FEES_CHARGED` is better than any fee display.
 */
export function compareFees(
	fees1: FeeDisplay | 'NO_FEES_CHARGED',
	fees2: FeeDisplay | 'NO_FEES_CHARGED',
): -1 | 0 | 1 {
	if (fees1 === 'NO_FEES_CHARGED' || fees2 === 'NO_FEES_CHARGED') {
		return compareRanks(fees1 === 'NO_FEES_CHARGED' ? 1 : 0, fees2 === 'NO_FEES_CHARGED' ? 1 : 0)
	}

	validateFeeDisplay(fees1)
	validateFeeDisplay(fees2)

	const byDefaultCompare = compareRanks(
		feeDisplayLevelRank(fees1.shownByDefault.comprehensiveness),
		feeDisplayLevelRank(fees2.shownByDefault.comprehensiveness),
	)

	if (byDefaultCompare !== 0) {
		return byDefaultCompare
	}

	const afterSingleActionCompare = compareRanks(
		feeDisplayLevelRank(feeDisplayAfterSingleAction(fees1).comprehensiveness),
		feeDisplayLevelRank(feeDisplayAfterSingleAction(fees2).comprehensiveness),
	)

	if (afterSingleActionCompare !== 0) {
		return afterSingleActionCompare
	}

	return compareRanks(walletFeeUnitsRank(fees1), walletFeeUnitsRank(fees2))
}

/** Worst basic-operation fees with contributing research refs. */
export type WorstOperationFees = {
	fees: FeeDisplay | 'NO_FEES_CHARGED'
	references: FullyQualifiedReference[]
}

/** Worst-case fees among basic operation fees, with contributing refs. */
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
		fees: supportedOperationFees[0].fees,
		references: refs(supportedOperationFees[0]),
	}

	for (const operationFeeDisplay of supportedOperationFees.slice(1)) {
		switch (compareFees(worstOperationFees.fees, operationFeeDisplay.fees)) {
			case -1:
				break
			case 0:
				worstOperationFees = {
					fees: worstOperationFees.fees,
					references: mergeRefs(worstOperationFees.references, refs(operationFeeDisplay)),
				}
				break
			case 1:
				worstOperationFees = {
					fees: operationFeeDisplay.fees,
					references: refs(operationFeeDisplay),
				}
		}
	}

	return worstOperationFees
}

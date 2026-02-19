import type { WithRef } from '@/schema/reference'

import type { Support } from '../support'
import type { FeeDisplay } from '../transparency/fee-display'

/**
 * How does the wallet display token balances?
 */
export interface CrossChainBalanceDisplay {
	/**
	 * Does the wallet support showing the user's balance on multiple chains
	 * at once in a single view, with each chain's balance reflected
	 * individually?
	 */
	perChainBalanceViewAcrossMultipleChains: Support

	/**
	 * Does the wallet support showing the user's balance summed up across
	 * multiple chains at once?
	 */
	crossChainSumView: Support
}

/** Chain abstraction features. */
export type ChainAbstraction = {
	/** What types of balances can the wallet display? */
	crossChainBalances: WithRef<{
		/** Can the wallet display the account's total value across all chains? */
		globalAccountValue: Support

		/** Can the wallet display the value of the account on a single chain? */
		perChainAccountValue: Support

		/**
		 * How does the wallet display Ether balances?
		 * Chains on which Ether is not the native unit are ignored here.
		 */
		ether: CrossChainBalanceDisplay

		/**
		 * How does the wallet display USDC balances?
		 * USDC is chosen as a sample token for which it is useful to see one's
		 * total cross-chain balance.
		 * Chains on which USDC is not deployed are ignored here.
		 */
		usdc: CrossChainBalanceDisplay
	}>

	/** Chain bridging features. */
	bridging: {
		/** Does the wallet have a built-in bridging feature? */
		builtInBridging: Support<
			WithRef<{
				/** Are the trust assumptions of the bridge explained to the user? */
				risksExplained: 'NOT_IN_UI' | 'VISIBLE_BY_DEFAULT' | 'HIDDEN_BY_DEFAULT'

				/**
				 * How are the fees involved in bridging explained to the user?
				 * For the purpose of evaluating this attribute, fees of 1bps or
				 * smaller are not taken into consideration (it is OK for wallets
				 * to not display them).
				 */
				feesLargerThan1bps: FeeDisplay
			}>
		>

		/**
		 * When the user is attempting to spend tokens on a chain where their
		 * balance is insufficient, but where they have sufficient balance on
		 * another chain, does the wallet automatically propose the user to bridge?
		 */
		suggestedBridging: Support<WithRef<{}>>
	}
}

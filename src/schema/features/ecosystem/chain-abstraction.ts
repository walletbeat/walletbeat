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
	 * (e.g. Ethereum: 1.0 ETH, Arbitrum: 0.8 ETH, Base: 0.2 ETH — or Ethereum: 100 USDC, Arbitrum: 200 USDC, shown as separate line items.)
	 */
	perChainBalanceViewAcrossMultipleChains: Support

	/**
	 * Does the wallet support showing the user's balance summed up across
	 * multiple chains at once?
	 * (e.g. 2.0 ETH total across Ethereum, Arbitrum, and Base — or 300 USDC total across Ethereum and Arbitrum.)
	 */
	crossChainSumView: Support
}

/** Chain abstraction features. */
export type ChainAbstraction = {
	/** What types of balances can the wallet display? */
	crossChainBalances: WithRef<{
		/** Can the wallet display the account's total value across all chains? (e.g. Combined USD value of all assets across Ethereum, Arbitrum, and other L2s.) */
		globalAccountValue: Support

		/** Can the wallet display the value of the account on a single chain? (e.g. Total USD value of assets on Ethereum, independent of other chains.) */
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
		/**
		 * Does the wallet have a built-in bridging feature?
		 * (e.g. The wallet allows the user to bridge ETH from Ethereum to Arbitrum directly within the wallet UI, without needing an external app.)
		 */
		builtInBridging: Support<
			WithRef<{
				/**
				 * Are the trust assumptions of the bridge explained to the user?
				 * (e.g. The wallet shows a warning that the bridge is operated by an external provider and that funds may be at risk.)
				 */
				risksExplained: 'NOT_IN_UI' | 'VISIBLE_BY_DEFAULT' | 'HIDDEN_BY_DEFAULT'

				/**
				 * How are the fees involved in bridging explained to the user?
				 * For the purpose of evaluating this attribute, fees of 1bps or
				 * smaller are not taken into consideration (it is OK for wallets
				 * to not display them).
				 * (e.g. The wallet shows a fee breakdown before the user confirms the bridge transaction.)
				 */
				feesLargerThan1bps: FeeDisplay
			}>
		>

		/**
		 * When the user is attempting to spend tokens on a chain where their
		 * balance is insufficient, but where they have sufficient balance on
		 * another chain, does the wallet automatically propose the user to bridge?
		 * (e.g. The user tries to send USDC on Arbitrum but only has USDC on Ethereum, the wallet prompts them to bridge first.)
		 */
		suggestedBridging: Support<WithRef<{}>>
	}
}

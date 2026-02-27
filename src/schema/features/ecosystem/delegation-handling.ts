import type { Support, Supported } from '../support'

/** When does the wallet offer to perform the delegation? */
interface DelegationOffer {
	/**
	 * Does the wallet offer to sign the EIP-7702 delegation transaction upon fresh EOA creation?
	 *   - `NO`: wallet creates the EOA without mentioning delegation.
	 *   - `SUGGESTED`: wallet prompts the user to delegate during account setup, but they can skip it.
	 *   - `REQUIRED`: wallet forces the user to delegate before the account can be used.
	 */
	duringEOACreation: 'NO' | 'SUGGESTED' | 'REQUIRED'

	/**
	 * Does the wallet offer to sign an EIP-7702 delegation transaction upon importing an existing EOA?
	 *   - `NO`: wallet imports the key without mentioning delegation.
	 *   - `SUGGESTED`: wallet prompts the user to delegate after import, but they can skip it.
	 *   - `REQUIRED`: wallet requires the user to delegate before the imported account can be used.
	 */
	duringEOAImport: 'NO' | 'SUGGESTED' | 'REQUIRED'

	/**
	 * Does the wallet offer to sign an EIP-7702 transaction upon the first operation that requires it?
	 * (i.e. The user attempts a sponsored transaction and the wallet detects no delegation is in place yet,
	 * so it initiates the delegation flow before or alongside the intended operation.)
	 */
	duringFirst7702Operation: Support<
		| {
				/**
				 * Is the delegation step done as a standalone step before other operations?
				 * (i.e. The wallet shows a "Set up your smart account" screen and waits for it to confirm
				 * on-chain before proceeding with the user's original transaction.)
				 */
				type: 'STANDALONE_UPFRONT_DELEGATION'
		  }
		| {
				/**
				 * Is the delegation step done together with the non-delegation operations?
				 * (i.e. The wallet bundles the EIP-7702 delegation and the user's intended transaction
				 * into a single transaction that is submitted together.)
				 */
				type: 'DELEGATION_BUNDLED_WITH_OTHER_OPERATIONS'

				/**
				 * Does the wallet show the same level of details on the non-delegation part of the bundle
				 * as it would show if the user had initiated the same transaction after the wallet already
				 * has the delegation in place?
				 *   - `true`: the wallet shows the token transfer details, recipient, and amount exactly
				 *     as it would in a normal flow — the delegation being bundled does not reduce visibility.
				 *   - `false`: the wallet only shows a generic "setting up smart account" message without
				 *     details of the non-delegation transaction being bundled alongside it.
				 */
				nonDelegationTransactionDetailsIdenticalToNormalFlow: boolean
		  }
	>
}

/** How the wallet handles EIP-7702 delegations. */
export type DelegationHandling =
	| 'EIP_7702_NOT_SUPPORTED'
	| (DelegationOffer &
			(
				| // Either the delegation is required at EOA creation and import time...
				{ duringEOACreation: 'REQUIRED'; duringEOAImport: 'REQUIRED' }
				// Or it is supported at transaction time.
				| { duringFirst7702Operation: Supported<DelegationOffer['duringFirst7702Operation']> }
			) & {
				/** How is the fee for the initial EIP-7702 delegation paid? */
				fee: {
					/**
					 * Does the wallet sponsor the delegation fee?
					 * (i.e. The wallet pays for the gas cost of the EIP-7702 delegation transaction
					 * on behalf of the user, so they do not need ETH to get started.)
					 */
					walletSponsored: Support

					/**
					 * Does the wallet support paying for the gas fee across chains?
					 * (i.e. The user pays the delegation gas fee using USDC on Arbitrum,
					 * even though the delegation occurs on Ethereum mainnet.)
					 */
					crossChainGas: Support
				}
			})

import type { Support, Supported } from '../support'

/** When does the wallet offer to perform the delegation? */
interface DelegationOffer {
	/** Does the wallet offer to sign the EIP-7702 delegation transaction upon fresh EOA creation? */
	duringEOACreation: 'NO' | 'SUGGESTED' | 'REQUIRED'

	/** Does the wallet offer to sign an EIP-7702 delegation transaction upon importing an existing EOA? */
	duringEOAImport: 'NO' | 'SUGGESTED' | 'REQUIRED'

	/** Does the wallet offer to sign an EIP-7702 transaction upon the first operation that requires it? */
	duringFirst7702Operation: Support<
		| {
				/** Is the delegation step done as a standalone step before other operations? */
				type: 'STANDALONE_UPFRONT_DELEGATION'
		  }
		| {
				/** Is the delegation step done together with the non-delegation operations? */
				type: 'DELEGATION_BUNDLED_WITH_OTHER_OPERATIONS'

				/**
				 * Does the wallet show the same level of details on the non-delegation part of the bundle
				 * as it would show if the user had initiated the same transaction after the wallet already
				 * has the delegation in place?
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
					/** Does the wallet sponsor the delegation fee? */
					walletSponsored: Support

					/** Does the wallet support paying for the gas fee across chains? */
					crossChainGas: Support
				}
			})

import type { Support } from './features/support'
import type { WithRef } from './reference'

/** An EVM address. */
export type EVMAddress = `0x${Lowercase<string>}`

/**
 * A smart wallet contract, for ERC-4337 smart accounts, typically
 * delegated via EIP-7702.
 */
export interface SmartWalletContract {
	/** The address of the smart wallet contract. */
	address: EVMAddress

	/** Is the contract intended to be delegated to with EIP-7702? */
	eip7702Delegatable: boolean

	/** Is the source code for this contract available? */
	sourceCode:
		| { available: false }
		| WithRef<{
				available: true
		  }>

	/** Supported methods. */
	methods: {
		/** Does the contract support isValidSignature, as defined by ERC-1271? */
		isValidSignature: Support

		/** Does the contract support validateUserOp, as defined by ERC-4337? */
		validateUserOp: Support
	}
}

import type { Support } from './features/support'
import type { WithRef } from './reference'

/** An EVM address. */
export type EVMAddress = `0x${Lowercase<string>}`

export type AccountAbstraction = AltMemPoolAccountAbstraction | NativeAccountAbstraction

/**
 * An EVM contract with smart wallet functionality, 
 * for ERC-4337, EIP-7702, and native account abstraction
 */
export interface EVMContract {
	/** A human-readable name for the contract. */
	name: string

	/** The address of the smart wallet contract. */
	address: EVMAddress

	/** The chain this contract is deployed on. */
	chain: string 

	/** Is the contract intended to be delegated to with EIP-7702? */
	eip7702Delegatable: boolean

	/** Is the source code for this contract available? */
	sourceCode:
		| { available: false }
		| WithRef<{
				available: true
		  }>

	/** Supported methods. */
	methods?: {
		/** Does the contract support isValidSignature, as defined by ERC-1271? */
		isValidSignature: Support

		/** Does the contract support validateUserOp, as defined by ERC-4337? */
		validateUserOp: Support
	}
}

/**
 * A native account abstraction contract, for smart contract wallets using a
 * chain's native account abstraction. Which mean, the wallet can send
 * transactions to the public mempool.
 */
export interface NativeAccountAbstraction {
	/** A human-readable name for the contract. */
	name: string

	/** The address of the native account abstraction contracts that deploy implementation logic. */
	deployers: EVMContract[]
}

export interface AltMemPoolAccountAbstraction {
	/** A human-readable name for the contract. */
	name: string

	// More space here for alt-mempool-specific properties

	/** The addresses of the account abstraction contracts where the logic is delegated. */
	implementationLogicContracts: EVMContract[]
}

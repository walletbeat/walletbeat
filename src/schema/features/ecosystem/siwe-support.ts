import type { WithRef } from '../../reference'

/**
 * Sign-In With Ethereum (SIWE) support.
 * EIP-4361 standard for authentication using Ethereum accounts.
 */

/** SIWE support data. */
export type SiweSupport = {
	/** Whether SIWE is supported */
	supported: boolean

	/** Whether wallet provides built-in SIWE UI */
	builtInUI: boolean

	/** Whether wallet supports EIP-4361 message format */
	eip4361Compliant: boolean
}

/** SIWE implementation with references. */
export type SiweImplementation = WithRef<SiweSupport>

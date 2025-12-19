import type { WithRef } from '@/schema/reference'

/**
 * Types of passkey verification libraries that can be used
 */
export enum PasskeyVerificationLibrary {
	SMOOTH_CRYPTO_LIB = 'SMOOTH_CRYPTO_LIB',
	FRESH_CRYPTO_LIB = 'FRESH_CRYPTO_LIB',
	DAIMO_P256_VERIFIER = 'DAIMO_P256_VERIFIER',
	OPEN_ZEPPELIN_P256_VERIFIER = 'OPEN_ZEPPELIN_P256_VERIFIER',
	WEB_AUTHN_SOL = 'WEB_AUTHN_SOL',
	OTHER = 'OTHER',
}

/**
 * Information about the passkey verification implementation
 */
export interface PasskeyVerificationSupport {
	/**
	 * The library used for passkey verification
	 */
	library: PasskeyVerificationLibrary

	/**
	 * The URL to the library's repository or documentation
	 */
	libraryUrl?: string

	/**
	 * Additional details about the passkey verification implementation
	 */
	details?: string
}

/**
 * A record of passkey verification support
 */
export type PasskeyVerificationImplementation = WithRef<PasskeyVerificationSupport>

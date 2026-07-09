import type { WithRef } from '@/schema/reference'

/**
 * On-chain P-256 verifier libraries used to validate passkey
 * (WebAuthn) signatures in smart contract wallets.
 *
 * This is not about whether the wallet uses passkeys for login — it refers
 * specifically to the smart contract library the wallet uses to verify
 * passkey signatures onchain when passkeys are used as a signing key.
 *
 * Not visible in the UI — identify by inspecting the wallet's smart contract
 * source code for the verifier contract it imports or calls, or by checking
 * the wallet's technical documentation.
 */
export enum PasskeyVerificationLibrary {
	/** SmoothCryptoLib — a P-256 verification library. */
	SMOOTH_CRYPTO_LIB = 'SMOOTH_CRYPTO_LIB',

	/** FreshCryptoLib — a P-256 verification library. */
	FRESH_CRYPTO_LIB = 'FRESH_CRYPTO_LIB',

	/** Daimo's P-256 verifier contract. */
	DAIMO_P256_VERIFIER = 'DAIMO_P256_VERIFIER',

	/** OpenZeppelin's P-256 verifier. */
	OPEN_ZEPPELIN_P256_VERIFIER = 'OPEN_ZEPPELIN_P256_VERIFIER',

	/** WebAuthn.sol — a Solidity library for onchain WebAuthn verification. */
	WEB_AUTHN_SOL = 'WEB_AUTHN_SOL',

	/**
	 * A verifier library not listed above.
	 * Set `libraryUrl` to the repository or documentation URL.
	 */
	OTHER = 'OTHER',
}

/**
 * Human-readable name for a given passkey verification library.
 */
export function passkeyLibraryName(library: PasskeyVerificationLibrary): string {
	switch (library) {
		case PasskeyVerificationLibrary.SMOOTH_CRYPTO_LIB:
			return 'Smooth Crypto Lib'
		case PasskeyVerificationLibrary.FRESH_CRYPTO_LIB:
			return 'FreshCryptoLib'
		case PasskeyVerificationLibrary.DAIMO_P256_VERIFIER:
			return 'Daimo P256 Verifier'
		case PasskeyVerificationLibrary.OPEN_ZEPPELIN_P256_VERIFIER:
			return 'OpenZeppelin P256 Verifier'
		case PasskeyVerificationLibrary.WEB_AUTHN_SOL:
			return 'WebAuthn.sol'
		case PasskeyVerificationLibrary.OTHER:
			return 'an unrecognized library'
	}
}

/**
 * Information about the passkey verification implementation.
 * To identify: look at the wallet's smart contract source code for the
 * P-256 verifier it imports or delegates to.
 */
export interface PasskeyVerificationSupport {
	/**
	 * The onchain library used to verify passkey signatures.
	 * Use OTHER if the library is not listed in `PasskeyVerificationLibrary`,
	 * and set `libraryUrl` to its repository.
	 */
	library: PasskeyVerificationLibrary

	/**
	 * URL to the library's repository or documentation.
	 * Required when `library` is OTHER; optional otherwise.
	 */
	libraryUrl?: string

	/**
	 * Any additional implementation details worth noting.
	 * (e.g. a specific contract address, a fork of an upstream library, etc.)
	 */
	details?: string
}

/**
 * A record of passkey verification support.
 * Set to not supported if the wallet does not use passkeys as a signing key
 * and therefore has no onchain P-256 verifier.
 */
export type PasskeyVerificationImplementation = WithRef<PasskeyVerificationSupport>

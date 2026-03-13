import type { WithRef } from '@/schema/reference'

/**
 * How the wallet stores the user's private key.
 */
export enum KeyStorageMechanism {
	/**
	 * The key is encrypted with a user-known secret before being stored on disk.
	 */
	ENCRYPTED_WITH_USER_SECRET = 'ENCRYPTED_WITH_USER_SECRET',

	/**
	 * The key is stored inside a hardware security module or secure enclave
	 * that prevents key extraction by other software.
	 */
	HARDWARE_SECURITY_MODULE = 'HARDWARE_SECURITY_MODULE',

	/**
	 * The key is stored in plaintext, but in OS-sandboxed app storage that
	 * other apps and processes cannot read.
	 */
	OS_SANDBOXED_PLAINTEXT = 'OS_SANDBOXED_PLAINTEXT',

	/**
	 * No private key is stored on the device — the wallet uses passkey-managed
	 * smart contract accounts where signing happens through the OS passkey API.
	 */
	NO_KEY_STORED = 'NO_KEY_STORED',
}

/**
 * The entropy source used when generating the wallet's private key.
 */
export enum SecureRngSource {
	/** OS-provided Cryptographically Secure Pseudorandom RNG. */
	OS_CSPRNG = 'OS_CSPRNG',

	/** Dedicated hardware entropy source. */
	HARDWARE_ENTROPY = 'HARDWARE_ENTROPY',

	/** A library-provided RNG whose quality is not independently verified. */
	LIBRARY_RNG = 'LIBRARY_RNG',
}

/**
 * Security hardening applied to a browser extension deployment.
 */
export interface BrowserExtensionHardening {
	/**
	 * The extension requests only the minimum host permissions needed for
	 * its functionality, avoiding overbroad `<all_urls>` or similar grants.
	 */
	minimalPermissions: boolean

	/**
	 * The `web_accessible_resources` manifest field is either absent or
	 * restricted to specific origins, preventing other web pages from
	 * loading internal extension resources.
	 */
	lockedDownAccessibleResources: boolean
}

/**
 * Security hardening applied to a mobile app deployment.
 */
export interface MobileAppHardening {
	/**
	 * The app declares only the OS permissions it actually requires,
	 * without requesting broad access to contacts, location, etc.
	 */
	minimalPermissions: boolean

	/**
	 * The app uses Android Keystore or iOS Secure Enclave for key operations,
	 * hardware-backing cryptographic material where available.
	 */
	usesKeystoreOrEnclave: boolean
}

/**
 * Security best-practices data for a wallet.
 * Identifies how keys are stored, how entropy is sourced, and whether
 * deployment-environment hardening is applied.
 */
export interface SecurityBestPracticesSupport {
	/** How the wallet stores the user's private key. */
	keyStorageMechanism: KeyStorageMechanism

	/** The entropy source used during key generation. */
	secureRng: SecureRngSource

	/**
	 * Browser extension hardening details.
	 * Set to null if the wallet does not have a browser extension variant.
	 */
	browserExtensionHardening: BrowserExtensionHardening | null

	/**
	 * Mobile app hardening details.
	 * Set to null if the wallet does not have a mobile app variant.
	 */
	mobileAppHardening: MobileAppHardening | null
}

/**
 * A referenced record of security best-practices data.
 */
export type SecurityBestPracticesData = WithRef<SecurityBestPracticesSupport>

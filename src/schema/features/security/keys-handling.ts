/**
 * Keys handling data is not visible in the wallet UI — it must be determined
 * from the wallet's security documentation, architecture overview, or source code.
 * MPC-based wallets typically describe their key model in a blog post or whitepaper.
 */

/**
 * Where and how the private key (or key shares) are generated.
 * To identify: check the wallet's security or architecture documentation.
 * For MPC wallets, a blog post or whitepaper usually describes the key generation protocol.
 */
export enum KeyGenerationLocation {
	/**
	 * The key is generated entirely on the user's device.
	 * No key material leaves the device during generation.
	 * (e.g. A standard BIP-39 seed phrase wallet where the entropy is generated
	 * locally and the seed never touches a server.)
	 * To identify: this is the default for most traditional wallets. Confirm by
	 * checking that onboarding works fully offline and that no key material is
	 * sent to any server (inspect source code or network traffic during setup).
	 */
	FULLY_ON_USER_DEVICE = 'FULLY_ON_USER_DEVICE',

	/**
	 * The key is generated entirely off the user's device — on a remote server
	 * or service — and then delivered to the user.
	 * (e.g. A custodial service that generates keys server-side and holds them
	 * on behalf of the user.)
	 * To identify: the wallet's documentation states that keys are generated
	 * server-side, or the wallet requires an internet connection and account
	 * login before any key material is available.
	 */
	FULLY_OFF_USER_DEVICE = 'FULLY_OFF_USER_DEVICE',

	/**
	 * The key is computed through a multi-party protocol where both the user's
	 * device and at least one remote party contribute randomness or key shares.
	 * No single party ever holds the complete key — not even the user's device.
	 * (e.g. An MPC wallet where the user's device and the wallet provider's
	 * server each generate a key share, and threshold signing is used so the
	 * full key is never assembled anywhere.)
	 * To identify: the wallet documentation explicitly describes MPC key
	 * generation involving the user's device as one of the parties.
	 */
	MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE = 'MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE',
}

/**
 * If the key is split between multiple parties, how does signing/reconstruction occur?
 * To identify: check the wallet's security documentation or source code.
 * For MPC wallets, the key model (threshold signing vs. client-side reconstruction)
 * is usually described in the whitepaper or architecture docs.
 */
export enum MultiPartyKeyReconstruction {
	/**
	 * The key is not split — it exists in full on the user's device.
	 * This is the standard model for traditional seed phrase wallets.
	 */
	NON_MULTIPARTY = 'NON_MULTIPARTY',

	/**
	 * The key shares are combined on the user's device to reconstruct the
	 * full key before signing. The key exists in full on-device momentarily.
	 * (e.g. A wallet that stores key shares with different guardians but
	 * fetches them all to the user's device and assembles the key locally
	 * at signing time.)
	 * To identify: the wallet documentation describes "client-side key
	 * reconstruction" or the source code shows shares being combined on-device.
	 */
	ON_USER_DEVICE = 'RECONSTRUCTED_ON_USER_DEVICE',

	/**
	 * Signing is performed through a multi-party computation protocol that
	 * includes the user's device as one of the signing parties. The full key
	 * is never reconstructed — each party signs with its share.
	 * (e.g. An MPC wallet where the user's device holds one key share and the
	 * provider's server holds another; both participate in threshold signing
	 * for every transaction without ever combining their shares.)
	 * To identify: the wallet documentation describes "threshold signing",
	 * "MPC signing", or "distributed signing" where the user's device participates.
	 */
	MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE = 'MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE',

	/**
	 * Signing is performed through a multi-party computation entirely on
	 * remote infrastructure — the user's device does not participate in the
	 * signing computation itself, only in authorizing it
	 *
	 * To identify: the wallet documentation describes server-side MPC signing
	 * where the user's device is not one of the signing parties.
	 */
	MULTIPARTY_COMPUTED_WITHOUT_USER_DEVICE = 'MULTIPARTY_COMPUTED_WITHOUT_USER_DEVICE',
}

/**
 * How is private key material handled?
 */
export interface KeysHandlingSupport {
	/**
	 * Where and how the key is generated.
	 * See `KeyGenerationLocation` for how to identify.
	 */
	keyGeneration: KeyGenerationLocation

	/**
	 * If the key is split across multiple parties, how does signing occur?
	 * Use `NON_MULTIPARTY` for standard wallets where the full key lives
	 * on the user's device. See `MultiPartyKeyReconstruction` for MPC cases.
	 */
	multipartyKeyReconstruction: MultiPartyKeyReconstruction
}

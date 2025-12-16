/** Where is the secret generated? */
export enum KeyGenerationLocation {
	FULLY_ON_USER_DEVICE = 'FULLY_ON_USER_DEVICE',
	FULLY_OFF_USER_DEVICE = 'FULLY_OFF_USER_DEVICE',
	MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE = 'MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE',
}

/** If the key is split between multiple parties, how does reconstruction occur? */
export enum MultiPartyKeyReconstruction {
	NON_MULTIPARTY = 'NON_MULTIPARTY',
	ON_USER_DEVICE = 'RECONSTRUCTED_ON_USER_DEVICE',
	MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE = 'MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE',
	MULTIPARTY_COMPUTED_WITHOUT_USER_DEVICE = 'MULTIPARTY_COMPUTED_WITHOUT_USER_DEVICE',
}

/**
 * How is private key material handled?
 */
export interface KeysHandlingSupport {
	/** Is the key generated on-device or not? */
	keyGeneration: KeyGenerationLocation

	/** If the key is split between multiple parties, how does reconstruction occur? */
	multipartyKeyReconstruction: MultiPartyKeyReconstruction
}

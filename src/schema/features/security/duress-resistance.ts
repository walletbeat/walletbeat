import type { WithRef } from '@/schema/reference'

import type { Support } from '../support'

/**
 * Basic unlock mechanisms a wallet may use to prevent unauthorized access.
 * This is a prerequisite for any meaningful duress resistance.
 */
export enum BasicUnlockMechanism {
	/** A numeric PIN code entered on-device or in-app. */
	PIN = 'PIN',

	/** An alphanumeric password or passphrase. */
	PASSWORD = 'PASSWORD',

	/** Biometric authentication (Face ID, fingerprint, etc.). */
	BIOMETRIC = 'BIOMETRIC',

	/** A drawn swipe pattern. */
	PATTERN = 'PATTERN',
}

/**
 * Information about how the wallet locks itself against unauthorized access.
 */
export interface BasicUnlock {
	/**
	 * One or more unlock mechanisms supported by the wallet.
	 * Must contain at least one entry.
	 */
	mechanisms: BasicUnlockMechanism[]
}

/**
 * The action triggered when a duress PIN or passphrase is entered.
 *
 * Both actions require a dedicated duress credential (PIN, passphrase, etc.)
 * that is distinct from the normal unlock credential.
 */
export enum DuressAction {
	/**
	 * Entering the duress credential opens a separate "decoy" wallet with
	 * a different set of accounts and balances. The real wallet is not
	 * exposed. The attacker cannot distinguish the decoy from the real wallet,
	 * providing plausible deniability.
	 */
	DECOY_WALLET = 'DECOY_WALLET',

	/**
	 * Entering the duress credential wipes all local wallet data and
	 * immediately forwards all funds to a pre-configured external address.
	 *
	 * Note: the destination address must NOT be unilaterally user-controlled
	 * (e.g. must be a multisig, time-locked contract, or an independent external
	 * address), otherwise an attacker can force the user to change it first.
	 */
	SELF_DESTRUCT_AND_FORWARD = 'SELF_DESTRUCT_AND_FORWARD',
}

/**
 * Information about a wallet's duress mode.
 */
export interface DuressMode {
	/** The action triggered when the duress credential is entered. */
	action: DuressAction
}

/**
 * Duress resistance features of a wallet.
 *
 * Covers the full spectrum from basic lock-screen protection through
 * full duress-pin-triggered decoy wallets or self-destruct mechanisms.
 * This feature helps protect users against "wrench attacks" — physical
 * coercion to hand over funds.
 *
 * Only applicable to hardware wallets and mobile app wallets.
 * Desktop and browser extension wallets are exempt.
 */
export interface DuressResistance {
	/**
	 * The basic unlock mechanism protecting the wallet from unauthorized access.
	 * Set to null if unknown or if the wallet has no lock screen at all.
	 * A non-null value is a prerequisite for any meaningful duress resistance.
	 */
	basicUnlock: WithRef<BasicUnlock> | null

	/**
	 * A dedicated duress mode triggered by a separate duress credential.
	 * Use `notSupported` when the wallet has no duress mode.
	 * Use `supported({ action: ..., ref: ... })` when a duress mode exists.
	 */
	duressMode: Support<WithRef<DuressMode>>
}

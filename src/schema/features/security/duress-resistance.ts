import type { WithRef } from '@/schema/reference'
import type { NonEmptyArray } from '@/types/utils/non-empty'

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

/** Returns a human-readable label for a BasicUnlockMechanism. */
export function basicUnlockMechanismName(m: BasicUnlockMechanism): string {
	switch (m) {
		case BasicUnlockMechanism.PIN:
			return 'PIN code'
		case BasicUnlockMechanism.PASSWORD:
			return 'password'
		case BasicUnlockMechanism.BIOMETRIC:
			return 'biometric (Face ID / fingerprint)'
		case BasicUnlockMechanism.PATTERN:
			return 'swipe pattern'
	}
}

/**
 * Information about how the wallet locks itself against unauthorized access.
 */
export interface BasicUnlock {
	/**
	 * One or more unlock mechanisms supported by the wallet.
	 * Must contain at least one entry.
	 */
	mechanisms: NonEmptyArray<BasicUnlockMechanism>
}

/**
 * The action triggered when a duress PIN or passphrase is entered.
 *
 * Requires a dedicated duress credential (PIN, passphrase, etc.)
 * that is distinct from the normal unlock credential.
 *
 * Note: This enum is not limited to decoy wallets. As more wallets implement
 * different forms of duress actions, new variants should be added here.
 */
export enum DuressAction {
	/**
	 * Entering the duress credential opens a separate "decoy" wallet with
	 * a different set of accounts and balances. The real wallet is not
	 * exposed. The attacker cannot distinguish the decoy from the real wallet,
	 * providing plausible deniability.
	 */
	DECOY_WALLET = 'DECOY_WALLET',

	SELF_DESTRUCT = 'SELF_DESTRUCT',

	ONCHAIN_LOCKDOWN = 'ONCHAIN_LOCKDOWN',
}

/** Returns a human-readable label for a DuressAction. */
export function duressActionName(action: DuressAction): string {
	switch (action) {
		case DuressAction.DECOY_WALLET:
			return 'Decoy wallet'
		case DuressAction.ONCHAIN_LOCKDOWN:
			return 'Onchain lockdown'
		case DuressAction.SELF_DESTRUCT:
			return 'Self-destruct'
	}
}

/** Returns a human-readable description of what a DuressAction does. */
export function duressActionDescription(action: DuressAction): string {
	switch (action) {
		case DuressAction.DECOY_WALLET:
			return 'opens a separate decoy wallet with a distinct set of accounts and balances, giving the user plausible deniability under coercion'
		case DuressAction.ONCHAIN_LOCKDOWN:
			return 'triggers an onchain lockdown, preventing unauthorized transfers of funds'
		case DuressAction.SELF_DESTRUCT:
			return 'wipes the wallet, preventing the attacker from accessing funds'
	}
}

/**
 * Information about a wallet's duress mode.
 */
export interface DuressMode {
	/** One or more actions triggered when duress credentials are entered. */
	actions: NonEmptyArray<DuressAction>
}

/**
 * Duress resistance features of a wallet.
 *
 * Covers the full spectrum from basic lock-screen protection through
 * full duress-pin-triggered decoy wallets or self-destruct mechanisms.
 * This feature helps protect users against "wrench attacks" — physical
 * coercion to hand over funds.
 */
export interface DuressResistance {
	/**
	 * The basic unlock mechanism protecting the wallet from unauthorized access.
	 * Set to 'NO_LOCK_MECHANISM' if the wallet has no lock screen at all.
	 * A non-null value is a prerequisite for any meaningful duress resistance.
	 */
	basicUnlock: WithRef<BasicUnlock> | 'NO_LOCK_MECHANISM'

	/**
	 * A dedicated duress mode triggered by a separate duress credential.
	 * Use `notSupported` when the wallet has no duress mode.
	 * Use `supported({ action: ..., ref: ... })` when a duress mode exists.
	 */
	duressMode: Support<WithRef<DuressMode>>
}

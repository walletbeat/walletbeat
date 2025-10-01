import {
	type NonEmptyArray,
	nonEmptyFilter,
	type NonEmptySet,
	nonEmptySetFromArray,
} from '@/types/utils/non-empty'

import type { SmartWalletContract } from '../contracts'
import type { WithRef } from '../reference'
import { isSupported, type NotSupported, type Support, type Supported } from './support'

export type AccountTypeSupport<T extends object> = WithRef<Support<T>>

/** Type predicate for AccountTypeSupported<T>. */
export function isAccountTypeSupported<T extends object>(
	accountTypeSupport: AccountTypeSupport<T>,
): accountTypeSupport is WithRef<Supported<T>> {
	return isSupported<T>(accountTypeSupport)
}

/** Set of possible account types. */
export enum AccountType {
	/** EOA account type, behind a private key. */
	eoa = 'eoa',

	/** MPC wallets, behind a key with split shards. */
	mpc = 'mpc',

	/** EOA account that is used as a smart contract account with EIP-7702. */
	eip7702 = 'eip7702',

	/**
	 * Raw ERC-4337 account, i.e. an account for which the address matches the
	 * smart contract code.
	 */
	rawErc4337 = 'rawErc4337',
}

const allAccountTypes: NonEmptyArray<AccountType> = [
	AccountType.eoa,
	AccountType.mpc,
	AccountType.rawErc4337,
	AccountType.eip7702,
]

/** The ability (or lack thereof) to generate a transaction of a specific type. */
export enum TransactionGenerationCapability {
	/** The process to generate such a transaction relies on a third-party API. */
	RELYING_ON_THIRD_PARTY_API = 'RELYING_ON_THIRD_PARTY_API',

	/** The process to generate such a transaction requires the use of a standalone proprietary application. */
	USING_PROPRIETARY_STANDALONE_APP = 'USING_PROPRIETARY_STANDALONE_APP',

	/** The process to generate such a transaction requires the use of an open-source standalone application. */
	USING_OPEN_SOURCE_STANDALONE_APP = 'USING_OPEN_SOURCE_STANDALONE_APP',

	/** It is not possible to generate such a transaction. */
	IMPOSSIBLE = 'IMPOSSIBLE',
}

/** The ability to generate a transaction of a specific type. */
export type PossibleTransactionGenerationCapability = Exclude<
	TransactionGenerationCapability,
	TransactionGenerationCapability.IMPOSSIBLE
>

/** Account support features. */
export type AccountSupport = Exclude<
	{
		/**
		 * Support for raw EOA accounts.
		 * Leave as NOT_SUPPORTED if the wallet only supports EIP-7702-type EOAs.
		 */
		eoa: AccountTypeSupport<AccountTypeEoa>

		/** Support for MPC-based (sharded key) accounts. */
		mpc: AccountTypeSupport<AccountTypeMpc>

		/**
		 * Support for EIP-7702 EOA accounts.
		 * This usually also implies `rawEoa` support.
		 */
		eip7702: AccountTypeSupport<AccountType7702>

		/**
		 * Support for smart accounts (pure ERC-4337 accounts for which the
		 * address matches the contract code).
		 */
		rawErc4337: AccountTypeSupport<AccountType4337>
	},
	// At least one account type must be supported.
	Record<AccountType, NotSupported>
> & { defaultAccountType: AccountType }

/**
 * Returns whether the given AccountSupport data supports the given account type.
 */
export function supportsAccountType(
	accountSupport: AccountSupport | null | undefined,
	accountType: AccountType,
): boolean {
	if (accountSupport === undefined || accountSupport === null) {
		return false
	}

	return isSupported<Support>(accountSupport[accountType])
}

/**
 * Returns whether the given AccountSupport data supports *only* the given account type and no other.
 */
export function supportsOnlyAccountType(
	accountSupport: AccountSupport | null | undefined,
	accountType: AccountType,
): boolean {
	if (!supportsAccountType(accountSupport, accountType)) {
		return false
	}

	for (const otherType of allAccountTypes) {
		if (otherType === accountType) {
			continue
		}

		if (supportsAccountType(accountSupport, otherType)) {
			return false
		}
	}

	return true
}

/**
 * Returns the set of account types supported by AccountSupport.
 */
export function supportedAccountTypes(accountSupport: AccountSupport): NonEmptySet<AccountType> {
	return nonEmptySetFromArray(
		nonEmptyFilter(allAccountTypes, (accountType: AccountType): boolean =>
			supportsAccountType(accountSupport, accountType),
		),
	)
}

/** Support information for EOA accounts. */
export interface AccountTypeEoa {
	/** Type of standards used to deterministically derive private keys. */
	keyDerivation:
		| {
				type: 'NONSTANDARD'
		  }
		| {
				type: 'BIP32'
				seedPhrase: 'NONSTANDARD' | 'BIP39'
				derivationPath: 'NONSTANDARD' | 'BIP44'
				canExportSeedPhrase: boolean
		  }
	/** Can the wallet export EOA private keys directly? */
	canExportPrivateKey: boolean
}

interface AccountTypeMultifactor {
	/**
	 * When setting up the wallet, does the user own enough shares in their
	 * own self-custody to control the wallet?
	 * "Control" here means the ability to sign arbitrary transactions.
	 */
	controllingSharesInSelfCustodyByDefault: 'YES' | 'NO' | 'USER_MAKES_EXPLICIT_CHOICE'

	/**
	 * Is it possible to create and broadcast an Ethereum transaction that
	 * withdraws any type of asset from the account to transfer it out to
	 * another address, without the help of a third-party?
	 *
	 * This implies that the code to create such a transaction already exists
	 * and does not rely on any network request to a proprietary API or service.
	 */
	tokenTransferTransactionGeneration: PossibleTransactionGenerationCapability
}

/**
 * Support information for accounts with multiple authentication factors
 * where the factors cannot be mutated.
 */
export type AccountTypeMpc = AccountTypeMultifactor & {
	/** How is the underlying key generation performed before shares are distributed? */
	initialKeyGeneration: 'ON_USER_DEVICE' | 'BY_THIRD_PARTY_IN_TEE' | 'BY_THIRD_PARTY_IN_THE_CLEAR'
}

/**
 * Support information for accounts with multiple authentication factors
 * where the factors can be mutated.
 */
export type AccountTypeMutableMultifactor = AccountTypeMultifactor & {
	/**
	 * Is it possible to create and broadcast an Ethereum transaction that
	 * rotates one of the factors used to control the account without relying
	 * on a third-party?
	 *
	 * This implies that the code to create such a transaction is open-source
	 * and does not rely on any network request to a proprietary API or service.
	 */
	keyRotationTransactionGeneration: TransactionGenerationCapability
}

/** A wallet backed by a smart contract. */
export interface SmartAccountType {
	contract: 'UNKNOWN' | SmartWalletContract
}

/** Support information for ERC-4337 accounts. */
export type AccountType4337 = AccountTypeMutableMultifactor & SmartAccountType

/**
 * Support information for EIP-7702 accounts.
 */
export type AccountType7702 = SmartAccountType

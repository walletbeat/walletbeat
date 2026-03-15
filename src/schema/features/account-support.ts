import {
	type NonEmptyArray,
	nonEmptyFilter,
	type NonEmptySet,
	nonEmptySetFromArray,
} from '@/types/utils/non-empty'

import type { SmartWalletContract } from '../contracts'
import type { WithRef } from '../reference'
import { isSupported, type NotSupported, type Support, type Supported } from './support'

export type AccountTypeSupport<T extends object> = Support<WithRef<T>>

/** Type predicate for AccountTypeSupported<T>. */
export function isAccountTypeSupported<T extends object>(
	accountTypeSupport: AccountTypeSupport<T>,
): accountTypeSupport is WithRef<Supported<T>> {
	return isSupported<T>(accountTypeSupport)
}

/** Set of possible account types. */
export enum AccountType {
	/**
	 * EOA account type, behind a private key.
	 * To test: create a new wallet and check whether it shows a seed phrase
	 * during onboarding. Verify the address starts with `0x` and has no
	 * associated contract code (e.g. check on Etherscan — "Contract" tab
	 * should be absent).
	 */
	eoa = 'eoa',

	/**
	 * MPC wallets, behind a key with split shards.
	 * To test: check the wallet's documentation for "MPC", "threshold
	 * signatures", or "key sharding". MPC wallets typically do not show a
	 * seed phrase and the address has no on-chain contract code.
	 */
	mpc = 'mpc',

	/**
	 * EOA account that is used as a smart contract account with EIP-7702.
	 * To test: check the wallet's documentation for EIP-7702 support. The
	 * address is an EOA but will have contract code attached when the
	 * delegation is active (visible on Etherscan under "Contract").
	 */
	eip7702 = 'eip7702',

	/**
	 * Raw ERC-4337 account, i.e. an account for which the address matches the
	 * smart contract code.
	 * To test: look up the wallet address on Etherscan — the "Contract" tab
	 * should be present and show deployed bytecode. The wallet typically does
	 * not show a seed phrase; authentication uses a separate signer key.
	 */
	rawErc4337 = 'rawErc4337',

	/**
	 * Safe multisig smart contract account.
	 * To test: check whether the wallet lets you connect to or create a Safe.
	 * The address should resolve to a Safe contract on Etherscan (look for
	 * "GnosisSafe" or "Safe" in the contract name).
	 */
	safe = 'safe',
}

const allAccountTypes: NonEmptyArray<AccountType> = [
	AccountType.eoa,
	AccountType.mpc,
	AccountType.rawErc4337,
	AccountType.eip7702,
	AccountType.safe,
]

/** The ability (or lack thereof) to generate a transaction of a specific type. */
export enum TransactionGenerationCapability {
	/** The process to generate such a transaction relies on an external API. */
	RELYING_ON_EXTERNAL_API = 'RELYING_ON_EXTERNAL_API',

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

/**
 * Account support features.
 *
 * To test: create a new wallet and observe which account type is created by
 * default (EOA, MPC, smart account, Safe). Then check wallet settings and
 * documentation to confirm which additional account types are supported.
 */
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
		/** Support for Safe multisig accounts. */
		safe: AccountTypeSupport<AccountTypeSafe>
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

/**
 * Support information for EOA accounts.
 *
 * To test:
 * - `keyDerivation`: During onboarding or in Settings, check whether the
 *   wallet shows a 12/24-word BIP39 seed phrase. Import the seed phrase into
 *   another BIP44-compatible wallet (e.g. MetaMask) and verify the same
 *   address is derived.
 * - `canExportPrivateKey`: Go to Settings → Security (or equivalent) and
 *   look for an "Export private key" or "Show private key" option.
 * - `canExportSeedPhrase`: Go to Settings → Security and look for a
 *   "Reveal seed phrase" or "Back up recovery phrase" option.
 */
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
	 *
	 * To test: check the wallet's documentation and onboarding flow. Look for
	 * whether any share is stored solely on the provider's servers (NO), on the
	 * user's device by default (YES), or whether the user is prompted to choose
	 * (USER_MAKES_EXPLICIT_CHOICE).
	 */
	controllingSharesInSelfCustodyByDefault: 'YES' | 'NO' | 'USER_MAKES_EXPLICIT_CHOICE'

	/**
	 * Is it possible to create and broadcast an Ethereum transaction that
	 * withdraws any type of asset from the account to transfer it out to
	 * another address, without the help of an external provider?
	 *
	 * This implies that the code to create such a transaction already exists
	 * and does not rely on any network request to a proprietary API or service.
	 *
	 * To test: check the wallet's source code and documentation for whether
	 * token transfers depend on a proprietary API. Try sending a transaction
	 * while blocking network access to the provider's endpoints to see if it
	 * is still possible.
	 */
	tokenTransferTransactionGeneration: PossibleTransactionGenerationCapability
}

/**
 * Support information for accounts with multiple authentication factors
 * where the factors cannot be mutated.
 */
export type AccountTypeMpc = AccountTypeMultifactor & {
	/**
	 * How is the underlying key generation performed before shares are distributed?
	 *
	 * To test: check the wallet's technical documentation or audit reports.
	 * ON_USER_DEVICE means key material never leaves the user's device during
	 * generation; BY_EXTERNAL_PROVIDER_* means the provider participates in or
	 * fully controls the initial keygen ceremony.
	 */
	initialKeyGeneration:
		| 'ON_USER_DEVICE'
		| 'BY_EXTERNAL_PROVIDER_IN_SECURE_ENCLAVE'
		| 'BY_EXTERNAL_PROVIDER_IN_THE_CLEAR'
}

/**
 * Support information for accounts with multiple authentication factors
 * where the factors can be mutated.
 */
export type AccountTypeMutableMultifactor = AccountTypeMultifactor & {
	/**
	 * Is it possible to create and broadcast an Ethereum transaction that
	 * rotates one of the factors used to control the account without relying
	 * on an external service?
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

/**
 * Support information for Safe multisig accounts.
 *
 * To test:
 * - `canDeployNew`: Go through the wallet's UI and check whether it offers
 *   a flow to deploy a new Safe contract.
 * - `supportsAddingOrRemovingSigners`: In an existing Safe, attempt to add
 *   or remove an owner using only the wallet's native UI (no extra modules).
 *   Check whether the wallet generates the `addOwnerWithThreshold` /
 *   `removeOwner` transaction directly.
 * - `supportsKeyRotationWithoutModules`: In an existing Safe, attempt to
 *   replace an owner key using only the wallet's native UI (no extra
 *   modules). Check whether the wallet generates the `swapOwner` transaction
 *   directly.
 * - `supportedConfigs.owners`: Try connecting the wallet to Safes with 1,
 *   2, and many owners and note the limits.
 */
export interface AccountTypeSafe extends AccountTypeMutableMultifactor {
	/** Can the wallet deploy new Safe contracts? */
	canDeployNew: boolean

	/** Does the wallet support adding or removing signers without additional modules? */
	supportsAddingOrRemovingSigners: boolean

	/** Does the wallet support key rotation without additional modules? */
	supportsKeyRotationWithoutModules: boolean

	/**
	 * Range of signers (owners) the wallet can work with.
	 * - SINGLE_SIGNER: only single-owner Safes are supported.
	 * - ANY_NUMBER_OF_SIGNERS: no practical upper limit on owners.
	 */
	supportedOwners: 'SINGLE_SIGNER' | 'ANY_NUMBER_OF_SIGNERS'
}

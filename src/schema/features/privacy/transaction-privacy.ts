import type { Entity } from '@/schema/entity'
import type { WithRef } from '@/schema/reference'

import type { Support, Supported } from '../support'
import type { MultiAddressHandling, MultiAddressPolicy } from './data-collection'

export enum PrivateTransferTechnology {
	STEALTH_ADDRESSES = 'stealthAddresses',
	TORNADO_CASH_NOVA = 'tornadoCashNova',
}

/** Type predicate for `PrivateTransferTechnology`. */
export function isPrivateTransferTechnology(obj: unknown): obj is PrivateTransferTechnology {
	if (typeof obj !== 'string') {
		return false
	}

	switch (obj) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- Safe because this is exactly what we are trying to establish
		case PrivateTransferTechnology.STEALTH_ADDRESSES:
			return true
		// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- Safe because this is exactly what we are trying to establish
		case PrivateTransferTechnology.TORNADO_CASH_NOVA:
			return true
		default:
			return false
	}
}

export type FungibleTokenTransferMode =
	/**
	 * The wallet has no default token transfer mode; the user must make an
	 * explicit selection of which transfer mode to use.
	 */
	| 'EXPLICIT_CHOICE'

	/**
	 * Tokens are sent in a public token transaction,
	 * revealing both sender and recipient.
	 */
	| 'PUBLIC'

	/**
	 * Tokens are sent using a specific private transfer technology.
	 */
	| PrivateTransferTechnology

type IfDefaultTransferMode<T extends PrivateTransferTechnology, IfDefault> =
	| ({
			defaultFungibleTokenTransferMode: T
	  } & IfDefault)
	| {
			defaultFungibleTokenTransferMode: Exclude<FungibleTokenTransferMode, T>
	  }

/**
 * Support for various types of transactional privacy.
 */
export type TransactionPrivacy = {
	/**
	 * When sending Ether or ERC-20, which transfer mode is the default?
	 * If the wallet uses a different mode for transfers of Ether vs ERC-20
	 * tokens, this field should be set to the least private of the two.
	 */
	defaultFungibleTokenTransferMode: FungibleTokenTransferMode

	/** Support for stealth addresses. */
	[PrivateTransferTechnology.STEALTH_ADDRESSES]: Support<StealthAddressSupport>

	/** Support for Tornado Cash Nova. */
	[PrivateTransferTechnology.TORNADO_CASH_NOVA]: Support<TornadoCashNovaSupport>

	// TODO: Add other forms of transaction privacy here,
	// e.g. Privacy Pools, Railgun, etc.
} & IfDefaultTransferMode<
	PrivateTransferTechnology.STEALTH_ADDRESSES,
	{
		[PrivateTransferTechnology.STEALTH_ADDRESSES]: Supported<StealthAddressSupport>
	}
> &
	IfDefaultTransferMode<
		PrivateTransferTechnology.TORNADO_CASH_NOVA,
		{
			[PrivateTransferTechnology.TORNADO_CASH_NOVA]: Supported<TornadoCashNovaSupport>
		}
	>

/** Support for ERC-5564 stealth addresses. */
export interface StealthAddressSupport {
	/**
	 * When sending funds to a stealth meta-address, how is the resolution of
	 * that stealth meta-address to a specific stealth address done?
	 * (ERC-5564: `generateStealthAddress`)
	 */
	recipientAddressResolution: WithRef<
		| {
				/**
				 * Resolution is done exclusively with the default chain provider,
				 * inheriting its privacy properties (or lack thereof).
				 */
				type: 'DEFAULT_CHAIN_PROVIDER'
		  }
		| {
				/**
				 * Resolution is done exclusively with a specific third-party provider.
				 */
				type: 'THIRD_PARTY_RESOLVER'

				/** The third party that does the resolution. */
				thirdParty: Entity

				/** What does this third party learn? */
				learns: {
					senderIpAddress: boolean
					senderMetaAddress: boolean
					recipientMetaAddress: boolean
					recipientGeneratedStealthAddress: boolean
				}
		  }
	>

	/**
	 * When a user wants to look at the funds they own across their stealth
	 * addresses, how is this lookup done?
	 */
	balanceLookup: WithRef<
		| {
				/**
				 * Resolution is done exclusively with the default chain provider,
				 * inheriting its privacy properties (or lack thereof).
				 */
				type: 'DEFAULT_CHAIN_PROVIDER'

				/**
				 * How requests for multiple stealth addresses are handled.
				 * Cannot be "ACTIVE_ADDRESS_ONLY" because stealth addresses mean
				 * there are inherently multiple effective active addresses.
				 */
				multiAddressHandling: Exclude<
					MultiAddressHandling,
					{ type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY }
				>
		  }
		| {
				type: 'THIRD_PARTY_SERVICE'

				/** The third party that does the balance lookup. */
				thirdParty: Entity

				/** What does this third party learn? */
				learns: {
					/** The user's stealth meta-address. */
					userMetaAddress: boolean

					/** The user's generated stealth addresses. */
					generatedStealthAddresses: boolean
				}
		  }
	>

	/**
	 * When needing to spend funds from stealth addresses, how does the owner
	 * derive the private key for each stealth address?
	 * (ERC-5564: `computeStealthKey`)
	 */
	privateKeyDerivation: WithRef<
		| {
				/** The wallet calls `computeStealthKey` with the chain RPC provider. */
				type: 'DEFAULT_CHAIN_PROVIDER'
		  }
		| {
				/** A third-party service provides private key data to the wallet. */
				type: 'THIRD_PARTY_SERVICE'

				/** The third party that provides this. */
				thirdParty: Entity
		  }
		| {
				/** Private key derivation is done locally. */
				type: 'LOCALLY'
		  }
	>

	/**
	 * Can the user label their stealth addresses into distinct buckets, such
	 * that two addresses from different buckets may never appear in the same
	 * transaction?
	 */
	userLabeling: Support<
		WithRef<{
			/**
			 * When funds are received to a new unlabeled address, and the user
			 * attempts to spend from it, what happens?
			 */
			unlabeledBehavior: StealthAddressUnlabeledBehavior
		}>
	>
}

/**
 * When funds are received to a new unlabeled address, and the user
 * attempts to spend from it, what happens?
 */
export enum StealthAddressUnlabeledBehavior {
	/** All unlabeled addresses are treated as a single bucket to spend from. */
	TREAT_ALL_UNLABELED_AS_SINGLE_BUCKET = 'TREAT_ALL_UNLABELED_AS_SINGLE_BUCKET',

	/** Each unlabeled address is treated as its own bucket. */
	TREAT_EACH_UNLABELED_AS_OWN_BUCKET = 'TREAT_EACH_UNLABELED_AS_OWN_BUCKET',

	/** Users cannot spend from unlabeled addresses; must label them first. */
	MUST_LABEL_BEFORE_SPENDING = 'MUST_LABEL_BEFORE_SPENDING',
}

/**
 * Support data for Tornado Cash Nova.
 */
export type TornadoCashNovaSupport = WithRef<
	{
		/**
		 * Does the wallet support in-pool transfers (no withdrawal needed)?
		 */
		novaInternalTransfers: Support

		/**
		 * Does the wallet warn when doing multiple Tornado Cash Nova operations
		 * in quick succession, potentially leading to time-based correlation?
		 */
		warnAboutSuccessiveOperations: Support

		/**
		 * When scanning for a user's UTXOs, are they filtered entirely by the
		 * wallet on the client side, or are they filtered by an external service?
		 */
		utxoFiltering: 'WALLET_SIDE' | 'EXTERNAL'

		/**
		 * Is the fee taken by the relayer displayed in the UI?
		 */
		relayerFee: 'SHOWN_BY_DEFAULT' | 'HIDDEN_BY_DEFAULT' | 'NOT_IN_UI'
	} & (
		| {
				/**
				 * The wallet integrates with Tornado Cash Nova directly.
				 * Requests that require a relayer go through the relayer directly.
				 */
				integrationType: 'DIRECT'

				/**
				 * Can the relayer endpoint be customized?
				 */
				customizableRelayer: Support

				/**
				 * Can the relayer learn the user's IP address?
				 */
				relayerLearnsUserIpAddress: boolean
		  }
		| {
				/**
				 * The wallet integrates with Tornado Cash Nova by going through some
				 * central service that is the one actually interacting with Tornado Cash.
				 */
				integrationType: 'THROUGH_ENTITY'

				/**
				 * The entity doing the interaction with Tornado Cash Nova.
				 */
				entity: Entity

				/**
				 * Does the entity learn the user's UTXOs?
				 */
				entityLearnsUserUtxos: boolean

				/**
				 * Does the entity learn the user's IP address?
				 */
				entityLearnsUserIpAddress: boolean
		  }
	)
>

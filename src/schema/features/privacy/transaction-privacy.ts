import type { Entity } from '@/schema/entity'
import type { WithRef } from '@/schema/reference'
import { Enum } from '@/utils/enum'

import type { NotSupported, Support, Supported } from '../support'
import type { FeeDisplay } from '../transparency/fee-display'
import type { MultiAddressHandling, MultiAddressPolicy } from './data-collection'

export enum PrivateTransferTechnology {
	STEALTH_ADDRESSES = 'stealthAddresses',
	TORNADO_CASH_NOVA = 'tornadoCashNova',
	PRIVACY_POOLS = 'privacyPools',
	RAILGUN = 'railgun',
}

export const privateTransferTechnology = new Enum<PrivateTransferTechnology>({
	[PrivateTransferTechnology.STEALTH_ADDRESSES]: true,
	[PrivateTransferTechnology.TORNADO_CASH_NOVA]: true,
	[PrivateTransferTechnology.PRIVACY_POOLS]: true,
	[PrivateTransferTechnology.RAILGUN]: true,
})

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

	/** Support for Privacy Pools. */
	[PrivateTransferTechnology.PRIVACY_POOLS]: Support<PrivacyPoolsSupport>

	/** Support for Railgun. */
	[PrivateTransferTechnology.RAILGUN]: Support<RailgunSupport>
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
	> &
	IfDefaultTransferMode<
		PrivateTransferTechnology.PRIVACY_POOLS,
		{
			[PrivateTransferTechnology.PRIVACY_POOLS]: Supported<PrivacyPoolsSupport>
		}
	> &
	IfDefaultTransferMode<
		PrivateTransferTechnology.RAILGUN,
		{
			[PrivateTransferTechnology.RAILGUN]: Supported<RailgunSupport>
		}
	>

/** Support for ERC-5564 stealth addresses. */
export type StealthAddressSupport = WithRef<{
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
				 * Resolution is done exclusively with a specific external provider.
				 */
				type: 'EXTERNAL_RESOLVER'

				/** The external resolver that does the resolution. */
				externalResolver: Entity

				/** What does this external resolver learn? */
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
				type: 'EXTERNAL_SERVICE'

				/** The external service that does the balance lookup. */
				externalService: Entity

				/** What does this external service learn? */
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
				/** An external service provides private key data to the wallet. */
				type: 'EXTERNAL_SERVICE'

				/** The external service that provides this. */
				externalService: Entity
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

	/** When sending transactions, how are fees displayed? */
	fees: FeeDisplay
}>

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
		 * When scanning for a user's UTXOs, are they filtered entirely on the
		 * user's device, or are they filtered by an external service?
		 */
		utxoFiltering: 'ON_USER_DEVICE' | 'EXTERNAL'

		/**
		 * Is the fee taken by the relayer displayed in the UI?
		 */
		relayerFee: FeeDisplay
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

type PrivacyPoolsWithdrawalWithRelayer = {
	/** Who is the default relayer? */
	defaultRelayer: Entity | 'NO_DEFAULT_RELAYER'

	/**
	 * Can the relayer endpoint be customized?
	 */
	customizableRelayer: Support

	/**
	 * Can the relayer learn the user's IP address?
	 */
	relayerLearnsUserIpAddress: boolean
} & ( // Either there is a default relayer...
	| { defaultRelayer: Entity }
	// Or customizable relayers must be supported.
	| { customizableRelayer: Supported }
)

interface PrivacyPoolsCapabilitiesBase {
	/**
	 * Does the wallet support the Ethereum mainnet pool for Ether?
	 */
	etherL1Pool: Support

	/**
	 * Does the wallet support the Ethereum mainnet pool for USDC?
	 */
	usdcL1Pool: Support

	/**
	 * Does the wallet support ragequitting?
	 * https://docs.privacypools.com/protocol/ragequit
	 */
	ragequit: Support

	/**
	 * Does the wallet support the ability to import deposit data
	 * that has been exported from other wallets?
	 */
	importDeposits: Support

	/**
	 * Does the wallet support withdrawals without a relayer?
	 */
	withdrawalWithRelayer: Support<PrivacyPoolsWithdrawalWithRelayer>

	/**
	 * Does the wallet support withdrawals without a relayer?
	 */
	withdrawalWithoutRelayer: Support

	/**
	 * Does the wallet warn when doing multiple Privacy Pools operations
	 * in quick succession, potentially leading to time-based correlation?
	 */
	warnAboutSuccessiveOperations: Support
}

type PrivacyPoolsCapabilities = PrivacyPoolsCapabilitiesBase &
	// At least Ether or USDC must be supported.
	({ etherL1Pool: Supported } | { usdcL1Pool: Supported }) &
	// At least one form of withdrawal must be supported.
	(
		| { withdrawalWithRelayer: Supported<PrivacyPoolsWithdrawalWithRelayer> }
		| { withdrawalWithoutRelayer: Supported }
	)

interface PrivacyPoolsDepositsDataCustodian {
	/** Who is the custodian? */
	custodian: Entity

	/**
	 * If stored with a custodian. is there any user flow where this
	 * custodian can learn the raw (decrypted) deposit data?
	 */
	custodianCanLearnDepositData: boolean

	/**
	 * If stored with a custodian, does the custodian learn the
	 * user's IP address?
	 */
	custodianCanLearnUserIpAddress: boolean
}

type PrivacyPoolsDepositData = {
	/** Can you export unencrypted deposit data out of the wallet? */
	exportable: Support
} & (
	| { type: 'LOCAL_ONLY' }
	| ({ type: 'CUSTODIAN_ONLY' } & PrivacyPoolsDepositsDataCustodian)
	| ({
			type: 'CUSTODIAN_OR_LOCAL'

			/**
			 * Does the user have to explicitly choose to use a custodian,
			 * or is a custodian used by default?
			 */
			useOfCustodian: 'BY_DEFAULT' | 'OPT_IN'

			/** Can you export unencrypted deposit data out of the wallet? */
			exportable: Support<{
				/**
				 * When exporting deposit data, does the wallet require
				 * information from the custodian before the export can be done?
				 */
				exportFunctionDependsOnCustodian: boolean
			}>
	  } & PrivacyPoolsDepositsDataCustodian)
)

/**
 * Support data for Privacy Pools.
 */
export type PrivacyPoolsSupport = WithRef<{
	/** What subset of the protocol does the wallet support? */
	capabilities: PrivacyPoolsCapabilities

	/**
	 * How is deposit data handled?
	 */
	depositData: PrivacyPoolsDepositData
}>

type BroadcasterBasedTransactionSubmissionData = {
	/**
	 * Can the broadcaster endpoint be customized?
	 */
	customizableBroadcaster: Support

	/**
	 * Can the broadcaster learn the user's IP address?
	 * Should be false if using Logos (previously Waku) for IP protection.
	 */
	broadcasterLearnsUserIpAddress: boolean

	/**
	 * Is the fee taken by broadcasters displayed in the UI?
	 */
	broadcasterFee: FeeDisplay
}

type RailgunTransactionSubmissionMethods =
	| {
			broadcasterBasedTransactionSubmission: Supported<BroadcasterBasedTransactionSubmissionData>
			selfRelayedTransactionSubmission: NotSupported
	  }
	| {
			broadcasterBasedTransactionSubmission: NotSupported
			selfRelayedTransactionSubmission: Supported
	  }
	| {
			broadcasterBasedTransactionSubmission: Supported<BroadcasterBasedTransactionSubmissionData>
			selfRelayedTransactionSubmission: Supported
			/**
			 * Which transaction submission method is used by default when both
			 * broadcaster and self-relay are available?
			 * Required when both broadcasterBasedTransactionSubmission and
			 * selfRelayedTransactionSubmission are supported.
			 */
			defaultTransactionSubmissionType: 'BROADCASTER' | 'SELF_RELAY'
	  }

/**
 * Support data for Railgun.
 */
export type RailgunSupport = WithRef<{
	/**
	 * Does the wallet support private transfers between Railgun wallets?
	 */
	privateTransfers: Support

	/**
	 * Does the wallet support cross-contract calls (private DeFi interactions)?
	 */
	crossContractCalls: Support

	/**
	 * Does the wallet warn when doing multiple Railgun operations
	 * in quick succession, potentially leading to time-based correlation?
	 */
	warnAboutSuccessiveOperations: Support

	/**
	 * Does the wallet warn users about correlation risks when shielding tokens?
	 * Shielding transactions are public onchain and can be analyzed to link
	 * a user's 0x address to their 0zk address through amount, timing, and token
	 * type correlation. Similar to how Privacy Pools tracks deposit correlation risks.
	 */
	warnAboutShieldingCorrelation: Support

	/**
	 * Does the wallet warn users when unshielding to addresses associated with
	 * their wallet? Unshielding to addresses that belong to the same wallet creates
	 * a correlation link between the user's 0zk and 0x addresses, compromising privacy.
	 */
	warnAboutUnshieldingDestinationCorrelation: Support

	/**
	 * Does the wallet warn users about the privacy risks of sharing viewing keys?
	 * Viewing keys are encoded in 0zk addresses and are irrevocable. Anyone with
	 * access to a viewing key can see all private interactions sent by that address
	 * permanently, even if the key is later shared or leaked.
	 */
	warnAboutViewingKeySharing: Support

	/**
	 * When scanning for received funds, is the Railgun UTXO merkle tree synced
	 * and decrypted entirely on the user's device, or is it synced
	 * by an external service? This matters for privacy: if syncing is done
	 * server-side, the external provider can learn about received funds even
	 * though the chain data itself doesn't reveal this information.
	 */
	merkleTreeSync: 'ON_USER_DEVICE' | 'EXTERNAL'

	/**
	 * Does the wallet support broadcaster-based transaction submission?
	 * Broadcasters are required for transactions FROM shielded addresses
	 * (private transfers, unshielding), but NOT for shielding (depositing into Railgun).
	 */
	broadcasterBasedTransactionSubmission: Support<BroadcasterBasedTransactionSubmissionData>

	/**
	 * Does the wallet support self-relayed transaction submission?
	 * Self-relay exposes IP address and should be avoided for privacy.
	 */
	selfRelayedTransactionSubmission: Support
}> &
	RailgunTransactionSubmissionMethods

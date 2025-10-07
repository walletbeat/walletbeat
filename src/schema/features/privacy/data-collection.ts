import type { MustRef, WithRef } from '@/schema/reference'
import type { NonEmptyArray, NonEmptyRecord } from '@/types/utils/non-empty'
import { Enum, mergeEnums } from '@/utils/enum'

import type { Entity } from '../../entity'

/**
 * An enum representing when data collection occurs.
 *
 * Values are comparable as integers; the closest to zero, the more privacy.
 */
export enum CollectionPolicy {
	/** The data is never collected. */
	NEVER = 0,

	/**
	 * The wallet does not collect this data by default.
	 * The user may decide to enable to this, but this requires explicit user
	 * intent to do this.
	 */
	OPT_IN = 1,

	/**
	 * The wallet does not collect this data by default. However, the
	 * wallet will at some point (e.g. during wallet setup) actively ask the
	 * user whether or not they want to enable this data collection, without
	 * explicit user intent to look for this setting.
	 */
	PROMPTED = 2,

	/**
	 * The data is collected by default, but the user may turn this off by
	 * configuring the wallet appropriately. Doing so requires explicit
	 * user intent and knowledge that there is an option to do this in the
	 * first place.
	 * In order to qualify for this level, it must be possible for the
	 * user to access this setting and turn off the collection *before*
	 * the first time it happens. For example, a wallet that refreshes
	 * crypto prices by default (using a third-party service) and does so
	 * before ever giving the user a chance to access the wallet settings
	 * to turn off this feature does not qualify for this level.
	 */
	BY_DEFAULT = 3,

	/**
	 * The data is always collected no matter what the user does.
	 */
	ALWAYS = 4,
}

/**
 * How a wallet approaches fetching data for multiple addresses.
 */
export enum MultiAddressPolicy {
	/**
	 * If the wallet only handles one active account
	 * at a time, and never fetches data about other accounts unless the
	 * user actively decides to switch account. In this scenario, the
	 * wallet may support multiple addresses, but from a network
	 * correlation perspective, these multiple addresses are not
	 * correlatable on a timing basis.
	 *
	 * NOTE 1: Wallets that support multiple accounts often have an
	 * "account switcher" view which may refresh all addresses' balance
	 * at the same time. If so, this counts as SIMULTANEOUS, since the
	 * N requests happen simultaneously when the user opens this switcher.
	 *
	 * NOTE 2: Wallets using stealth addresses need to handle multiple addresses
	 * even for a single logical user account. For such wallets, the concept of
	 * "active address" does not make sense, since accounts are abstracted from
	 * addresses, and it is critical for such wallets to not allow correlation
	 * of the multiple addresses that belong to the same account or user.
	 */
	ACTIVE_ADDRESS_ONLY = 'ACTIVE_ADDRESS_ONLY',

	/**
	 * If the wallet supports multiple addresses and fetches data for all of
	 * them in the same request (bearing all the addresses within).
	 */
	SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES = 'SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES',

	/**
	 * If the wallet supports multiple addresses and fetches data for all of
	 * them in separate requests (one per address).
	 */
	SEPARATE_REQUEST_PER_ADDRESS = 'SEPARATE_REQUEST_PER_ADDRESS',
}

/**
 * How the wallet handles refreshing data for multiple addresses.
 * This can either be by sending a single request containing all addresses at
 * once, or multiple requests (one per address).
 * Wallets typically need data about multiple addresses at once in the context
 * of refreshing balances, or handling a set of stealth addresses. In either
 * case, there is a risk of allowing third-parties to correlate these
 * addresses together if the requests are not done carefully.
 *
 * If sending multiple requests, the wallet has additional control over how to
 * proxy connections or whether to stagger requests in order to reduce
 * correlatability of the addresses.
 *
 * If the wallet has configuration settings related to this, the setting it
 * should be judged by is the one that applies by default once a second
 * address is added.
 */
export type MultiAddressHandling =
	| {
			/** How the wallet handles refreshing data for multiple addresses. */
			type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY
	  }
	| {
			/** How the wallet handles refreshing data for multiple addresses. */
			type: MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES
	  }
	| {
			/** How the wallet handles refreshing data for multiple addresses. */
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS

			/**
			 * Diversity of endpoints on the receiving end of the requests.
			 * Is it always the same set of endpoints for all addresses, or is there
			 * a pool of multiple endpoints such that each address is only mapped to
			 * one of them?
			 */
			destination: 'SAME_FOR_ALL' | 'ISOLATED'

			/**
			 * How individual requests are proxied: separate circuits (such that they
			 * are perceived as coming from different IPs on the destination endpoint),
			 * same circuit (same IP perceived on the destination endpoint), or not
			 * proxied at all?
			 */
			proxy: 'NONE' | 'SAME_CIRCUIT' | 'SEPARATE_CIRCUITS'

			/**
			 * Whether individual requests are staggered across time to reduce the
			 * ease of correlating them by the destination endpoint.
			 *
			 * - SIMULTANEOUS: If the wallet makes N simultaneous requests for N
			 *   addresses at the same time.
			 * - STAGGERED: If the wallet staggers N requests for N addresses
			 *   over a period of time (e.g. by waiting a minute between each
			 *   request).
			 */
			timing: 'SIMULTANEOUS' | 'STAGGERED'
	  }

/**
 * Represents a regular (non-enclave) server endpoint.
 */
export const RegularEndpoint = {
	/**
	 * The endpoint is a regular server.
	 * The entity can see all traffic going in/out of it.
	 */
	type: 'REGULAR',
} as const

/**
 * The environment in which the server endpoint is running.
 * A server can either be running as a regular server (`RegularEndpoint`),
 * or in a secure enclave which potentially gives it more privacy properties.
 */
export type Endpoint =
	| typeof RegularEndpoint
	| {
			/**
			 * The server is running in a secure enclave.
			 */
			type: 'SECURE_ENCLAVE'

			/**
			 * Whether the software running within the enclave is verifiable
			 * by the client.
			 */
			verifiability: WithRef<{
				/**
				 * Whether the source code of the server software is available.
				 */
				sourceAvailable: boolean

				/**
				 * Whether the source code of the server software can be reproducibly
				 * built.
				 */
				reproducibleBuilds: boolean

				/**
				 * How the client verifies that the endpoint is running in a secure enclave.
				 */
				clientVerification:
					| {
							/** The client does not do any verification. */
							type: 'NOT_VERIFIED'
					  }
					| {
							/**
							 * The client claims to verify but has not made the source code that
							 * does this available.
							 */
							type: 'VERIFIED_BUT_NO_SOURCE_AVAILABLE'
					  }
					| MustRef<{
							/**
							 * The client verifies this. Must also come with a code reference.
							 */
							type: 'VERIFIED'
					  }>
			}>

			/**
			 * Whether the endpoint running in a secure enclave logs anything
			 * outside of the enclave, thereby removing the privacy advantage
			 * of enclaves.
			 */
			externalLogging:
				| {
						/**
						 * It is not known whether the software running within the enclave
						 * logs any data externally.
						 */
						type: 'UNKNOWN'
				  }
				| {
						/**
						 * This server software is known to log data externally to the
						 * enclave.
						 */
						type: 'YES'
				  }
				| {
						/**
						 * This server software does not log data externally to the
						 * enclave.
						 */
						type: 'NO'
				  }

			/**
			 * Info about the use of end-to-end encryption to the endpoint.
			 * In most cases, this means where does the TLS handshake happens?
			 * If this does not happen within the enclave (such as if terminated
			 * at the load balancer level), then the connection is susceptible to
			 * be man-in-the-middle'd.
			 */
			endToEndEncryption:
				| {
						/** No end-to-end encryption (really? in this day and age?) */
						type: 'NONE'
				  }
				| {
						/**
						 * End-to-end encryption terminated outside of the enclave,
						 * for example at the load balancer level.
						 */
						type: 'TERMINATED_OUT_OF_ENCLAVE'
				  }
				| {
						/** End-to-end encryption terminated inside the enclave. */
						type: 'TERMINATED_INSIDE_ENCLAVE'
				  }
	  }

/** Returns whether an endpoint gets to learn the user's IP address */
export function endpointLearnsUserIpAddress(endpoint: Endpoint): 'YES' | 'NO' | 'UNVERIFIABLE' {
	switch (endpoint.type) {
		case 'REGULAR':
			return 'YES'
		case 'SECURE_ENCLAVE':
			switch (endpoint.externalLogging.type) {
				case 'UNKNOWN':
					return 'YES' // Assume the worst; most web servers will log IPs even in default configuration.
				case 'YES':
					return 'YES'
				case 'NO':
					switch (endpoint.endToEndEncryption.type) {
						case 'NONE':
							return 'UNVERIFIABLE'
						case 'TERMINATED_OUT_OF_ENCLAVE':
							return 'UNVERIFIABLE'
						case 'TERMINATED_INSIDE_ENCLAVE':
							if (
								!endpoint.verifiability.sourceAvailable ||
								!endpoint.verifiability.reproducibleBuilds
							) {
								// Server can be running anything, so all bets are off.
								return 'UNVERIFIABLE'
							}

							switch (endpoint.verifiability.clientVerification.type) {
								case 'NOT_VERIFIED':
									return 'UNVERIFIABLE'
								case 'VERIFIED_BUT_NO_SOURCE_AVAILABLE':
									return 'UNVERIFIABLE'
								case 'VERIFIED':
									return 'NO'
							}
					}
			}
	}
}

/**
 * @returns If the data collection happens by default for the given collection policy.
 */
export function collectedByDefault(collectionPolicy: CollectionPolicy): boolean {
	return collectionPolicy >= CollectionPolicy.BY_DEFAULT
}

/** Personal information types. */
export enum PersonalInfo {
	/** The user's IP address. */
	IP_ADDRESS = 'ipAddress',

	/** The user's selected pseudonym. */
	PSEUDONYM = 'pseudonym',

	/** The user's legal name. */
	LEGAL_NAME = 'legalName',

	/** The user's email. */
	EMAIL = 'email',

	/** The user's phone number. */
	PHONE = 'phone',

	/** URLs the user visits. */
	BROWSING_HISTORY_URLS = 'browsingHistoryUrls',

	/**
	 * The user's contacts (e.g. when searching for friends to invite).
	 */
	CONTACTS = 'contacts',

	/** The user's physical address. */
	PHYSICAL_ADDRESS = 'physicalAddress',

	/** The user's face (e.g. KYC selfie). */
	FACE = 'face',

	/** The user's CEX account(s). */
	CEX_ACCOUNT = 'cexAccount',

	/** The user's government-issued ID. */
	GOVERNMENT_ID = 'governmentId',

	/** The user's X.com account. */
	X_DOT_COM_ACCOUNT = 'xDotComAccount',

	/** The user's Farcaster account. */
	FARCASTER_ACCOUNT = 'farcasterAccount',
}

export const personalInfo = new Enum<PersonalInfo>({
	[PersonalInfo.IP_ADDRESS]: true,
	[PersonalInfo.PSEUDONYM]: true,
	[PersonalInfo.LEGAL_NAME]: true,
	[PersonalInfo.EMAIL]: true,
	[PersonalInfo.PHONE]: true,
	[PersonalInfo.BROWSING_HISTORY_URLS]: true,
	[PersonalInfo.CONTACTS]: true,
	[PersonalInfo.PHYSICAL_ADDRESS]: true,
	[PersonalInfo.FACE]: true,
	[PersonalInfo.CEX_ACCOUNT]: true,
	[PersonalInfo.GOVERNMENT_ID]: true,
	[PersonalInfo.X_DOT_COM_ACCOUNT]: true,
	[PersonalInfo.FARCASTER_ACCOUNT]: true,
})

/** Wallet-related information types. */
export enum WalletInfo {
	/** The user's wallet actions (clicks etc). */
	USER_ACTIONS = 'userActions',

	/** The user's account address. */
	ACCOUNT_ADDRESS = 'accountAddress',

	/**
	 * The user's wallet balance.
	 * This can easily be turned back into an address, because most
	 * addresses' balance amount is unique.
	 */
	BALANCE = 'balance',

	/**
	 * The set of assets that are in the wallet.
	 * On wallets with many NFTs, this can be used to uniquely identify the
	 * wallet.
	 */
	ASSETS = 'assets',

	/**
	 * The user's wallet transactions before they are included onchain.
	 * For example, MEV protection services usually fall under this category.
	 */
	MEMPOOL_TRANSACTIONS = 'mempoolTransactions',

	/** Domain names the wallet is connected to. */
	WALLET_CONNECTED_DOMAINS = 'walletConnectedDomains',
}

export const walletInfo = new Enum<WalletInfo>({
	[WalletInfo.USER_ACTIONS]: true,
	[WalletInfo.ACCOUNT_ADDRESS]: true,
	[WalletInfo.BALANCE]: true,
	[WalletInfo.ASSETS]: true,
	[WalletInfo.MEMPOOL_TRANSACTIONS]: true,
	[WalletInfo.WALLET_CONNECTED_DOMAINS]: true,
})

export type UserInfo = PersonalInfo | WalletInfo

export const userInfoEnums: Enum<UserInfo> = mergeEnums<PersonalInfo, WalletInfo>(
	personalInfo,
	walletInfo,
)

/**
 * Rough ordering score for comparing UserInfo.
 * Higher score means the data is more sensitive.
 */
function userInfoScore(userInfo: UserInfo): number {
	switch (userInfo) {
		case PersonalInfo.IP_ADDRESS:
			return 0
		case WalletInfo.USER_ACTIONS:
			return 1
		case WalletInfo.ASSETS:
			return 2
		case WalletInfo.BALANCE:
			return 3
		case WalletInfo.ACCOUNT_ADDRESS:
			return 4
		case WalletInfo.MEMPOOL_TRANSACTIONS:
			return 5
		case WalletInfo.WALLET_CONNECTED_DOMAINS:
			return 5
		case PersonalInfo.PSEUDONYM:
			return 6

		// All the social-media-y entries are roughly the same as email.
		case PersonalInfo.FARCASTER_ACCOUNT:
			return 7
		case PersonalInfo.X_DOT_COM_ACCOUNT:
			return 7
		case PersonalInfo.EMAIL:
			return 7

		case PersonalInfo.BROWSING_HISTORY_URLS:
			return 8
		case PersonalInfo.LEGAL_NAME:
			return 9
		case PersonalInfo.PHONE:
			return 10
		case PersonalInfo.CONTACTS:
			return 11
		case PersonalInfo.PHYSICAL_ADDRESS:
			return 12
		case PersonalInfo.CEX_ACCOUNT:
			return 13
		case PersonalInfo.FACE:
			return 14
		case PersonalInfo.GOVERNMENT_ID:
			return 15
	}
}

/** The type of information that a UserInfo is about. */
export enum UserInfoType {
	/** Data related to the user's wallet. */
	WALLET_RELATED = 'walletRelated',

	/** Data related to the user themselves. */
	PERSONAL_DATA = 'personalData',
}

/** Get the type of information that a UserInfo is about. */
export function userInfoType(userInfo: UserInfo): UserInfoType {
	switch (userInfo) {
		case PersonalInfo.IP_ADDRESS:
			return UserInfoType.PERSONAL_DATA
		case WalletInfo.USER_ACTIONS:
			return UserInfoType.WALLET_RELATED
		case WalletInfo.ASSETS:
			return UserInfoType.WALLET_RELATED
		case WalletInfo.BALANCE:
			return UserInfoType.WALLET_RELATED
		case WalletInfo.ACCOUNT_ADDRESS:
			return UserInfoType.WALLET_RELATED
		case WalletInfo.MEMPOOL_TRANSACTIONS:
			return UserInfoType.WALLET_RELATED
		case WalletInfo.WALLET_CONNECTED_DOMAINS:
			return UserInfoType.WALLET_RELATED
		case PersonalInfo.PSEUDONYM:
			return UserInfoType.PERSONAL_DATA
		case PersonalInfo.FARCASTER_ACCOUNT:
			return UserInfoType.PERSONAL_DATA
		case PersonalInfo.X_DOT_COM_ACCOUNT:
			return UserInfoType.PERSONAL_DATA
		case PersonalInfo.EMAIL:
			return UserInfoType.PERSONAL_DATA
		case PersonalInfo.LEGAL_NAME:
			return UserInfoType.PERSONAL_DATA
		case PersonalInfo.PHONE:
			return UserInfoType.PERSONAL_DATA
		case PersonalInfo.BROWSING_HISTORY_URLS:
			return UserInfoType.PERSONAL_DATA
		case PersonalInfo.CONTACTS:
			return UserInfoType.PERSONAL_DATA
		case PersonalInfo.PHYSICAL_ADDRESS:
			return UserInfoType.PERSONAL_DATA
		case PersonalInfo.CEX_ACCOUNT:
			return UserInfoType.PERSONAL_DATA
		case PersonalInfo.FACE:
			return UserInfoType.PERSONAL_DATA
		case PersonalInfo.GOVERNMENT_ID:
			return UserInfoType.PERSONAL_DATA
	}
}

/** Compare two UserInfo scores (higher score is more sensitive). */
export function compareUserInfo(a: UserInfo, b: UserInfo): number {
	return userInfoScore(a) - userInfoScore(b)
}

/** Human-friendly names to refer to the type of info being collection. */
export function userInfoName(userInfo: UserInfo) {
	switch (userInfo) {
		case PersonalInfo.IP_ADDRESS:
			return { short: 'IP', long: 'IP address' } as const
		case WalletInfo.USER_ACTIONS:
			return { short: 'wallet actions', long: 'wallet actions' } as const
		case WalletInfo.ASSETS:
			return { short: 'wallet assets', long: 'wallet asset types' } as const
		case WalletInfo.BALANCE:
			return { short: 'wallet balance', long: 'wallet assets and balances' } as const
		case WalletInfo.ACCOUNT_ADDRESS:
			return { short: 'wallet address', long: 'wallet address' } as const
		case WalletInfo.MEMPOOL_TRANSACTIONS:
			return { short: 'outgoing transactions', long: 'outgoing wallet transactions' } as const
		case WalletInfo.WALLET_CONNECTED_DOMAINS:
			return { short: 'connected sites', long: 'wallet-connected domains' } as const
		case PersonalInfo.PSEUDONYM:
			return {
				short: '{{WALLET_PSEUDONYM_SINGULAR}}',
				long: '{{WALLET_PSEUDONYM_SINGULAR}}',
			} as const
		case PersonalInfo.FARCASTER_ACCOUNT:
			return { short: 'Farcaster account', long: 'Farcaster account' } as const
		case PersonalInfo.X_DOT_COM_ACCOUNT:
			return { short: 'X.com account', long: 'X.com account' } as const
		case PersonalInfo.EMAIL:
			return { short: 'email', long: 'email address' } as const
		case PersonalInfo.LEGAL_NAME:
			return { short: 'name', long: 'legal name' } as const
		case PersonalInfo.PHONE:
			return { short: 'phone', long: 'phone number' } as const
		case PersonalInfo.BROWSING_HISTORY_URLS:
			return { short: 'Browsing history', long: 'Browsing history' } as const
		case PersonalInfo.CONTACTS:
			return { short: 'contacts', long: 'personal contact list' } as const
		case PersonalInfo.PHYSICAL_ADDRESS:
			return { short: 'physical address', long: 'geographical address' } as const
		case PersonalInfo.CEX_ACCOUNT:
			return { short: 'CEX account', long: 'centralized exchange account' } as const
		case PersonalInfo.FACE:
			return { short: 'face', long: 'facial recognition data' } as const
		case PersonalInfo.GOVERNMENT_ID:
			return { short: 'government ID', long: 'government-issued ID' } as const
	}
}

/** The UX flow within a wallet. */
export enum UserFlow {
	/** Any flow that is unclassified or unclear. */
	UNCLASSIFIED = 'unclassified',

	/** Onboard onto the wallet, either as a new user or importing an existing account. */
	ONBOARDING = 'onboarding',

	/** Sending tokens to another address. */
	SEND = 'send',

	/** Swapping tokens through a wallet's built-in swap feature. */
	NATIVE_SWAP = 'nativeSwap',

	/** Review a transaction and signing it. */
	TRANSACTION = 'transaction',

	/** Connecting to a dapp. */
	DAPP_CONNECTION = 'dappConnection',
}

export const userFlow = new Enum<UserFlow>({
	[UserFlow.UNCLASSIFIED]: true,
	[UserFlow.ONBOARDING]: true,
	[UserFlow.DAPP_CONNECTION]: true,
	[UserFlow.SEND]: true,
	[UserFlow.NATIVE_SWAP]: true,
	[UserFlow.TRANSACTION]: true,
})

/** Why is data being collected? */
export enum DataCollectionPurpose {
	/** Checking for updates to the wallet. */
	UPDATE_CHECKING = 'UPDATE_CHECKING',

	/** Looking up chain data (read only). */
	CHAIN_DATA_LOOKUP = 'CHAIN_DATA_LOOKUP',

	/** Broadcasting transactions for inclusion. */
	TRANSACTION_BROADCAST = 'TRANSACTION_BROADCAST',

	/** Simulating transaction outcome. */
	TRANSACTION_SIMULATION = 'TRANSACTION_SIMULATION',

	/** Getting a quote for a swap operation. */
	SWAP_QUOTE = 'SWAP_QUOTE',

	/** Checking for scams. */
	SCAM_DETECTION = 'SCAM_DETECTION',

	/** Signing up for a wallet-related account. */
	ACCOUNT_SIGNUP = 'ACCOUNT_SIGNUP',

	/** Linking to an external (non-wallet-related) account, e.g. CEX account. */
	EXTERNAL_ACCOUNT_LINKING = 'EXTERNAL_ACCOUNT_LINKING',

	/** Looking up asset metadata (price, icon, ticker, NFT data). */
	ASSET_METADATA = 'ASSET_METADATA',

	/** Verifying the wallet user's identity. */
	IDENTITY_VERIFICATION = 'IDENTITY_VERIFICATION',

	/** Downloading static assets (images, CSS). */
	STATIC_ASSETS = 'STATIC_ASSETS',

	/** Wallet user analytics. */
	ANALYTICS = 'ANALYTICS',
}

export const dataCollectionPurpose = new Enum<DataCollectionPurpose>({
	[DataCollectionPurpose.SWAP_QUOTE]: true,
	[DataCollectionPurpose.EXTERNAL_ACCOUNT_LINKING]: true,
	[DataCollectionPurpose.TRANSACTION_SIMULATION]: true,
	[DataCollectionPurpose.CHAIN_DATA_LOOKUP]: true,
	[DataCollectionPurpose.TRANSACTION_BROADCAST]: true,
	[DataCollectionPurpose.SCAM_DETECTION]: true,
	[DataCollectionPurpose.UPDATE_CHECKING]: true,
	[DataCollectionPurpose.ACCOUNT_SIGNUP]: true,
	[DataCollectionPurpose.ASSET_METADATA]: true,
	[DataCollectionPurpose.IDENTITY_VERIFICATION]: true,
	[DataCollectionPurpose.STATIC_ASSETS]: true,
	[DataCollectionPurpose.ANALYTICS]: true,
})

/** Human-friendly name for a data collection purpose. */
export function dataCollectionPurposeToText(dataCollectionPurpose: DataCollectionPurpose): string {
	switch (dataCollectionPurpose) {
		case DataCollectionPurpose.EXTERNAL_ACCOUNT_LINKING:
			return 'External account linking'
		case DataCollectionPurpose.ACCOUNT_SIGNUP:
			return 'Signup'
		case DataCollectionPurpose.ANALYTICS:
			return 'Analytics'
		case DataCollectionPurpose.ASSET_METADATA:
			return 'Asset metadata'
		case DataCollectionPurpose.CHAIN_DATA_LOOKUP:
			return 'Chain data access'
		case DataCollectionPurpose.IDENTITY_VERIFICATION:
			return 'Identity verification'
		case DataCollectionPurpose.SCAM_DETECTION:
			return 'Scam detection'
		case DataCollectionPurpose.STATIC_ASSETS:
			return 'Static assets'
		case DataCollectionPurpose.SWAP_QUOTE:
			return 'Swap quote'
		case DataCollectionPurpose.TRANSACTION_BROADCAST:
			return 'Transaction broadcasting'
		case DataCollectionPurpose.TRANSACTION_SIMULATION:
			return 'Transaction simulation'
		case DataCollectionPurpose.UPDATE_CHECKING:
			return 'Checking for updates'
	}
}

/** What data is collection by an entity; must have at least one piece of user information. */
export type Collection<T extends UserInfo> = NonEmptyRecord<T, CollectionPolicy> & {
	/**
	 * How multiple addresses are handled, if at all.
	 */
	multiAddress?: MultiAddressHandling
}

/** A partially-known set of personal info collected, with reference information. */
export type PersonalInfoCollection = Collection<PersonalInfo>

/** Adds endpoint information to a given type. */
type WithEndpoint<L> = L & {
	/**
	 * Information about the endpoint that receives this data.
	 */
	endpoint: Endpoint
}

/** A partially-known set of collected info, with reference information. */
export type EndpointCollection = WithEndpoint<Collection<UserInfo>>

/** Type predicate for WithEndpoint<L>. */
export function isWithEndpoint<T extends UserInfo>(
	maybeEndpoint: Collection<T>,
): maybeEndpoint is WithEndpoint<Collection<T>> {
	return Object.hasOwn(maybeEndpoint, 'endpoint')
}

/** What data is collected by an entity; fully qualified. */
export type QualifiedDataCollection = WithRef<
	Record<UserInfo, CollectionPolicy> & {
		/**
		 * How multiple addresses are handled, if at all.
		 */
		multiAddress?: MultiAddressHandling
	}
>

/**
 * Infer what info is derivable from a given partial set of known collected information.
 * @param userInfo Partial set of known info collected.
 * @returns A fully-qualified set of info collected.
 */
export function qualifiedDataCollection<T extends UserInfo>(
	userInfo: Collection<T>,
): QualifiedDataCollection {
	const get = (info: UserInfo): CollectionPolicy | undefined => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because L is guaranteed to be non-empty.
		return (userInfo as NonEmptyRecord<UserInfo, CollectionPolicy>)[info]
	}
	const first = (...ls: Array<CollectionPolicy | undefined>): CollectionPolicy | undefined =>
		ls.find(l => l !== undefined)

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know userInfo extends Collection<T> and T extends UserInfo.
	const userInfoAsCollection = userInfo as Collection<UserInfo>

	let ipAddressCollection = get(PersonalInfo.IP_ADDRESS)

	if (
		ipAddressCollection !== CollectionPolicy.ALWAYS &&
		ipAddressCollection !== CollectionPolicy.BY_DEFAULT &&
		isWithEndpoint(userInfoAsCollection) &&
		endpointLearnsUserIpAddress(userInfoAsCollection.endpoint) === 'YES'
	) {
		// If endpoint learns IP address, and `userInfo` doesn't specify this explicitly,
		// then infer that the entity does learn the user's IP address.
		ipAddressCollection = CollectionPolicy.BY_DEFAULT
	}

	return {
		[PersonalInfo.IP_ADDRESS]: ipAddressCollection ?? CollectionPolicy.NEVER,
		[WalletInfo.USER_ACTIONS]: get(WalletInfo.USER_ACTIONS) ?? CollectionPolicy.NEVER,
		[WalletInfo.ACCOUNT_ADDRESS]:
			first(
				get(WalletInfo.ACCOUNT_ADDRESS),
				get(WalletInfo.MEMPOOL_TRANSACTIONS),
				get(WalletInfo.BALANCE),
			) ?? CollectionPolicy.NEVER,
		[WalletInfo.BALANCE]:
			first(
				get(WalletInfo.BALANCE),
				get(WalletInfo.ACCOUNT_ADDRESS),
				get(WalletInfo.MEMPOOL_TRANSACTIONS),
			) ?? CollectionPolicy.NEVER,
		[WalletInfo.ASSETS]:
			first(
				get(WalletInfo.ASSETS),
				get(WalletInfo.ACCOUNT_ADDRESS),
				get(WalletInfo.BALANCE),
				get(WalletInfo.MEMPOOL_TRANSACTIONS),
			) ?? CollectionPolicy.NEVER,
		[WalletInfo.MEMPOOL_TRANSACTIONS]:
			get(WalletInfo.MEMPOOL_TRANSACTIONS) ?? CollectionPolicy.NEVER,
		[WalletInfo.WALLET_CONNECTED_DOMAINS]:
			first(get(WalletInfo.WALLET_CONNECTED_DOMAINS), get(PersonalInfo.BROWSING_HISTORY_URLS)) ??
			CollectionPolicy.NEVER,
		[PersonalInfo.PSEUDONYM]:
			first(
				get(PersonalInfo.PSEUDONYM),
				get(PersonalInfo.EMAIL),
				get(PersonalInfo.FARCASTER_ACCOUNT),
				get(PersonalInfo.X_DOT_COM_ACCOUNT),
			) ?? CollectionPolicy.NEVER, // Email addresses and social media accounts usually contains at least pseudonym-level information.
		[PersonalInfo.FARCASTER_ACCOUNT]: get(PersonalInfo.FARCASTER_ACCOUNT) ?? CollectionPolicy.NEVER,
		[PersonalInfo.X_DOT_COM_ACCOUNT]: get(PersonalInfo.X_DOT_COM_ACCOUNT) ?? CollectionPolicy.NEVER,
		[PersonalInfo.LEGAL_NAME]:
			first(get(PersonalInfo.LEGAL_NAME), get(PersonalInfo.GOVERNMENT_ID)) ??
			CollectionPolicy.NEVER,
		[PersonalInfo.EMAIL]:
			first(get(PersonalInfo.EMAIL), get(PersonalInfo.CEX_ACCOUNT)) ?? CollectionPolicy.NEVER,
		[PersonalInfo.PHONE]:
			first(get(PersonalInfo.PHONE), get(PersonalInfo.CEX_ACCOUNT)) ?? CollectionPolicy.NEVER,
		[PersonalInfo.BROWSING_HISTORY_URLS]:
			get(PersonalInfo.BROWSING_HISTORY_URLS) ?? CollectionPolicy.NEVER,
		[PersonalInfo.CONTACTS]: get(PersonalInfo.CONTACTS) ?? CollectionPolicy.NEVER,
		[PersonalInfo.PHYSICAL_ADDRESS]:
			first(
				get(PersonalInfo.PHYSICAL_ADDRESS),
				get(PersonalInfo.CEX_ACCOUNT),
				get(PersonalInfo.GOVERNMENT_ID),
			) ?? CollectionPolicy.NEVER,
		[PersonalInfo.FACE]:
			first(get(PersonalInfo.FACE), get(PersonalInfo.GOVERNMENT_ID)) ?? CollectionPolicy.NEVER,
		[PersonalInfo.CEX_ACCOUNT]: get(PersonalInfo.CEX_ACCOUNT) ?? CollectionPolicy.NEVER,
		[PersonalInfo.GOVERNMENT_ID]: get(PersonalInfo.GOVERNMENT_ID) ?? CollectionPolicy.NEVER,
		multiAddress: userInfo.multiAddress,
	}
}

/** Infer data collection, preserving endpoint information. */
export function qualifiedDataCollectionWithEndpoint<T extends UserInfo>(
	userInfo: WithEndpoint<Collection<T>>,
): WithEndpoint<QualifiedDataCollection> {
	return { ...qualifiedDataCollection<T>(userInfo), endpoint: userInfo.endpoint }
}

/**
 * Describes the data that an entity may be sent.
 */
export interface DataCollectionByEntity {
	/** The entity to which the data may be sent. */
	byEntity: Entity

	/** The type of data that an entity may be sent. */
	dataCollection: EndpointCollection

	/** Why is the data collected? */
	purposes: NonEmptyArray<DataCollectionPurpose>
}

export interface DataCollectionForFlow {
	/** The data collected by entities. */
	collected: WithRef<DataCollectionByEntity>[]
}

export type DataCollectionForFlowWithOnchainData = DataCollectionForFlow & {
	/** Personal data published onchain in public view. */
	publishedOnchain:
		| 'NO_DATA_PUBLISHED_ONCHAIN'
		| WithRef<
				PersonalInfoCollection & {
					/** Why is the onchain data published? */
					purposes: NonEmptyArray<DataCollectionPurpose>
				}
		  >
}

/**
 * A collection of data that a wallet collects.
 * See /docs/mitmproxy-guide for how to collect this.
 */
export interface DataCollection {
	/** What data is collected during signup? */
	[UserFlow.ONBOARDING]: DataCollectionForFlowWithOnchainData | null

	/** What data is collected when sending tokens? */
	[UserFlow.SEND]: DataCollectionForFlow | null | 'FLOW_NOT_SUPPORTED'

	/** What data is collected when swapping tokens using the wallet's native swap feature? */
	[UserFlow.NATIVE_SWAP]: DataCollectionForFlow | null | 'FLOW_NOT_SUPPORTED'

	/** What data is collected during the transaction review/signing flow? */
	[UserFlow.TRANSACTION]: DataCollectionForFlow | null | 'FLOW_NOT_SUPPORTED'

	/** What data is collected when connecting to a dapp? */
	[UserFlow.DAPP_CONNECTION]: DataCollectionForFlow | null | 'FLOW_NOT_SUPPORTED'

	/** What other data is collected but not covered in the other flows, if any? */
	[UserFlow.UNCLASSIFIED]?: DataCollectionForFlow
}

/**
 * Aggregate data collection across all supported user flows.
 */
export function dataCollectionForAllSupportedFlows(
	dataCollection: DataCollection | null,
): WithRef<DataCollectionByEntity>[] | null {
	if (dataCollection === null) {
		return null
	}

	let allDataCollection: WithRef<DataCollectionByEntity>[] = []

	for (const flow of userFlow.items) {
		const forFlow = dataCollection[flow]

		if (forFlow === null) {
			return null
		}

		if (forFlow === undefined || forFlow === 'FLOW_NOT_SUPPORTED') {
			continue
		}

		allDataCollection = allDataCollection.concat(forFlow.collected)
	}

	return allDataCollection
}

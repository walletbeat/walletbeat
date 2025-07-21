import type { MustRef, WithRef } from '@/schema/reference'
import type { Dict } from '@/types/utils/dict'

import type { Entity } from '../../entity'

/**
 * An enum representing when data collection or leak occurs.
 *
 * Values are comparable as integers; the closest to zero, the more privacy.
 */
export enum Leak {
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

/** Returns whether */
export function endpointLeaksIpAddress(endpoint: Endpoint): 'YES' | 'NO' | 'UNVERIFIABLE' {
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
 * @param leak Some leak level.
 * @returns If the data collection happens by default.
 */
export function leaksByDefault(leak: Leak): boolean {
	return leak >= Leak.BY_DEFAULT
}

/** Personal information types. */
export enum LeakedPersonalInfo {
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

/** Wallet-related information types. */
export enum LeakedWalletInfo {
	/** The user's wallet activity. */
	WALLET_ACTIONS = 'walletActions',

	/** The user's wallet address. */
	WALLET_ADDRESS = 'walletAddress',

	/**
	 * The user's wallet balance.
	 * This can easily be turned back into an address, because most
	 * addresses' balance amount is unique.
	 */
	WALLET_BALANCE = 'walletBalance',

	/**
	 * The set of assets that are in the wallet.
	 * On wallets with many NFTs, this can be used to uniquely identify the
	 * wallet.
	 */
	WALLET_ASSETS = 'walletAssets',

	/**
	 * The user's wallet transactions before they are included onchain.
	 * For example, MEV protection services usually fall under this category.
	 */
	MEMPOOL_TRANSACTIONS = 'mempoolTransactions',

	/** Domain names the wallet is connected to. */
	WALLET_CONNECTED_DOMAINS = 'walletConnectedDomains',
}

export type LeakedInfo = LeakedPersonalInfo | LeakedWalletInfo

/** List of all LeakedInfos. */
export const leakedInfos = (Object.values(LeakedPersonalInfo) as LeakedInfo[]).concat(
	Object.values(LeakedWalletInfo),
)

/**
 * Rough ordering score for comparing LeakedInfo.
 * Higher score means the data is more sensitive.
 */
function leakedInfoScore(leakedInfo: LeakedInfo): number {
	switch (leakedInfo) {
		case LeakedPersonalInfo.IP_ADDRESS:
			return 0
		case LeakedWalletInfo.WALLET_ACTIONS:
			return 1
		case LeakedWalletInfo.WALLET_ASSETS:
			return 2
		case LeakedWalletInfo.WALLET_BALANCE:
			return 3
		case LeakedWalletInfo.WALLET_ADDRESS:
			return 4
		case LeakedWalletInfo.MEMPOOL_TRANSACTIONS:
			return 5
		case LeakedWalletInfo.WALLET_CONNECTED_DOMAINS:
			return 5
		case LeakedPersonalInfo.PSEUDONYM:
			return 6

		// All the social-media-y entries are roughly the same as email.
		case LeakedPersonalInfo.FARCASTER_ACCOUNT:
			return 7
		case LeakedPersonalInfo.X_DOT_COM_ACCOUNT:
			return 7
		case LeakedPersonalInfo.EMAIL:
			return 7

		case LeakedPersonalInfo.BROWSING_HISTORY_URLS:
			return 8
		case LeakedPersonalInfo.LEGAL_NAME:
			return 9
		case LeakedPersonalInfo.PHONE:
			return 10
		case LeakedPersonalInfo.CONTACTS:
			return 11
		case LeakedPersonalInfo.PHYSICAL_ADDRESS:
			return 12
		case LeakedPersonalInfo.CEX_ACCOUNT:
			return 13
		case LeakedPersonalInfo.FACE:
			return 14
		case LeakedPersonalInfo.GOVERNMENT_ID:
			return 15
	}
}

/** The type of information that a LeakedInfo is about. */
export enum LeakedInfoType {
	/** Data related to the user's wallet. */
	WALLET_RELATED = 'walletRelated',

	/** Data related to the user themselves. */
	PERSONAL_DATA = 'personalData',
}

/** Get the type of information that a LeakedInfo is about. */
export function leakedInfoType(leakedInfo: LeakedInfo): LeakedInfoType {
	switch (leakedInfo) {
		case LeakedPersonalInfo.IP_ADDRESS:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedWalletInfo.WALLET_ACTIONS:
			return LeakedInfoType.WALLET_RELATED
		case LeakedWalletInfo.WALLET_ASSETS:
			return LeakedInfoType.WALLET_RELATED
		case LeakedWalletInfo.WALLET_BALANCE:
			return LeakedInfoType.WALLET_RELATED
		case LeakedWalletInfo.WALLET_ADDRESS:
			return LeakedInfoType.WALLET_RELATED
		case LeakedWalletInfo.MEMPOOL_TRANSACTIONS:
			return LeakedInfoType.WALLET_RELATED
		case LeakedWalletInfo.WALLET_CONNECTED_DOMAINS:
			return LeakedInfoType.WALLET_RELATED
		case LeakedPersonalInfo.PSEUDONYM:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedPersonalInfo.FARCASTER_ACCOUNT:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedPersonalInfo.X_DOT_COM_ACCOUNT:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedPersonalInfo.EMAIL:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedPersonalInfo.LEGAL_NAME:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedPersonalInfo.PHONE:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedPersonalInfo.BROWSING_HISTORY_URLS:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedPersonalInfo.CONTACTS:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedPersonalInfo.PHYSICAL_ADDRESS:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedPersonalInfo.CEX_ACCOUNT:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedPersonalInfo.FACE:
			return LeakedInfoType.PERSONAL_DATA
		case LeakedPersonalInfo.GOVERNMENT_ID:
			return LeakedInfoType.PERSONAL_DATA
	}
}

/** Compare two LeakedInfo scores (higher score is more sensitive). */
export function compareLeakedInfo(a: LeakedInfo, b: LeakedInfo): number {
	return leakedInfoScore(a) - leakedInfoScore(b)
}

/** Human-friendly names to refer to the type of info being leaked. */
export function leakedInfoName(leakedInfo: LeakedInfo) {
	switch (leakedInfo) {
		case LeakedPersonalInfo.IP_ADDRESS:
			return { short: 'IP', long: 'IP address' } as const
		case LeakedWalletInfo.WALLET_ACTIONS:
			return { short: 'wallet actions', long: 'wallet actions' } as const
		case LeakedWalletInfo.WALLET_ASSETS:
			return { short: 'wallet assets', long: 'wallet asset types' } as const
		case LeakedWalletInfo.WALLET_BALANCE:
			return { short: 'wallet balance', long: 'wallet assets and balances' } as const
		case LeakedWalletInfo.WALLET_ADDRESS:
			return { short: 'wallet address', long: 'wallet address' } as const
		case LeakedWalletInfo.MEMPOOL_TRANSACTIONS:
			return { short: 'outgoing transactions', long: 'outgoing wallet transactions' } as const
		case LeakedWalletInfo.WALLET_CONNECTED_DOMAINS:
			return { short: 'connected sites', long: 'wallet-connected domains' } as const
		case LeakedPersonalInfo.PSEUDONYM:
			return {
				short: '{{WALLET_PSEUDONYM_SINGULAR}}',
				long: '{{WALLET_PSEUDONYM_SINGULAR}}',
			} as const
		case LeakedPersonalInfo.FARCASTER_ACCOUNT:
			return { short: 'Farcaster account', long: 'Farcaster account' } as const
		case LeakedPersonalInfo.X_DOT_COM_ACCOUNT:
			return { short: 'X.com account', long: 'X.com account' } as const
		case LeakedPersonalInfo.EMAIL:
			return { short: 'email', long: 'email address' } as const
		case LeakedPersonalInfo.LEGAL_NAME:
			return { short: 'name', long: 'legal name' } as const
		case LeakedPersonalInfo.PHONE:
			return { short: 'phone', long: 'phone number' } as const
		case LeakedPersonalInfo.BROWSING_HISTORY_URLS:
			return { short: 'Browsing history', long: 'Browsing history' } as const
		case LeakedPersonalInfo.CONTACTS:
			return { short: 'contacts', long: 'personal contact list' } as const
		case LeakedPersonalInfo.PHYSICAL_ADDRESS:
			return { short: 'physical address', long: 'geographical address' } as const
		case LeakedPersonalInfo.CEX_ACCOUNT:
			return { short: 'CEX account', long: 'centralized exchange account' } as const
		case LeakedPersonalInfo.FACE:
			return { short: 'face', long: 'facial recognition data' } as const
		case LeakedPersonalInfo.GOVERNMENT_ID:
			return { short: 'government ID', long: 'government-issued ID' } as const
	}
}

/** What data is leaked from an entity; partial. */
type PartialLeaks<T extends LeakedInfo> = Dict<
	Partial<Record<T, Leak>> & {
		/**
		 * How multiple addresses are handled, if at all.
		 */
		multiAddress?: MultiAddressHandling
	}
>

/** A partially-known set of leaks, with reference information. */
export type Leaks<L extends LeakedInfo> = WithRef<PartialLeaks<L>>

/** A partially-known set of personal info leaks, with reference information. */
export type PersonalInfoLeaks = Leaks<LeakedPersonalInfo>

/** Adds endpoint information to a leaks type. */
type WithEndpoint<L> = L & {
	/**
	 * Information about the endpoint that receives this data.
	 */
	endpoint: Endpoint
}

/** A partially-known set of leaks, with reference information. */
export type EndpointLeaks = WithEndpoint<Leaks<LeakedInfo>>

/** Type predicate for WithEndpoint<L>. */
export function isEndpointLeaks<L extends Leaks<LeakedInfo>>(
	maybeEndpoint: L,
): maybeEndpoint is WithEndpoint<L> {
	return Object.hasOwn(maybeEndpoint, 'endpoint')
}

/** What data is leaked from an entity; fully qualified. */
export type QualifiedLeaks = WithRef<
	Dict<
		Record<LeakedInfo, Leak> & {
			/**
			 * How multiple addresses are handled, if at all.
			 */
			multiAddress?: MultiAddressHandling
		}
	>
>

/**
 * Infer what leaks from a given partial set of known leaks.
 * @param leaks Partial set of known leaks.
 * @returns A fully-qualified set of leaks.
 */
export function inferLeaks<T extends LeakedInfo, L extends Leaks<T>>(leaks: L): QualifiedLeaks {
	const get = (leakedInfo: LeakedInfo): Leak | undefined => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because all possible `LeakedInfo` keys map to `Leak` values, or are unset (undefined).
		return (leaks as Record<LeakedInfo, Leak>)[leakedInfo]
	}
	const first = (...ls: Array<Leak | undefined>): Leak | undefined => ls.find(l => l !== undefined)

	let ipAddressLeak = get(LeakedPersonalInfo.IP_ADDRESS)

	if (
		ipAddressLeak !== Leak.ALWAYS &&
		ipAddressLeak !== Leak.BY_DEFAULT &&
		isEndpointLeaks<L>(leaks) &&
		endpointLeaksIpAddress(leaks.endpoint) === 'YES'
	) {
		// If endpoint leaks IP address, and `leaks` doesn't specify this explicitly,
		// then infer that the IP address does leak.
		ipAddressLeak = Leak.BY_DEFAULT
	}

	return {
		[LeakedPersonalInfo.IP_ADDRESS]: ipAddressLeak ?? Leak.NEVER,
		[LeakedWalletInfo.WALLET_ACTIONS]: get(LeakedWalletInfo.WALLET_ACTIONS) ?? Leak.NEVER,
		[LeakedWalletInfo.WALLET_ADDRESS]:
			first(
				get(LeakedWalletInfo.WALLET_ADDRESS),
				get(LeakedWalletInfo.MEMPOOL_TRANSACTIONS),
				get(LeakedWalletInfo.WALLET_BALANCE),
			) ?? Leak.NEVER,
		[LeakedWalletInfo.WALLET_BALANCE]:
			first(
				get(LeakedWalletInfo.WALLET_BALANCE),
				get(LeakedWalletInfo.WALLET_ADDRESS),
				get(LeakedWalletInfo.MEMPOOL_TRANSACTIONS),
			) ?? Leak.NEVER,
		[LeakedWalletInfo.WALLET_ASSETS]:
			first(
				get(LeakedWalletInfo.WALLET_ASSETS),
				get(LeakedWalletInfo.WALLET_ADDRESS),
				get(LeakedWalletInfo.WALLET_BALANCE),
				get(LeakedWalletInfo.MEMPOOL_TRANSACTIONS),
			) ?? Leak.NEVER,
		[LeakedWalletInfo.MEMPOOL_TRANSACTIONS]:
			get(LeakedWalletInfo.MEMPOOL_TRANSACTIONS) ?? Leak.NEVER,
		[LeakedWalletInfo.WALLET_CONNECTED_DOMAINS]:
			first(
				get(LeakedWalletInfo.WALLET_CONNECTED_DOMAINS),
				get(LeakedPersonalInfo.BROWSING_HISTORY_URLS),
			) ?? Leak.NEVER,
		[LeakedPersonalInfo.PSEUDONYM]:
			first(
				get(LeakedPersonalInfo.PSEUDONYM),
				get(LeakedPersonalInfo.EMAIL),
				get(LeakedPersonalInfo.FARCASTER_ACCOUNT),
				get(LeakedPersonalInfo.X_DOT_COM_ACCOUNT),
			) ?? Leak.NEVER, // Email addresses and social media accounts usually contains at least pseudonym-level information.
		[LeakedPersonalInfo.FARCASTER_ACCOUNT]: get(LeakedPersonalInfo.FARCASTER_ACCOUNT) ?? Leak.NEVER,
		[LeakedPersonalInfo.X_DOT_COM_ACCOUNT]: get(LeakedPersonalInfo.X_DOT_COM_ACCOUNT) ?? Leak.NEVER,
		[LeakedPersonalInfo.LEGAL_NAME]:
			first(get(LeakedPersonalInfo.LEGAL_NAME), get(LeakedPersonalInfo.GOVERNMENT_ID)) ??
			Leak.NEVER,
		[LeakedPersonalInfo.EMAIL]:
			first(get(LeakedPersonalInfo.EMAIL), get(LeakedPersonalInfo.CEX_ACCOUNT)) ?? Leak.NEVER,
		[LeakedPersonalInfo.PHONE]:
			first(get(LeakedPersonalInfo.PHONE), get(LeakedPersonalInfo.CEX_ACCOUNT)) ?? Leak.NEVER,
		[LeakedPersonalInfo.BROWSING_HISTORY_URLS]:
			get(LeakedPersonalInfo.BROWSING_HISTORY_URLS) ?? Leak.NEVER,
		[LeakedPersonalInfo.CONTACTS]: get(LeakedPersonalInfo.CONTACTS) ?? Leak.NEVER,
		[LeakedPersonalInfo.PHYSICAL_ADDRESS]:
			first(
				get(LeakedPersonalInfo.PHYSICAL_ADDRESS),
				get(LeakedPersonalInfo.CEX_ACCOUNT),
				get(LeakedPersonalInfo.GOVERNMENT_ID),
			) ?? Leak.NEVER,
		[LeakedPersonalInfo.FACE]:
			first(get(LeakedPersonalInfo.FACE), get(LeakedPersonalInfo.GOVERNMENT_ID)) ?? Leak.NEVER,
		[LeakedPersonalInfo.CEX_ACCOUNT]: get(LeakedPersonalInfo.CEX_ACCOUNT) ?? Leak.NEVER,
		[LeakedPersonalInfo.GOVERNMENT_ID]: get(LeakedPersonalInfo.GOVERNMENT_ID) ?? Leak.NEVER,
		multiAddress: leaks.multiAddress,
		ref: leaks.ref,
	}
}

/** Infer leaks, preserving endpoint information. */
export function inferEndpointLeaks<T extends LeakedInfo, L extends Leaks<T>>(
	leaks: WithEndpoint<L>,
): WithEndpoint<QualifiedLeaks> {
	return { ...inferLeaks<T, L>(leaks), endpoint: leaks.endpoint }
}

/**
 * Describes the data that an entity may be sent.
 */
export interface EntityData {
	/** The entity to which the data may be sent. */
	entity: Entity

	/** The type of data that an entity may be sent. */
	leaks: EndpointLeaks
}

/**
 * A collection of data that a wallet collects.
 */
export interface DataCollection {
	/** Personal data exported out onchain in public view. */
	onchain: PersonalInfoLeaks

	/** The data collected by corporate entities. */
	collectedByEntities: EntityData[]
}

import {
	type MultiAddressHandling,
	MultiAddressPolicy,
	type UserInfo,
	userInfoCorrelatableAcrossEntities,
} from '@/schema/features/privacy/data-collection'
import type { Erc55Address } from '@/types/utils/ethereum-address'
import type { NonEmptyArray } from '@/types/utils/non-empty'

/**
 * A single request, reduced to the fields that matter for classifying how a
 * wallet handles fetching data for multiple wallet addresses.
 */
export interface AddressBearingRequest {
	/**
	 * The distinct wallet addresses this request carries. Only the wallet's
	 * own addresses (as recorded in `captureInfo.walletAddresses`) should be
	 * included; other addresses that merely appear in the traffic (token
	 * contracts, transaction recipients, addresses embedded in RLP-encoded
	 * calldata) are not the user's addresses and have no bearing on
	 * correlation.
	 */
	addresses: NonEmptyArray<Erc55Address>

	/**
	 * The correlatable `UserInfo` string values carried by this request,
	 * keyed by `UserInfo` type. Two requests that carry the same value for the
	 * same correlatable `UserInfo` type (e.g. the same tracking cookie, email
	 * address, or phone number) can be correlated by the receiving entity, so
	 * these values are what allow addresses sent in separate requests to be
	 * linked together.
	 *
	 * See {@link userInfoCorrelatableAcrossEntities}.
	 */
	correlatableUserInfo: ReadonlyMap<UserInfo, ReadonlySet<string>>

	/**
	 * The session-relative time of the request, in milliseconds since the
	 * start of its capture session. Used to classify whether requests for
	 * different addresses are simultaneous or staggered.
	 */
	sessionMilliseconds: number
}

/**
 * A request that carries correlatable `UserInfo` values but no wallet address.
 * Such requests still matter for correlation, because a chain of requests
 * linked by shared correlatable `UserInfo` values can transitively correlate
 * two addresses even when no single request carries both.
 */
export interface CorrelatableOnlyRequest {
	/** The correlatable `UserInfo` string values carried by this request. */
	correlatableUserInfo: ReadonlyMap<UserInfo, ReadonlySet<string>>

	/**
	 * The session-relative time of the request, in milliseconds since the
	 * start of its capture session.
	 */
	sessionMilliseconds: number
}

/** The requests observed by a single receiving entity. */
export interface EntityRequests {
	/** The distinct wallet addresses seen by this receiving entity. */
	addresses: NonEmptyArray<Erc55Address>
	/** The requests, each carrying one or more wallet addresses. */
	requests: AddressBearingRequest[]
	/**
	 * The requests that carry correlatable `UserInfo` values but no wallet
	 * address. These participate in correlation chains but are not
	 * address-bearing, so they are kept separate from `requests`.
	 */
	correlatableOnlyRequests: CorrelatableOnlyRequest[]
}

/**
 * Two requests sent within this many milliseconds are considered simultaneous.
 */
export const SIMULTANEOUS_WINDOW_MS = 300_000

/**
 * Classify how a wallet handles fetching data for multiple wallet addresses,
 * based on the network traffic it generated. This is what the
 * `multi-address-correlation` attribute consumes.
 *
 * - If any single request carries two or more distinct addresses, the wallet
 *   groups multiple addresses into one request
 *   (`SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES`).
 * - Otherwise, if a receiving entity observes more than one distinct address
 *   across separate requests, the wallet fetches data for each address in a
 *   separate request (`SEPARATE_REQUEST_PER_ADDRESS`), with destination and
 *   timing derived from the traffic.
 * - Otherwise the wallet only ever makes requests about a single address
 *   (`ACTIVE_ADDRESS_ONLY`).
 *
 * For `SEPARATE_REQUEST_PER_ADDRESS`, the classification also determines
 * whether the wallet's addresses are correlatable through a chain of shared
 * correlatable `UserInfo` values (see
 * {@link addressesCorrelatableByCorrelatableUserInfo}).
 *
 * @param totalWalletAddressCount The number of distinct wallet addresses the
 *   wallet manages across the entire capture. This distinguishes
 *   `ACTIVE_ADDRESS_ONLY` (single address) from `SEPARATE_REQUEST_PER_ADDRESS`
 *   with isolated destinations (multiple addresses routed to distinct
 *   endpoints).
 * @param entityRequests The requests observed by each receiving entity, keyed
 *   by entity ID. Intermediaries (e.g. a TLS-terminating CDN) see the same
 *   requests as the operator they front, so they share the same address set
 *   and classification.
 */
export function classifyEntityMultiAddressHandling(
	totalWalletAddressCount: number,
	entityRequests: EntityRequests,
): MultiAddressHandling | null {
	const { addresses, requests, correlatableOnlyRequests } = entityRequests

	if (requests.length === 0) {
		return null
	}

	// A wallet that only ever references a single address across the whole
	// capture is ACTIVE_ADDRESS_ONLY regardless of how requests are grouped.
	if (totalWalletAddressCount === 1) {
		return { type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY }
	}

	// A request carrying more than one address groups them together, the
	// most-correlatable behavior.
	for (const req of requests) {
		if (req.addresses.length >= 2) {
			return { type: MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES }
		}
	}

	// Every request now carries exactly one address, but the wallet manages
	// more than one. If this entity sees more than one distinct address, all of
	// them were sent to the same endpoint, which could correlate them;
	// otherwise it sees only a single address and is isolated.
	const destination: 'SAME_FOR_ALL' | 'ISOLATED' =
		addresses.length >= 2 ? 'SAME_FOR_ALL' : 'ISOLATED'

	return {
		type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
		destination,
		proxy: 'NONE',
		timing: classifyTiming(requests),
		correlatableUserInfoCorrelation: addressesCorrelatableByCorrelatableUserInfo(
			requests,
			correlatableOnlyRequests,
		)
			? 'CORRELATABLE'
			: 'NOT_CORRELATABLE',
	}
}

/**
 * Determine whether two or more distinct wallet addresses are correlatable
 * through a chain of requests that share correlatable `UserInfo` values.
 *
 * Two addresses are correlated when requests about each of them carry the
 * same correlatable `UserInfo` value, either directly (a request about
 * address A1 and a request about address A2 both carry identifier X) or
 * transitively (a sequence of requests R1..Rn links A1 to A2, where each
 * consecutive pair of requests shares a correlatable `UserInfo` value, and
 * only the endpoints carry the addresses). This is computed with a union-find
 * over a graph whose nodes are wallet addresses and correlatable `UserInfo`
 * values; each request connects all of its addresses and all of its
 * correlatable `UserInfo` values.
 *
 * @param requests The requests, each carrying one or more wallet addresses.
 * @param correlatableOnlyRequests The requests carrying correlatable
 *   `UserInfo` values but no wallet address.
 */
function addressesCorrelatableByCorrelatableUserInfo(
	requests: AddressBearingRequest[],
	correlatableOnlyRequests: CorrelatableOnlyRequest[],
): boolean {
	// Union-find over node keys. Addresses and correlatable UserInfo values are
	// prefixed (by kind and, for UserInfo values, by type) so that values that
	// happen to collide never share a node.
	const parent = new Map<string, string>()

	const find = (node: string): string => {
		let root = node

		// Every node is registered in `parent` via `add` before it is ever
		// queried, so a missing entry means the node is its own root.
		while (true) {
			const p = parent.get(root)

			if (p === undefined || p === root) {
				break
			}

			root = p
		}

		// Path compression.
		let current = node

		while (current !== root) {
			const next = parent.get(current)

			if (next === undefined) {
				break
			}

			parent.set(current, root)
			current = next
		}

		return root
	}

	const add = (node: string): void => {
		if (!parent.has(node)) {
			parent.set(node, node)
		}
	}

	const union = (a: string, b: string): void => {
		const rootA = find(a)
		const rootB = find(b)

		if (rootA !== rootB) {
			parent.set(rootB, rootA)
		}
	}

	const connect = (nodes: string[]): void => {
		for (const node of nodes) {
			add(node)
		}

		for (let i = 1; i < nodes.length; i++) {
			union(nodes[0], nodes[i])
		}
	}

	// The nodes a request connects: its wallet addresses plus every
	// correlatable `UserInfo` value it carries, each keyed by `UserInfo` type.
	const nodesForCorrelatableUserInfo = (
		correlatableUserInfo: ReadonlyMap<UserInfo, ReadonlySet<string>>,
	): string[] => {
		const nodes: string[] = []

		for (const [userInfo, values] of correlatableUserInfo) {
			for (const value of values) {
				nodes.push(`userinfo:${userInfo}:${value}`)
			}
		}

		return nodes
	}

	for (const req of requests) {
		connect([
			...req.addresses.map(addr => `address:${addr}`),
			...nodesForCorrelatableUserInfo(req.correlatableUserInfo),
		])
	}

	for (const req of correlatableOnlyRequests) {
		connect(nodesForCorrelatableUserInfo(req.correlatableUserInfo))
	}

	// Group the wallet addresses seen by this entity by their union-find root.
	// If any group contains two or more distinct addresses, those addresses are
	// correlatable through a chain of shared correlatable `UserInfo` values.
	const addressesByRoot = new Map<string, Set<string>>()

	for (const req of requests) {
		for (const addr of req.addresses) {
			const root = find(`address:${addr}`)
			const group = addressesByRoot.get(root)

			if (group === undefined) {
				addressesByRoot.set(root, new Set([addr]))
			} else {
				group.add(addr)
			}
		}
	}

	for (const group of addressesByRoot.values()) {
		if (group.size >= 2) {
			return true
		}
	}

	return false
}

/**
 * Classify whether requests for different addresses are simultaneous or
 * staggered, based on the session-relative times of the requests.
 */
function classifyTiming(requests: AddressBearingRequest[]): 'SIMULTANEOUS' | 'STAGGERED' {
	const crossAddressPairs: Array<[number, number]> = []

	for (let i = 0; i < requests.length; i++) {
		for (let j = i + 1; j < requests.length; j++) {
			const a = requests[i]
			const b = requests[j]

			if (
				a.addresses.length === 1 &&
				b.addresses.length === 1 &&
				a.addresses[0] === b.addresses[0]
			) {
				continue
			}

			crossAddressPairs.push([a.sessionMilliseconds, b.sessionMilliseconds])
		}
	}

	if (crossAddressPairs.length === 0) {
		return 'STAGGERED'
	}

	// Any pair of requests for different addresses within the simultaneous
	// window means the wallet refreshes distinct addresses close together.
	const anySimultaneous = crossAddressPairs.some(
		([a, b]) => Math.abs(a - b) < SIMULTANEOUS_WINDOW_MS,
	)

	return anySimultaneous ? 'SIMULTANEOUS' : 'STAGGERED'
}

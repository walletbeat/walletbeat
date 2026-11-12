import {
	type CorrelationChain,
	type CorrelationEdge,
	IP_TIME_CORRELATION_WINDOW_MS,
	type MultiAddressHandling,
	MultiAddressPolicy,
	SIMULTANEOUS_WINDOW_MS,
	type UserInfo,
	userInfoCorrelatableAcrossEntities,
	userInfoScore,
} from '@/schema/features/privacy/data-collection'
import type { Erc55Address } from '@/types/utils/ethereum-address'
import type { NonEmptyArray } from '@/types/utils/non-empty'

export type { CorrelationChain, CorrelationEdge } from '@/schema/features/privacy/data-collection'
export { IP_TIME_CORRELATION_WINDOW_MS, SIMULTANEOUS_WINDOW_MS }

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
	 * The proxy circuit this request was routed through, or `null` if it was
	 * not proxied. Two requests routed through the same circuit appear to the
	 * receiving entity as coming from the same IP address, so a matching proxy
	 * (including two `null`s) is what allows IP-time correlation.
	 */
	proxy: string | null

	/**
	 * Details about the secure enclave the request's endpoint runs in, or
	 * `null` if the endpoint is not an IP-hiding secure enclave (in which case
	 * the entity learns the user's IP address).
	 */
	secureEnclaveDetails: null // Secure enclaves not representable yet.

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
 * linked by shared correlatable `UserInfo` values or IP-time links can
 * transitively correlate two addresses even when no single request carries
 * both.
 */
export interface CorrelatableOnlyRequest {
	/** The correlatable `UserInfo` string values carried by this request. */
	correlatableUserInfo: ReadonlyMap<UserInfo, ReadonlySet<string>>

	/** The proxy circuit this request was routed through, or `null`. */
	proxy: string | null

	/** Secure-enclave details, or `null` if the endpoint is not an IP-hiding enclave. */
	secureEnclaveDetails: null // Secure enclaves not representable yet.

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

// UserInfo edge strengths are offset well above any IP-time edge strength so
// that a shared-UserInfo link is always stronger than an IP-time link.
const USERINFO_STRENGTH_OFFSET = 10_000_000

/** The strength of a shared-`UserInfo` correlation link. */
function userInfoEdgeStrength(userInfo: UserInfo): number {
	return USERINFO_STRENGTH_OFFSET + userInfoScore(userInfo)
}

/** The strength of an IP-time correlation link: a shorter gap is stronger. */
function ipTimeEdgeStrength(gapMs: number): number {
	return IP_TIME_CORRELATION_WINDOW_MS - gapMs
}

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
 * For `SEPARATE_REQUEST_PER_ADDRESS`, the classification also finds the best
 * request-correlation chain between any two requests bearing distinct
 * addresses (see {@link findBestCorrelationChain}).
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
		bestChain: findBestCorrelationChain(requests, correlatableOnlyRequests),
	}
}

/**
 * A node in the request-correlation graph: one captured request.
 */
interface CorrelationNode {
	/** The wallet addresses this request carries (empty for correlatable-only requests). */
	addresses: Erc55Address[]
	correlatableUserInfo: ReadonlyMap<UserInfo, ReadonlySet<string>>
	proxy: string | null
	secureEnclaveDetails: null
	sessionMilliseconds: number
}

/**
 * Find the best request-correlation chain between any two requests bearing
 * distinct wallet addresses, or `null` if no chain links any two distinct
 * addresses.
 *
 * The graph's nodes are requests. Two requests are linked by:
 * - a UserInfo edge, when they carry an identical correlatable `UserInfo`
 *   value (strength by {@link userInfoScore});
 * - an IP-time edge, when both endpoints are not IP-hiding secure enclaves,
 *   both requests share the same proxy circuit, and they were sent within
 *   {@link IP_TIME_CORRELATION_WINDOW_MS} of each other (strength by inverse
 *   time gap).
 *
 * A chain's strength is its weakest edge (bottleneck). The best chain between
 * two requests is the shortest one, breaking ties by highest weakest-edge
 * strength. This is a lexicographic shortest-path (Dijkstra) over the graph:
 * extending a chain always adds an edge (never improves it), so the cost
 * tuple `(hops, -weakestEdgeStrength)` is monotonic and Dijkstra applies.
 *
 * @param requests The address-bearing requests.
 * @param correlatableOnlyRequests The requests carrying correlatable
 *   `UserInfo` values but no wallet address.
 */
function findBestCorrelationChain(
	requests: AddressBearingRequest[],
	correlatableOnlyRequests: CorrelatableOnlyRequest[],
): CorrelationChain | null {
	const nodes: CorrelationNode[] = []

	for (const req of requests) {
		nodes.push({
			addresses: [...req.addresses],
			correlatableUserInfo: req.correlatableUserInfo,
			proxy: req.proxy,
			secureEnclaveDetails: req.secureEnclaveDetails,
			sessionMilliseconds: req.sessionMilliseconds,
		})
	}

	for (const req of correlatableOnlyRequests) {
		nodes.push({
			addresses: [],
			correlatableUserInfo: req.correlatableUserInfo,
			proxy: req.proxy,
			secureEnclaveDetails: req.secureEnclaveDetails,
			sessionMilliseconds: req.sessionMilliseconds,
		})
	}

	// Build edges, keeping only the strongest edge between any pair.
	const pairEdges = new Map<string, CorrelationEdge>()
	const keyFor = (a: number, b: number): string => `${Math.min(a, b)}:${Math.max(a, b)}`
	const upsertEdge = (a: number, b: number, edge: CorrelationEdge): void => {
		const key = keyFor(a, b)
		const existing = pairEdges.get(key)

		if (existing === undefined || edge.strength > existing.strength) {
			pairEdges.set(key, edge)
		}
	}

	// UserInfo edges: group requests by correlatable `UserInfo` value.
	const valuesByUserInfo = new Map<UserInfo, Map<string, number[]>>()

	for (let i = 0; i < nodes.length; i++) {
		for (const [userInfo, values] of nodes[i].correlatableUserInfo) {
			let byValue = valuesByUserInfo.get(userInfo)

			if (byValue === undefined) {
				byValue = new Map()
				valuesByUserInfo.set(userInfo, byValue)
			}

			for (const value of values) {
				const indices = byValue.get(value)

				if (indices === undefined) {
					byValue.set(value, [i])
				} else {
					indices.push(i)
				}
			}
		}
	}

	for (const [userInfo, byValue] of valuesByUserInfo) {
		for (const indices of byValue.values()) {
			if (indices.length < 2) {
				continue
			}

			const edge: CorrelationEdge = {
				kind: 'userInfo',
				userInfo,
				strength: userInfoEdgeStrength(userInfo),
			}

			for (let i = 0; i < indices.length; i++) {
				for (let j = i + 1; j < indices.length; j++) {
					upsertEdge(indices[i], indices[j], edge)
				}
			}
		}
	}

	// IP-time edges: same proxy, non-enclave endpoints, within the window.
	for (let i = 0; i < nodes.length; i++) {
		for (let j = i + 1; j < nodes.length; j++) {
			const a = nodes[i]
			const b = nodes[j]

			if (a.secureEnclaveDetails !== null || b.secureEnclaveDetails !== null) {
				continue
			}

			if (a.proxy !== b.proxy) {
				continue
			}

			const gapMs = Math.abs(a.sessionMilliseconds - b.sessionMilliseconds)

			if (gapMs >= IP_TIME_CORRELATION_WINDOW_MS) {
				continue
			}

			upsertEdge(i, j, {
				kind: 'ipTime',
				gapMs,
				strength: ipTimeEdgeStrength(gapMs),
			})
		}
	}

	const adjacency = new Map<number, Array<{ to: number; edge: CorrelationEdge }>>()

	for (const [key, edge] of pairEdges) {
		const [a, b] = key.split(':').map(Number)

		let list = adjacency.get(a)

		if (list === undefined) {
			list = []
			adjacency.set(a, list)
		}

		list.push({ to: b, edge })

		let listB = adjacency.get(b)

		if (listB === undefined) {
			listB = []
			adjacency.set(b, listB)
		}

		listB.push({ to: a, edge })
	}

	let best: CorrelationChain | null = null

	for (let src = 0; src < nodes.length; src++) {
		if (nodes[src].addresses.length === 0) {
			continue
		}

		// cost = (hops, weakestStrength); a lower cost (fewer hops, then
		// higher weakest strength) is better. weakestEdge is the bottleneck.
		const cost = new Map<
			number,
			{ hops: number; weakest: number; weakestEdge: CorrelationEdge | null }
		>()
		const settled = new Set<number>()

		cost.set(src, { hops: 0, weakest: Infinity, weakestEdge: null })
		const isBetter = (
			a: { hops: number; weakest: number },
			b: { hops: number; weakest: number },
		): boolean => a.hops < b.hops || (a.hops === b.hops && a.weakest > b.weakest)

		while (true) {
			let bestIdx = -1
			let bestCost: { hops: number; weakest: number } | null = null

			for (const [idx, c] of cost) {
				if (settled.has(idx)) {
					continue
				}

				if (bestCost === null || isBetter(c, bestCost)) {
					bestCost = c
					bestIdx = idx
				}
			}

			if (bestIdx === -1) {
				break
			}

			settled.add(bestIdx)

			for (const { to, edge } of adjacency.get(bestIdx) ?? []) {
				const c = cost.get(bestIdx)!
				const newHops = c.hops + 1
				const newWeakest = Math.min(c.weakest, edge.strength)
				const newWeakestEdge = edge.strength < c.weakest ? edge : c.weakestEdge
				const existing = cost.get(to)

				if (
					existing === undefined ||
					newHops < existing.hops ||
					(newHops === existing.hops && newWeakest > existing.weakest)
				) {
					cost.set(to, { hops: newHops, weakest: newWeakest, weakestEdge: newWeakestEdge })
				}
			}
		}

		// Collect chains to every other address-bearing request with a distinct
		// address.
		for (let tgt = 0; tgt < nodes.length; tgt++) {
			if (tgt === src) {
				continue
			}

			const target = nodes[tgt]

			if (target.addresses.length === 0) {
				continue
			}

			// Each address-bearing request carries exactly one address in the
			// SEPARATE_REQUEST_PER_ADDRESS case, so distinct addresses means
			// the single addresses differ.
			if (target.addresses[0] === nodes[src].addresses[0]) {
				continue
			}

			const c = cost.get(tgt)

			if (c === undefined || c.hops === 0 || c.weakestEdge === null) {
				continue
			}

			const chain: CorrelationChain = {
				length: c.hops,
				weakestEdge: c.weakestEdge,
			}

			if (
				best === null ||
				chain.length < best.length ||
				(chain.length === best.length && chain.weakestEdge.strength > best.weakestEdge.strength)
			) {
				best = chain
			}
		}
	}

	return best
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

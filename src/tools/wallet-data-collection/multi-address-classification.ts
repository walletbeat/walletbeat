import {
	type MultiAddressHandling,
	MultiAddressPolicy,
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
	 * The session-relative time of the request, in milliseconds since the
	 * start of its capture session. Used to classify whether requests for
	 * different addresses are simultaneous or staggered.
	 */
	sessionMilliseconds: number
}

/** The requests observed by a single receiving entity. */
export interface EntityRequests {
	/** The distinct wallet addresses seen by this receiving entity. */
	addresses: NonEmptyArray<Erc55Address>
	/** The requests, each carrying one or more wallet addresses. */
	requests: AddressBearingRequest[]
}

/**
 * Two requests sent within this many milliseconds are considered simultaneous.
 * The window is a heuristic: a wallet that refreshes multiple addresses
 * back-to-back produces requests within a few milliseconds of each other,
 * while one that waits between requests produces requests further apart. It is
 * generous because captures often batch several requests together even when
 * the wallet intends them as separate logical operations.
 */
export const SIMULTANEOUS_WINDOW_MS = 10_000

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
	const { addresses, requests } = entityRequests

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
	}
}

/**
 * Classify whether requests for different addresses are simultaneous or
 * staggered, based on the session-relative times of the requests.
 */
function classifyTiming(requests: AddressBearingRequest[]): 'SIMULTANEOUS' | 'STAGGERED' {
	// Only cross-address timing matters for correlation: repeated requests for
	// the same address, no matter how far apart, reveal nothing about whether
	// distinct addresses belong to the same user.
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

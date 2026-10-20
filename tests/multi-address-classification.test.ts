import { describe, expect, it } from 'vitest'

import {
	MultiAddressPolicy,
	PersonalInfo,
	type UserInfo,
} from '@/schema/features/privacy/data-collection'
import {
	type AddressBearingRequest,
	classifyEntityMultiAddressHandling,
	type CorrelatableOnlyRequest,
	type EntityRequests,
	IP_TIME_CORRELATION_WINDOW_MS,
} from '@/tools/wallet-data-collection/multi-address-classification'
import type { Erc55Address } from '@/types/utils/ethereum-address'
import { assertNonEmptyArray } from '@/types/utils/non-empty'

const A1 = '0x1111111111111111111111111111111111111111'
const A2 = '0x2222222222222222222222222222222222222222'

/** Build a `correlatableUserInfo` map from `[UserInfo, values]` entries. */
function userInfoMap(entries: Array<[UserInfo, string[]]>): Map<UserInfo, Set<string>> {
	return new Map(entries.map(([info, values]) => [info, new Set(values)]))
}

interface RequestOpts {
	proxy?: string | null
	secureEnclaveDetails?: null
}

function addressRequest(
	addresses: Erc55Address[],
	correlatableUserInfo: Array<[UserInfo, string[]]> = [],
	sessionMilliseconds = 0,
	opts: RequestOpts = {},
): AddressBearingRequest {
	return {
		addresses: assertNonEmptyArray(addresses),
		correlatableUserInfo: userInfoMap(correlatableUserInfo),
		proxy: opts.proxy ?? null,
		secureEnclaveDetails: opts.secureEnclaveDetails ?? null,
		sessionMilliseconds,
	}
}

function correlatableOnlyRequest(
	correlatableUserInfo: Array<[UserInfo, string[]]>,
	sessionMilliseconds = 0,
	opts: RequestOpts = {},
): CorrelatableOnlyRequest {
	return {
		correlatableUserInfo: userInfoMap(correlatableUserInfo),
		proxy: opts.proxy ?? null,
		secureEnclaveDetails: opts.secureEnclaveDetails ?? null,
		sessionMilliseconds,
	}
}

function entityRequests(
	addresses: Erc55Address[],
	requests: AddressBearingRequest[],
	correlatableOnlyRequests: CorrelatableOnlyRequest[] = [],
): EntityRequests {
	return {
		addresses: assertNonEmptyArray(addresses),
		requests,
		correlatableOnlyRequests,
	}
}

describe('classifyEntityMultiAddressHandling', () => {
	it('classifies a wallet with a single address as ACTIVE_ADDRESS_ONLY', () => {
		const result = classifyEntityMultiAddressHandling(
			1,
			entityRequests([A1], [addressRequest([A1])]),
		)

		expect(result).toEqual({ type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY })
	})

	it('classifies a request carrying multiple addresses as SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests([A1, A2], [addressRequest([A1, A2])]),
		)

		expect(result).toEqual({ type: MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES })
	})

	it('classifies separate requests for multiple addresses as SEPARATE_REQUEST_PER_ADDRESS', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests([A1, A2], [addressRequest([A1], [], 0), addressRequest([A2], [], 0)]),
		)

		expect(result).toMatchObject({
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
			destination: 'SAME_FOR_ALL',
		})
	})

	it('finds an IP-time chain when two distinct-address requests are within the window from the same IP', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests([A1, A2], [addressRequest([A1], [], 0), addressRequest([A2], [], 1_000)]),
		)

		expect(result).toMatchObject({
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
			bestChain: { length: 1, weakestEdge: { kind: 'ipTime' } },
		})
	})

	it('finds no chain when requests are more than the window apart', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[addressRequest([A1], [], 0), addressRequest([A2], [], IP_TIME_CORRELATION_WINDOW_MS + 1)],
			),
		)

		expect(result).toMatchObject({ bestChain: null })
	})

	it('finds no IP-time chain when requests use different proxy circuits', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[
					addressRequest([A1], [], 0, { proxy: 'circuit-a' }),
					addressRequest([A2], [], 1_000, { proxy: 'circuit-b' }),
				],
			),
		)

		expect(result).toMatchObject({ bestChain: null })
	})

	it('finds a UserInfo chain when requests share an identical email', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[
					addressRequest([A1], [[PersonalInfo.EMAIL, ['user@example.com']]], 0),
					addressRequest([A2], [[PersonalInfo.EMAIL, ['user@example.com']]], 1_000),
				],
			),
		)

		expect(result).toMatchObject({
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
			bestChain: { length: 1, weakestEdge: { kind: 'userInfo' } },
		})
	})

	it('finds a UserInfo chain even when requests are beyond the IP-time window', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[
					addressRequest([A1], [[PersonalInfo.EMAIL, ['user@example.com']]], 0),
					addressRequest(
						[A2],
						[[PersonalInfo.EMAIL, ['user@example.com']]],
						IP_TIME_CORRELATION_WINDOW_MS + 1,
					),
				],
			),
		)

		expect(result).toMatchObject({
			bestChain: { length: 1, weakestEdge: { kind: 'userInfo' } },
		})
	})

	it('prefers a direct chain over a longer transitive chain', () => {
		// A1 and A2 are directly IP-time linked (length 1), but there is also a
		// transitive path through R (length 2). The direct chain should win.
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[addressRequest([A1], [], 0), addressRequest([A2], [], 1_000)],
				[correlatableOnlyRequest([], 500)],
			),
		)

		expect(result).toMatchObject({ bestChain: { length: 1 } })
	})

	it('finds a transitive chain through a correlatable-only request', () => {
		// A1 --IP-time--> R --IP-time--> A2, where A1 and A2 are just beyond the
		// window of each other so no direct edge exists.
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[
					addressRequest([A1], [], 0),
					addressRequest([A2], [], IP_TIME_CORRELATION_WINDOW_MS + 1_000),
				],
				[correlatableOnlyRequest([], IP_TIME_CORRELATION_WINDOW_MS / 2)],
			),
		)

		expect(result).toMatchObject({ bestChain: { length: 2, weakestEdge: { kind: 'ipTime' } } })
	})

	it('builds a combined chain from a UserInfo edge and an IP-time edge', () => {
		// A1 --UserInfo(email)--> R --IP-time--> A2.
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[
					addressRequest([A1], [[PersonalInfo.EMAIL, ['user@example.com']]], 0),
					addressRequest([A2], [], IP_TIME_CORRELATION_WINDOW_MS + 1_000),
				],
				[
					correlatableOnlyRequest(
						[[PersonalInfo.EMAIL, ['user@example.com']]],
						IP_TIME_CORRELATION_WINDOW_MS / 2,
					),
				],
			),
		)

		expect(result).toMatchObject({ bestChain: { length: 2 } })
	})

	it('prefers a UserInfo weakest edge over an IP-time weakest edge for equal-length chains', () => {
		// Two length-2 chains between A1 and A2 (which are just beyond the window
		// of each other, so no direct edge exists):
		// - A1 --UserInfo(email)--> R1 --UserInfo(phone)--> A2 (weakest = email).
		// - A1 --IP-time--> R2 --IP-time--> A2 (weakest = IP-time, weaker).
		// The UserInfo chain wins because its weakest edge is stronger.
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[
					addressRequest([A1], [[PersonalInfo.EMAIL, ['user@example.com']]], 0),
					addressRequest(
						[A2],
						[[PersonalInfo.PHONE, ['555']]],
						IP_TIME_CORRELATION_WINDOW_MS + 1_000,
					),
				],
				[
					correlatableOnlyRequest(
						[
							[PersonalInfo.EMAIL, ['user@example.com']],
							[PersonalInfo.PHONE, ['555']],
						],
						50 * IP_TIME_CORRELATION_WINDOW_MS,
					),
					correlatableOnlyRequest([], IP_TIME_CORRELATION_WINDOW_MS / 2),
				],
			),
		)

		expect(result).toMatchObject({ bestChain: { length: 2, weakestEdge: { kind: 'userInfo' } } })
	})

	it('does not flag correlation for a single address even when it carries correlatable user info', () => {
		const result = classifyEntityMultiAddressHandling(
			1,
			entityRequests(
				[A1],
				[addressRequest([A1], [[PersonalInfo.TRACKING_IDENTIFIER, ['idA']]], 0)],
			),
		)

		expect(result).toEqual({ type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY })
	})
})

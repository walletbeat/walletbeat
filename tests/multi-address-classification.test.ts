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
} from '@/tools/wallet-data-collection/multi-address-classification'
import type { Erc55Address } from '@/types/utils/ethereum-address'
import { assertNonEmptyArray } from '@/types/utils/non-empty'

const A1 = '0x1111111111111111111111111111111111111111'
const A2 = '0x2222222222222222222222222222222222222222'
const A3 = '0x3333333333333333333333333333333333333333'

/** Build a `correlatableUserInfo` map from `[UserInfo, values]` entries. */
function userInfoMap(entries: Array<[UserInfo, string[]]>): Map<UserInfo, Set<string>> {
	return new Map(entries.map(([info, values]) => [info, new Set(values)]))
}

function addressRequest(
	addresses: Erc55Address[],
	correlatableUserInfo: Array<[UserInfo, string[]]> = [],
	sessionMilliseconds = 0,
): AddressBearingRequest {
	return {
		addresses: assertNonEmptyArray(addresses),
		correlatableUserInfo: userInfoMap(correlatableUserInfo),
		sessionMilliseconds,
	}
}

function correlatableOnlyRequest(
	correlatableUserInfo: Array<[UserInfo, string[]]>,
	sessionMilliseconds = 0,
): CorrelatableOnlyRequest {
	return {
		correlatableUserInfo: userInfoMap(correlatableUserInfo),
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

	it('does not flag correlation when requests carry no correlatable user info', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests([A1, A2], [addressRequest([A1], [], 0), addressRequest([A2], [], 0)]),
		)

		expect(result).toMatchObject({
			correlatableUserInfoCorrelation: 'NOT_CORRELATABLE',
		})
	})

	it('flags two addresses as correlatable when their requests share a tracking identifier', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[
					addressRequest([A1], [[PersonalInfo.TRACKING_IDENTIFIER, ['shared-cookie']]], 0),
					addressRequest([A2], [[PersonalInfo.TRACKING_IDENTIFIER, ['shared-cookie']]], 1_000),
				],
			),
		)

		expect(result).toMatchObject({
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
			correlatableUserInfoCorrelation: 'CORRELATABLE',
		})
	})

	it('flags two addresses as correlatable when their requests share an email', () => {
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
			correlatableUserInfoCorrelation: 'CORRELATABLE',
		})
	})

	it('flags two addresses as correlatable through a transitive chain of correlatable user info', () => {
		// R1: A1 + idA,idB; R2: idB,idC; R3: idC,idD; R4: idD + A2.
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[
					addressRequest([A1], [[PersonalInfo.TRACKING_IDENTIFIER, ['idA', 'idB']]], 0),
					addressRequest([A2], [[PersonalInfo.TRACKING_IDENTIFIER, ['idD']]], 4_000),
				],
				[
					correlatableOnlyRequest([[PersonalInfo.TRACKING_IDENTIFIER, ['idB', 'idC']]], 1_000),
					correlatableOnlyRequest([[PersonalInfo.TRACKING_IDENTIFIER, ['idC', 'idD']]], 2_000),
				],
			),
		)

		expect(result).toMatchObject({
			correlatableUserInfoCorrelation: 'CORRELATABLE',
		})
	})

	it('does not flag correlation when the shared chain does not reach both addresses', () => {
		// A1 shares an identifier with A2's chain, but a third address A3 shares
		// identifiers with nothing that reaches A1/A2, so it stays uncorrelated.
		const result = classifyEntityMultiAddressHandling(
			3,
			entityRequests(
				[A1, A2, A3],
				[
					addressRequest([A1], [[PersonalInfo.TRACKING_IDENTIFIER, ['idA']]], 0),
					addressRequest([A2], [[PersonalInfo.TRACKING_IDENTIFIER, ['idA']]], 1_000),
					addressRequest([A3], [[PersonalInfo.TRACKING_IDENTIFIER, ['idZ']]], 2_000),
				],
			),
		)

		expect(result).toMatchObject({
			correlatableUserInfoCorrelation: 'CORRELATABLE',
		})
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

	it('flags correlation when a correlatable-only request bridges two address requests', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[
					addressRequest([A1], [[PersonalInfo.TRACKING_IDENTIFIER, ['idA']]], 0),
					addressRequest([A2], [[PersonalInfo.TRACKING_IDENTIFIER, ['idC']]], 2_000),
				],
				[
					correlatableOnlyRequest([[PersonalInfo.TRACKING_IDENTIFIER, ['idA', 'idB']]], 1_000),
					correlatableOnlyRequest([[PersonalInfo.TRACKING_IDENTIFIER, ['idB', 'idC']]], 1_500),
				],
			),
		)

		expect(result).toMatchObject({
			correlatableUserInfoCorrelation: 'CORRELATABLE',
		})
	})

	it('does not flag correlation when correlatable user info is disjoint between addresses', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[
					addressRequest([A1], [[PersonalInfo.TRACKING_IDENTIFIER, ['cookie-1']]], 0),
					addressRequest([A2], [[PersonalInfo.TRACKING_IDENTIFIER, ['cookie-2']]], 1_000),
				],
			),
		)

		expect(result).toMatchObject({
			correlatableUserInfoCorrelation: 'NOT_CORRELATABLE',
		})
	})
})

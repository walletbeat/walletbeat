import { describe, expect, it } from 'vitest'

import { MultiAddressPolicy } from '@/schema/features/privacy/data-collection'
import {
	type AddressBearingRequest,
	classifyEntityMultiAddressHandling,
	type EntityRequests,
	type TrackingOnlyRequest,
} from '@/tools/wallet-data-collection/multi-address-classification'
import type { Erc55Address } from '@/types/utils/ethereum-address'
import { assertNonEmptyArray } from '@/types/utils/non-empty'

const A1 = '0x1111111111111111111111111111111111111111'
const A2 = '0x2222222222222222222222222222222222222222'
const A3 = '0x3333333333333333333333333333333333333333'

function addressRequest(
	addresses: Erc55Address[],
	trackingIdentifiers: string[] = [],
	sessionMilliseconds = 0,
): AddressBearingRequest {
	return {
		addresses: assertNonEmptyArray(addresses),
		trackingIdentifiers: new Set(trackingIdentifiers),
		sessionMilliseconds,
	}
}

function trackingRequest(
	trackingIdentifiers: string[],
	sessionMilliseconds = 0,
): TrackingOnlyRequest {
	return {
		trackingIdentifiers: new Set(trackingIdentifiers),
		sessionMilliseconds,
	}
}

function entityRequests(
	addresses: Erc55Address[],
	requests: AddressBearingRequest[],
	trackingOnlyRequests: TrackingOnlyRequest[] = [],
): EntityRequests {
	return {
		addresses: assertNonEmptyArray(addresses),
		requests,
		trackingOnlyRequests,
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

	it('does not flag correlation when requests carry no tracking identifiers', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests([A1, A2], [addressRequest([A1], [], 0), addressRequest([A2], [], 0)]),
		)

		expect(result).toMatchObject({
			trackingIdentifierCorrelation: 'NOT_CORRELATABLE',
		})
	})

	it('flags two addresses as correlatable when their requests share a tracking identifier', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[
					addressRequest([A1], ['shared-cookie'], 0),
					addressRequest([A2], ['shared-cookie'], 1_000),
				],
			),
		)

		expect(result).toMatchObject({
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
			trackingIdentifierCorrelation: 'CORRELATABLE',
		})
	})

	it('flags two addresses as correlatable through a transitive chain of tracking identifiers', () => {
		// R1: A1 + idA,idB; R2: idB,idC; R3: idC,idD; R4: idD + A2.
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[addressRequest([A1], ['idA', 'idB'], 0), addressRequest([A2], ['idD'], 4_000)],
				[trackingRequest(['idB', 'idC'], 1_000), trackingRequest(['idC', 'idD'], 2_000)],
			),
		)

		expect(result).toMatchObject({
			trackingIdentifierCorrelation: 'CORRELATABLE',
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
					addressRequest([A1], ['idA'], 0),
					addressRequest([A2], ['idA'], 1_000),
					addressRequest([A3], ['idZ'], 2_000),
				],
			),
		)

		expect(result).toMatchObject({
			trackingIdentifierCorrelation: 'CORRELATABLE',
		})
	})

	it('does not flag correlation for a single address even when it carries tracking identifiers', () => {
		const result = classifyEntityMultiAddressHandling(
			1,
			entityRequests([A1], [addressRequest([A1], ['idA'], 0)]),
		)

		expect(result).toEqual({ type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY })
	})

	it('flags correlation when a tracking-only request bridges two address requests', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[addressRequest([A1], ['idA'], 0), addressRequest([A2], ['idC'], 2_000)],
				[trackingRequest(['idA', 'idB'], 1_000), trackingRequest(['idB', 'idC'], 1_500)],
			),
		)

		expect(result).toMatchObject({
			trackingIdentifierCorrelation: 'CORRELATABLE',
		})
	})

	it('does not flag correlation when tracking identifiers are disjoint between addresses', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests(
				[A1, A2],
				[addressRequest([A1], ['cookie-1'], 0), addressRequest([A2], ['cookie-2'], 1_000)],
			),
		)

		expect(result).toMatchObject({
			trackingIdentifierCorrelation: 'NOT_CORRELATABLE',
		})
	})
})

import { describe, expect, it } from 'vitest'

import { MultiAddressPolicy } from '@/schema/features/privacy/data-collection'
import {
	classifyEntityMultiAddressHandling,
	type EntityRequests,
	SIMULTANEOUS_WINDOW_MS,
} from '@/tools/wallet-data-collection/multi-address-classification'
import type { Erc55Address } from '@/types/utils/ethereum-address'
import type { NonEmptyArray } from '@/types/utils/non-empty'

const A = '0x1111111111111111111111111111111111111111' as Erc55Address
const B = '0x2222222222222222222222222222222222222222' as Erc55Address

function req(addresses: NonEmptyArray<Erc55Address>, ms: number) {
	return { addresses, sessionMilliseconds: ms }
}

function entityRequests(
	addresses: NonEmptyArray<Erc55Address>,
	requests: ReturnType<typeof req>[],
): EntityRequests {
	return { addresses, requests }
}

describe('classifyEntityMultiAddressHandling', () => {
	it('returns null for an entity with no address-bearing requests', () => {
		const result = classifyEntityMultiAddressHandling(2, entityRequests([A], []))

		expect(result).toBeNull()
	})

	it('classifies a single managed address as ACTIVE_ADDRESS_ONLY', () => {
		const result = classifyEntityMultiAddressHandling(1, entityRequests([A], [req([A], 100)]))

		expect(result).toEqual({ type: MultiAddressPolicy.ACTIVE_ADDRESS_ONLY })
	})

	it('classifies a single request carrying multiple addresses as SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES', () => {
		const result = classifyEntityMultiAddressHandling(2, entityRequests([A, B], [req([A, B], 100)]))

		expect(result).toEqual({ type: MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES })
	})

	it('classifies multiple addresses sent to the same endpoint as SEPARATE_REQUEST_PER_ADDRESS with SAME_FOR_ALL', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests([A, B], [req([A], 100), req([B], 200)]),
		)

		expect(result).toEqual({
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
			destination: 'SAME_FOR_ALL',
			proxy: 'NONE',
			timing: 'SIMULTANEOUS',
		})
	})

	it('classifies an entity that sees a single address as ISOLATED when the wallet manages multiple', () => {
		const result = classifyEntityMultiAddressHandling(2, entityRequests([A], [req([A], 100)]))

		expect(result).toEqual({
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
			destination: 'ISOLATED',
			proxy: 'NONE',
			timing: 'STAGGERED',
		})
	})

	it('classifies requests spread far apart in time as STAGGERED', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests([A, B], [req([A], 0), req([B], SIMULTANEOUS_WINDOW_MS + 1)]),
		)

		expect(result).toEqual({
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
			destination: 'SAME_FOR_ALL',
			proxy: 'NONE',
			timing: 'STAGGERED',
		})
	})

	it('classifies requests within the window as SIMULTANEOUS', () => {
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests([A, B], [req([A], 0), req([B], SIMULTANEOUS_WINDOW_MS - 1)]),
		)

		expect(result).toEqual({
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
			destination: 'SAME_FOR_ALL',
			proxy: 'NONE',
			timing: 'SIMULTANEOUS',
		})
	})

	it('ignores repeated requests for the same address when classifying timing', () => {
		// Two requests for the same address, far apart in time, then one
		// request for a different address close to the first. The repeated
		// same-address requests should not make the timing appear staggered.
		const result = classifyEntityMultiAddressHandling(
			2,
			entityRequests([A, B], [req([A], 0), req([A], 100_000), req([B], 5_000)]),
		)

		expect(result).toEqual({
			type: MultiAddressPolicy.SEPARATE_REQUEST_PER_ADDRESS,
			destination: 'SAME_FOR_ALL',
			proxy: 'NONE',
			timing: 'SIMULTANEOUS',
		})
	})

	it('treats a single request as staggered (no correlation signal)', () => {
		const result = classifyEntityMultiAddressHandling(2, entityRequests([A], [req([A], 100)]))

		expect(result).toMatchObject({ timing: 'STAGGERED' })
	})
})

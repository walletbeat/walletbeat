import { afterEach, describe, expect, it, vi } from 'vitest'

import { eip712 } from '@/data/eips/eip-712'
import { erc4337 } from '@/data/eips/erc-4337'
import { EipPrefix, EipStatus } from '@/schema/eips'
import {
	checkEip,
	type EipCheckResultDrift,
	EipMismatchField,
	EipStatusCheckKind,
} from '@/tools/eip-status-checker/eip-status-checker-lib'

function upstreamSpec(status: string, category?: string): string {
	return [
		'---',
		`status: ${status}`,
		...(category === undefined ? [] : [`category: ${category}`]),
		'---',
		'',
		'# Test specification',
	].join('\n')
}

function response(status: string, category?: string): Response {
	return new Response(upstreamSpec(status, category))
}

function expectDrift(result: Awaited<ReturnType<typeof checkEip>>): EipCheckResultDrift {
	expect(result.kind).toBe(EipStatusCheckKind.DRIFT)

	if (result.kind !== EipStatusCheckKind.DRIFT) {
		throw new Error(`Expected drift, received ${result.kind}`)
	}

	return result
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('EIP status checker drift detection', () => {
	it('reports a stale EIP prefix when upstream classifies the spec as an ERC', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(response('Final', 'ERC'))

		const result = expectDrift(await checkEip(eip712))

		expect(result.mismatches).toContainEqual({
			field: EipMismatchField.PREFIX,
			ours: EipPrefix.EIP,
			upstream: EipPrefix.ERC,
			upstreamRaw: 'ERC',
		})
	})

	it('follows a Moved tombstone and evaluates the destination spec', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(response('Moved', 'ERC'))
			.mockResolvedValueOnce(response('Final', 'ERC'))

		vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock)

		const result = expectDrift(await checkEip(eip712))

		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(result.mismatches).toContainEqual({
			field: EipMismatchField.PREFIX,
			ours: EipPrefix.EIP,
			upstream: EipPrefix.ERC,
			upstreamRaw: 'ERC',
		})
	})

	it('reports an upstream status that Walletbeat does not model as drift', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(response('Stagnant'))

		const result = expectDrift(await checkEip(eip712))

		expect(result.mismatches).toContainEqual({
			field: EipMismatchField.STATUS,
			ours: EipStatus.FINAL,
			upstream: null,
			upstreamRaw: 'Stagnant',
		})
	})

	it('treats a missing upstream category as EIP prefix drift for an ERC record', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(response('Final'))

		const result = expectDrift(await checkEip(erc4337))

		expect(result.mismatches).toContainEqual({
			field: EipMismatchField.PREFIX,
			ours: EipPrefix.ERC,
			upstream: EipPrefix.EIP,
			upstreamRaw: null,
		})
	})
})

import { z } from 'astro/zod'
import { AbiFunction, Hash, Hex, RpcTransport, TxEnvelopeEip1559 } from 'ox'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
	cidToContentHash,
	encodeEnsName,
	readEnsContentHash,
	resolveAbi,
	UNIVERSAL_RESOLVER_ADDRESS,
} from '@/tools/ens-content-hash-checker/ens-content-hash-checker-lib'
import {
	deploymentGas,
	SubmissionError,
	updateEnsContentHash,
} from '@/tools/ens-content-hash-checker/ens-update-lib'
import { assertStringHasPrefix } from '@/types/utils/text'

const OLD_CID = 'bafybeiei3uuywhsrkwtjwvxob554e63qqcmvm55qghage353ztxxcn54t4'
const NEW_CID = 'bafybeiaurcu736zyugzywkc7sc6dg52x64xl3lp2ydfkio6twtystlgbcm'
const RESOLVER = '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63'
// Public test key used only with an in-memory RPC transport.
const TEST_KEY = `0x${'01'.repeat(32)}` as const
const contenthashAbi = {
	name: 'contenthash',
	type: 'function',
	inputs: [{ type: 'bytes32' }],
	outputs: [{ type: 'bytes' }],
	stateMutability: 'view',
} as const

interface Scenario {
	version?: 1 | 2
	alreadyCurrent?: boolean
	unauthorized?: boolean
	chain?: string
	pending?: boolean
	gasEstimate?: string
	receipt?: 'success' | 'failure' | 'missing' | 'wrong-hash'
	unchanged?: boolean
	sendError?: boolean
	malformedResolution?: boolean
}

function fixture(scenario: Scenario = {}) {
	const requests: { method: string; params: unknown[] }[] = []
	let submitted: Hex.Hex | null = null
	let transactionHash: Hex.Hex = '0x00'
	const fetchFn: typeof fetch = async input => {
		if (!(input instanceof Request)) {
			throw new Error('Expected an RPC Request.')
		}

		const body = z
			.object({ id: z.number(), method: z.string(), params: z.array(z.unknown()).optional() })
			.parse(await input.json())
		const params = body.params ?? []

		requests.push({ method: body.method, params })
		let result: unknown
		let error = false

		switch (body.method) {
			case 'eth_chainId':
				result = scenario.chain ?? '0x1'
				break
			case 'eth_getCode':
				result = '0x6000'
				break
			case 'eth_getTransactionCount':
				result = scenario.pending && params[1] === 'pending' ? '0x1' : '0x0'
				break
			case 'eth_estimateGas':
				result = scenario.gasEstimate ?? '0xd736'
				break
			case 'eth_getBlockByNumber':
				result = { baseFeePerGas: '0x3b9aca00' }
				break
			case 'eth_maxPriorityFeePerGas':
				result = '0x3b9aca00'
				break
			case 'eth_call': {
				const call = z
					.object({
						to: z.string(),
						data: z.custom<Hex.Hex>(Hex.validate),
						gas: z.custom<Hex.Hex>(Hex.validate),
					})
					.parse(params[0])

				if (call.to === UNIVERSAL_RESOLVER_ADDRESS) {
					const current =
						scenario.alreadyCurrent === true || (submitted !== null && scenario.unchanged !== true)

					result =
						scenario.malformedResolution === true
							? '0x'
							: AbiFunction.encodeResult(resolveAbi, [
									AbiFunction.encodeResult(
										contenthashAbi,
										cidToContentHash(current ? NEW_CID : OLD_CID),
									),
									RESOLVER,
								])
				} else {
					const selector = scenario.version === 1 ? '0x304e6ade' : '0xc5d7badd'

					error =
						scenario.unauthorized === true ||
						!call.data.startsWith(selector) ||
						BigInt(call.gas) < 60_000n
					result = '0x'
				}

				break
			}
			case 'eth_sendRawTransaction': {
				const raw = params[0]

				if (!Hex.validate(raw)) {
					throw new Error('Missing signed transaction.')
				}

				submitted = raw
				transactionHash = Hash.keccak256(raw)
				expect(marker).toHaveBeenCalledWith(transactionHash)
				error = scenario.sendError === true
				result = transactionHash
				break
			}
			case 'eth_getTransactionReceipt':
				result =
					scenario.receipt === 'missing'
						? null
						: {
								status: scenario.receipt === 'failure' ? '0x0' : '0x1',
								transactionHash: scenario.receipt === 'wrong-hash' ? '0x00' : transactionHash,
							}
				break
			default:
				throw new Error(`Unexpected RPC method ${body.method}.`)
		}

		return new Response(
			JSON.stringify({
				jsonrpc: '2.0',
				id: body.id,
				...(error ? { error: { code: -32000, message: 'Execution failed.' } } : { result }),
			}),
			{ headers: { 'Content-Type': 'application/json' } },
		)
	}
	const marker = vi.fn()
	const transport = RpcTransport.fromHttp('https://rpc.invalid', { fetchFn, timeout: 0 })

	return {
		transport,
		requests,
		marker,
		raw: () => submitted,
		update: () => updateEnsContentHash(transport, 'beta.walletbeat.eth', NEW_CID, TEST_KEY, marker),
	}
}

afterEach(() => vi.useRealTimers())

describe('universal ENS deployment', () => {
	it('encodes DNS names and resolves content without a legacy registry lookup', async () => {
		const f = fixture()

		expect(encodeEnsName('beta.walletbeat.eth')).toBe(
			'0x04626574610a77616c6c6574626561740365746800',
		)
		expect(await readEnsContentHash(f.transport, 'beta.walletbeat.eth')).toEqual({
			cid: OLD_CID,
			resolver: RESOLVER.toLowerCase(),
		})
		expect(f.requests).toHaveLength(1)
		const call = z.object({ data: z.custom<Hex.Hex>(Hex.validate) }).parse(f.requests[0]?.params[0])

		expect(AbiFunction.decodeData(resolveAbi, call.data)[0]).toBe(
			encodeEnsName('beta.walletbeat.eth'),
		)
	})

	it.each([1, 2] as const)(
		'signs the simulated ENSv%i setter with buffered gas and verifies its receipt and content',
		async version => {
			const f = fixture({ version })

			await f.update()
			const raw = f.raw()

			if (raw === null) {
				throw new Error('No transaction submitted.')
			}

			const transaction = TxEnvelopeEip1559.deserialize(assertStringHasPrefix(raw, '0x02'))

			expect(transaction.gas).toBe(100_000n)
			expect(transaction.chainId).toBe(1)
			expect(transaction.data?.startsWith(version === 1 ? '0x304e6ade' : '0xc5d7badd')).toBe(true)
			expect(f.marker).toHaveBeenCalledWith(Hash.keccak256(raw))
			expect(
				f.requests.filter(request => request.method === 'eth_sendRawTransaction'),
			).toHaveLength(1)
			expect(f.requests.at(-1)?.method).toBe('eth_call')
		},
	)

	it('uses the execution RPC only to veto a conflicting pending nonce', async () => {
		const verified = fixture()
		const execution = fixture({ pending: true })

		await expect(
			updateEnsContentHash(
				verified.transport,
				'beta.walletbeat.eth',
				NEW_CID,
				TEST_KEY,
				verified.marker,
				execution.transport,
			),
		).rejects.toBeInstanceOf(SubmissionError)
		expect(execution.requests).toHaveLength(1)
		expect(execution.requests[0]?.method).toBe('eth_getTransactionCount')
		expect(execution.requests[0]?.params[1]).toBe('pending')
		expect(verified.requests.some(request => request.params[1] === 'pending')).toBe(false)
		expect(verified.raw()).toBeNull()
	})

	it('does not submit when the record is already current', async () => {
		const f = fixture({ alreadyCurrent: true })

		await f.update()
		expect(f.marker).not.toHaveBeenCalled()
		expect(f.raw()).toBeNull()
	})

	it.each<Scenario>([
		{ chain: '0x2' },
		{ unauthorized: true },
		{ pending: true },
		{ gasEstimate: '0x0' },
		{ gasEstimate: '0xf4241' },
		{ malformedResolution: true },
	])('rejects unsafe preparation: %j', async scenario => {
		const f = fixture(scenario)

		await expect(f.update()).rejects.toThrow()
		expect(f.raw()).toBeNull()
		expect(f.marker).not.toHaveBeenCalled()
	})

	it.each<Scenario>([
		{ receipt: 'failure' },
		{ receipt: 'wrong-hash' },
		{ unchanged: true },
		{ sendError: true },
	])('stops automatic retries after submission: %j', async scenario => {
		const f = fixture(scenario)

		await expect(f.update()).rejects.toBeInstanceOf(SubmissionError)
		expect(f.marker).toHaveBeenCalledOnce()
		expect(f.requests.filter(request => request.method === 'eth_sendRawTransaction')).toHaveLength(
			1,
		)
	})

	it('bounds receipt waiting without submitting another transaction', async () => {
		vi.useFakeTimers()
		const f = fixture({ receipt: 'missing' })
		const outcome = expect(f.update()).rejects.toThrow('Timed out')

		await vi.runAllTimersAsync()
		await outcome
		expect(f.requests.filter(request => request.method === 'eth_sendRawTransaction')).toHaveLength(
			1,
		)
	})

	it('enforces the gas budget after adding the margin', () => {
		expect(deploymentGas(55_094n)).toBe(100_000n)
		expect(deploymentGas(200_001n)).toBe(300_002n)
		expect(() => deploymentGas(700_000n)).toThrow('budget')
	})
})

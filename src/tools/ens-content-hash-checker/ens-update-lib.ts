import {
	AbiFunction,
	Address,
	Ens,
	Hash,
	Hex,
	RpcTransport,
	Secp256k1,
	TxEnvelopeEip1559,
} from 'ox'

import { cidToContentHash, encodeEnsName, readEnsContentHash } from './ens-content-hash-checker-lib'

const MAX_GAS = 1_000_000n
const MIN_GAS = 100_000n

/** A send may have reached the network; automatic retries could duplicate a transaction. */
export class SubmissionError extends Error {}

/** Reserve gas for nested calls and storage-write sentries, with a bounded transaction budget. */
export function deploymentGas(estimate: bigint): bigint {
	if (estimate <= 0n || estimate > MAX_GAS) {
		throw new Error('ENS gas estimate is outside the deployment budget.')
	}

	const buffered = (estimate * 3n + 1n) / 2n
	const gas = buffered < MIN_GAS ? MIN_GAS : buffered

	if (gas > MAX_GAS) {
		throw new Error('Buffered ENS gas exceeds the deployment budget.')
	}

	return gas
}

/** Submit one mainnet update; callers may retry only errors raised before submission. */
export async function updateEnsContentHash(
	transport: RpcTransport.Http,
	domain: string,
	cid: string,
	privateKey: Hex.Hex,
	onSubmission: (transactionHash: Hex.Hex) => void,
	pendingTransport: RpcTransport.Http = transport,
): Promise<void> {
	if (BigInt(await transport.request({ method: 'eth_chainId' })) !== 1n) {
		throw new Error('ENS deployment requires Ethereum mainnet.')
	}

	const current = await readEnsContentHash(transport, domain)

	if (current.cid === cid) {
		return
	}

	if (
		(await transport.request({ method: 'eth_getCode', params: [current.resolver, 'latest'] })) ===
		'0x'
	) {
		throw new Error('ENS resolver has no contract code.')
	}

	let from: Address.Address

	try {
		from = Address.fromPublicKey(Secp256k1.getPublicKey({ privateKey }))
	} catch {
		throw new Error('Invalid ENS updater private key.')
	}

	const latestNonce = BigInt(
		await transport.request({ method: 'eth_getTransactionCount', params: [from, 'latest'] }),
	)
	const pendingNonce = BigInt(
		await pendingTransport.request({
			method: 'eth_getTransactionCount',
			params: [from, 'pending'],
		}),
	)

	if (pendingNonce !== latestNonce) {
		throw new SubmissionError(
			'Updater has a pending transaction; reconcile it before another deployment.',
		)
	}

	const hash = cidToContentHash(cid)
	// Authorization is checked by simulating the actual setter. ENSv1 takes a
	// namehash; ENSv2 takes DNS bytes. A failed simulation never sends a transaction.
	const candidates = [
		AbiFunction.encodeData(
			{
				name: 'setContenthash',
				type: 'function',
				inputs: [{ type: 'bytes' }, { type: 'bytes' }],
				outputs: [],
				stateMutability: 'nonpayable',
			},
			[encodeEnsName(domain), hash],
		),
		AbiFunction.encodeData(
			{
				name: 'setContenthash',
				type: 'function',
				inputs: [{ type: 'bytes32' }, { type: 'bytes' }],
				outputs: [],
				stateMutability: 'nonpayable',
			},
			[Ens.namehash(Ens.normalize(domain)), hash],
		),
	]
	let data: Hex.Hex | null = null

	for (const candidate of candidates) {
		try {
			await transport.request({
				method: 'eth_call',
				params: [
					{ from, to: current.resolver, data: candidate, gas: Hex.fromNumber(MAX_GAS) },
					'latest',
				],
			})
			data = candidate
			break
		} catch {
			// Only a successful simulation selects a resolver interface.
		}
	}

	if (data === null) {
		throw new Error(
			'Neither ENS setter simulation succeeded; check resolver configuration, worker authorization, and RPC availability.',
		)
	}

	const call = { from, to: current.resolver, data }
	const gas = deploymentGas(
		BigInt(
			await transport.request({
				method: 'eth_estimateGas',
				params: [{ ...call, gas: Hex.fromNumber(MAX_GAS) }],
			}),
		),
	)

	await transport.request({
		method: 'eth_call',
		params: [{ ...call, gas: Hex.fromNumber(gas) }, 'latest'],
	})
	const block = await transport.request({
		method: 'eth_getBlockByNumber',
		params: ['latest', false],
	})

	if (block === null || block.baseFeePerGas === undefined) {
		throw new Error('RPC did not provide a mainnet base fee.')
	}

	const priority = BigInt(await transport.request({ method: 'eth_maxPriorityFeePerGas' }))
	const transaction = TxEnvelopeEip1559.from({
		chainId: 1,
		to: current.resolver,
		data,
		nonce: latestNonce,
		gas,
		maxPriorityFeePerGas: priority,
		maxFeePerGas: BigInt(block.baseFeePerGas) * 2n + priority,
		value: 0n,
	})
	const signature = Secp256k1.sign({
		payload: TxEnvelopeEip1559.getSignPayload(transaction),
		privateKey,
	})
	const serialized = TxEnvelopeEip1559.serialize(transaction, { signature })
	const transactionHash = Hash.keccak256(serialized)

	process.stderr.write(`Submitting ENS transaction ${transactionHash} with gas limit ${gas}.\n`)
	onSubmission(transactionHash)

	try {
		const returnedHash = await transport.request({
			method: 'eth_sendRawTransaction',
			params: [serialized],
		})

		if (returnedHash.toLowerCase() !== transactionHash.toLowerCase()) {
			throw new Error('RPC returned a different transaction hash.')
		}

		const deadline = Date.now() + 120_000

		while (Date.now() < deadline) {
			const receipt = await transport.request({
				method: 'eth_getTransactionReceipt',
				params: [transactionHash],
			})

			if (receipt !== null) {
				if (
					receipt.status !== '0x1' ||
					receipt.transactionHash.toLowerCase() !== transactionHash.toLowerCase()
				) {
					throw new Error('ENS transaction receipt did not confirm success.')
				}

				if ((await readEnsContentHash(transport, domain)).cid !== cid) {
					throw new Error('Confirmed transaction did not resolve to the intended CID.')
				}

				return
			}

			await new Promise<void>(resolve => setTimeout(resolve, 2_000))
		}
		throw new Error('Timed out waiting for the ENS transaction receipt.')
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'RPC failure'

		throw new SubmissionError(
			`ENS transaction ${transactionHash}: ${reason} Reconcile this transaction before retrying.`,
		)
	}
}

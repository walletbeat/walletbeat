import { Address, Hash, Hex, RpcTransport, Secp256k1, TxEnvelopeEip1559 } from 'ox'

import { readEnsContentHash } from './ens-content-hash-checker-lib'
import { simulateEnsUpdate } from './ens-preflight-lib'

/** A send may have reached the network; automatic retries could duplicate a transaction. */
export class SubmissionError extends Error {}

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

	const { call, gas } = await simulateEnsUpdate(transport, domain, cid, from, current.resolver)
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
		to: call.to,
		data: call.data,
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

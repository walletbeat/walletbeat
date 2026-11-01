import { Hex, RpcTransport } from 'ox'
import { createWalletClient, custom, keccak256, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

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
	const client = createWalletClient({
		chain: mainnet,
		transport: custom(transport, { retryCount: 0 }),
	}).extend(publicActions)

	if ((await client.getChainId()) !== mainnet.id) {
		throw new Error('ENS deployment requires Ethereum mainnet.')
	}

	const current = await readEnsContentHash(transport, domain)

	if (current.cid === cid) {
		return
	}

	let account: ReturnType<typeof privateKeyToAccount>

	try {
		account = privateKeyToAccount(privateKey)
	} catch {
		throw new Error('Invalid ENS updater private key.')
	}

	const nonce = await client.getTransactionCount({ address: account.address, blockTag: 'latest' })
	const pendingNonce = BigInt(
		await pendingTransport.request({
			method: 'eth_getTransactionCount',
			params: [account.address, 'pending'],
		}),
	)

	if (pendingNonce !== BigInt(nonce)) {
		throw new SubmissionError(
			'Updater has a pending transaction; reconcile it before another deployment.',
		)
	}

	const { call, gas } = await simulateEnsUpdate(
		transport,
		domain,
		cid,
		account.address,
		current.resolver,
	)
	const request = await client.prepareTransactionRequest({
		account,
		to: call.to,
		data: call.data,
		nonce,
		gas,
		value: 0n,
		type: 'eip1559',
		parameters: ['fees', 'chainId'],
	})
	const serialized = await client.signTransaction(request)
	const transactionHash = keccak256(serialized)

	process.stderr.write(`Submitting ENS transaction ${transactionHash} with gas limit ${gas}.\n`)
	onSubmission(transactionHash)

	try {
		const returnedHash = await client.sendRawTransaction({ serializedTransaction: serialized })

		if (returnedHash.toLowerCase() !== transactionHash.toLowerCase()) {
			throw new Error('RPC returned a different transaction hash.')
		}

		const receipt = await client.waitForTransactionReceipt({
			hash: transactionHash,
			timeout: 120_000,
			pollingInterval: 2_000,
			checkReplacement: false,
			retryCount: 0,
		})

		if (
			receipt.status !== 'success' ||
			receipt.transactionHash.toLowerCase() !== transactionHash.toLowerCase()
		) {
			throw new Error('ENS transaction receipt did not confirm success.')
		}

		if ((await readEnsContentHash(transport, domain)).cid !== cid) {
			throw new Error('Confirmed transaction did not resolve to the intended CID.')
		}
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'RPC failure'

		throw new SubmissionError(
			`ENS transaction ${transactionHash}: ${reason} Reconcile this transaction before retrying.`,
		)
	}
}

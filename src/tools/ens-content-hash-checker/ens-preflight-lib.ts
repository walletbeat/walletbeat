import { AbiFunction, Address, Ens, Hex, RpcTransport } from 'ox'

import {
	base32Encode,
	cidToContentHash,
	encodeEnsName,
	readEnsContentHash,
} from './ens-content-hash-checker-lib'

const MAX_GAS = 1_000_000n
const MIN_GAS = 100_000n

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

/** Simulate the same setter and gas budget used by deployment, without signing or broadcasting. */
export async function simulateEnsUpdate(
	transport: RpcTransport.Http,
	domain: string,
	cid: string,
	from: Address.Address,
	resolver: Address.Address,
) {
	if ((await transport.request({ method: 'eth_getCode', params: [resolver, 'latest'] })) === '0x') {
		throw new Error('ENS resolver has no contract code.')
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
				params: [{ from, to: resolver, data: candidate, gas: Hex.fromNumber(MAX_GAS) }, 'latest'],
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

	const call = { from, to: resolver, data }
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

	return { call, gas }
}

/** Probe an actual storage change so an unchanged record cannot hide authorization or gas failures. */
export async function checkEnsReadiness(
	transport: RpcTransport.Http,
	domain: string,
	from: Address.Address,
) {
	if (BigInt(await transport.request({ method: 'eth_chainId' })) !== 1n) {
		throw new Error('ENS deployment requires Ethereum mainnet.')
	}

	const current = await readEnsContentHash(transport, domain)

	process.stdout.write(
		`${domain}: resolver=${current.resolver} current=${current.cid} updater=${from}\n`,
	)
	// CIDv1, dag-pb, SHA-256, with a synthetic 32-byte digest.
	const bytes = Uint8Array.of(1, 0x70, 0x12, 0x20, ...new Uint8Array(32).fill(0x42))
	const seed = `b${base32Encode(bytes)}`
	const probeCid =
		seed === current.cid
			? `b${base32Encode(bytes.map((byte, index) => (index === bytes.length - 1 ? byte ^ 1 : byte)))}`
			: seed
	const simulated = await simulateEnsUpdate(transport, domain, probeCid, from, current.resolver)

	return { ...simulated, current, probeCid }
}

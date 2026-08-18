import { AbiFunction, Address, Bytes, Ens, Hex } from 'ox'

import { prefixError } from '@/types/errors'

/**
 * The canonical ENS registry contract on Ethereum mainnet.
 * The `resolver(bytes32)` function is used to look up the resolver
 * responsible for a name.
 */
const ENS_REGISTRY_ADDRESS = Address.from('0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e')

/** The `resolver(bytes32 node) returns (address)` view function on the ENS registry. */
const resolverAbi = {
	name: 'resolver',
	type: 'function',
	inputs: [{ name: 'node', type: 'bytes32' }],
	outputs: [{ name: '', type: 'address' }],
	stateMutability: 'view',
} as const

/** The `contenthash(bytes32 node) returns (bytes)` view function on an ENS resolver. */
const contenthashAbi = {
	name: 'contenthash',
	type: 'function',
	inputs: [{ name: 'node', type: 'bytes32' }],
	outputs: [{ name: '', type: 'bytes' }],
	stateMutability: 'view',
} as const

/** Base32 (RFC 4648, lowercase, no padding) alphabet used by CIDv1 multibase `b`. */
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'

const BASE32_CHAR_TO_VALUE = new Map<string, number>(
	[...BASE32_ALPHABET].map((char, index) => [char, index]),
)

/** Decode a base32 string (multibase `b`, no padding) into raw bytes. */
export function base32Decode(input: string): Uint8Array {
	const clean = input.replace(/=+$/u, '')
	const bytes: number[] = []
	let buffer = 0
	let bits = 0

	for (const char of clean) {
		const value = BASE32_CHAR_TO_VALUE.get(char)

		if (value === undefined) {
			throw new Error(`Invalid base32 character \`${char}\`.`)
		}

		buffer = (buffer << 5) | value
		bits += 5

		if (bits >= 8) {
			bytes.push((buffer >>> (bits - 8)) & 0xff)
			bits -= 8
		}
	}

	return Uint8Array.from(bytes)
}

/** Encode raw bytes as a base32 string (multibase `b`, no padding). */
export function base32Encode(bytes: Uint8Array): string {
	let out = ''
	let buffer = 0
	let bits = 0

	for (const byte of bytes) {
		buffer = (buffer << 8) | byte
		bits += 8

		while (bits >= 5) {
			out += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 0x1f]
			bits -= 5
		}
	}

	if (bits > 0) {
		out += BASE32_ALPHABET[(buffer << (5 - bits)) & 0x1f]
	}

	return out
}

/**
 * The `multicodec` prefix for an IPFS content-hash, as defined by EIP-1577.
 * A content-hash is `<codec><value>`; for IPFS the codec is `0xe3` and the
 * value is the raw (base32-decoded) CIDv1 bytes.
 */
const IPFS_CONTENT_HASH_CODEC = 0xe3

/**
 * Compute the exact ENS content-hash bytes that `omnipin ens` would write for a
 * given base32 (CIDv1) IPFS CID. The content-hash is `0xe3` followed by the raw
 * CID bytes, so comparing these bytes directly with what the resolver returns
 * is the most faithful way to tell whether the domain already points at the CID.
 */
export function cidToContentHash(cid: string): `0x${string}` {
	const rawCidBytes = cid.startsWith('b') ? base32Decode(cid.slice(1)) : base32Decode(cid)

	return Hex.fromBytes(Bytes.from(Uint8Array.of(IPFS_CONTENT_HASH_CODEC, ...rawCidBytes)))
}

/**
 * Decode the raw bytes of an ENS content-hash back into a base32 (CIDv1) IPFS
 * CID. Returns `null` when the content-hash does not use the IPFS codec
 * (`0xe3`).
 */
export function contentHashToCid(contentHash: Hex.Hex): string | null {
	const bytes = Hex.toBytes(contentHash)

	if (bytes.length < 2 || bytes[0] !== IPFS_CONTENT_HASH_CODEC) {
		return null
	}

	return `b${base32Encode(bytes.subarray(1))}`
}

/** Minimal JSON-RPC client used to make `eth_call` queries against an RPC URL. */

const ETH_CALL_GAS = '0x100000' // 1_048_576

async function ethCall(rpcUrl: string, to: Address.Address, data: Hex.Hex): Promise<Hex.Hex> {
	const response = await fetch(rpcUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'eth_call',
			params: [{ to, data, gas: ETH_CALL_GAS }, 'latest'],
			id: 1,
		}),
	})

	if (!response.ok) {
		throw new Error(`RPC request failed with HTTP status ${response.status}.`)
	}

	const payload: unknown = await response.json()

	if (typeof payload !== 'object' || payload === null) {
		throw new Error('RPC returned an unexpected response.')
	}

	const { error, result } = payload as { error?: unknown; result?: unknown }

	if (error !== undefined) {
		const message = typeof error === 'string' ? error : 'RPC returned an unknown error.'

		throw new Error(message)
	}

	if (!Hex.validate(result)) {
		throw new Error('RPC returned an unexpected response for eth_call.')
	}

	return result
}

/** Read the ENS content-hash currently set for `domain` through `rpcUrl`. */
export async function readEnsContentHashCid(
	rpcUrl: string,
	domain: string,
): Promise<string | null> {
	const node = Ens.namehash(domain)
	const resolverCalldata = AbiFunction.encodeData(resolverAbi, [node])

	let resolverData: Hex.Hex

	try {
		resolverData = await ethCall(rpcUrl, ENS_REGISTRY_ADDRESS, resolverCalldata)
	} catch (error) {
		throw prefixError('Failed to query ENS resolver', error)
	}

	const resolverAddress = Address.from(AbiFunction.decodeResult(resolverAbi, resolverData))

	if (resolverAddress === Address.from('0x0000000000000000000000000000000000000000')) {
		return null
	}

	const contenthashCalldata = AbiFunction.encodeData(contenthashAbi, [node])

	let contenthashData: Hex.Hex

	try {
		contenthashData = await ethCall(rpcUrl, resolverAddress, contenthashCalldata)
	} catch (error) {
		throw prefixError('Failed to query ENS resolver content-hash', error)
	}

	const contentHash = AbiFunction.decodeResult(contenthashAbi, contenthashData)

	return contentHashToCid(contentHash)
}

/** Determine whether `domain` already points at `expectedCid`. */
export async function ensPointsToCid(
	rpcUrl: string,
	domain: string,
	expectedCid: string,
): Promise<boolean> {
	try {
		const currentCid = await readEnsContentHashCid(rpcUrl, domain)

		return currentCid === expectedCid
	} catch (error) {
		throw prefixError(`Could not determine whether ${domain} points at ${expectedCid}`, error)
	}
}

import { AbiFunction, Address, Bytes, Ens, Hex, RpcTransport } from 'ox'

import { prefixError } from '@/types/errors'

/** Mainnet Universal Resolver; resolves both ENSv1 and ENSv2 names. */
export const UNIVERSAL_RESOLVER_ADDRESS = Address.from('0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe')

export const resolveAbi = {
	name: 'resolve',
	type: 'function',
	inputs: [
		{ name: 'name', type: 'bytes' },
		{ name: 'data', type: 'bytes' },
	],
	outputs: [
		{ name: 'result', type: 'bytes' },
		{ name: 'resolver', type: 'address' },
	],
	stateMutability: 'view',
} as const

/** Encode a normalized ENS name as DNS wire-format labels. */
export function encodeEnsName(domain: string): Hex.Hex {
	const labels = Ens.normalize(domain)
		.split('.')
		.map(label => {
			const bytes = new TextEncoder().encode(label)

			if (bytes.length === 0 || bytes.length > 63) {
				throw new Error('ENS deployment requires DNS labels of 1–63 bytes.')
			}

			return Bytes.concat(Uint8Array.of(bytes.length), bytes)
		})

	return Hex.fromBytes(Bytes.concat(...labels, Uint8Array.of(0)))
}

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
 * A content-hash is `<codec><value>`; for IPFS the codec is `0xe3`, which is
 * an unsigned variable-length integer encoded as the two bytes `0xe3 0x01`.
 * The value is the raw (base32-decoded) CIDv1 bytes.
 */
const IPFS_CONTENT_HASH_PREFIX = Uint8Array.of(0xe3, 0x01)

/**
 * Compute the exact ENS content-hash bytes that `omnipin ens` would write for a
 * given base32 (CIDv1) IPFS CID. The content-hash is `0xe301` followed by the
 * raw CID bytes, so comparing these bytes directly with what the resolver returns
 * is the most faithful way to tell whether the domain already points at the CID.
 */
export function cidToContentHash(cid: string): `0x${string}` {
	const rawCidBytes = cid.startsWith('b') ? base32Decode(cid.slice(1)) : base32Decode(cid)

	return Hex.fromBytes(Bytes.concat(IPFS_CONTENT_HASH_PREFIX, rawCidBytes))
}

/**
 * Decode the raw bytes of an ENS content-hash back into a base32 (CIDv1) IPFS
 * CID. Returns `null` when the content-hash does not use the IPFS codec
 * (`0xe301`).
 */
export function contentHashToCid(contentHash: Hex.Hex): string | null {
	const bytes = Hex.toBytes(contentHash)
	const prefixLength = IPFS_CONTENT_HASH_PREFIX.length

	if (
		bytes.length <= prefixLength ||
		!Bytes.isEqual(bytes.subarray(0, prefixLength), IPFS_CONTENT_HASH_PREFIX)
	) {
		return null
	}

	return `b${base32Encode(bytes.subarray(prefixLength))}`
}

/** Resolve through the universal entry point, including migrated and wildcard names. */
export async function readEnsContentHash(
	transport: RpcTransport.Http,
	domain: string,
): Promise<{ cid: string | null; resolver: Address.Address }> {
	const data = AbiFunction.encodeData(resolveAbi, [
		encodeEnsName(domain),
		AbiFunction.encodeData(contenthashAbi, [Ens.namehash(Ens.normalize(domain))]),
	])
	const result = await transport.request({
		method: 'eth_call',
		params: [{ to: UNIVERSAL_RESOLVER_ADDRESS, data, gas: '0x100000' }, 'latest'],
	})
	const [encoded, resolver] = AbiFunction.decodeResult(resolveAbi, result)

	if (resolver === '0x0000000000000000000000000000000000000000') {
		throw new Error('Universal resolution returned no resolver.')
	}

	return { cid: contentHashToCid(AbiFunction.decodeResult(contenthashAbi, encoded)), resolver }
}

/** Read the ENS content-hash currently set for `domain` through `rpcUrl`. */
export async function readEnsContentHashCid(
	rpcUrl: string,
	domain: string,
	timeoutMs: number,
): Promise<string | null> {
	try {
		return (await readEnsContentHash(RpcTransport.fromHttp(rpcUrl, { timeout: timeoutMs }), domain))
			.cid
	} catch (error) {
		throw prefixError('Failed to resolve ENS content-hash', error)
	}
}

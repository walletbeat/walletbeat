const MASK64 = 0xffff_ffff_ffff_ffffn

const RC: bigint[] = [
	0x0000000000000001n,
	0x0000000000008082n,
	0x800000000000808an,
	0x8000000080008000n,
	0x000000000000808bn,
	0x0000000080000001n,
	0x8000000080008081n,
	0x8000000000008009n,
	0x000000000000008an,
	0x0000000000000088n,
	0x0000000080008009n,
	0x000000008000000an,
	0x000000008000808bn,
	0x800000000000008bn,
	0x8000000000008089n,
	0x8000000000008003n,
	0x8000000000008002n,
	0x8000000000000080n,
	0x000000000000800an,
	0x800000008000000an,
	0x8000000080008081n,
	0x8000000000008080n,
	0x0000000080000001n,
	0x8000000080008008n,
]

const RHO: number[][] = [
	[0, 36, 3, 41, 18],
	[1, 44, 10, 45, 2],
	[62, 6, 43, 15, 61],
	[28, 55, 25, 21, 56],
	[27, 20, 39, 8, 14],
]

/** 64-bit rotate-left. */
function rotl64(v: bigint, n: number): bigint {
	return n === 0 ? v : ((v << BigInt(n)) | (v >> BigInt(64 - n))) & MASK64
}

/**
 * Keccak-f[1600] permutation (24 rounds, in-place).
 */
function keccakF1600(s: bigint[]): void {
	const C = new Array<bigint>(5)
	const B = new Array<bigint>(25)

	for (let round = 0; round < 24; round++) {
		for (let x = 0; x < 5; x++) {
			C[x] = s[x] ^ s[x + 5] ^ s[x + 10] ^ s[x + 15] ^ s[x + 20]
		}

		for (let x = 0; x < 5; x++) {
			const d = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1)

			for (let y = 0; y < 25; y += 5) {
				s[x + y] = (s[x + y] ^ d) & MASK64
			}
		}

		for (let x = 0; x < 5; x++) {
			for (let y = 0; y < 5; y++) {
				B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl64(s[x + 5 * y], RHO[x][y])
			}
		}

		for (let x = 0; x < 5; x++) {
			for (let y = 0; y < 25; y += 5) {
				s[x + y] = (B[x + y] ^ (~B[((x + 1) % 5) + y] & B[((x + 2) % 5) + y])) & MASK64
			}
		}

		s[0] = (s[0] ^ RC[round]) & MASK64
	}
}

/**
 * Keccak-256 hash function used by Ethereum,
 */
export function keccak256(data: Uint8Array): Uint8Array {
	const RATE = 136
	const state = new Array<bigint>(25).fill(0n)

	const padLen = Math.ceil((data.length + 1) / RATE) * RATE
	const padded = new Uint8Array(padLen)

	padded.set(data)
	padded[data.length] = 0x01
	padded[padLen - 1] |= 0x80

	for (let off = 0; off < padLen; off += RATE) {
		for (let i = 0; i < RATE; i += 8) {
			let lane = 0n

			for (let b = 0; b < 8; b++) {
				lane |= BigInt(padded[off + i + b]) << BigInt(8 * b)
			}
			state[i >>> 3] ^= lane
		}
		keccakF1600(state)
	}

	const hash = new Uint8Array(32)

	for (let i = 0; i < 4; i++) {
		let lane = state[i]

		for (let b = 0; b < 8; b++) {
			hash[i * 8 + b] = Number(lane & 0xffn)
			lane >>= 8n
		}
	}

	return hash
}

export function bytesToHex(bytes: Uint8Array): string {
	let hex = ''

	for (let i = 0; i < bytes.length; i++) {
		hex += bytes[i].toString(16).padStart(2, '0')
	}

	return hex
}

export function hexToBytes(hex: string): Uint8Array {
	const bare = hex.startsWith('0x') ? hex.slice(2) : hex
	const out = new Uint8Array(bare.length / 2)

	for (let i = 0; i < out.length; i++) {
		out[i] = parseInt(bare.slice(i * 2, i * 2 + 2), 16)
	}

	return out
}

export function numberTo32Bytes(n: number): Uint8Array {
	const out = new Uint8Array(32)

	for (let i = 31; i >= 0 && n > 0; i--) {
		out[i] = n & 0xff
		n = Math.floor(n / 256)
	}

	return out
}

export type Erc55Address = `0x${string}`

/** Type predicate for Erc55Address */
export function isErc55Address(address: string): address is Erc55Address {
	try {
		return address == ethereumErc55Address(address)
	} catch {
		return false
	}
}

/** Assert that the given string is an ERC-55 address. */
export function assertErc55Address(address: string): Erc55Address {
	const erc55 = ethereumErc55Address(address)

	if (address !== erc55) {
		throw new Error(`Invalid ERC-55 Ethereum address: "${address}" (expected: ${erc55})`)
	}

	return erc55
}

/**
 * Convert a 20-byte Ethereum address to its ERC-55 mixed-case
 * checksummed representation.
 */
export function ethereumErc55Address(address: string): Erc55Address {
	const bare = address.replace(/^0x/i, '').toLowerCase()

	if (bare.length !== 40 || !/^[0-9a-f]{40}$/.test(bare)) {
		throw new Error(`Invalid Ethereum address: "${address}"`)
	}

	const hashHex = bytesToHex(keccak256(new TextEncoder().encode(bare)))

	let result = '0x'

	for (let i = 0; i < 40; i++) {
		const c = bare[i]

		result += parseInt(hashHex[i], 16) >= 8 ? c.toUpperCase() : c
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We have built it as ERC-55.
	const erc55 = result as Erc55Address

	const lower = address.toLowerCase()
	const upper = address.toUpperCase()

	if (address === lower || address === upper) {
		return erc55
	}

	// Mixed-case: must match the checksum exactly.
	if (address !== result) {
		throw new Error(
			`tried to canonicalize "${address}" which was not in canonical format to begin with (computed: ${result})`,
		)
	}

	return erc55
}

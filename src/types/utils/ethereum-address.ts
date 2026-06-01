import { bytesToHex, keccak256 } from './bytes'

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

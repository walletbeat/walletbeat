import { bytesToHex, hexToBytes, keccak256 } from './bytes'
import { isRecord } from './record'

export type Eip712Field = { name: string; type: string }
export type Eip712TypeMap = Record<string, Eip712Field[]>

function eip712BaseType(type: string): string {
	return type.replace(/(\[\d*\])+$/, '')
}

function eip712EncodeType(primaryType: string, types: Eip712TypeMap): string {
	const deps = new Set<string>()
	const queue = [primaryType]

	while (queue.length > 0) {
		const t = queue.shift()!

		if (!types[t]) {
			continue
		}

		for (const field of types[t]) {
			const base = eip712BaseType(field.type)

			if (types[base] && !deps.has(base) && base !== primaryType) {
				deps.add(base)
				queue.push(base)
			}
		}
	}

	const encodeOne = (name: string): string => {
		const fields = types[name]

		if (!fields) {
			return ''
		}

		return `${name}(${fields.map(f => `${f.type} ${f.name}`).join(',')})`
	}

	return encodeOne(primaryType) + [...deps].sort().map(encodeOne).join('')
}

function bigintTo32Bytes(n: bigint): Uint8Array {
	const out = new Uint8Array(32)
	let v = n

	for (let i = 31; i >= 0 && v > 0n; i--) {
		out[i] = Number(v & 0xffn)
		v >>= 8n
	}

	return out
}

function eip712EncodeValue(type: string, value: unknown, types: Eip712TypeMap): Uint8Array {
	if (type === 'string') {
		if (typeof value !== 'string') {
			throw new Error(`EIP-712: expected string for type "string", got ${typeof value}`)
		}

		return keccak256(new TextEncoder().encode(value))
	}

	if (type === 'bytes') {
		if (typeof value !== 'string') {
			throw new Error(`EIP-712: expected hex string for type "bytes", got ${typeof value}`)
		}

		return keccak256(hexToBytes(value))
	}

	if (/^bytes\d+$/.test(type)) {
		if (typeof value !== 'string') {
			throw new Error(`EIP-712: expected hex string for type "${type}", got ${typeof value}`)
		}

		const bytes = hexToBytes(value)
		const out = new Uint8Array(32)

		out.set(bytes.slice(0, 32))

		return out
	}

	if (type === 'address') {
		if (typeof value !== 'string') {
			throw new Error(`EIP-712: expected hex string for type "address", got ${typeof value}`)
		}

		const bytes = hexToBytes(value)
		const out = new Uint8Array(32)

		out.set(bytes, 12)

		return out
	}

	if (type === 'bool') {
		const out = new Uint8Array(32)

		out[31] = value ? 1 : 0

		return out
	}

	if (/^u?int\d*$/.test(type)) {
		if (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'bigint') {
			throw new Error(
				`EIP-712: expected number, string, or bigint for type "${type}", got ${typeof value}`,
			)
		}

		let n = BigInt(value)

		if (n < 0n) {
			n += 1n << 256n
		}

		return bigintTo32Bytes(n)
	}

	if (type.endsWith(']')) {
		const match = /^(.+)\[(\d*)\]$/.exec(type)

		if (match) {
			const elementType = match[1]

			if (!Array.isArray(value)) {
				throw new Error(`EIP-712: expected array for type "${type}"`)
			}

			const parts = value.map(el => eip712EncodeValue(elementType, el, types))
			const total = parts.reduce((s, p) => s + p.length, 0)
			const concat = new Uint8Array(total)
			let off = 0

			for (const p of parts) {
				concat.set(p, off)
				off += p.length
			}

			return keccak256(concat)
		}
	}

	if (types[type]) {
		if (!isRecord(value)) {
			throw new Error(`EIP-712: expected object for struct type "${type}"`)
		}

		return hexToBytes(eip712HashStructRaw(type, value, types).slice(2))
	}

	throw new Error(`EIP-712: unknown type "${type}"`)
}

function eip712HashStructRaw(
	primaryType: string,
	data: Record<string, unknown>,
	types: Eip712TypeMap,
): `0x${string}` {
	const typeHash = keccak256(new TextEncoder().encode(eip712EncodeType(primaryType, types)))
	const fields = types[primaryType] ?? []
	const parts: Uint8Array[] = [
		typeHash,
		...fields.map(f => eip712EncodeValue(f.type, data[f.name], types)),
	]
	const total = parts.reduce((s, p) => s + p.length, 0)
	const encoded = new Uint8Array(total)
	let off = 0

	for (const p of parts) {
		encoded.set(p, off)
		off += p.length
	}

	return `0x${bytesToHex(keccak256(encoded))}`
}

export function hashStruct({
	primaryType,
	data,
	types,
}: {
	primaryType: string
	data: Record<string, unknown>
	types: Eip712TypeMap
}): `0x${string}` {
	return eip712HashStructRaw(primaryType, data, types)
}

export function hashTypedData({
	domain,
	types,
	primaryType,
	message,
}: {
	domain: Record<string, unknown>
	types: Eip712TypeMap
	primaryType: string
	message: Record<string, unknown>
}): `0x${string}` {
	const domainFields: Eip712Field[] = []

	if (domain.name !== undefined) {
		domainFields.push({ name: 'name', type: 'string' })
	}

	if (domain.version !== undefined) {
		domainFields.push({ name: 'version', type: 'string' })
	}

	if (domain.chainId !== undefined) {
		domainFields.push({ name: 'chainId', type: 'uint256' })
	}

	if (domain.verifyingContract !== undefined) {
		domainFields.push({ name: 'verifyingContract', type: 'address' })
	}

	if (domain.salt !== undefined) {
		domainFields.push({ name: 'salt', type: 'bytes32' })
	}

	const domainSep = hexToBytes(
		eip712HashStructRaw('EIP712Domain', domain, { EIP712Domain: domainFields }).slice(2),
	)
	const msgHash = hexToBytes(eip712HashStructRaw(primaryType, message, types).slice(2))
	const encoded = new Uint8Array(2 + 32 + 32)

	encoded[0] = 0x19
	encoded[1] = 0x01
	encoded.set(domainSep, 2)
	encoded.set(msgHash, 34)

	return `0x${bytesToHex(keccak256(encoded))}`
}

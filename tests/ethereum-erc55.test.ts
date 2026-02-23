import { describe, expect, it } from 'vitest'

import { ethereumErc55Address, isErc55Address, keccak256 } from '@/types/utils/ethereum-address'

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

describe('keccak256 (Ethereum Keccak)', () => {
	it('hashes empty input', () => {
		const out = keccak256(new Uint8Array())

		expect(toHex(out)).toBe('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
		expect(out).toHaveLength(32)
	})

	it("hashes ASCII 'hello'", () => {
		const out = keccak256(new TextEncoder().encode('hello'))

		expect(toHex(out)).toBe('1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8')
	})
})

describe('ERC-55', () => {
	const vectors = [
		['0x52908400098527886e0f7030069857d2e4169ee7', '0x52908400098527886E0F7030069857D2E4169EE7'],
		['0x8617e340b3d01fa5f11f306f4090fd50e238070d', '0x8617E340B3D01FA5F11F306F4090FD50E238070D'],
		['0xde709f2102306220921060314715629080e2fb77', '0xde709f2102306220921060314715629080e2fb77'],
		['0x27b1fdb04752bbc536007a920d24acb045561c26', '0x27b1fdb04752bbc536007a920d24acb045561c26'],
		['0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed', '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'],
		['0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359', '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359'],
		['0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb', '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB'],
		['0xd1220a0cf47c7b9be7a2e6ba89f429762e7b9adb', '0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb'],
	] as const

	it('matches reference ERC-55 examples', () => {
		for (const [input, expected] of vectors) {
			for (const input2 of [
				input,
				input.substring(2),
				input.toLowerCase(),
				input.substring(2).toLowerCase(),
				input.toUpperCase(),
				input.substring(2).toUpperCase(),
			]) {
				expect(ethereumErc55Address(input2)).toBe(expected)
			}
			expect(isErc55Address(expected)).toBe(true)
			expect(isErc55Address(ethereumErc55Address(input))).toBe(true)
		}
	})

	it('checks mixed-case', () => {
		const good = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'
		const bad = '0x5aaeb6053F3E94C9b9A09f33669435E7Ef1BeAed'

		expect(isErc55Address(good)).toBe(true)
		expect(isErc55Address(bad)).toBe(false)
	})

	it('throws on invalid address', () => {
		expect(() => ethereumErc55Address('0x1234')).toThrow()
		expect(() => ethereumErc55Address('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeda')).toThrow()
		expect(() => ethereumErc55Address('')).toThrow()
	})

	it('idempotent', () => {
		const a = '0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359'
		const b = ethereumErc55Address(a)
		const c = ethereumErc55Address(b)

		expect(b).toBe(c)
	})
})

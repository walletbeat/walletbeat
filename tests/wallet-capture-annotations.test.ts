import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
	refersToAddress,
	WalletCaptureAnnotations,
} from '@/tools/wallet-data-collection/wallet-capture-annotations'
import { getRepositoryRoot } from '@/utils/codebase'

const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

const globalData = {
	globalContractAddresses: [
		{ name: 'ETH (native token placeholder)', address: ETH },
		{ name: 'USDC (Ethereum)', address: USDC },
	],
	matchers: [],
	benignStrings: [],
}

describe('refersToAddress', () => {
	it('matches the full address in any letter case', () => {
		expect(refersToAddress(USDC, USDC)).toBe(true)
		expect(refersToAddress(USDC.toLowerCase(), USDC)).toBe(true)
		expect(refersToAddress(USDC.toUpperCase().replace('0X', '0x'), USDC)).toBe(true)
		expect(refersToAddress(USDC.slice(2), USDC)).toBe(true)
	})

	it('matches truncated forms', () => {
		expect(refersToAddress('0xEeeeeEeeeEeEeeE...', ETH)).toBe(true)
		expect(refersToAddress('0xa0b8...eb48', USDC)).toBe(true)
		expect(refersToAddress('0xA0b869…', USDC)).toBe(true)
	})

	it('does not match other strings', () => {
		expect(refersToAddress('0xA0b8...eb49', USDC)).toBe(false)
		expect(refersToAddress('0xa0b...', USDC)).toBe(false)
		expect(refersToAddress('0xa0b86991', USDC)).toBe(false)
		expect(refersToAddress(`${USDC}00`, USDC)).toBe(false)
		expect(refersToAddress('0x52908400098527886E0F7030069857D2E4169EE7', USDC)).toBe(false)
	})
})

describe('WalletCaptureAnnotations global contract addresses', () => {
	const annotations = WalletCaptureAnnotations.fromData({}, globalData)

	it('treats well-known contract addresses as benign', () => {
		expect(annotations.isBenign(USDC.toLowerCase())).toBe(true)
		expect(annotations.isBenign('0xEeeeeEeeeEeEeeEeEeE...')).toBe(true)
		expect(annotations.globalContractAddressOf('0xa0b8...eb48')).toBe(USDC)
		expect(annotations.isBenign('0x52908400098527886E0F7030069857D2E4169EE7')).toBe(false)
	})

	it('does not treat user asset addresses as benign', () => {
		expect(annotations.isBenign(USDC.toLowerCase(), [USDC])).toBe(false)
		expect(annotations.isBenign('0xa0b8...eb48', [USDC])).toBe(false)
		expect(annotations.isBenign(ETH, [USDC])).toBe(true)
	})

	it('rejects invalid entries', () => {
		expect(() =>
			WalletCaptureAnnotations.fromData(
				{},
				{ globalContractAddresses: [{ name: 'Bad checksum', address: USDC.toLowerCase() }] },
			),
		).toThrow()
		expect(() =>
			WalletCaptureAnnotations.fromData(
				{},
				{
					globalContractAddresses: [
						{ name: 'USDC', address: USDC },
						{ name: 'USDC again', address: USDC },
					],
				},
			),
		).toThrow(/duplicate/)
	})

	it('only allows global contract addresses in the global annotations file', () => {
		expect(() => WalletCaptureAnnotations.fromData(globalData, globalData)).toThrow(
			/only allowed in the global annotations file/,
		)
	})

	it('loads the repository global annotations file', () => {
		const repoAnnotations = WalletCaptureAnnotations.fromFile(
			path.join(getRepositoryRoot(), 'data', 'collection', 'does-not-exist.annotations.json'),
			path.join(getRepositoryRoot(), 'data', 'collection', 'global.annotations.json'),
		)

		expect(repoAnnotations.globalContractAddressOf(USDC.toLowerCase())).toBe(USDC)
		expect(repoAnnotations.isBenign('0xdac17f958d2ee523a2206206994597c13d831ec7')).toBe(true)
	})
})

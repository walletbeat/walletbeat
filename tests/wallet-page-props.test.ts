import { serializeProps } from 'astro/runtime/server/serialize.js'
import { describe, expect, it } from 'vitest'

import { rateWalletOfType, type WalletOfType } from '@/data/wallet-rating'
import { allRatedWalletsBySlug, walletOfTypeBySlug } from '@/data/wallets'

/**
 * Revive props serialized by Astro's `serializeProps`, the same way the
 * `<astro-island>` element does in the browser. Only plain values, objects,
 * arrays and `undefined` are supported; anything else fails the test.
 */
function reviveTuple(tuple: unknown): unknown {
	if (!Array.isArray(tuple)) {
		throw new Error(`Expected a serialized prop tuple, got ${JSON.stringify(tuple)}`)
	}

	const type: unknown = tuple[0]
	const value: unknown = tuple[1]

	switch (type) {
		case 0:
			return reviveObject(value)
		case 1:
			if (!Array.isArray(value)) {
				throw new Error('Expected a serialized array')
			}

			return value.map(reviveTuple)
		default:
			throw new Error(`Unsupported serialized prop type ${String(type)}`)
	}
}

function reviveObject(value: unknown): unknown {
	if (typeof value !== 'object' || value === null) {
		return value
	}

	return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, reviveTuple(item)]))
}

/** Round-trip props through Astro's island serialization. */
function roundTripIslandProps(props: Record<string, unknown>): Record<string, unknown> {
	const revived = reviveObject(JSON.parse(serializeProps(props)))

	if (typeof revived !== 'object' || revived === null) {
		throw new Error('Expected an object')
	}

	return Object.fromEntries(Object.entries(revived))
}

function isWalletOfType(value: unknown): value is WalletOfType {
	return typeof value === 'object' && value !== null && 'type' in value && 'wallet' in value
}

describe('rating a single wallet from serialized island props', () => {
	for (const [slug, ratedWallet] of Object.entries(allRatedWalletsBySlug)) {
		it(`matches allRatedWalletsBySlug for ${slug}`, () => {
			const walletOfType = walletOfTypeBySlug(slug)

			expect(walletOfType).toBeDefined()

			const { walletOfType: revived } = roundTripIslandProps({ walletOfType })

			if (!isWalletOfType(revived)) {
				throw new Error('Serialized props did not round-trip')
			}

			expect(revived).toEqual(walletOfType)
			expect(rateWalletOfType(revived)).toEqual(ratedWallet)
		})
	}
})

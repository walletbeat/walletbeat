import { describe, expect, it } from 'vitest'

import { allRatedWalletsBySlug } from '@/data/wallets'
import { toFullyQualified } from '@/schema/reference'
import { referenceImageDimensions } from '@/utils/reference-image-metadata'
import { walletReferenceImageDimensions } from '@/utils/wallet-reference-image-metadata'

describe('reference image metadata', () => {
	it('derives positive dimensions for wallet page reference images', async () => {
		let imageCount = 0

		for (const wallet of Object.values(allRatedWalletsBySlug)) {
			const dimensions = await walletReferenceImageDimensions(wallet)

			for (const { width, height } of Object.values(dimensions)) {
				expect(width).toBeGreaterThan(0)
				expect(height).toBeGreaterThan(0)
				imageCount++
			}
		}

		expect(imageCount).toBeGreaterThan(0)
	})

	it('does not read external images and rejects missing local assets', async () => {
		expect(
			await referenceImageDimensions(toFullyQualified([{ url: 'https://example.com/image.png' }])),
		).toEqual({})
		await expect(
			referenceImageDimensions(
				toFullyQualified([{ file: 'public/missing.png', label: 'Missing image' }]),
			),
		).rejects.toThrow()
	})
})

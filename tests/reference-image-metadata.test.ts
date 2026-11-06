import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import { collectWalletRefs, toFullyQualified } from '@/schema/reference'
import { isRepoImageUrl } from '@/schema/url'
import { referenceImageDimensions } from '@/utils/reference-image-metadata'

describe('reference image metadata', () => {
	it('derives positive intrinsic dimensions for precisely each wallet’s local image references', async () => {
		for (const [name, wallet] of Object.entries(allWallets)) {
			const references = collectWalletRefs(name, wallet).flatMap(ref => ref.fullyQualifiedRefs)
			const dimensions = await referenceImageDimensions(references)
			const urls = [
				...new Set(
					references.flatMap(ref => ref.urls.map(({ url }) => url)).filter(isRepoImageUrl),
				),
			]

			expect(Object.keys(dimensions).sort()).toEqual(urls.sort())

			for (const { width, height } of Object.values(dimensions)) {
				expect(width).toBeGreaterThan(0)
				expect(height).toBeGreaterThan(0)
			}
		}
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

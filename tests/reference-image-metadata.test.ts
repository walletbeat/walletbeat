import { describe, expect, it } from 'vitest'

import { toFullyQualified } from '@/schema/reference'
import { referenceImageDimensions } from '@/utils/reference-image-metadata'

describe('reference image metadata', () => {
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

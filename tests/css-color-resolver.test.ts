import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { resolveCssColor } from '@/utils/css-color-resolver'

import nativePaint from './css-color-resolver/native-pixels.json'

// Native sRGB pixels provide an oracle independent of the export conversion.
describe.each(nativePaint.cases)('$rating over $background', ({ color, background, rgb }) => {
	it('preserves canonical paint through SVG rasterization', async () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${resolveCssColor(background)}"/><rect width="1" height="1" fill="${resolveCssColor(color)}"/></svg>`
		const actual = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer()

		for (const [channel, expected] of rgb.entries()) {
			expect(Math.abs(actual[channel] - expected)).toBeLessThanOrEqual(2)
		}
	})
})

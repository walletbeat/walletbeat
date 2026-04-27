import { describe, expect, it } from 'vitest'

import { SVGFont } from '@/tools/icon-font-generator/icon-font-generator-lib'

describe('wbicons', async () => {
	const wbicons = await SVGFont.create({
		fontName: 'wbicons',
		cssOutputDir: 'src/styles',
		fontOutputDir: 'public/wbicons',
		svgIconsDir: 'resources/files/wbicons',
	})

	it('wbicons font is up-to-date', () => {
		expect(
			wbicons.isUpToDate(),
			`wbicons font is out of date; run the following command to fix:\n\n  ${wbicons.writeCommand()}\n\n`,
		).toBe(true)
	})
})

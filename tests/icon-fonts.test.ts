import { describe, expect, it } from 'vitest'

import { SVGFont } from '@/tools/icon-font-generator/icon-font-generator-lib'

describe('wbicons', async () => {
	const wbicons = await SVGFont.create({
		fontName: 'wbicons',
		fontTypeName: 'WBIcon',
		cssOutputDir: 'src/styles',
		fontOutputDir: 'public/wbicons',
		svgIconsDir: 'resources/files/wbicons',
	})

	it('is up-to-date', () => {
		expect(
			wbicons.isUpToDate(),
			`wbicons font is out of date; run the following command to fix:\n\n  ${wbicons.writeCommand()}\n\n`,
		).toBe(true)
	})
	it('has only monochrome files', async () => {
		const results = await wbicons.nonMonochromeFiles()
		const errorDetails = Object.entries(results)
			.map(([file, errors]) => `${file}:\n  ${errors.join('\n  ')}`)
			.join('\n\n')

		expect(
			Object.keys(results).length,
			`Found ${Object.keys(results).length} non-monochrome file(s):\n\n${errorDetails}`,
		).toBe(0)
	})
})

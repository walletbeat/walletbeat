import { describe, expect, it } from 'vitest'

import {
	generatedIconFontCSS,
	iconFontCodepoints,
	repeatedIconFontCodepoints,
	SVGFont,
} from '@/tools/icon-font-generator/icon-font-generator-lib'

describe('wbicons', async () => {
	const wbicons = await SVGFont.create({
		fontName: 'wbicons',
		fontTypeName: 'WBIcon',
		cssOutputDir: 'src/styles',
		fontOutputDir: 'src/assets/fonts/wbicons',
		svgIconsDir: 'resources/files/wbicons',
	})

	it('is up-to-date', () => {
		expect(
			wbicons.isUpToDate(),
			`wbicons font is out of date; run the following command to fix:\n\n  ${wbicons.writeCommand()}\n\n`,
		).toBe(true)
	})
	it('maps every icon to a unique emoji sequence', () => {
		const repeatedCodepoints = repeatedIconFontCodepoints(iconFontCodepoints.wbicons)

		expect(
			repeatedCodepoints,
			`Every wbicon needs a unique unicode sequence so the font can map it back to its SVG glyph: ${JSON.stringify(repeatedCodepoints)}`,
		).toEqual({})
	})
	it('only renders data-icon values with the wbicons token', () => {
		const css = generatedIconFontCSS('wbicons', [
			'&[data-icon~="security"] {\n\t--icon-content: "🔒";\n}',
		])

		expect(css).toContain('[data-icon~="wbicons"] {')
		expect(css).toContain(
			'&::before {\n\t\tcontent: var(--icon-content);\n\t\tfont-family: var(--fontFamily-wbicons);',
		)
		expect(css).toContain('&[data-icon~="security"]')
		expect(css).not.toContain(':where(')
		expect(css).toContain('&[data-icon~="emoji"]::before')
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

import { describe, expect, it } from 'vitest'

import { wbIconEmojiSequences } from '@/styles/wbicons'
import {
	generatedIconFontCSS,
	repeatedIconFontUnicodeSequences,
	SVGFont,
} from '@/tools/icon-font-generator/icon-font-generator-lib'

describe('wbicons', async () => {
	const wbicons = await SVGFont.create({
		fontName: 'wbicons',
		fontTypeName: 'WBIcon',
		cssOutputDir: 'src/styles',
		fontOutputDir: 'src/assets/fonts/wbicons',
		svgIconsDir: 'resources/files/wbicons',
		iconUnicodeSequences: wbIconEmojiSequences,
	})

	it('is up-to-date', () => {
		expect(
			wbicons.isUpToDate(),
			`wbicons font is out of date; run the following command to fix:\n\n  ${wbicons.writeCommand()}\n\n`,
		).toBe(true)
	})
	it('maps every icon to a unique emoji sequence', () => {
		const repeatedUnicodeSequences = repeatedIconFontUnicodeSequences(wbIconEmojiSequences)

		expect(
			repeatedUnicodeSequences,
			`Every wbicon needs a unique unicode sequence so the font can map it back to its SVG glyph: ${JSON.stringify(repeatedUnicodeSequences)}`,
		).toEqual({})
	})
	it('only renders data-icon values with the wbicons token', () => {
		const css = generatedIconFontCSS('wbicons', [
			':is(&[data-icon~="security"], [data-list-item-marker="security"]) {\n\t--icon-content: "🔒";\n\t--list-marker-fontFamily: var(--fontFamily-wbicons);\n}',
		])

		expect(css).toContain('[data-icon~="wbicons"] {')
		expect(css).toContain(
			'font-family: var(--fontFamily-wbicons);\n\tfont-style: normal;\n\t-webkit-font-smoothing: subpixel-antialiased;',
		)
		expect(css).toContain('&::before {\n\t\tcontent: var(--icon-content);')
		expect(css).toContain(':is(&[data-icon~="security"], [data-list-item-marker="security"])')
		expect(css).toContain('--list-marker-fontFamily: var(--fontFamily-wbicons);')
		expect(css).not.toContain(':where(')
		expect(css).toContain('&[data-icon~="emoji"]')
	})
	it('has only monochrome files', async () => {
		const results: Record<string, string[]> = await wbicons.nonMonochromeFiles()
		const errorDetails = Object.entries(results)
			.map(([file, errors]) => `${file}:\n  ${errors.join('\n  ')}`)
			.join('\n\n')

		expect(
			Object.keys(results).length,
			`Found ${Object.keys(results).length} non-monochrome file(s):\n\n${errorDetails}`,
		).toBe(0)
	})
})

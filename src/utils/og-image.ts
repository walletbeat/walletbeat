import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { create as createFont, type Font } from 'fontkitten'
import sharp from 'sharp'

import { recompressPng } from '@/tools/image-integrity/png-optimizer-lib'
import { getAstroBuildTimeRepositoryRoot } from '@/utils/codebase.astro'
import { resolveCssColor } from '@/utils/css-color-resolver'

/** Size of social media preview images. */
export const ogImageSize = { width: 1200, height: 630 } as const
export const repositoryFile = (...parts: string[]): Buffer =>
	readFileSync(join(getAstroBuildTimeRepositoryRoot(), ...parts))
export const dataUri = (mime: string, data: Buffer): string =>
	`data:${mime};base64,${data.toString('base64')}`

function loadFont(fileName: string): Font {
	const font = createFont(repositoryFile('src', 'assets', 'fonts', fileName))

	if (font.isCollection) {
		throw new Error(`Expected a single font in ${fileName}, found a font collection`)
	}

	return font
}

let loadedFonts: { roman: Font; heavy: Font } | null = null

/** The site's body and heading fonts, loaded on first use. */
export function fonts(): { roman: Font; heavy: Font } {
	loadedFonts ??= {
		roman: loadFont('avenir-lt-std-roman.otf'),
		heavy: loadFont('avenir-lt-std-heavy.otf'),
	}

	return loadedFonts
}

/**
 * Lay out a single line of text as SVG path data with its baseline at y = 0,
 * so that the image does not depend on the fonts installed where it is built.
 */
export function textOutline(
	font: Font,
	text: string,
	fontSize: number,
): { pathData: string; width: number } {
	const scale = fontSize / font.unitsPerEm
	let width = 0
	let pathData = ''

	for (const glyph of font.glyphsForString(text)) {
		pathData += glyph.path.scale(scale, -scale).translate(width, 0).toSVG()
		width += glyph.advanceWidth * scale
	}

	return { pathData, width }
}

/** Font size at which `text` fits within `maxWidth`, up to `maxFontSize`. */
export function fittingFontSize(
	font: Font,
	text: string,
	maxFontSize: number,
	maxWidth: number,
): number {
	const { width } = textOutline(font, text, maxFontSize)

	return width <= maxWidth ? maxFontSize : (maxFontSize * maxWidth) / width
}

/** Static preview shell, sharing the site's logo and palette. */
export function ogImageSvg(content: string): string {
	const { width, height } = ogImageSize

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
 <defs><radialGradient id="glow" cx="853" cy="315" r="440" gradientUnits="userSpaceOnUse">
 <stop offset="0" stop-color="${resolveCssColor('var(--accent-backgroundColor)')}"/>
 <stop offset="1" stop-color="${resolveCssColor('var(--background-primary)')}"/>
 </radialGradient></defs>
 <rect width="${width}" height="${height}" fill="url(#glow)"/>
 <image href="${dataUri('image/svg+xml', repositoryFile('public', 'logo.svg'))}" x="72" y="56" width="434" height="40" preserveAspectRatio="xMinYMid meet"/>
 ${content}</svg>`
}

/** Rasterization and canonical PNG compression have their own build-time lifecycle. */
export async function renderOgImage(svg: string): Promise<Buffer> {
	return await recompressPng(await sharp(Buffer.from(svg)).png().toBuffer())
}

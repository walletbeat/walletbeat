import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { create as createFont, type Font } from 'fontkitten'
import sharp from 'sharp'

import type { WalletMetadata } from '@/schema/wallet'
import { recompressPng } from '@/tools/image-integrity/png-optimizer-lib'
import { getAstroBuildTimeRepositoryRoot } from '@/utils/codebase.astro'
import { resolveCssColor } from '@/utils/css-color-resolver'

/** Size of social media preview images, in the 1.91:1 ratio that link previews use. */
export const ogImageSize = { width: 1200, height: 630 } as const

/** Margin between the image edges and its content. */
export const ogImagePadding = 72

/** Open Graph image metadata of a page. */
export interface OgImage {
	url: string
	width: number
	height: number
	alt: string
}

const logoTop = 56
const logoHeight = 40

export const repositoryFile = (...pathParts: string[]): Buffer =>
	readFileSync(join(getAstroBuildTimeRepositoryRoot(), ...pathParts))

export const dataUri = (mimeType: string, data: Buffer): string =>
	`data:${mimeType};base64,${data.toString('base64')}`

const imageMimeTypes = {
	jpg: 'image/jpeg',
	png: 'image/png',
	svg: 'image/svg+xml',
} as const satisfies Record<WalletMetadata['iconExtension'], string>

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

/**
 * Lay out `text` on one line if it fits within `maxWidth` at `minFontSize` or
 * more. Otherwise, split it over two lines of up to `minFontSize`, at the word
 * boundary that allows the largest font size and then the most even lines.
 */
export function fittingLines(
	font: Font,
	text: string,
	{
		maxFontSize,
		minFontSize,
		maxWidth,
	}: { maxFontSize: number; minFontSize: number; maxWidth: number },
): { lines: string[]; fontSize: number } {
	const oneLineFontSize = fittingFontSize(font, text, maxFontSize, maxWidth)
	const words = text.split(' ')

	if (oneLineFontSize >= minFontSize || words.length < 2) {
		return { lines: [text], fontSize: oneLineFontSize }
	}

	return words
		.slice(1)
		.map((_, index) => {
			const lines = [words.slice(0, index + 1).join(' '), words.slice(index + 1).join(' ')]
			const widths = lines.map(line => textOutline(font, line, minFontSize).width)

			return {
				lines,
				fontSize: Math.min(
					...lines.map(line => fittingFontSize(font, line, minFontSize, maxWidth)),
				),
				imbalance: Math.abs(widths[0] - widths[1]),
			}
		})
		.reduce((best, candidate) =>
			candidate.fontSize > best.fontSize ||
			(candidate.fontSize === best.fontSize && candidate.imbalance < best.imbalance)
				? candidate
				: best,
		)
}

/** A wallet's icon from `public/images/wallets/` as an SVG `<image>`. */
export function walletIconSvg(
	metadata: Pick<WalletMetadata, 'id' | 'iconExtension'>,
	{ x, y, size }: { x: number; y: number; size: number },
): string {
	const icon = repositoryFile(
		'public',
		'images',
		'wallets',
		`${metadata.id}.${metadata.iconExtension}`,
	)

	return `<image href="${dataUri(imageMimeTypes[metadata.iconExtension], icon)}" x="${x}" y="${y}" width="${size}" height="${size}" />`
}

/**
 * The opening of a preview image's SVG: the page background with a glow
 * around `glowCenter`, and the Walletbeat logo at the top of the text column.
 */
export function ogImageSvgStart({
	glowCenter,
	glowRadius,
	textColumnWidth,
}: {
	glowCenter: { x: number; y: number }
	glowRadius: number
	textColumnWidth: number
}): string {
	const { width, height } = ogImageSize
	const logo = repositoryFile('public', 'logo.svg')

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
		'<defs>',
		`<radialGradient id="glow" cx="${glowCenter.x}" cy="${glowCenter.y}" r="${glowRadius}" gradientUnits="userSpaceOnUse">`,
		`<stop offset="0" stop-color="${resolveCssColor('var(--accent-backgroundColor)')}" />`,
		`<stop offset="1" stop-color="${resolveCssColor('var(--background-primary)')}" />`,
		'</radialGradient>',
		'</defs>',
		`<rect width="${width}" height="${height}" fill="url(#glow)" />`,
		`<image href="${dataUri('image/svg+xml', logo)}" x="${ogImagePadding}" y="${logoTop}" height="${logoHeight}" width="${textColumnWidth}" preserveAspectRatio="xMinYMid meet" />`,
	].join('')
}

/** Rasterize a preview image's SVG as a PNG. */
export async function renderOgImagePng(svg: string): Promise<Buffer> {
	return await recompressPng(await sharp(Buffer.from(svg)).png().toBuffer())
}

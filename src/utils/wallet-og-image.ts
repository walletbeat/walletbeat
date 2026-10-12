import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { create as createFont, type Font } from 'fontkitten'
import sharp from 'sharp'

import {
	type ComputedSlice,
	computePieSlices,
	overallRatingPieLevels,
	overallRatingPieMaxRadius,
	overallRatingPieRadius,
	PieLayout,
	type Slice,
	slicePathData,
} from '@/components/pie-geometry'
import { variants } from '@/constants/variants'
import {
	type AttributeTree,
	calculateAttributeGroupScore,
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import { ratingToColor } from '@/schema/attributes'
import { getVariants, type Variant } from '@/schema/variants'
import type { RatedWallet } from '@/schema/wallet'
import type { WBIconID } from '@/styles/wbicons'
import { recompressPng } from '@/tools/image-integrity/png-optimizer-lib'
import { setItems } from '@/types/utils/non-empty'
import { getAstroBuildTimeRepositoryRoot } from '@/utils/codebase.astro'
import { scoreToColor, stageToColor } from '@/utils/colors'
import { resolveCssColor } from '@/utils/css-color-resolver'
import { getWalletStageAndLadder } from '@/utils/stage'
import { getWalletUrl } from '@/utils/urls'

/** Size of social media preview images, in the 1.91:1 ratio that link previews use. */
export const walletOgImageSize = { width: 1200, height: 630 } as const

/** Open Graph image metadata for a wallet's page. */
export function walletOgImage(wallet: RatedWallet<string>): {
	url: string
	width: number
	height: number
	alt: string
} {
	return {
		url: `${getWalletUrl(wallet)}og.png`,
		...walletOgImageSize,
		alt: `${wallet.metadata.displayName} ratings on Walletbeat`,
	}
}

const padding = 72
const flowerRadius = walletOgImageSize.height / 2 - 40
const flowerScale = flowerRadius / overallRatingPieMaxRadius
const flowerCenter = {
	x: walletOgImageSize.width - padding - flowerRadius,
	y: walletOgImageSize.height / 2,
}
const textColumnWidth = flowerCenter.x - flowerRadius - padding * 2
const logoTop = 56
const logoHeight = 40
const walletIconTop = 148
const walletIconSize = 104

/** Dark ink drawn over rating fills, matching the slice labels of `Pie.svelte`. */
const sliceIconOpacity = 0.5

const repositoryFile = (...pathParts: string[]): Buffer =>
	readFileSync(join(getAstroBuildTimeRepositoryRoot(), ...pathParts))

const dataUri = (mimeType: string, data: Buffer): string =>
	`data:${mimeType};base64,${data.toString('base64')}`

const imageMimeTypes = {
	jpg: 'image/jpeg',
	png: 'image/png',
	svg: 'image/svg+xml',
} as const satisfies Record<RatedWallet<string>['metadata']['iconExtension'], string>

function loadFont(fileName: string): Font {
	const font = createFont(repositoryFile('src', 'assets', 'fonts', fileName))

	if (font.isCollection) {
		throw new Error(`Expected a single font in ${fileName}, found a font collection`)
	}

	return font
}

let loadedFonts: { roman: Font; heavy: Font } | null = null

/** The site's body and heading fonts, loaded on first use. */
function fonts(): { roman: Font; heavy: Font } {
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
function textOutline(
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
function fittingFontSize(font: Font, text: string, maxFontSize: number, maxWidth: number): number {
	const { width } = textOutline(font, text, maxFontSize)

	return width <= maxWidth ? maxFontSize : (maxFontSize * maxWidth) / width
}

/** Slices of the rating flower shown on the wallet's page. */
function ratingFlowerSlices<_AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	wallet: RatedWallet<_AttributeGroupId>,
): Slice[] {
	return mapNonExemptAttributeGroupsInTree(
		attributeTree,
		wallet.overall,
		(attrGroup, evalGroup) => ({
			id: attrGroup.id,
			color: scoreToColor(calculateAttributeGroupScore(attrGroup, evalGroup)?.score ?? null),
			weight: 1,
			arcLabel: '',
			arcIconId: attrGroup.icon,
			ariaLabel: attrGroup.displayName,
			children: mapNonExemptGroupAttributes(evalGroup, evalAttr => ({
				id: evalAttr.attribute.id,
				color: ratingToColor(evalAttr.evaluation.outcome.rating),
				weight:
					attrGroup.attributes.find(({ attribute }) => attribute.id === evalAttr.attribute.id)
						?.weight ?? 1,
				arcLabel: '',
				arcIconId: evalAttr.attribute.icon,
				ariaLabel: evalAttr.attribute.displayName,
			})),
		}),
	)
}

function sliceIcon(iconId: WBIconID, slice: ComputedSlice): string {
	const icon = repositoryFile('resources', 'files', 'wbicons', 'wbicons-simple', `${iconId}.svg`)
	const size = slice.computed.labelSize

	return `<image href="${dataUri('image/svg+xml', icon)}" x="${-size / 2}" y="${-slice.computed.labelR - size / 2}" width="${size}" height="${size}" opacity="${sliceIconOpacity}" transform="rotate(${-slice.computed.midAngle} 0 ${-slice.computed.labelR})" />`
}

function sliceSvg(slice: ComputedSlice): string {
	return [
		`<g transform="rotate(${slice.computed.midAngle}) translate(0 ${-slice.computed.offset})">`,
		`<path d="${slicePathData(slice.computed)}" fill="${resolveCssColor(slice.color)}" />`,
		slice.arcIconId === undefined ? '' : sliceIcon(slice.arcIconId, slice),
		'</g>',
		...(slice.children ?? []).map(sliceSvg),
	].join('')
}

function ratingFlowerSvg(slices: Slice[]): string {
	const computedSlices = computePieSlices({
		slices,
		radius: overallRatingPieRadius,
		levels: overallRatingPieLevels(),
		layout: PieLayout.FullTop,
		centerFirstSlice: true,
	})

	return `<g transform="translate(${flowerCenter.x} ${flowerCenter.y}) scale(${flowerScale})">${computedSlices.map(sliceSvg).join('')}</g>`
}

function stageBadgeSvg(wallet: RatedWallet<string>, y: number): string {
	const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)

	if (stage === null || typeof stage !== 'object' || ladderEvaluation === null) {
		return ''
	}

	const stages = ladderEvaluation.ladder.stages
	const fontSize = 28
	const height = 52
	const label = textOutline(fonts().heavy, stage.label, fontSize)
	const background = resolveCssColor(
		stageToColor(
			stages.findIndex(ladderStage => ladderStage.id === stage.id),
			stages.length,
		),
	)

	return [
		`<rect x="${padding}" y="${y}" width="${label.width + 40}" height="${height}" rx="12" fill="${background}" />`,
		`<path d="${label.pathData}" transform="translate(${padding + 20} ${y + height / 2 + fontSize * 0.35})" fill="${resolveCssColor('var(--text-primary)')}" />`,
	].join('')
}

/**
 * A wallet's social media preview image as SVG: its icon, name, variants and
 * stage next to its rating flower, with Walletbeat branding.
 */
export function walletOgImageSvg<_AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	wallet: RatedWallet<_AttributeGroupId>,
): string {
	const { width, height } = walletOgImageSize
	const { metadata } = wallet
	const textColor = resolveCssColor('var(--text-primary)')
	const nameFontSize = fittingFontSize(fonts().heavy, metadata.displayName, 80, textColumnWidth)
	const name = textOutline(fonts().heavy, metadata.displayName, nameFontSize)
	const variantsLine = textOutline(
		fonts().roman,
		setItems<Variant>(getVariants(wallet.variants))
			.map(variant => variants[variant].label)
			.join('  ·  '),
		28,
	)
	const nameBaseline = walletIconTop + walletIconSize + 24 + nameFontSize
	const walletIcon = repositoryFile(
		'public',
		'images',
		'wallets',
		`${metadata.id}.${metadata.iconExtension}`,
	)
	const logo = repositoryFile('public', 'logo.svg')

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
		'<defs>',
		`<radialGradient id="glow" cx="${flowerCenter.x}" cy="${flowerCenter.y}" r="${flowerRadius * 1.6}" gradientUnits="userSpaceOnUse">`,
		`<stop offset="0" stop-color="${resolveCssColor('var(--accent-backgroundColor)')}" />`,
		`<stop offset="1" stop-color="${resolveCssColor('var(--background-primary)')}" />`,
		'</radialGradient>',
		'</defs>',
		`<rect width="${width}" height="${height}" fill="url(#glow)" />`,
		`<image href="${dataUri('image/svg+xml', logo)}" x="${padding}" y="${logoTop}" height="${logoHeight}" width="${textColumnWidth}" preserveAspectRatio="xMinYMid meet" />`,
		`<image href="${dataUri(imageMimeTypes[metadata.iconExtension], walletIcon)}" x="${padding}" y="${walletIconTop}" width="${walletIconSize}" height="${walletIconSize}" />`,
		`<path d="${name.pathData}" transform="translate(${padding} ${nameBaseline})" fill="${textColor}" />`,
		`<path d="${variantsLine.pathData}" transform="translate(${padding} ${nameBaseline + 50})" fill="${textColor}" fill-opacity="0.7" />`,
		stageBadgeSvg(wallet, nameBaseline + 84),
		ratingFlowerSvg(ratingFlowerSlices(attributeTree, wallet)),
		'</svg>',
	].join('')
}

/** Render a wallet's social media preview image as a PNG. */
export async function renderWalletOgImage<_AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	wallet: RatedWallet<_AttributeGroupId>,
): Promise<Buffer> {
	return await recompressPng(
		await sharp(Buffer.from(walletOgImageSvg(attributeTree, wallet)))
			.png()
			.toBuffer(),
	)
}

import type { ImageMetadata } from 'astro'
import { imageMetadata } from 'astro/assets/utils'

import { withBasePath } from '@/base-url'
import { attributeGroupFlowerGradient, sliceGradientStops } from '@/components/pie-fill'
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
import { setItems } from '@/types/utils/non-empty'
import { scoreToColor, stageToColor } from '@/utils/colors'
import { resolveCssColor } from '@/utils/css-color-resolver'
import {
	dataUri,
	fittingFontSize,
	fonts,
	ogImageSize,
	ogImageSvg,
	renderOgImage,
	repositoryFile,
	textOutline,
} from '@/utils/og-image'
import { getWalletStageAndLadder } from '@/utils/stage'

/** Size of social media preview images, in the 1.91:1 ratio that link previews use. */
export const walletOgImageSize = ogImageSize

/** Open Graph image metadata for a wallet's page. */
export function walletOgImage(wallet: RatedWallet<string>): {
	url: string
	width: number
	height: number
	alt: string
} {
	return {
		url: withBasePath(`/${wallet.metadata.id}/og.png`),
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
const walletIconTop = 148
const walletIconSize = 104

/** Dark ink drawn over rating fills, matching the slice labels of `Pie.svelte`. */
const sliceIconOpacity = 0.5

/** Intrinsic wallet icon dimensions shared by the page and its compact header. */
export async function getWalletIcon(
	metadata: RatedWallet<string>['metadata'],
): Promise<ImageMetadata> {
	const fileName = `${metadata.id}.${metadata.iconExtension}`
	const src = `/images/wallets/${fileName}`

	return {
		src,
		...(await imageMetadata(repositoryFile('public', 'images', 'wallets', fileName), src)),
	}
}

const imageMimeTypes = {
	jpg: 'image/jpeg',
	png: 'image/png',
	svg: 'image/svg+xml',
} as const satisfies Record<RatedWallet<string>['metadata']['iconExtension'], string>

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
			gradient: attributeGroupFlowerGradient,
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
	const stops = sliceGradientStops(slice)
	const path = slicePathData(slice.computed)
	const fillId = `fill-${slice.id}`
	const gradient =
		typeof stops === 'string'
			? ''
			: `<radialGradient id="${fillId}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${slice.computed.outerR}">${stops
					.flatMap((stop, index) => {
						const previous = stops[index - 1]

						if (previous === undefined) {
							return [
								`<stop offset="${stop.position / slice.computed.outerR}" stop-color="${resolveCssColor(stop.color)}"/>`,
							]
						}

						// Sample the canonical OKLCH interpolation for SVG's sRGB-only rasterizer.
						return Array.from({ length: 32 }, (_, step) => {
							const fraction = (step + 1) / 32
							const color = resolveCssColor(
								`color-mix(in oklch, ${previous.color}, ${stop.color} ${fraction * 100}%)`,
							)

							return `<stop offset="${(previous.position + (stop.position - previous.position) * fraction) / slice.computed.outerR}" stop-color="${color}"/>`
						})
					})
					.join('')}</radialGradient>`

	return [
		`<g transform="rotate(${slice.computed.midAngle}) translate(0 ${-slice.computed.offset})">`,
		gradient,
		typeof stops === 'string'
			? ''
			: `<path d="${path}" fill="${resolveCssColor('var(--rating-unrated)')}" />`,
		`<path d="${path}" fill="${typeof stops === 'string' ? resolveCssColor(stops) : `url(#${fillId})`}" />`,
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
	const { metadata } = wallet
	const textColor = resolveCssColor('var(--text-primary)')
	const nameFontSize = fittingFontSize(fonts().heavy, metadata.displayName, 80, textColumnWidth)
	const name = textOutline(fonts().heavy, metadata.displayName, nameFontSize)
	const variantsText = setItems<Variant>(getVariants(wallet.variants))
		.map(variant => variants[variant].label)
		.join('  ·  ')
	const variantsLine = textOutline(
		fonts().roman,
		variantsText,
		fittingFontSize(fonts().roman, variantsText, 28, textColumnWidth),
	)
	const nameBaseline = walletIconTop + walletIconSize + 24 + nameFontSize
	const walletIcon = repositoryFile(
		'public',
		'images',
		'wallets',
		`${metadata.id}.${metadata.iconExtension}`,
	)

	return ogImageSvg(
		[
			`<image href="${dataUri(imageMimeTypes[metadata.iconExtension], walletIcon)}" x="${padding}" y="${walletIconTop}" width="${walletIconSize}" height="${walletIconSize}" />`,
			`<path d="${name.pathData}" transform="translate(${padding} ${nameBaseline})" fill="${textColor}" />`,
			`<path d="${variantsLine.pathData}" transform="translate(${padding} ${nameBaseline + 50})" fill="${textColor}" fill-opacity="0.7" />`,
			stageBadgeSvg(wallet, nameBaseline + 84),
			ratingFlowerSvg(ratingFlowerSlices(attributeTree, wallet)),
		].join(''),
	)
}

/** Render a wallet's social media preview image as a PNG. */
export async function renderWalletOgImage<_AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	wallet: RatedWallet<_AttributeGroupId>,
): Promise<Buffer> {
	return await renderOgImage(walletOgImageSvg(attributeTree, wallet))
}

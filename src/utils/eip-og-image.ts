import { computePieSlices, PieLayout, type Slice, slicePathData } from '@/components/pie-geometry'
import { type EipStatusSupportCard, EipSupportStatus } from '@/schema/eip-support'
import { type Eip, eipShortLabel, eipStatusLabel } from '@/schema/eips'
import { resolveCssColor } from '@/utils/css-color-resolver'
import {
	fittingLines,
	fonts,
	type OgImage,
	ogImagePadding as padding,
	ogImageSize,
	ogImageSvgStart,
	renderOgImagePng,
	textOutline,
	walletIconSvg,
} from '@/utils/og-image'
import { getEipTrackerUrl } from '@/utils/urls'

/** Open Graph image metadata for an EIP's tracker page. */
export function eipOgImage(eip: Eip): OgImage {
	return {
		url: `${getEipTrackerUrl(eip)}og.png`,
		...ogImageSize,
		alt: `${eipShortLabel(eip)} wallet adoption on Walletbeat`,
	}
}

const statusSlices: Array<{ status: EipSupportStatus; color: string }> = [
	{ status: EipSupportStatus.SUPPORTED, color: 'var(--rating-pass)' },
	{ status: EipSupportStatus.NOT_SUPPORTED, color: 'var(--rating-fail)' },
	{ status: EipSupportStatus.UNKNOWN, color: 'var(--rating-unrated)' },
]

const donutRadius = ogImageSize.height / 2 - 115
const donutCenter = {
	x: ogImageSize.width - padding - donutRadius,
	y: ogImageSize.height / 2,
}
const textColumnWidth = donutCenter.x - donutRadius - padding * 2
const walletIconSize = 56
const walletIconGap = 12
const walletRowTop = 500

/** Ink of the slice counts, matching the slice labels of `Pie.svelte`. */
const sliceLabelColor = 'rgb(19 10 43 / 0.62)'

/** Text line with its baseline at `y`, horizontally centered on `centerX` if given. */
function textSvg({
	text,
	heavy = false,
	fontSize,
	x = padding,
	centerX,
	y,
	opacity = 1,
}: {
	text: string
	heavy?: boolean
	fontSize: number
	x?: number
	centerX?: number
	y: number
	opacity?: number
}): string {
	const { pathData, width } = textOutline(heavy ? fonts().heavy : fonts().roman, text, fontSize)
	const left = centerX === undefined ? x : centerX - width / 2

	return `<path d="${pathData}" transform="translate(${left} ${y})" fill="${resolveCssColor('var(--text-primary)')}" fill-opacity="${opacity}" />`
}

/** A donut with one slice per support status, labeled with its count. */
function supportDonutSvg(cards: EipStatusSupportCard[], centerLabel: string): string {
	const slices: Slice[] = statusSlices.flatMap(({ status, color }) => {
		const count = cards.filter(card => card.status === status).length

		return count === 0
			? []
			: [{ id: status, color, weight: count, arcLabel: String(count), ariaLabel: status }]
	})
	const computedSlices = computePieSlices({
		slices,
		radius: donutRadius,
		levels: [
			{
				outerRadiusFraction: 1,
				innerRadiusFraction: 0.58,
				gap: 0,
				angleGap: slices.length > 1 ? 4 : 0,
				outerCornerRadius: 18,
				innerCornerRadius: 12,
			},
		],
		layout: PieLayout.FullTop,
		centerFirstSlice: true,
		labelSize: 36,
	})

	return [
		`<g transform="translate(${donutCenter.x} ${donutCenter.y})">`,
		...computedSlices.map(slice => {
			const label = textOutline(fonts().heavy, slice.arcLabel, slice.computed.labelSize)

			return [
				`<g transform="rotate(${slice.computed.midAngle})">`,
				`<path d="${slicePathData(slice.computed)}" fill="${resolveCssColor(slice.color)}" />`,
				`<path d="${label.pathData}" transform="rotate(${-slice.computed.midAngle} 0 ${-slice.computed.labelR}) translate(${-label.width / 2} ${-slice.computed.labelR + slice.computed.labelSize * 0.35})" fill="${sliceLabelColor}" />`,
				'</g>',
			].join('')
		}),
		textSvg({ text: centerLabel, heavy: true, fontSize: 72, centerX: 0, y: 26 }),
		'</g>',
	].join('')
}

/** Icons of the wallets in `cards`, in one row, with a "+N" for those that don't fit. */
function walletRowSvg(cards: EipStatusSupportCard[], label: string): string {
	const wallets = cards.filter(
		(card, index) => cards.findIndex(other => other.id === card.id) === index,
	)
	const fittingCount = Math.floor(
		(textColumnWidth + walletIconGap) / (walletIconSize + walletIconGap),
	)
	const shownCount = wallets.length > fittingCount ? fittingCount - 1 : wallets.length
	const step = walletIconSize + walletIconGap

	return [
		textSvg({ text: label, fontSize: 22, y: walletRowTop - 16, opacity: 0.7 }),
		...wallets
			.slice(0, shownCount)
			.map((card, index) =>
				walletIconSvg(card, { x: padding + index * step, y: walletRowTop, size: walletIconSize }),
			),
		wallets.length > shownCount
			? textSvg({
					text: `+${wallets.length - shownCount}`,
					heavy: true,
					fontSize: 28,
					centerX: padding + shownCount * step + walletIconSize / 2,
					y: walletRowTop + walletIconSize / 2 + 10,
					opacity: 0.7,
				})
			: '',
	].join('')
}

/**
 * An EIP tracker page's social media preview image as SVG: the EIP's name
 * and status, how many software wallets support it, the supporting wallets'
 * icons (or the non-supporting ones if none do), and a donut of the support
 * breakdown, with Walletbeat branding.
 */
export function eipOgImageSvg(eip: Eip, cards: EipStatusSupportCard[]): string {
	const walletCount = new Set(cards.map(card => card.id)).size
	const supportedCards = cards.filter(card => card.status === EipSupportStatus.SUPPORTED)
	const notSupportedCards = cards.filter(card => card.status === EipSupportStatus.NOT_SUPPORTED)
	const supportedCount = new Set(supportedCards.map(card => card.id)).size
	const name = fittingLines(fonts().heavy, eip.friendlyName, {
		maxFontSize: 72,
		minFontSize: 52,
		maxWidth: textColumnWidth,
	})
	const nameLineHeight = name.fontSize * 1.15
	const nameBaseline = 160 + 24 + name.fontSize + (name.lines.length - 1) * nameLineHeight
	const headlineGap = name.lines.length > 1 ? 64 : 72
	const finalSince =
		eip.finalizedDate === null
			? null
			: `Final since ${new Date(eip.finalizedDate).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					timeZone: 'UTC',
				})}`

	return [
		ogImageSvgStart({ glowCenter: donutCenter, glowRadius: donutRadius * 1.9, textColumnWidth }),
		textSvg({
			text: `${eipShortLabel(eip)}  ·  ${eipStatusLabel[eip.status]}`,
			fontSize: 30,
			y: 160,
			opacity: 0.7,
		}),
		...name.lines.map((line, index) =>
			textSvg({
				text: line,
				heavy: true,
				fontSize: name.fontSize,
				y: nameBaseline - (name.lines.length - 1 - index) * nameLineHeight,
			}),
		),
		textSvg({
			text: `${supportedCount} of ${walletCount} software wallets`,
			heavy: true,
			fontSize: 40,
			y: nameBaseline + headlineGap,
		}),
		textSvg({
			text: `support ${eipShortLabel(eip)}`,
			fontSize: 32,
			y: nameBaseline + headlineGap + 42,
		}),
		finalSince === null
			? ''
			: textSvg({
					text: finalSince,
					fontSize: 26,
					y: nameBaseline + headlineGap + 88,
					opacity: 0.7,
				}),
		supportedCards.length > 0
			? walletRowSvg(supportedCards, 'Supported by')
			: notSupportedCards.length > 0
				? walletRowSvg(notSupportedCards, 'Not supported by')
				: '',
		walletCount > 0 ? supportDonutSvg(cards, `${supportedCount}/${walletCount}`) : '',
		'</svg>',
	].join('')
}

/** Render an EIP tracker page's social media preview image as a PNG. */
export async function renderEipOgImage(eip: Eip, cards: EipStatusSupportCard[]): Promise<Buffer> {
	return await renderOgImagePng(eipOgImageSvg(eip, cards))
}

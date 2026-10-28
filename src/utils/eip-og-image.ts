import { withBasePath } from '@/base-url'
import { eipSupportPie } from '@/components/eip-support-pie'
import { computePieSlices, PieLayout, slicePathData } from '@/components/pie-geometry'
import { ratedSoftwareWallets } from '@/data/software-wallets'
import { EipSupportStatus, ratedWalletEipSupportByStatus } from '@/schema/eip-support'
import { type Eip, eipShortLabel } from '@/schema/eips'
import { resolveCssColor } from '@/utils/css-color-resolver'
import {
	fittingFontSize,
	fonts,
	ogImageSize,
	ogImageSvg,
	renderOgImage,
	textOutline,
} from '@/utils/og-image'

/** Page-specific preview metadata, including the dedicated EIP-7702 tracker. */
export function eipOgImage(eip: Eip) {
	return {
		url: withBasePath(`/wallet/eip/${eip.number}/og.png`),
		...ogImageSize,
		alt: `${eipShortLabel(eip)} (${eip.friendlyName}): software wallet support on Walletbeat`,
	}
}

/** Use the same platform-qualified status entries as the software wallet chart. */
export function eipOgImageSvg(eip: Eip): string {
	const cards = Object.values(ratedSoftwareWallets).flatMap(wallet => {
		const byStatus = ratedWalletEipSupportByStatus(wallet, eip.number)

		return Object.values(EipSupportStatus)
			.filter(status => byStatus[status] !== undefined)
			.map(status => ({ id: wallet.metadata.id, status }))
	})
	const summary = eipSupportPie(cards, 'software-wallets')
	const slices = computePieSlices({
		slices: summary.slices,
		radius: 64,
		levels: summary.levels,
		layout: PieLayout.FullTop,
		centerFirstSlice: true,
		labelSize: 14,
	})
	const text = (
		value: string,
		x: number,
		y: number,
		size: number,
		maxWidth: number,
		heavy = false,
		centered = false,
	) => {
		const font = heavy ? fonts().heavy : fonts().roman
		const outline = textOutline(font, value, fittingFontSize(font, value, size, maxWidth))

		return `<path d="${outline.pathData}" transform="translate(${centered ? x - outline.width / 2 : x} ${y})" fill="${resolveCssColor('var(--text-primary)')}"/>`
	}
	const titleWords = eip.friendlyName.split(/\s+/)
	const titleLines: string[] = []

	for (const word of titleWords) {
		const last = titleLines.at(-1)

		if (last !== undefined && textOutline(fonts().heavy, `${last} ${word}`, 38).width <= 520) {
			titleLines[titleLines.length - 1] = `${last} ${word}`
		} else {
			titleLines.push(word)
		}
	}
	const titleSize = Math.min(38, 138 / titleLines.length)
	const chart = slices
		.map(
			slice =>
				`<g transform="rotate(${slice.computed.midAngle})"><path d="${slicePathData(slice.computed)}" fill="${resolveCssColor(slice.color)}"/></g>`,
		)
		.join('')

	return ogImageSvg(
		[
			text(eipShortLabel(eip), 72, 190, 72, 520, true),
			...titleLines.map((line, index) =>
				text(line, 72, 248 + index * titleSize * 1.2, titleSize, 520, true),
			),
			text('Software wallet support', 72, 425, 30, 520),
			text(
				`${summary.supportedWalletCount} of ${summary.walletCount} distinct wallets`,
				72,
				471,
				32,
				520,
				true,
			),
			text('support on at least one platform', 72, 508, 24, 520),
			`<g transform="translate(878 280) scale(3.1)">${chart}</g>`,
			text(`${summary.supportedWalletCount}/${summary.walletCount}`, 878, 298, 40, 126, true, true),
			...summary.slices.map(
				(slice, index) =>
					`<circle cx="685" cy="${502 + index * 30}" r="7" fill="${resolveCssColor(slice.color)}"/>` +
					text(
						slice.ariaLabel.replace('platform-qualified status entries: ', ''),
						705,
						510 + index * 30,
						22,
						420,
					),
			),
			text('Slices: platform-qualified status entries', 72, 577, 22, 550),
			text('A wallet may have more than one status.', 72, 604, 20, 550),
		].join(''),
	)
}

export async function renderEipOgImage(eip: Eip): Promise<Buffer> {
	return await renderOgImage(eipOgImageSvg(eip))
}

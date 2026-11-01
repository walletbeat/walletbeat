import { readdirSync } from 'node:fs'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { chromaticLogoColors, getLogoPalette, logoBackgroundBlobs, logoSvgForTheme, sampleLogoColors } from './logo-palette'

const pixel = (red: number, green: number, blue: number, alpha = 255) => [red, green, blue, alpha]

it('weights visible area by alpha and excludes invisible RGB values', () => {
	const palette = sampleLogoColors(
		new Uint8Array([
			...pixel(255, 0, 0),
			...pixel(255, 0, 0),
			...pixel(0, 0, 255, 128),
			...pixel(0, 255, 0, 0),
		]),
	)

	expect(palette.map(entry => entry.color)).toEqual(['#ff0000', '#0000ff'])
	expect(palette[0].weight).toBeCloseTo(510 / 638)
	expect(palette[1].weight).toBeCloseTo(128 / 638)
	expect(sampleLogoColors(new Uint8Array(pixel(255, 0, 255, 0)))).toEqual([])
})

it('is independent of pixel order and preserves dominant edge colors', () => {
	const pixels = [pixel(255, 255, 255), ...Array.from({ length: 9 }, () => pixel(0, 0, 0))]
	const forward = sampleLogoColors(new Uint8Array(pixels.flat()))

	expect(sampleLogoColors(new Uint8Array(pixels.toReversed().flat()))).toEqual(forward)
	expect(forward).toEqual([
		{ color: '#000000', weight: 0.9 },
		{ color: '#ffffff', weight: 0.1 },
	])
})

it('allocates independent chromatic shares per theme with one opacity clock', () => {
	const palette = [{ color: '#ff0000', weight: 0.75 }, { color: '#ffffff', weight: 0.25 }]
	const blobs = Object.values(logoBackgroundBlobs({ light: palette, dark: [] }))
	expect(blobs).toHaveLength(1)
	expect(blobs[0].lightThemeColor).toBe('#ff0000')
	expect(blobs[0].lightThemeWeight).toBe(1)
	expect(blobs[0].darkThemeWeight).toBe(0)
	expect(blobs[0].darkThemeColor).toBe('transparent')
	expect(blobs[0].opacity.toValue).toBe('52%')
	expect(chromaticLogoColors([{ color: '#808080', weight: 1 }])).toEqual([])
})

it('resolves SVG media rules while preserving inline cascade precedence', async () => {
	const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" style="fill:#000"><style>svg{fill:#111}@media(prefers-color-scheme:dark){svg{fill:#fff}}</style><path d="M0 0h1v1z"/></svg>')
	expect(logoSvgForTheme(svg, 'light').toString()).not.toContain('#fff')
	expect(logoSvgForTheme(svg, 'dark').toString()).toContain('svg{fill:#fff}')
	expect(logoSvgForTheme(svg, 'dark').toString()).toContain('style="fill:#000"')
	const responsive = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><style>rect{fill:#000}@media(prefers-color-scheme:dark){rect{fill:#fff}}</style><rect width="16" height="16"/></svg>')
	for (const theme of ['light', 'dark'] as const) {
		const { data, info } = await sharp(logoSvgForTheme(responsive, theme)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
		expect(sampleLogoColors(data, info.width)[0].color).toBe(theme === 'light' ? '#000000' : '#ffffff')
	}
})

const logos = readdirSync('public/images/wallets')
	.filter(name => /\.(svg|png|jpg)$/.test(name))
	.sort()
	.map(name => `/images/wallets/${name}`)

describe('every shipped logo', () => {
	it.each(logos.flatMap(logo => (['light', 'dark'] as const).map(theme => ({ logo, theme }))))('$logo in $theme has a finite normalized distribution', async ({ logo, theme }) => {
		const palette = await getLogoPalette(logo, theme)

		expect(palette.length).toBeGreaterThan(0)
		expect(palette.length).toBeLessThanOrEqual(8)
		expect(palette.reduce((sum, entry) => sum + entry.weight, 0)).toBeCloseTo(1, 12)

		for (const entry of palette) {
			expect(entry.color).toMatch(/^#[0-9a-f]{6}$/)
			expect(entry.weight).toBeGreaterThan(0)
			expect(Number.isFinite(entry.weight)).toBe(true)
		}
	})
})

it('handles monochrome, tiny fragments and distinct nearby colors', () => {
	expect(sampleLogoColors(new Uint8Array(pixel(24, 80, 160)))).toEqual([
		{ color: '#1850a0', weight: 1 },
	])
	const dominant = [...Array.from({ length: 100 }, () => pixel(255, 0, 0)), pixel(255, 255, 0)]

	expect(sampleLogoColors(new Uint8Array(dominant.flat()))).toEqual([
		{ color: '#ff0000', weight: 100 / 101 },
		{ color: '#ffff00', weight: 1 / 101 },
	])
	const nearbyColors = [pixel(1, 2, 3), pixel(7, 4, 6, 64)]

	expect(sampleLogoColors(new Uint8Array(nearbyColors.flat()))).toEqual([
		{ color: '#010203', weight: 255 / 319 },
		{ color: '#070406', weight: 64 / 319 },
	])

	expect(sampleLogoColors(new Uint8Array(nearbyColors.flat()))).toEqual(
		sampleLogoColors(new Uint8Array(nearbyColors.toReversed().flat())),
	)
})

it('partitions a multicolor distribution without losing mass or determinism', () => {
	const colors = [
		[255, 0, 0],
		[0, 255, 0],
		[0, 0, 255],
		[255, 255, 0],
		[0, 255, 255],
		[255, 0, 255],
		[0, 0, 0],
		[255, 255, 255],
		[128, 128, 128],
		[240, 128, 0],
	]
	const pixels = colors.flatMap(([red, green, blue]) =>
		Array.from({ length: 10 }, () => pixel(red, green, blue)),
	)
	const palette = sampleLogoColors(new Uint8Array(pixels.flat()))

	expect(palette.length).toBe(8)
	expect(palette.reduce((sum, entry) => sum + entry.weight, 0)).toBeCloseTo(1, 12)
	expect(sampleLogoColors(new Uint8Array(pixels.toReversed().flat()))).toEqual(palette)
})

it('removes negligible boundary colors while retaining small solid accents and gradients', async () => {
	const shapes = [
		{ body: '<path fill="#ff0000" d="M0 0H100V100Z"/><path fill="#0000ff" d="M0 0V100H100Z"/>', kind: 'boundary' },
		{ body: '<path fill="#ff0000" d="M0 0H100V100H0Z"/><rect x="30" y="30" width="2" height="2" fill="#00ff00"/>', kind: 'accent' },
		{ body: '<defs><linearGradient id="g"><stop stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/></linearGradient></defs><path fill="url(#g)" d="M0 0H100V100H0Z"/>', kind: 'gradient' },
	]
	for (const shape of shapes) {
		const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">${shape.body}</svg>`)
		const { data, info } = await sharp(svg).resize(256, 256).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
		const colors = sampleLogoColors(data, info.width)
		if (shape.kind === 'boundary') expect(colors).toHaveLength(2)
		if (shape.kind === 'accent') expect(colors.some(entry => Number.parseInt(entry.color.slice(3, 5), 16) > 2 * Number.parseInt(entry.color.slice(1, 3), 16) && entry.weight < 0.001)).toBe(true)
		if (shape.kind === 'gradient') expect(colors.length).toBeGreaterThanOrEqual(4)
		expect(colors.reduce((sum, entry) => sum + entry.weight, 0)).toBeCloseTo(1, 12)
	}
})

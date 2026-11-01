import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import postcss from 'postcss'
import sharp from 'sharp'
import { optimize } from 'svgo'
import type { ComponentProps } from 'svelte'
import type Background from '../components/Background.svelte'

import { getAstroBuildTimeRepositoryRoot } from './codebase.astro'

export interface LogoColor {
	color: string
	/** Fraction of the visible, alpha-weighted logo area. */
	weight: number
}

type Sample = { rgb: [number, number, number]; mass: number; coreMass: number }

export type LogoTheme = 'light' | 'dark'
export type LogoPalettes = Record<LogoTheme, LogoColor[]>

const colorChannels = (channel: (axis: 0 | 1 | 2) => number): Sample['rgb'] => [
	channel(0),
	channel(1),
	channel(2),
]

const maximumColors = 8

const mass = (samples: Sample[]): number =>
	samples.reduce((total, sample) => total + sample.mass, 0)

function average(samples: Sample[]): Sample {
	const total = mass(samples)

	return {
		mass: total,
		coreMass: samples.reduce((sum, sample) => sum + sample.coreMass, 0),
		rgb: colorChannels(
			axis => samples.reduce((sum, sample) => sum + sample.rgb[axis] * sample.mass, 0) / total,
		),
	}
}

const distance = (a: Sample, b: Sample): number =>
	a.rgb.reduce((sum, value, axis) => sum + (value - b.rgb[axis]) ** 2, 0)

/** Deterministic alpha-weighted median cut; transparent padding contributes no color. */
export function sampleLogoColors(pixels: Uint8Array, width?: number, negligibleShare = 0.005): LogoColor[] {
	const histogram = new Map<number, { mass: number; coreMass: number }>()

	for (let offset = 0; offset < pixels.length; offset += 4) {
		const alpha = pixels[offset + 3]

		if (alpha === 0) {
			continue
		}

		const rgb: [number, number, number] = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
		const column = width === undefined ? 0 : (offset / 4) % width
		const core = width === undefined || (
			column > 0 && column < width - 1 && offset >= width * 4 && offset + width * 4 < pixels.length &&
			[-4, 4, -width * 4, width * 4].every(step =>
				Math.abs(pixels[offset + step + 3] - alpha) <= 8 &&
				rgb.every((value, axis) => Math.abs(pixels[offset + step + axis] - value) <= 8),
			))
		const coreMass = core ? alpha : 0
		const key = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]
		const entry = histogram.get(key)

		if (entry === undefined) {
			histogram.set(key, { mass: alpha, coreMass })
		} else {
			entry.mass += alpha
			entry.coreMass += coreMass

		}
	}
	const points: Sample[] = [...histogram.entries()]
		.sort(([a], [b]) => a - b)
		.map(([key, sample]) => ({
			mass: sample.mass,
			coreMass: sample.coreMass,
			rgb: [key >> 16, (key >> 8) & 255, key & 255],
		}))

	if (points.length === 0) {
		return []
	}

	const boxes: Sample[][] = [points]

	while (boxes.length < maximumColors) {
		let selected = -1
		let selectedAxis = 0
		let greatestVariance = 0

		for (let index = 0; index < boxes.length; index++) {
			const box = boxes[index]
			const center = average(box)

			for (const axis of [0, 1, 2]) {
				const variance = box.reduce(
					(sum, sample) => sum + sample.mass * (sample.rgb[axis] - center.rgb[axis]) ** 2,
					0,
				)

				if (box.length > 1 && variance > greatestVariance) {
					selected = index
					selectedAxis = axis
					greatestVariance = variance
				}
			}
		}

		if (selected === -1) {
			break
		}

		const box = boxes[selected].toSorted((a, b) => a.rgb[selectedAxis] - b.rgb[selectedAxis])
		const half = mass(box) / 2
		let accumulated = 0
		let split = 1

		for (; split < box.length; split++) {
			accumulated += box[split - 1].mass

			if (accumulated >= half) {
				break
			}
		}
		split = Math.min(split, box.length - 1)
		boxes.splice(selected, 1, box.slice(0, split), box.slice(split))
	}
	const colors = boxes.map(average)
	const total = mass(colors)

	// Negligible edge-only fragments join a main color; small interior accents retain their identity.
	while (colors.length > 1) {
		const index = colors.findIndex(color => color.mass / total < negligibleShare && color.coreMass === 0)

		if (index === -1) {
			break
		}

		const [small] = colors.splice(index, 1)
		let nearest = 0

		for (let i = 1; i < colors.length; i++) {
			if (distance(small, colors[i]) < distance(small, colors[nearest])) {
				nearest = i
			}
		}
		colors[nearest] = average([colors[nearest], small])
	}

	return colors
		.map(sample => ({
			color: `#${sample.rgb.map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`,
			weight: sample.mass / total,
		}))
		.sort((a, b) => b.weight - a.weight || a.color.localeCompare(b.color, 'en'))
}

/** Resolve SVG theme media rules before rasterization; preserve the SVG cascade and geometry. */
export function logoSvgForTheme(buffer: Buffer, theme: LogoTheme): Buffer {
	return Buffer.from(optimize(buffer.toString('utf8'), { plugins: [{
		name: 'resolve-logo-theme',
		fn: () => ({ element: { enter(node) {
			if (node.name !== 'style') return
			for (const child of node.children) {
				if (child.type !== 'text' && child.type !== 'cdata') continue
				const css = postcss.parse(child.value)
				css.walkAtRules('media', rule => {
					if (!rule.params.includes('prefers-color-scheme')) return
					const match = /^\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)$/.exec(rule.params)
					if (!match) throw new Error(`Unsupported logo theme query: ${rule.params}`)
					if (match[1] === theme) rule.replaceWith(...(rule.nodes ?? []))
					else rule.remove()
				})
				child.value = css.toString()
			}
		} } }),
	}] }).data)
}

const palettes = new Map<string, Promise<LogoColor[]>>()

/** Render SVGs directly at 4096 pixels; sample bitmaps at native resolution, once per build. */
export function getLogoPalette(src: string, theme: LogoTheme = 'light'): Promise<LogoColor[]> {
	if (!src.startsWith('/') || src.split('/').includes('..')) {
		throw new Error(`Expected a local logo URL: ${src}`)
	}

	const key = `${theme}:${src}`
	const existing = palettes.get(key)

	if (existing !== undefined) {
		return existing
	}

	const palette = readFile(join(getAstroBuildTimeRepositoryRoot(), 'public', src)).then(
		async buffer => {
			if (theme === 'dark' && !buffer.includes('prefers-color-scheme')) return getLogoPalette(src, 'light')
			const metadata = await sharp(buffer).metadata()
			const image = sharp(metadata.format === 'svg' && buffer.includes('prefers-color-scheme') ? logoSvgForTheme(buffer, theme) : buffer).rotate()

			if (metadata.format === 'svg') {
				image.resize(4096, 4096, { fit: 'inside' })
			}
			const { data, info } = await image
				.toColourspace('srgb')
				.ensureAlpha()
				.raw()
				.toBuffer({ resolveWithObject: true })

			return sampleLogoColors(data, info.width)
		},
	)

	palettes.set(key, palette)

	return palette
}

const percent = (value: number): `${number}%` => `${Math.round(value * 10000) / 10000}%`

const chroma = (hex: string): number => {
	const rgb = [1, 3, 5].map(offset => {
		const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
	})
	const l = Math.cbrt(0.4122214708 * rgb[0] + 0.5363325363 * rgb[1] + 0.0514459929 * rgb[2])
	const m = Math.cbrt(0.2119034982 * rgb[0] + 0.6806995451 * rgb[1] + 0.1073969566 * rgb[2])
	const s = Math.cbrt(0.0883024619 * rgb[0] + 0.2817188376 * rgb[1] + 0.6299787005 * rgb[2])
	return Math.hypot(1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s)
}

/** Separate visual emphasis from the measured area distribution; achromatic marks produce no blobs. */
export function chromaticLogoColors(palette: LogoColor[]): LogoColor[] {
	const colors = palette.map(entry => ({ ...entry, weight: entry.weight * chroma(entry.color) }))
		.filter(entry => chroma(entry.color) > 0.02)
	const total = colors.reduce((sum, entry) => sum + entry.weight, 0)
	return colors.map(entry => ({ ...entry, weight: entry.weight / total }))
		.sort((a, b) => b.weight - a.weight || a.color.localeCompare(b.color, 'en'))
}

/** Theme-specific opacity weights the complete blob, including its texture. */
export function logoBackgroundBlobs(palettes: LogoPalettes): ComponentProps<typeof Background>['blobs'] {
	const light = chromaticLogoColors(palettes.light)
	const dark = chromaticLogoColors(palettes.dark)
	const count = Math.max(light.length, dark.length)
	return Object.fromEntries(Array.from({ length: count }, (_, index) => {
		const angle = index / count * Math.PI * 2
		const blob: ComponentProps<typeof Background>['blobs'][string] = {
			lightThemeColor: light[index]?.color ?? 'transparent',
			darkThemeColor: dark[index]?.color ?? 'transparent',
			lightThemeWeight: light[index]?.weight ?? 0,
			darkThemeWeight: dark[index]?.weight ?? 0,
			opacity: { fromValue: percent(18), toValue: percent(52), seconds: 20 },
			translationX: { fromValue: percent(50 + 24 * Math.cos(angle)), toValue: percent(50 + 28 * Math.cos(angle + 0.7)), seconds: 25 + index * 5 },
			translationY: { fromValue: percent(45 + 18 * Math.sin(angle)), toValue: percent(50 + 24 * Math.sin(angle + 0.7)), seconds: 22.5 + index * 5 },
		}
		return [`logo-${index}`, blob] as const
	}))
}

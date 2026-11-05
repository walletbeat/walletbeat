import { readFileSync } from 'node:fs'

import { parse } from 'postcss'
import { expect, it } from 'vitest'

import { logoBackgroundBlobs } from '@/utils/logo-palette'

const styles = parse(readFileSync(new URL('./global.css', import.meta.url), 'utf8'))
const cardStyles = parse(readFileSync(new URL('./css-attributes.css', import.meta.url), 'utf8'))
let primaryOpacity = 0

cardStyles.walkDecls('--card-primaryOpacity', entry => {
	primaryOpacity ||= Number(entry.value)
})
const declaration = (name: string) => {
	let value: string | null = null

	styles.walkDecls(name, entry => {
		value ??= entry.value
	})

	if (value === null) {
		throw new Error(`Missing ${name}`)
	}

	return String(value)
}
const hex = (value: string) => ({
	channels: [1, 3, 5].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16) / 255),
	alpha: value.length === 9 ? Number.parseInt(value.slice(7, 9), 16) / 255 : 1,
})
const themeColors = (name: string) => {
	const value = declaration(name)
	const alias = /^var\((--[\w-]+)\)$/.exec(value)
	const match = /^light-dark\((#[\da-f]+), (#[\da-f]+)\)$/i.exec(
		alias === null ? value : declaration(alias[1]),
	)

	if (match === null) {
		throw new Error(`Recalculate the surface reference for ${name}`)
	}

	return match.slice(1).map(hex)
}
const coefficients = (name: string): number[] => {
	const value = declaration(name)
	const alias = /^var\((--[\w-]+)\)$/.exec(value)

	return alias === null
		? [...value.matchAll(/\d+\.\d+/g)].map(match => Number(match[0]))
		: coefficients(alias[1])
}
const linear = (value: number) =>
	value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
const gamma = (value: number) =>
	value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055
const luminance = (rgb: number[]) =>
	rgb.reduce((sum, value, index) => sum + linear(value) * [0.2126, 0.7152, 0.0722][index], 0)
const lab = (rgb: number[]) => {
	const [red, green, blue] = rgb.map(linear)
	const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue)
	const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue)
	const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue)

	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	]
}
const rgb = ([lightness, a, b]: number[]) => {
	const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
	const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
	const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	].map(value => Math.max(0, Math.min(1, gamma(value))))
}
const over = (source: number[], backdrop: number[], alpha: number) =>
	source.map((channel, index) => channel * alpha + backdrop[index] * (1 - alpha))
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

it('calibrates role luminance from the canonical palette in both themes', () => {
	const canvas = themeColors('--background-canvas')
	const retention = Number(declaration('---surface-retention'))

	for (let theme = 0; theme < 2; theme++) {
		const base = canvas[theme].channels
		const baseL = lab(base)[0]
		const neutralL = coefficients('---canvas-neutral-lightness')[theme]
		const gray = [gamma(neutralL ** 3), gamma(neutralL ** 3), gamma(neutralL ** 3)]

		expect(coefficients('---canvas-lightness')[theme]).toBeCloseTo(baseL, 12)
		expect(neutralL ** 3).toBeCloseTo(luminance(base), 12)

		for (const role of ['secondary', 'tertiary']) {
			const original = themeColors(`--background-${role}`)[theme]
			const [lightness, a, b] = lab(original.channels)
			const source = rgb([
				retention * lightness + (1 - retention) * Number(lightness > baseL),
				a * retention,
				b * retention,
			])
			const opacity = coefficients(`---${role}-opacity`)[theme]
			const reference = over(original.channels, base, original.alpha)

			expect(opacity).toBeGreaterThan(0)
			expect(opacity).toBeLessThan(1)
			expect(luminance(over(source, gray, opacity))).toBeCloseTo(luminance(reference), 12)
		}
		const secondary = themeColors('--background-secondary')[theme]
		const [secondaryL, secondaryA, secondaryB] = lab(secondary.channels)
		const secondarySource = rgb([
			retention * secondaryL + (1 - retention) * Number(secondaryL > baseL),
			retention * secondaryA,
			retention * secondaryB,
		])
		const parent = over(secondarySource, gray, coefficients('---secondary-opacity')[theme])
		const [lightness, a, b] = lab(base)
		const nestedSource = rgb([retention * lightness, retention * a, retention * b])
		const nestedOpacity = coefficients('---nested-primary-opacity')[theme]

		expect(luminance(over(nestedSource, parent, nestedOpacity))).toBeCloseTo(luminance(base), 12)
	}
})

it('uses the least foreground adjustment that protects supported surface compositions', () => {
	const blobs = Object.values(
		logoBackgroundBlobs({
			light: [{ color: '#ff0000', weight: 1 }],
			dark: [{ color: '#ff0000', weight: 1 }],
		}),
	)
	const maximumOpacity = Math.max(
		...blobs.flatMap(blob => [
			Number.parseFloat(blob.opacity.fromValue) / 100,
			Number.parseFloat(blob.opacity.toValue) / 100,
		]),
	)
	const component = readFileSync(
		new URL('../components/Background.svelte', import.meta.url),
		'utf8',
	)
	const style = /<style>([\s\S]+)<\/style>/.exec(component)

	if (style === null) {
		throw new Error('Missing background styles')
	}

	let noiseOpacity = 0

	parse(style[1]).walkRules('.background-dither', rule => {
		let layerOpacity = 0
		let image = ''

		rule.walkDecls('opacity', entry => {
			layerOpacity = Number(entry.value)
		})
		rule.walkDecls('background-image', entry => {
			image = decodeURIComponent(entry.value)
		})
		const alpha = /opacity='([\d.]+)'/.exec(image)

		if (alpha === null) {
			throw new Error('Missing noise alpha bound')
		}

		noiseOpacity = layerOpacity * Number(alpha[1])
	})
	expect(noiseOpacity).toBeGreaterThan(0)
	const retention = Number(declaration('---surface-retention'))

	for (let theme = 0; theme < 2; theme++) {
		const base = themeColors('--background-canvas')[theme].channels
		const baseL = lab(base)[0]
		const gray = Array.from({ length: 3 }, () =>
			gamma(coefficients('---canvas-neutral-lightness')[theme] ** 3),
		)
		const roles = new Map([['primary', { source: gray, alpha: primaryOpacity }]])

		for (const role of ['secondary', 'tertiary']) {
			const [lightness, a, b] = lab(themeColors(`--background-${role}`)[theme].channels)

			roles.set(role, {
				source: rgb([
					retention * lightness + (1 - retention) * Number(lightness > baseL),
					a * retention,
					b * retention,
				]),
				alpha: coefficients(`---${role}-opacity`)[theme],
			})
		}
		const foregrounds = ['--text-primary', '--text-secondary', '--accent-color'].map(
			name => themeColors(name)[theme].channels,
		)
		const ratingColors = ['pass', 'partial', 'fail', 'neutral'].map(
			role => hex(declaration(`--rating-${role}-base`)).channels,
		)

		const input = base
			.map(channel =>
				theme === 0 ? channel * (1 - maximumOpacity) : channel + (1 - channel) * maximumOpacity,
			)
			.map(channel =>
				Math.max(
					0,
					Math.min(
						1,
						channel +
							(theme === 0 ? -1 : 1) * (noiseOpacity * Math.min(channel, 1 - channel) + 0.5 / 255),
					),
				),
			)
		const worst = (lightness: number, includeFixed = true) => {
			const opacity = coefficients('---surface-foundation')[theme]
			const adjusted = [
				...ratingColors,
				foregrounds[2],
				...(theme === 1 ? [foregrounds[1]] : []),
			].map(color => {
				const [l, a, b] = lab(color)

				return rgb([theme === 0 ? Math.min(l, lightness) : Math.max(l, lightness), a, b])
			})
			const textColors = includeFixed
				? [foregrounds[0], ...(theme === 0 ? [foregrounds[1]] : []), ...adjusted]
				: adjusted
			const backing = over(gray, input, opacity)
			const sequences = [
				['primary'],
				['secondary'],
				['tertiary'],
				['secondary', 'tertiary'],
				['secondary', 'secondary', 'tertiary'],
			]
			const values = sequences.flatMap(sequence => {
				let painted = backing

				for (const name of sequence) {
					const role = roles.get(name)

					if (role === undefined) {
						throw new Error(`Missing ${name}`)
					}

					painted = over(role.source, painted, role.alpha)
				}
				painted = painted.map(channel =>
					Math.max(0, Math.min(1, channel + (theme === 0 ? -0.5 : 0.5) / 255)),
				)

				return textColors.map(foreground =>
					contrast(
						luminance(painted),
						luminance(
							foreground.map(channel =>
								Math.max(0, Math.min(1, channel + (theme === 0 ? 0.5 : -0.5) / 255)),
							),
						),
					),
				)
			})

			if (includeFixed) {
				const stage = over(
					Array.from({ length: 3 }, () => (theme === 0 ? 0 : 1)),
					backing,
					0.1,
				)

				values.push(
					...foregrounds
						.slice(0, 2)
						.map((foreground, index) => {
							if (theme === 0 || index === 0) {
								return foreground
							}

							const [l, a, b] = lab(foreground)

							return rgb([Math.max(l, lightness), a, b])
						})
						.map(foreground => contrast(luminance(stage), luminance(foreground))),
				)
			}

			return Math.min(...values)
		}

		const lightness = coefficients('---surface-text-lightness')[theme]

		expect(worst(lightness), `theme ${theme}`).toBeGreaterThanOrEqual(4.5)
		const previousStep = lightness + (theme === 0 ? 0.001 : -0.001)

		expect(worst(previousStep, false)).toBeLessThan(4.5)
	}
})

it('keeps Stage compound accent mixes ordered without opaque bases', () => {
	const component = readFileSync(
		new URL('../views/WalletStageOverview.svelte', import.meta.url),
		'utf8',
	)
	const weights = [
		...new Set(
			[...component.matchAll(/color-mix\(in srgb, var\(--accent\) (\d+)%/g)].map(
				match => Number(match[1]) / 100,
			),
		),
	].sort((a, b) => b - a)

	expect(weights.length).toBeGreaterThanOrEqual(2)
	const minimum = Math.max(
		...weights
			.slice(1)
			.map((child, index) => (child * (1 - weights[index])) / (weights[index] * (1 - child))),
	)
	const opacityDeclaration = /--card-primaryOpacity: ([\d.]+);/.exec(component)

	if (opacityDeclaration === null) {
		throw new Error('Missing Stage base opacity')
	}

	const opacity = Number(opacityDeclaration[1])

	expect(opacity).toBeGreaterThanOrEqual(minimum)
	expect(opacity).toBeLessThan(1)
})

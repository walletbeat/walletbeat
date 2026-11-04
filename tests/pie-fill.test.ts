import sharp from 'sharp'
import { expect, it } from 'vitest'

import { sliceFill } from '@/components/pie-fill'
import { computePieSlices, PieLayout, slicePathData } from '@/components/pie-geometry'

for (const radius of [80, 320]) {
	it.each([1, 2, 4, 8])(
		`preserves rating order and weighted radial area at radius ${radius} with %s slices`,
		count => {
			const colors = ['gray', 'red', 'orange', 'green']
			const slices = computePieSlices({
				slices: Array.from({ length: count }, (_, index) => ({
					id: String(index),
					color: 'gray',
					weight: 1,
					arcLabel: '',
					ariaLabel: '',
					gradient: { colors, transparentStopColor: 'gray' },
					children: [
						...colors.map((color, index) => ({
							id: color,
							color,
							weight: index + 1,
							arcLabel: '',
							ariaLabel: '',
						})),
						{ id: 'excluded', color: 'black', weight: 100, arcLabel: '', ariaLabel: '' },
					],
				})),
				radius,
				levels: [
					{
						outerRadiusFraction: 1,
						innerRadiusFraction: 0.2,
						gap: 0,
						outerCornerRadius: 0,
						innerCornerRadius: 0,
					},
				],
				layout: PieLayout.FullLeft,
				centerFirstSlice: true,
			})

			for (const slice of slices) {
				const fill = sliceFill(slice)

				expect(fill).toContain('radial-gradient(in oklch')
				expect(fill).not.toContain('black')
				const stops = [...fill.matchAll(/(transparent|red|orange|green) ([\d.]+)px/g)]

				expect(stops.map(stop => stop[1])).toEqual(['transparent', 'red', 'orange', 'green'])
				const { innerR, outerR } = slice.computed

				for (let index = 0, consumed = 0; index < stops.length; index++) {
					const position = Number(stops[index][2])
					const representedArea = (position ** 2 - innerR ** 2) / (outerR ** 2 - innerR ** 2)

					expect(representedArea).toBeCloseTo((consumed + (index + 1) / 2) / 10, 2)
					consumed += index + 1
				}
			}
		},
	)
}

for (const count of [2, 5, 12]) {
	for (const gap of [0, 8]) {
		it.each([
			[0, 0],
			[16, 0],
			[0, 12],
			[16, 12],
		])(
			`matches SVG raster area: ${count} petals, gap ${gap}, corners %s/%s`,
			async (outerCornerRadius, innerCornerRadius) => {
				const colors = ['gray', 'red', 'orange', 'green']
				const weights = [1, 2, 3, 4]
				const [slice] = computePieSlices({
					slices: Array.from({ length: count }, (_, index) => ({
						id: String(index),
						color: 'gray',
						weight: 1,
						arcLabel: '',
						ariaLabel: '',
						gradient: { colors, transparentStopColor: 'gray' },
						children: colors.map((color, index) => ({
							id: color,
							color,
							weight: weights[index],
							arcLabel: '',
							ariaLabel: '',
						})),
					})),
					radius: 120,
					levels: [
						{
							outerRadiusFraction: 1,
							innerRadiusFraction: 0.25,
							gap,
							outerCornerRadius,
							innerCornerRadius,
						},
					],
					layout: PieLayout.FullLeft,
					centerFirstSlice: true,
				})
				const stops = [...sliceFill(slice).matchAll(/(transparent|red|orange|green) ([\d.]+)px/g)]

				expect(stops).toHaveLength(colors.length)
				const scale = 3,
					extent = 121,
					size = extent * 2 * scale
				const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-extent} ${-extent} ${extent * 2} ${extent * 2}"><path d="${slicePathData(slice.computed)}" fill="white"/></svg>`
				const { data, info } = await sharp(Buffer.from(svg))
					.ensureAlpha()
					.raw()
					.toBuffer({ resolveWithObject: true })
				const included = stops.map(() => 0)
				let total = 0

				for (let y = 0; y < size; y++) {
					for (let x = 0; x < size; x++) {
						const alpha = data[(y * size + x) * info.channels + info.channels - 1] / 255

						if (!alpha) {
							continue
						}

						total += alpha
						const radius = Math.hypot((x + 0.5) / scale - extent, (y + 0.5) / scale - extent)

						for (let index = 0; index < stops.length; index++) {
							if (radius <= Number(stops[index][2])) {
								included[index] += alpha
							}
						}
					}
				}
				expect(total).toBeGreaterThan(0)

				for (let index = 0, consumed = 0; index < weights.length; index++) {
					expect(
						Math.abs(included[index] / total - (consumed + weights[index] / 2) / 10),
					).toBeLessThan(0.015)
					consumed += weights[index]
				}
			},
		)
	}
}

for (const totalAngle of [5, 45, 90, 175, 180, 185, 200, 270, 355, 360]) {
	it(`keeps rounded ${totalAngle}-degree slices within their annulus and angular extent`, async () => {
		const radius = 64
		const innerR = radius * 0.58
		const path = slicePathData({
			totalAngle,
			outerR: radius,
			innerR,
			outerCornerRadius: 6,
			innerCornerRadius: 4,
			gap: 0,
			midAngle: 0,
			level: 0,
			offset: 0,
			labelSize: 14,
			labelR: 50,
		})
		const extent = radius * 2
		const { data, info } = await sharp(
			Buffer.from(
				`<svg xmlns="http://www.w3.org/2000/svg" width="${extent * 2}" height="${extent * 2}" viewBox="${-extent} ${-extent} ${extent * 2} ${extent * 2}"><path d="${path}" fill="white"/></svg>`,
			),
		)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true })
		let painted = 0
		let outside = 0

		for (let y = 0; y < info.height; y++) {
			for (let x = 0; x < info.width; x++) {
				if (data[(y * info.width + x) * info.channels + info.channels - 1] < 128) {
					continue
				}

				painted++
				const px = x + 0.5 - extent
				const py = y + 0.5 - extent
				const distance = Math.hypot(px, py)
				const angle = (Math.abs(Math.atan2(px, -py)) * 180) / Math.PI

				if (distance < innerR - 1 || distance > radius + 1 || angle > totalAngle / 2 + 1) {
					outside++
				}
			}
		}
		expect(painted).toBeGreaterThan(0)
		expect(outside).toBe(0)
	})
}

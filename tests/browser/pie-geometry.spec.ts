import { expect, test } from './verified-test'

for (const width of [390, 1440]) {
	test(`canonical native pie paint and label geometry at ${width}px`, async ({ page }, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__pie-geometry/')
		await page.evaluate(() => document.fonts.ready)
		await page.mouse.move(0, 0)
		const ids = await page.locator('#pie-models').evaluate(element => {
			const value: unknown = JSON.parse(element.textContent ?? '[]')

			if (!Array.isArray(value)) {
				throw new Error('Invalid pie model list')
			}

			const models: unknown[] = value

			return models.map(model => {
				if (
					typeof model !== 'object' ||
					model === null ||
					!('id' in model) ||
					typeof model.id !== 'string'
				) {
					throw new Error('Invalid pie model identity')
				}

				return model.id
			})
		})

		expect(ids).toHaveLength(29)

		for (const id of ids) {
			await test.step(`🥧 Annulus / CornerRadii / SliceCounts / SliceHitArea / 🎨 LabelCenters / UprightGlyphs: ${id}`, async () => {
				const pie = page.locator(`#${id} .pie`)

				await pie.scrollIntoViewIfNeeded()
				await pie.evaluate(
					() =>
						new Promise<void>(resolve =>
							requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
						),
				)
				const result = await pie.evaluate((element, id) => {
					type Slice = {
						id: string
						midAngle: number
						offset: number
						labelR: number
						path: string
					}
					type Model = { id: string; origin: number; width: number; slices: Slice[] }
					const isSlice = (slice: unknown): slice is Slice =>
						typeof slice === 'object' &&
						slice !== null &&
						'id' in slice &&
						typeof slice.id === 'string' &&
						'midAngle' in slice &&
						typeof slice.midAngle === 'number' &&
						'offset' in slice &&
						typeof slice.offset === 'number' &&
						'labelR' in slice &&
						typeof slice.labelR === 'number' &&
						'path' in slice &&
						typeof slice.path === 'string'
					const isModel = (model: unknown): model is Model =>
						typeof model === 'object' &&
						model !== null &&
						'id' in model &&
						typeof model.id === 'string' &&
						'origin' in model &&
						typeof model.origin === 'number' &&
						'width' in model &&
						typeof model.width === 'number' &&
						'slices' in model &&
						Array.isArray(model.slices) &&
						model.slices.every(isSlice)
					const value: unknown = JSON.parse(
						document.getElementById('pie-models')?.textContent ?? '[]',
					)

					if (!Array.isArray(value)) {
						throw new Error('Invalid canonical pie models')
					}

					const models: unknown[] = value

					if (!models.every(isModel)) {
						throw new Error('Invalid canonical pie model geometry')
					}

					const model = models.find(candidate => candidate.id === id)

					if (!model) {
						throw new Error('Missing canonical slice model')
					}

					const box = element.getBoundingClientRect()
					const scale = box.width / model.width
					const context = document.createElement('canvas').getContext('2d')

					if (!context) {
						throw new Error('Native path oracle unavailable')
					}

					const shapes = model.slices.map(slice => {
						const matrix = new DOMMatrix()
							.translate(model.origin, model.origin)
							.rotate(slice.midAngle)
							.translate(0, -slice.offset)
							.translate(-model.origin, -model.origin)

						return { ...slice, path: new Path2D(slice.path), matrix, inverse: matrix.inverse() }
					})
					const expectedAt = (x: number, y: number) => {
						let target: string | null = null

						for (const shape of shapes) {
							const inverse = shape.inverse

							if (
								context.isPointInPath(
									shape.path,
									inverse.a * x + inverse.c * y + inverse.e,
									inverse.b * x + inverse.d * y + inverse.f,
								)
							) {
								target = shape.id
							}
						}

						return target
					}
					const mismatches: {
						x: number
						y: number
						expected: string | null
						actual: string | null
					}[] = []
					let samples = 0

					for (let x = 4; x < model.width; x += 8) {
						for (let y = 4; y < model.width; y += 8) {
							const expected = expectedAt(x, y)

							// Native hit testing quantizes edge coordinates; compare outside the one-pixel boundary neighborhood.
							if (
								[
									[1, 0],
									[-1, 0],
									[0, 1],
									[0, -1],
									[1, 1],
									[1, -1],
									[-1, 1],
									[-1, -1],
								].some(([dx, dy]) => expectedAt(x + dx, y + dy) !== expected)
							) {
								continue
							}

							const actual =
								document
									.elementFromPoint(box.x + x * scale, box.y + y * scale)
									?.closest('[data-slice-id]')
									?.getAttribute('data-slice-id') ?? null

							samples++

							if (actual !== expected) {
								mismatches.push({ x, y, expected, actual })
							}
						}
					}
					const labels = shapes.map(shape => {
						const owner = [...element.querySelectorAll('[data-slice-id]')].find(
							candidate => candidate.getAttribute('data-slice-id') === shape.id,
						)
						const label = owner?.querySelector('.label')

						if (!label) {
							throw new Error('Missing real slice label')
						}

						const actual = label.getBoundingClientRect()
						const expected = new DOMPoint(
							model.origin,
							model.origin - shape.labelR,
						).matrixTransform(shape.matrix)
						const surface = owner?.querySelector('.slice-shape')

						if (!surface) {
							throw new Error('Missing native slice paint owner')
						}

						const rotation = getComputedStyle(label).rotate
						const upright = new DOMMatrix(getComputedStyle(surface).transform).rotate(
							rotation === 'none' ? 0 : Number.parseFloat(rotation),
						)

						return {
							a: upright.a,
							b: upright.b,
							c: upright.c,
							d: upright.d,
							id: shape.id,
							deltaX: (actual.x + actual.width / 2 - box.x) / scale - expected.x,
							deltaY: (actual.y + actual.height / 2 - box.y) / scale - expected.y,
						}
					})

					return {
						samples,
						mismatches,
						labels,
						count: element.querySelectorAll('[data-slice-id]').length,
						expectedCount: model.slices.length,
					}
				}, id)

				await info.attach(`${id}-native-geometry`, {
					body: JSON.stringify(result),
					contentType: 'application/json',
				})
				expect(result.count).toBe(result.expectedCount)
				expect(result.samples).toBeGreaterThan(100)
				expect(result.mismatches).toEqual([])

				for (const label of result.labels) {
					expect(Math.abs(label.deltaX), label.id).toBeLessThan(0.5)
					expect(Math.abs(label.deltaY), label.id).toBeLessThan(0.5)
					expect(Math.abs(label.b), label.id).toBeLessThan(0.001)
					expect(Math.abs(label.c), label.id).toBeLessThan(0.001)
					expect(label.a, label.id).toBeGreaterThan(0)
					expect(label.d, label.id).toBeGreaterThan(0)
				}
			})
		}
	})
}

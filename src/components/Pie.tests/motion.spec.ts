import { expect, test } from '../../../tests/browser/verified-test'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test.describe(reducedMotion, () => {
		test.use({ reducedMotion, viewport: { width: 1280, height: 900 } })

		test('retained slice geometry and hover honor motion preferences across layouts and element kinds', async ({
			page,
		}, info) => {
			await page.goto('/__pie-motion')
			await expect(page.getByRole('button', { name: 'Change weights', exact: true })).toBeEnabled()
			await page.evaluate(() => document.fonts.ready)
			const slices = page.locator('[data-pie-case] [data-slice-id="security"]')

			await expect(slices).toHaveCount(9)
			const originals = await slices.elementHandles()
			const before = await slices.evaluateAll(slices =>
				slices.map(slice => Number(getComputedStyle(slice).getPropertyValue('--slice-totalAngle'))),
			)
			const sampling = page.evaluate(
				() =>
					new Promise<
						{
							time: number
							values: { id: string; angle: number; target: number; durations: string[] }[]
						}[]
					>(resolve => {
						const elements = [
							...document.querySelectorAll<HTMLElement>(
								'[data-pie-case] [data-slice-id="security"]',
							),
						]
						const frames: {
							time: number
							values: { id: string; angle: number; target: number; durations: string[] }[]
						}[] = []
						const button = document.getElementById('change-pie-weights')

						if (!button) {
							throw new Error('Missing native update control')
						}

						button.addEventListener(
							'click',
							() => {
								const start = performance.now()
								const sample = (time: number) => {
									frames.push({
										time: time - start,
										values: elements.map(slice => {
											const container = slice.closest('[data-pie-case]')
											const pie = slice.closest('.pie-container')
											const shape = slice.querySelector('.slice-shape')
											const label = slice.querySelector('.label')

											if (!container || !pie || !shape || !label) {
												throw new Error('Missing pie surface')
											}

											return {
												id: container.getAttribute('data-pie-case') ?? '',
												angle: Number(
													getComputedStyle(slice).getPropertyValue('--slice-totalAngle'),
												),
												target: Number(slice.style.getPropertyValue('--slice-totalAngle')),
												durations: [pie, slice, shape, label].map(
													element => getComputedStyle(element).transitionDuration,
												),
											}
										}),
									})

									if (time - start < 550) {
										requestAnimationFrame(sample)
									} else {
										resolve(frames)
									}
								}

								requestAnimationFrame(sample)
							},
							{ once: true, capture: true },
						)
						button.setAttribute('data-motion-probe-ready', '')
					}),
			)

			await expect(page.locator('#change-pie-weights')).toHaveAttribute(
				'data-motion-probe-ready',
				'',
			)
			await page.getByRole('button', { name: 'Change weights', exact: true }).click()
			const frames = await sampling

			await info.attach('native-pie-motion-samples', {
				body: JSON.stringify({ reducedMotion, before, frames }),
				contentType: 'application/json',
			})
			expect(frames.length).toBeGreaterThan(2)
			const last = frames.at(-1)

			if (!last) {
				throw new Error('Missing native animation samples')
			}

			expect(new Set(last.values.map(value => value.id)).size).toBe(9)

			for (const [index, value] of last.values.entries()) {
				expect(await slices.nth(index).evaluate(slice => slice.tagName.toLowerCase())).toBe(
					value.id.endsWith('-link') ? 'a' : value.id.endsWith('-button') ? 'button' : 'div',
				)
				expect(Number.isFinite(value.target)).toBe(true)
				expect(Math.abs(value.target - before[index])).toBeGreaterThan(1)
				expect(value.angle).toBeCloseTo(value.target, 4)
				const intermediate = frames.some(frame => {
					const angle = frame.values[index].angle

					return (
						angle > Math.min(before[index], value.target) + 0.01 &&
						angle < Math.max(before[index], value.target) - 0.01
					)
				})

				expect(intermediate).toBe(reducedMotion === 'no-preference')

				if (reducedMotion === 'reduce') {
					for (const frame of frames) {
						expect(frame.values[index].angle).toBeCloseTo(value.target, 4)
						expect(
							frame.values[index].durations.every(duration =>
								duration.split(',').every(part => Number.parseFloat(part) === 0),
							),
						).toBe(true)
					}
				}

				expect(
					await slices
						.nth(index)
						.evaluate(
							(slice, original) => slice === original && slice.isConnected,
							originals[index],
						),
				).toBe(true)
			}

			for (const slice of await slices.all()) {
				await slice.locator('.label').hover()
				await expect
					.poll(() =>
						slice.evaluate(slice =>
							Number(getComputedStyle(slice).getPropertyValue('--slice-scale')),
						),
					)
					.toBeCloseTo(1.05, 4)
				await page.mouse.move(0, 0)
				await expect
					.poll(() =>
						slice.evaluate(slice =>
							Number(getComputedStyle(slice).getPropertyValue('--slice-scale')),
						),
					)
					.toBeCloseTo(1, 4)
			}
			const button = page.getByRole('button', { name: 'Security', exact: true }).first()

			await button.locator('.label').hover()
			await page.mouse.down()

			try {
				expect(await button.evaluate(button => button.matches(':active'))).toBe(true)
				const duration = await button.evaluate(button =>
					Number.parseFloat(getComputedStyle(button).transitionDuration),
				)

				if (reducedMotion === 'reduce') {
					expect(duration).toBe(0)
				} else {
					expect(duration).toBeGreaterThan(0)
				}
			} finally {
				await page.mouse.move(0, 0)
				await page.mouse.up()
			}

			await expect(page.locator('output')).toHaveText('Activations: 0')
			await button.focus()
			await page.keyboard.press('Enter')
			await expect(page.locator('output')).toHaveText('Activations: 1')
		})
	})
}

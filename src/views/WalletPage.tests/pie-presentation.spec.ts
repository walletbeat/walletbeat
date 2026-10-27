import { expect, test } from '../../../tests/browser/verified-test'

for (const colorScheme of ['light', 'dark'] as const) {
	test(`pie label fill follows the nearest stop in ${colorScheme} mode`, async ({ page }) => {
		await page.emulateMedia({ colorScheme })
		await page.goto('/__pie-geometry')
		const results = await page
			.locator('#flower .slice')
			.first()
			.evaluate(element => {
				if (!(element instanceof HTMLElement)) {
					throw new Error('Expected a pie slice')
				}

				const slice = element
				const original = slice.style.getPropertyValue('--slice-labelR')
				const transition = slice.style.transition

				slice.style.transition = 'none'
				const stops = [
					...slice.style
						.getPropertyValue('--slice-fill')
						.matchAll(/(var\(--rating-[a-z]+\)|transparent) ([\d.]+)px/g),
				]

				if (stops.length < 2) {
					throw new Error('Expected a gradient fixture')
				}

				const canvas = document.createElement('canvas')
				const context = canvas.getContext('2d')!
				const probe = document.createElement('span')

				slice.append(probe)
				const color = (value: string) => {
					probe.style.color = value
					context.clearRect(0, 0, 1, 1)
					context.fillStyle = getComputedStyle(probe).color
					context.fillRect(0, 0, 1, 1)

					return [...context.getImageData(0, 0, 1, 1).data]
				}
				const samples = [
					Number(stops[0][2]),
					Number(stops.at(-1)![2]),
					...stops.slice(1).flatMap((stop, index) => {
						const midpoint = (Number(stops[index][2]) + Number(stop[2])) / 2

						return [midpoint - 0.01, midpoint, midpoint + 0.01]
					}),
				]
				const results = samples.map(radius => {
					slice.style.setProperty('--slice-labelR', String(radius))
					const nearest = stops.reduce((best, stop) =>
						Math.abs(Number(stop[2]) - radius) < Math.abs(Number(best[2]) - radius) ? stop : best,
					)

					return {
						actual: color('var(--slice-labelBackground)'),
						expected: color(nearest[1] === 'transparent' ? 'var(--rating-unrated)' : nearest[1]),
					}
				})

				slice.style.setProperty('--slice-labelR', original)
				slice.style.transition = transition
				probe.remove()

				return results
			})

		for (const { actual, expected } of results) {
			for (const [index, channel] of actual.entries()) {
				expect(Math.abs(channel - expected[index])).toBeLessThanOrEqual(1)
			}
		}
	})

	test(`WalletPage pie icons share label ink in ${colorScheme} mode`, async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.emulateMedia({ colorScheme })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 180000 })
		await page.evaluate(() => document.fonts.ready)
		await page.mouse.move(1, 899)
		const inks = await page.locator('.pie-navigation-icon').evaluateAll(elements =>
			elements.map(element => {
				const style = getComputedStyle(element)
				const canvas = document.createElement('canvas')
				const context = canvas.getContext('2d')!

				context.fillStyle = style.color
				context.fillRect(0, 0, 1, 1)

				return {
					alpha: context.getImageData(0, 0, 1, 1).data[3],
					background: style.getPropertyValue('--slice-labelBackground'),
					filter: style.filter,
				}
			}),
		)

		expect(inks.length).toBeGreaterThan(0)

		for (const ink of inks) {
			expect(ink.background).not.toBe('')
			expect(
				Math.abs(ink.alpha - (colorScheme === 'light' ? 0.62 : 0.7) * 255),
			).toBeLessThanOrEqual(1)
			expect(ink.filter).toBe('opacity(0.8)')
		}
	})
}

import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 1440]) {
	test(`🎨 WalletAspect: intrinsic image proportions through native scroll at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/nonSquare/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		const image = page.locator('#top > header img.wallet-icon')

		await page.evaluate(() => document.fonts.ready)
		const root = page.locator('#layout')

		for (const position of [0, 200, 900, 2500, 0]) {
			await root.evaluate(
				(element, top) => element.scrollTo({ top, behavior: 'instant' }),
				position,
			)
			await image.evaluate(
				() =>
					new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					),
			)
			const ratio = await image.evaluate((element: HTMLImageElement) => {
				const box = element.getBoundingClientRect()
				const label = element.parentElement?.querySelector('span')?.getBoundingClientRect()

				return {
					intrinsic: element.naturalWidth / element.naturalHeight,
					rendered: box.width / box.height,
					iconEnd: box.right,
					labelStart: label?.left,
				}
			})

			expect(ratio.intrinsic).toBe(2)
			expect(ratio.rendered).toBeCloseTo(ratio.intrinsic, 2)
			expect(
				ratio.labelStart,
				'The intrinsic image width must leave room for its real label',
			).toBeGreaterThanOrEqual(ratio.iconEnd)
		}
	})
}

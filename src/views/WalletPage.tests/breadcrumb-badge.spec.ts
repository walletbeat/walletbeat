import { expect, test } from '../../../tests/browser/verified-test'

for (const colorScheme of ['light', 'dark'] as const) {
	for (const fixture of ['software', 'unknown']) {
		test(`breadcrumb badge paint obscures underlying content: ${fixture} ${colorScheme}`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 390, height: 900 })
			await page.emulateMedia({ colorScheme })
			await page.goto(`/__wallet-page/${fixture}/`)
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(() => document.fonts.ready)
			test.skip(
				!(await page.evaluate(
					() =>
						CSS.supports('animation-timeline: scroll()') &&
						CSS.supports('animation-range: 0% 100%') &&
						CSS.supports('width: anchor-size(--breadcrumb-source inline)') &&
						CSS.supports('timeline-scope: --breadcrumb-size') &&
						CSS.supports('color: if(style(--a: 1): red)'),
				)),
				'Native breadcrumb enhancement unavailable',
			)
			const badge = page.locator('#transparency [data-sticky-breadcrumb~="end"][data-badge]')

			await expect(badge).toHaveCount(1)

			if (fixture === 'unknown') {
				await expect(badge).toHaveAttribute('title', '*contains unrated components')
			} else {
				await expect(badge).not.toHaveAttribute('value', 'UNRATED')
			}

			await badge.evaluate(async element => {
				const root = document.querySelector<HTMLElement>('#layout')!
				const section = element.closest('section')!

				root.style.scrollSnapType = 'none'
				root.style.overflowAnchor = 'none'
				root.scrollTo({
					top: root.scrollTop + section.getBoundingClientRect().top - 350,
					behavior: 'instant',
				})
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
			})

			for (const transparent of [false, true]) {
				if (transparent) {
					await badge.evaluate(element => {
						element.style.backgroundImage = 'none'
						element.style.backgroundColor = 'var(--badge-backgroundColor)'
					})
				}

				const samples: Buffer[] = []

				for (const color of ['rgb(255, 0, 255)', 'rgb(0, 255, 0)']) {
					const box = await badge.evaluate((element, color) => {
						const owner = element.closest<HTMLElement>('[data-sticky]')!

						owner.style.backgroundColor = color
						const { x, y, width, height } = element.getBoundingClientRect()

						return { x, y, width, height }
					}, color)

					expect(box.width).toBeGreaterThan(10)
					expect(box.height).toBeGreaterThan(10)
					expect(box.y).toBeGreaterThan(100)
					expect(box.y + box.height).toBeLessThan(900)
					// Sample interior fill away from rounded edges and the label.
					samples.push(
						await page.screenshot({
							clip: {
								x: Math.ceil(box.x + 3),
								y: Math.floor(box.y + box.height / 2),
								width: 1,
								height: 1,
							},
						}),
					)
				}
				expect(
					samples[0].equals(samples[1]),
					transparent
						? 'Transparent control must expose the underlying color'
						: 'Underlying color must not alter the badge fill',
				).toBe(!transparent)
			}
		})
	}
}

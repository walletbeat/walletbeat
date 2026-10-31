import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 690, 1024, 1025, 1400]) {
	test(`wallet navigation leaves readable content across its layout boundary at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 1200 })
		await page.goto('/phantom/?variant=MOBILE')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const read = () =>
			page.locator('#top').evaluate(container => {
				const article = container.querySelector<HTMLElement>(':scope > article')!
				const navigation = container.querySelector<HTMLElement>(':scope > .page-navigation')!
				const pie = navigation.querySelector<HTMLElement>(':scope > .pie-navigation')!
				const root = document.querySelector<HTMLElement>('#layout')!
				const box = (element: Element) => {
					const rect = element.getBoundingClientRect()

					return {
						left: rect.left,
						right: rect.right,
						top: rect.top,
						bottom: rect.bottom,
						width: rect.width,
						height: rect.height,
					}
				}
				const style = getComputedStyle(container)
				const number = (value: string) => Number.parseFloat(value) || 0
				const bounds = box(container)

				return {
					container: bounds,
					content: box(document.querySelector('#content')!),
					article: box(article),
					navigation: box(navigation),
					pie: box(pie),
					toc: box(navigation.querySelector('#wallet-toc')!),
					flower: box(pie.querySelector('.navigation-items')!),
					row: {
						direction: getComputedStyle(navigation).flexDirection,
						wrap: getComputedStyle(navigation).flexWrap,
					},
					innerLeft: bounds.left + number(style.borderLeftWidth) + number(style.paddingLeft),
					innerRight: bounds.right - number(style.borderRightWidth) - number(style.paddingRight),
					rem: number(getComputedStyle(document.documentElement).fontSize),
					horizontalOverflow: root.scrollWidth - root.clientWidth,
					inFlow: matchMedia('(width <= 1024px)').matches,
				}
			})
		let geometry: Awaited<ReturnType<typeof read>> | undefined

		try {
			geometry = await read()

			for (const box of [geometry.article, geometry.navigation, geometry.pie]) {
				expect(box.width).toBeGreaterThan(0)
				expect(box.left).toBeGreaterThanOrEqual(geometry.innerLeft - 1)
				expect(box.right).toBeLessThanOrEqual(geometry.innerRight + 1)
			}

			expect(geometry.horizontalOverflow).toBeLessThanOrEqual(1)

			expect(geometry.flower.width).toBeLessThanOrEqual(Math.min(20 * geometry.rem, 320) + 1)

			if (geometry.inFlow) {
				expect(geometry.row).toEqual({ direction: 'row', wrap: 'wrap' })

				if (width === 1024) {
					expect(Math.abs(geometry.toc.top - geometry.pie.top)).toBeLessThanOrEqual(1)
				}

				expect(geometry.pie.width).toBeLessThanOrEqual(
					Math.min(32 * geometry.rem, geometry.innerRight - geometry.innerLeft) + 1,
				)
				expect(geometry.article.top).toBeGreaterThanOrEqual(geometry.navigation.bottom - 1)
			} else {
				expect(geometry.navigation.width).toBeLessThanOrEqual(Math.min(20 * geometry.rem, 320) + 1)
				expect(geometry.article.right).toBeLessThanOrEqual(geometry.navigation.left + 1)
			}
		} finally {
			await info.attach('responsive-navigation-geometry', {
				body: JSON.stringify({ width, geometry: geometry ?? (await read()) }),
				contentType: 'application/json',
			})
		}
	})
}

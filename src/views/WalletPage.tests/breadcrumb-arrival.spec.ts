import { expect, test } from '../../../tests/browser/verified-test'

for (const direction of ['ltr', 'rtl'] as const) {
	test(`adjacent breadcrumbs follow a reversible rounded corner (${direction})`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 690, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('animation-timeline: view()') &&
					CSS.supports('width: anchor-size(--source inline)'),
			)),
			'Native breadcrumb arrival enhancement unavailable',
		)
		await page.evaluate(direction => {
			document.documentElement.dir = direction
			const root = document.querySelector<HTMLElement>('#layout')!

			root.style.scrollSnapType = 'none'
			root.style.scrollBehavior = 'auto'
		}, direction)

		for (const id of ['transaction-legibility', 'account-recovery']) {
			const item = page.locator(`#${id} [data-sticky-breadcrumb~="item"]`).first()
			const natural = await page.locator(`#${id}`).evaluate(section => {
				const root = document.querySelector<HTMLElement>('#layout')!
				const flow = section.querySelector(
					':scope > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
				)!

				return root.scrollTop + flow.getBoundingClientRect().top - root.getBoundingClientRect().top
			})
			const seek = async (scroll: number) => {
				await page.evaluate(scroll => {
					document.querySelector('#layout')!.scrollTop = scroll
				}, scroll)
				await page.evaluate(
					() =>
						new Promise<void>(resolve =>
							requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
						),
				)

				return item.evaluate(element => {
					const animation = element
						.getAnimations()
						.find(
							animation =>
								animation instanceof CSSAnimation &&
								animation.animationName === 'breadcrumb-arrival',
						)

					if (!animation?.effect || !(animation.timeline instanceof ViewTimeline)) {
						throw new Error('Resolved native rounded arrival required')
					}

					const style = getComputedStyle(element)
					const [x = 0, y = 0] = style.translate.split(' ').map(Number.parseFloat)

					return {
						x,
						y,
						phase: animation.effect.getComputedTiming().progress,
						scroll: document.querySelector('#layout')!.scrollTop,
					}
				})
			}
			const start = await seek(natural - 500)
			const end = await seek(natural + 500)

			expect(start.phase).toBe(0)
			expect(end.phase).toBe(1)
			expect(Math.abs(end.x)).toBeGreaterThan(20)
			expect(Math.abs(end.y)).toBeGreaterThan(10)
			const samples = []

			for (const target of [0.35, 0.45, 0.5, 0.55, 0.65]) {
				let low = natural - 500,
					high = natural + 500

				for (let attempt = 0; attempt < 12; attempt++) {
					const row = await seek((low + high) / 2)

					if (typeof row.phase !== 'number') {
						throw new Error('Arrival phase unavailable')
					}

					if (row.phase < target) {
						low = row.scroll
					} else {
						high = row.scroll
					}
				}
				const row = await seek(high)
				const x = row.x / end.x,
					y = row.y / end.y

				expect(
					Math.abs(x * x + (1 - y) * (1 - y) - 1),
					'Rendered translation follows the rounded corner, rather than its diagonal chord',
				).toBeLessThan(0.003)

				if (target === 0.5) {
					expect(x - y).toBeGreaterThan(0.3)
				}

				samples.push(row)
			}

			for (const sample of samples.reverse()) {
				const reversed = await seek(sample.scroll)

				expect(Math.abs(reversed.x - sample.x)).toBeLessThan(0.5)
				expect(Math.abs(reversed.y - sample.y)).toBeLessThan(0.5)
			}
		}
	})
}

test('reduced breadcrumb arrival has a single endpoint step', async ({ page }) => {
	await page.setViewportSize({ width: 690, height: 900 })
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.goto('/metamask/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	test.skip(
		!(await page.evaluate(
			() =>
				CSS.supports('animation-timeline: view()') &&
				CSS.supports('width: anchor-size(--source inline)'),
		)),
		'Native breadcrumb arrival enhancement unavailable',
	)
	const motion = await page
		.locator('#transaction-legibility [data-sticky-breadcrumb~="item"]')
		.first()
		.evaluate(element => {
			const animation = element
				.getAnimations()
				.find(
					animation =>
						animation instanceof CSSAnimation &&
						animation.animationName === 'breadcrumb-arrival-step',
				)

			if (!(animation?.effect instanceof KeyframeEffect)) {
				throw new Error('Native reduced arrival required')
			}

			return animation.effect
				.getKeyframes()
				.map(frame => ({ offset: frame.offset, easing: frame.easing }))
		})

	expect(motion).toEqual([
		{ offset: 0, easing: 'steps(1)' },
		{ offset: 1, easing: 'steps(1)' },
	])
})

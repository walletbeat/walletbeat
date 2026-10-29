import { expect, test } from '../../../tests/browser/verified-test'

for (const direction of ['ltr', 'rtl']) {
	test(`selected icon has one monotonic size owner during arrival: ${direction}`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width: 690, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		const arrival = await page.evaluate(async direction => {
			document.documentElement.dir = direction
			await document.fonts.ready
			const root = document.querySelector<HTMLElement>('#layout')!

			root.style.scrollSnapType = 'none'

			return document
				.querySelector('#top > [data-sticky-breadcrumb~="flow"]')!
				.getBoundingClientRect().height
		}, direction)
		const rows = []

		for (let index = 0; index <= 20; index++) {
			await page.locator('#layout').evaluate(
				async (root, top) => {
					root.scrollTo({ top, behavior: 'instant' })
					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
				},
				((arrival + 2) * index) / 20,
			)
			rows.push(
				await page
					.getByRole('combobox', { name: 'Wallet version', exact: true })
					.evaluate(select => {
						const icon = select.querySelector('selectedcontent .select-icon')!
						const paint = icon.querySelector('svg, img')

						if (!paint) {
							throw new Error('Selected native icon has no painted asset')
						}

						const box = paint.getBoundingClientRect()
						const label = select.querySelector('selectedcontent .select-label')!
						const clock = label
							.getAnimations()
							.find(
								animation =>
									animation instanceof CSSAnimation &&
									animation.animationName === 'select-compact-label',
							)

						if (!clock) {
							throw new Error('Native select arrival clock is missing')
						}

						return {
							top: document.querySelector('#layout')!.scrollTop,
							width: box.width,
							height: box.height,
							scale: getComputedStyle(icon).scale,
							phase: clock.effect!.getComputedTiming().progress,
							timeline: clock.timeline?.constructor.name,
							properties: icon
								.getAnimations()
								.flatMap(animation =>
									animation.effect instanceof KeyframeEffect
										? animation.effect
												.getKeyframes()
												.flatMap(frame =>
													Object.keys(frame).filter(
														key =>
															!['offset', 'computedOffset', 'easing', 'composite'].includes(key),
													),
												)
										: [],
								),
						}
					}),
			)

			if ([0, 10, 20].includes(index)) {
				await info.attach(`select-${direction}-${index}`, {
					body: await page.screenshot(),
					contentType: 'image/png',
				})
			}
		}
		await info.attach('native-icon-size-sweep', {
			body: JSON.stringify(rows),
			contentType: 'application/json',
		})
		expect(rows[0].phase).toBe(0)
		expect(rows.at(-1)!.phase).toBe(1)
		expect(rows[0].height).toBeGreaterThan(rows.at(-1)!.height)

		for (let index = 0; index < rows.length; index++) {
			const row = rows[index]

			expect(row.timeline).toBe('ViewTimeline')
			expect(row.width).toBeGreaterThan(0)
			expect(Math.abs(row.width - row.height)).toBeLessThan(0.1)
			expect(row.scale).toBe(rows[0].scale)
			expect(row.properties).not.toContain('scale')

			if (index) {
				expect(row.height).toBeLessThanOrEqual(rows[index - 1].height + 0.1)
			}
		}
	})
}

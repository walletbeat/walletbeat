import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 900]) {
	test(`compact site header preserves page wheel scrolling and popover containment at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const navigation = page.locator('#nav')
		const toggle = page.getByRole('button', { name: 'Open navigation menu', exact: true })
		const root = page.locator('#layout')

		// Isolate header chaining from the page's independent snap-target selection.
		await root.evaluate(element => {
			element.style.scrollSnapType = 'none'
		})
		const settleRoot = () =>
			root.evaluate(async element => {
				let previous = element.scrollTop
				let stableSince = performance.now()
				const deadline = stableSince + 5000

				while (performance.now() < deadline) {
					await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
					const position = element.scrollTop

					if (Math.abs(position - previous) > 0.1) {
						stableSince = performance.now()
					}

					previous = position

					if (performance.now() - stableSince >= 400) {
						return true
					}
				}

				return false
			})

		for (const open of [false, true]) {
			if (open) {
				await toggle.click()
			}

			await expect
				.poll(() => navigation.evaluate(element => element.matches(':popover-open')))
				.toBe(open)
			await navigation.evaluate(async element => {
				await Promise.allSettled(
					element
						.getAnimations()
						.filter(
							animation =>
								animation.timeline instanceof DocumentTimeline &&
								Number.isFinite(animation.effect?.getComputedTiming().endTime),
						)
						.map(animation => animation.finished),
				)
			})

			if (open) {
				await navigation.evaluate(element =>
					element.scrollTo({ top: element.scrollHeight, behavior: 'instant' }),
				)
				await expect
					.poll(() =>
						navigation.evaluate(
							element => element.scrollHeight - element.clientHeight - element.scrollTop,
						),
					)
					.toBeLessThanOrEqual(1)
			}

			expect(await settleRoot(), 'Page motion must settle before the native gesture').toBe(true)

			const box = await toggle.boundingBox()

			if (!box) {
				throw new Error('The site menu control must have a visible pointer target')
			}

			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
			expect(
				await toggle.evaluate(element => {
					const bounds = element.getBoundingClientRect()

					return element.contains(
						document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2),
					)
				}),
			).toBe(true)
			const before = await root.evaluate(element => element.scrollTop)

			await navigation.evaluate(element => {
				delete element.dataset.wheelReceipt
				element.addEventListener(
					'wheel',
					event => {
						element.dataset.wheelReceipt = String(event.isTrusted)
					},
					{ once: true, passive: true },
				)
			})

			await page.mouse.wheel(0, 420)
			await expect
				.poll(() => navigation.getAttribute('data-wheel-receipt'), {
					message: `The ${open ? 'open' : 'closed'} header must receive the native wheel event`,
				})
				.toBe('true')

			if (open) {
				const positions = await root.evaluate(async element => {
					const positions: number[] = []
					const until = performance.now() + 400

					while (positions.length < 6 || performance.now() < until) {
						await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
						positions.push(element.scrollTop)
					}

					return positions
				})

				expect(
					positions.every(position => Math.abs(position - before) < 1),
					'Open navigation contains the gesture',
				).toBe(true)
			} else {
				await expect
					.poll(async () => (await root.evaluate(element => element.scrollTop)) - before)
					.toBeGreaterThan(10)
			}
		}
	})
}

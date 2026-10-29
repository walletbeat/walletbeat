import { expect, test } from '../../../tests/browser/verified-test'

for (const javaScriptEnabled of [true, false]) {
	test.describe(`site navigation with JavaScript ${javaScriptEnabled ? 'enabled' : 'disabled'}`, () => {
		test.use({ javaScriptEnabled })

		for (const width of [390, 900, 1025, 1280]) {
			test(`site header and menu boundary chain wheel input and contain open menus at ${width}px`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height: 900 })
				await page.goto('/metamask/?variant=BROWSER')

				if (javaScriptEnabled) {
					await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				}

				if (javaScriptEnabled) {
					await page.evaluate(() => document.fonts.ready)
				} else {
					await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')
				}

				const navigation = page.locator('#nav')
				const panel = page.locator('#nav-menu')
				const toggle = page.getByRole('button', { name: 'Open navigation menu', exact: true })
				const pointerTarget = width <= 1024 ? toggle : navigation.locator('header .logo')
				const root = page.locator('#layout')

				// Chaining and snap-target selection have independent owners.
				await root.evaluate(element => {
					element.style.scrollSnapType = 'none'
				})
				const settleRoot = async () => {
					let previous = await root.evaluate(element => element.scrollTop)
					let stableSince = Date.now()

					await expect
						.poll(
							async () => {
								const position = await root.evaluate(element => element.scrollTop)

								if (Math.abs(position - previous) > 0.1) {
									stableSince = Date.now()
								}

								previous = position

								return Date.now() - stableSince
							},
							{ timeout: 5000 },
						)
						.toBeGreaterThanOrEqual(400)
				}

				for (const open of width <= 1024 ? [false, true] : [false]) {
					if (open) {
						await toggle.click()
					}

					await expect
						.poll(() => panel.evaluate(element => element.matches(':popover-open')))
						.toBe(open)
					await expect
						.poll(() =>
							navigation.evaluate(element =>
								element
									.getAnimations({ subtree: true })
									.filter(
										animation =>
											animation.timeline instanceof DocumentTimeline &&
											Number.isFinite(animation.effect?.getComputedTiming().endTime),
									)
									.every(animation => !animation.pending && animation.playState !== 'running'),
							),
						)
						.toBe(true)

					for (const target of width <= 1024 && !open
						? [pointerTarget]
						: [pointerTarget, panel.locator('input[type="search"]')]) {
						await panel.evaluate(element =>
							element.scrollTo({ top: element.scrollHeight, behavior: 'instant' }),
						)
						await expect
							.poll(() =>
								panel.evaluate(
									element => element.scrollHeight - element.clientHeight - element.scrollTop,
								),
							)
							.toBeLessThanOrEqual(1)
						await settleRoot()
						const box = await target.boundingBox()

						if (!box) {
							throw new Error('The site header must have a visible pointer target')
						}

						await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
						expect(
							await target.evaluate(element => {
								const bounds = element.getBoundingClientRect()

								return element.contains(
									document.elementFromPoint(
										bounds.x + bounds.width / 2,
										bounds.y + bounds.height / 2,
									),
								)
							}),
						).toBe(true)
						const before = await root.evaluate(element => element.scrollTop)

						expect(
							await root.evaluate(
								element => element.scrollHeight - element.clientHeight - element.scrollTop,
							),
							'The page must have room to receive the complete wheel input',
						).toBeGreaterThan(420)

						if (javaScriptEnabled) {
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
						}

						await page.mouse.wheel(0, 420)

						if (javaScriptEnabled) {
							await expect
								.poll(() => navigation.getAttribute('data-wheel-receipt'), {
									message: 'The header must receive the native wheel event',
								})
								.toBe('true')
						}

						if (open) {
							const positions: number[] = []
							const until = Date.now() + 500

							while (positions.length < 6 || Date.now() < until) {
								await page.waitForTimeout(80)
								positions.push(await root.evaluate(element => element.scrollTop))
							}
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
				}
			})
		}
	})
}

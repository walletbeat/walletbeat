import { setTimeout as delay } from 'node:timers/promises'

import { expect, test } from '../../../tests/browser/verified-test'

test.use({ headless: false })

test.describe('stationary WalletPage rendering', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'Rendering counters require Chromium CDP',
	)

	for (const wallet of ['metamask', 'ambire']) {
		for (const width of [390, 768]) {
			test(`${wallet} settles without recurring layout or style work at ${width}px`, async ({
				page,
				context,
				browser,
			}, info) => {
				await page.setViewportSize({ width, height: 900 })
				await page.goto(`/${wallet}/`)
				await expect(page.locator('#top')).toBeVisible()
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				await page.evaluate(() => document.fonts.ready)
				const audit = page
					.locator('article summary')
					.filter({ has: page.locator('h4', { hasText: 'Audit by' }) })
					.first()

				await expect(audit).toBeVisible()
				const control = audit.locator('[data-row-item~=wrap-end]:visible')

				await expect(
					control,
					'Audit summary must expose one visible trailing control owner',
				).toHaveCount(1)
				await expect(control).toBeVisible()
				const cdp = await context.newCDPSession(page)

				await cdp.send('Performance.enable')
				const metrics = async () => {
					const result = await cdp.send('Performance.getMetrics')
					const values = Object.fromEntries(
						result.metrics.map(metric => [metric.name, metric.value]),
					)

					for (const key of [
						'Timestamp',
						'LayoutCount',
						'RecalcStyleCount',
						'LayoutDuration',
						'RecalcStyleDuration',
					]) {
						expect(Number.isFinite(values[key]), `CDP must expose ${key}`).toBe(true)
					}

					return values
				}

				try {
					// Exact poses isolate stationary work from snapping and smooth-scroll settlement.
					await page.locator('#layout').evaluate(element => {
						if (!(element instanceof HTMLElement)) {
							throw new Error('Scroll owner must be HTML')
						}

						const root = element

						root.style.scrollSnapType = 'none'
						root.style.scrollBehavior = 'auto'
					})

					for (const pose of ['top', 'audit-control', 'audit-closed', 'audit-reopened'] as const) {
						if (pose === 'audit-closed' || pose === 'audit-reopened') {
							const expectedOpen = pose === 'audit-reopened'

							await audit.evaluate(element => element.focus({ preventScroll: true }))
							await expect(audit).toBeFocused()
							await expect
								.poll(() =>
									audit.evaluate(element => {
										const owner = element.parentElement

										if (!(owner instanceof HTMLDetailsElement)) {
											throw new Error('Audit summary requires its native details owner')
										}

										return owner.open
									}),
								)
								.toBe(!expectedOpen)
							await page.keyboard.press('Space')
							await expect
								.poll(() =>
									audit.evaluate(element => {
										const owner = element.parentElement

										if (!(owner instanceof HTMLDetailsElement)) {
											throw new Error('Audit summary requires its native details owner')
										}

										return owner.open
									}),
								)
								.toBe(expectedOpen)
							await expect
								.poll(
									() =>
										audit.evaluate(element => {
											const owner = element.parentElement!

											return owner.getAnimations({ subtree: true }).filter(animation => {
												const timing = animation.effect?.getComputedTiming()

												return (
													animation.timeline instanceof DocumentTimeline &&
													timing &&
													Number.isFinite(timing.endTime) &&
													(animation.playState === 'running' || animation.pending)
												)
											}).length
										}),
									{
										timeout: 5000,
										message:
											'Native disclosure transition must finish before selecting the stationary pose',
									},
								)
								.toBe(0)
						}

						if (pose === 'top') {
							await page.locator('#layout').evaluate(element => {
								element.scrollTop = 0
							})
						} else {
							await control.evaluate(element => {
								const root = document.querySelector('#layout')!

								root.scrollTop += element.getBoundingClientRect().top - 100
							})
						}

						await expect
							.poll(
								() =>
									page.evaluate(
										() =>
											document.getAnimations().filter(animation => {
												const timing = animation.effect?.getComputedTiming()

												return (
													animation.timeline instanceof DocumentTimeline &&
													timing &&
													Number.isFinite(timing.endTime) &&
													(animation.playState === 'running' || animation.pending)
												)
											}).length,
									),
								{
									timeout: 5000,
									message: 'Finite time-driven effects must finish before stationary observation',
								},
							)
							.toBe(0)
						await delay(1500)
						const readPose = async () => ({
							...(await page.locator('#layout').evaluate(element => ({
								scroll: element.scrollTop,
								height: element.scrollHeight,
								viewport: element.clientHeight,
							}))),
							disclosureOpen: await audit.evaluate(element => {
								if (!(element.parentElement instanceof HTMLDetailsElement)) {
									throw new Error('Audit summary requires native details')
								}

								return element.parentElement.open
							}),
						})
						const beforePose = await readPose()

						if (pose === 'top') {
							expect(beforePose.scroll).toBe(0)
						} else {
							expect(beforePose.scroll).toBeGreaterThan(0)
							const box = await control.boundingBox()

							expect(box).not.toBeNull()
							expect(
								Math.abs(box!.y - 100),
								'The real trailing control must reach the requested encounter pose',
							).toBeLessThan(1)
						}

						const windows: Record<string, number>[] = []
						let before = await metrics()

						for (let index = 0; index < 2; index++) {
							// No DOM queries, animation sampling, screenshots or page timers in this interval.
							await delay(1000)
							const after = await metrics()

							windows.push(
								Object.fromEntries(Object.keys(before).map(key => [key, after[key] - before[key]])),
							)
							before = after
						}
						const afterPose = await readPose()

						await info.attach(`stationary-${pose}`, {
							body: JSON.stringify({
								wallet,
								width,
								browser: browser.version(),
								beforePose,
								afterPose,
								windows,
								scope:
									'Stationary layout/style recurrence only; does not establish scrolling smoothness, compositor execution, paint cost or low-end-device performance.',
							}),
							contentType: 'application/json',
						})
						expect(
							afterPose,
							'The page must remain at the same settled geometry throughout measurement',
						).toEqual(beforePose)

						for (const window of windows) {
							expect(window.Timestamp).toBeGreaterThanOrEqual(0.9)
						}

						for (const counter of ['LayoutCount', 'RecalcStyleCount']) {
							expect(
								windows.every(window => window[counter] > 0),
								`${pose}: ${counter} must not recur in both independent idle windows`,
							).toBe(false)
						}
					}
				} finally {
					await cdp.detach()
				}
			})
		}
	}
})

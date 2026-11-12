import { expect, test } from '../../../tests/browser/verified-test'

for (const javaScriptEnabled of [true, false]) {
	test.describe(javaScriptEnabled ? 'hydrated TOC flow' : 'no-script TOC flow', () => {
		test.use({ javaScriptEnabled })

		for (const { width, direction } of [
			{ width: 390, direction: 'ltr' },
			{ width: 864, direction: 'rtl' },
		]) {
			test(`native overlay preserves document layout at ${width}px ${direction}`, async ({
				page,
			}, info) => {
				await page.setViewportSize({ width, height: 900 })
				await page.goto('/__wallet-page/software/')

				if (javaScriptEnabled) {
					await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				}

				await page.evaluate(direction => {
					document.documentElement.dir = direction
					document.body.dir = direction
				}, direction)
				await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')
				const panel = page.locator('#wallet-toc')

				await expect(panel).toBeVisible()
				const original = await panel.elementHandle()
				const readLayout = await page.locator('#layout').evaluateHandle(root => () => {
					const nav = root.querySelector('.page-navigation')!
					const article = root.querySelector('#top > article')!
					const toc = root.querySelector('#wallet-toc')!
					const pie = root.querySelector('.pie-navigation')!
					const navBox = nav.getBoundingClientRect()
					const tocBox = toc.getBoundingClientRect()
					const pieBox = pie.getBoundingClientRect()

					return {
						scroll: root.scrollTop,
						extent: root.scrollHeight,
						articleTop: article.getBoundingClientRect().top + root.scrollTop,
						navHeight: navBox.height,
						navWidth: navBox.width,
						wrapped: pieBox.height > 0 && tocBox.top >= pieBox.bottom - 1,
						pieVisible: pieBox.height > 0 && pieBox.width > 0,
						shapeSupported: CSS.supports('clip-path', 'shape(from 0 0, line to 1px 1px, close)'),
					}
				})
				const observe = () => page.evaluate(read => read(), readLayout)
				const flow = await observe()
				const records = [{ phase: 'flow', ...flow }]

				if (flow.shapeSupported && flow.pieVisible) {
					expect(flow.wrapped).toBe(width === 390)
				}

				const check = async (phase: string, sample?: Awaited<ReturnType<typeof observe>>) => {
					const current = sample ?? (await observe())

					records.push({ phase, ...current })

					for (const key of ['scroll', 'extent', 'articleTop', 'navHeight', 'navWidth'] as const) {
						expect(Math.abs(current[key] - flow[key]), `${phase}: ${key}`).toBeLessThanOrEqual(1)
					}
					expect(await panel.evaluate((element, original) => element === original, original)).toBe(
						true,
					)
				}

				await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
				await expect(page.locator('#wallet-toc:popover-open')).toBeVisible()
				await check('open')
				const closing = javaScriptEnabled
					? await panel.evaluateHandle(
							(element, read) => ({
								result: new Promise<ReturnType<typeof read>>((resolve, reject) => {
									const onClose = (event: Event) => {
										if (!(event instanceof ToggleEvent) || event.newState !== 'closed') {
											return
										}

										element.removeEventListener('toggle', onClose)

										try {
											if (
												!(element instanceof HTMLElement) ||
												!element.hasAttribute('data-closing') ||
												!element.inert ||
												element.matches(':popover-open')
											) {
												throw Error('An actual inert closing phase is required')
											}

											resolve(read())
										} catch (error) {
											reject(error instanceof Error ? error : Error(String(error)))
										}
									}

									element.addEventListener('toggle', onClose)
								}),
							}),
							readLayout,
						)
					: null

				await page.keyboard.press('Escape')

				if (closing) {
					await check('closing', await closing.evaluate(armed => armed.result))
				}

				await expect(
					page.locator('#wallet-toc:popover-open, #wallet-toc[data-closing]'),
				).toHaveCount(0)
				await expect(panel).toBeVisible()
				await check('closed')
				await info.attach('native-flow-reservation', {
					body: JSON.stringify({ javaScriptEnabled, width, direction, records }),
					contentType: 'application/json',
				})
			})
		}
	})
}

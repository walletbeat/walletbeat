import { expect, test } from '../../../tests/browser/verified-test'

for (const javaScriptEnabled of [true, false]) {
	for (const width of [390, 690, 1280]) {
		test.describe(`skip navigation at ${width}px with JavaScript ${javaScriptEnabled}`, () => {
			test.use({ javaScriptEnabled, viewport: { width, height: 900 } })

			test('the original focused link owns its paint and activates the main content', async ({
				page,
			}) => {
				await page.goto('/metamask/?variant=BROWSER', { waitUntil: 'domcontentloaded' })
				await expect(page.locator('#top')).toHaveCount(1)
				await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')

				if (javaScriptEnabled) {
					await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				}

				const skip = page.locator('#layout > .skip-link')
				const originalSkip = await skip.elementHandle()
				const originalContent = await page.locator('#content').elementHandle()

				if (!originalSkip || !originalContent) {
					throw new Error('Skip navigation requires its original link and content target')
				}

				await expect(skip).toHaveAttribute('href', '#content')
				await expect(skip).toHaveAttribute('data-astro-reload', '')
				await page.keyboard.press('Tab')
				await expect(skip).toBeFocused()
				// Synchronous observations also work when page callbacks are disabled.
				await expect
					.poll(() =>
						skip.evaluate(element => {
							const box = element.getBoundingClientRect()
							const style = getComputedStyle(element)
							const points = [0.2, 0.5, 0.8].map(fraction => ({
								x: box.left + box.width * fraction,
								y: box.top + box.height / 2,
							}))

							return (
								element.matches(':focus-visible') &&
								Number(style.opacity) === 1 &&
								box.width > 0 &&
								box.height > 0 &&
								points.every(({ x, y }) => {
									const hit = document.elementFromPoint(x, y)

									return hit !== null && element.contains(hit)
								})
							)
						}),
					)
					.toBe(true)

				const point = await skip.evaluate(element => {
					const box = element.getBoundingClientRect()

					return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
				})

				await page.mouse.click(point.x, point.y)
				await expect(page).toHaveURL(/\/metamask\/\?variant=BROWSER#content$/)
				await expect(page.locator('#content')).toBeFocused()
				expect(await originalSkip.evaluate(element => element.isConnected)).toBe(true)
				expect(await originalContent.evaluate(element => element.isConnected)).toBe(true)
			})
		})
	}
}

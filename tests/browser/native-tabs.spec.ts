import { expect, test } from './verified-test'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test.describe(`native tabs, motion ${reducedMotion}`, () => {
		test.use({ javaScriptEnabled: false, reducedMotion })
		test('grouped panels retain native visibility, focus and responsive bounds', async ({
			page,
			browserName,
		}) => {
			for (const width of [1280, 390]) {
				await page.setViewportSize({ width, height: 900 })
				await page.goto('/__native-tabs')

				for (const name of ['horizontal', 'vertical']) {
					const group = page.locator(`#${name}`)
					const nested = group.locator(`#nested-${name}`)

					await nested.locator(':scope > details > summary').nth(1).click()
					await expect(nested.locator(':scope > details[open]')).toHaveCount(1)
					await expect(group.locator(':scope > details[open]')).toHaveCount(1)
					const selected = group.locator(':scope > details').last()
					const summary = selected.locator(':scope > summary')

					await summary.click()
					await summary.focus()
					const panel = selected.locator(':scope > [data-tab-panel]')
					const first = panel.locator('a').first()

					const last = panel.locator('a').last()
					const forward = browserName === 'webkit' ? 'Alt+Tab' : 'Tab'
					const backward = browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab'
					// Scrollable panels can themselves be native sequential focus stops.
					const passPanel = async (key: string) => {
						await page.keyboard.press(key)

						if (await panel.evaluate(element => document.activeElement === element)) {
							await page.keyboard.press(key)
						}
					}

					await expect(summary).toBeFocused()
					await passPanel(forward)
					await expect(first).toBeFocused()
					expect(
						await group.locator(':scope > details:not([open])').evaluateAll(elements =>
							elements.every(element => {
								const link = element.querySelector('a')

								link?.focus()

								return !link || document.activeElement !== link
							}),
						),
					).toBe(true)
					await page.keyboard.press(forward)
					await expect(last).toBeFocused()
					await page.keyboard.press(forward)
					expect(await selected.evaluate(element => element.contains(document.activeElement))).toBe(
						false,
					)
					await page.keyboard.press(backward)
					await expect(last).toBeFocused()
					await page.keyboard.press(backward)
					await expect(first).toBeFocused()
					await passPanel(backward)
					await expect(summary).toBeFocused()
					const bounds = await panel.evaluate(element => {
						const panel = element.getBoundingClientRect()
						const group = element.closest('[data-tabs]')!.getBoundingClientRect()

						return {
							left: panel.left - group.left,
							right: panel.right - group.right,
							width: panel.width,
						}
					})

					expect(bounds.width).toBeGreaterThan(150)
					expect(bounds.left).toBeGreaterThanOrEqual(-1)
					expect(bounds.right).toBeLessThanOrEqual(1)
					await page.keyboard.press('Enter')
					await expect(group.locator(':scope > details[open]')).toHaveCount(0)
					const summaries = group.locator(':scope > details > summary')

					for (let index = (await summaries.count()) - 2; index >= 0; index--) {
						await page.keyboard.press(backward)
						await expect(summaries.nth(index)).toBeFocused()
					}

					for (let index = 1; index < (await summaries.count()); index++) {
						await page.keyboard.press(forward)
						await expect(summaries.nth(index)).toBeFocused()
					}
					await page.keyboard.press('Enter')
					await passPanel(forward)
					await expect(first).toBeFocused()
				}
			}
		})
	})
}

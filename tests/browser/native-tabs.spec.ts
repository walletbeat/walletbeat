import { expect, test } from './verified-test'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test.describe(`native tabs, motion ${reducedMotion}`, () => {
		test.use({ javaScriptEnabled: false, reducedMotion })
		test('grouped panels retain native visibility, focus and responsive bounds', async ({
			page,
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
					const panel = selected.locator(':scope > [data-tab-panel]')
					const first = panel.locator('a').first()

					await first.focus()
					expect(await first.evaluate(element => document.activeElement === element)).toBe(true)
					expect(
						await group.locator(':scope > details:not([open])').evaluateAll(elements =>
							elements.every(element => {
								const link = element.querySelector('a')

								link?.focus()

								return !link || document.activeElement !== link
							}),
						),
					).toBe(true)
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
					await summary.focus()
					await page.keyboard.press('Enter')
					await expect(group.locator(':scope > details[open]')).toHaveCount(0)
					await page.keyboard.press('Enter')
					await first.focus()
					expect(await first.evaluate(element => document.activeElement === element)).toBe(true)
				}
			}
		})
	})
}

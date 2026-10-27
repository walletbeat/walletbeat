import { expect, test } from '../../../tests/browser/verified-test'

for (const strategy of ['live', 'none', 'document']) {
	for (const reducedMotion of ['no-preference', 'reduce'] as const) {
		test.describe(`retained row focus, ${strategy}, ${reducedMotion}`, () => {
			test.use({ reducedMotion })
			test('keeps moved controls focused and respects explicit changes and invalidation', async ({
				page,
			}) => {
				await page.goto('/__reorder-focus')
				await expect(page.locator('[data-focus-row]').first().getByRole('button')).toBeEnabled()
				await page.getByLabel('Transition strategy').selectOption(strategy)
				const rows = page.locator('[data-focus-row]')
				const settle = () =>
					page.waitForFunction(
						() => !document.querySelector('[data-layout-transition],[data-view-transition-active]'),
					)

				for (let iteration = 0; iteration < 4; iteration++) {
					const first = rows.first().getByRole('button')
					const handle = await first.elementHandle()

					await first.focus()
					await page.keyboard.press('Enter')
					await settle()
					expect(await handle?.evaluate(element => document.activeElement === element)).toBe(true)
					await expect(rows.last().getByRole('button')).toHaveText(`Move row ${iteration + 1}`)
				}

				for (const behavior of [
					'blur-before',
					'outside-before',
					'outside-after',
					'remove',
					'disable',
					'hide',
					'inert',
				]) {
					await page.getByRole('button', { name: 'Reset rows', exact: true }).click()
					await page.getByLabel('Update behavior').selectOption(behavior)
					const first = rows.first().getByRole('button')
					const handle = await first.elementHandle()

					await first.focus()
					await page.keyboard.press('Enter')
					await settle()
					await expect
						.poll(() => handle?.evaluate(element => document.activeElement === element))
						.toBe(false)

					if (behavior.startsWith('outside')) {
						await expect(
							page.getByRole('button', { name: 'Outside control', exact: true }),
						).toBeFocused()
					}
				}
			})
		})
	}
}

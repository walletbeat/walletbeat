import type { Locator, Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

async function tabTo(page: Page, target: Locator) {
	for (const key of ['Tab', 'Alt+Tab']) {
		for (let attempt = 0; attempt < 20; attempt += 1) {
			if (await target.evaluate(element => element === document.activeElement)) {
				return
			}

			await page.keyboard.press(key)
		}
	}
	await expect(target).toBeFocused()
}

test('Modal keyboard actions belong to the focused control', async ({ page }) => {
	await page.goto('/__modal-keyboard', { waitUntil: 'domcontentloaded' })
	await expect(page.locator('astro-island[ssr]')).toHaveCount(0)
	const heading = page.getByRole('heading', { name: 'Keyboard ownership', exact: true })
	const checkbox = page.getByRole('checkbox', { name: 'Acknowledgement' })

	await tabTo(page, checkbox)
	await page.keyboard.press('Space')
	await expect(checkbox).toBeChecked()
	await expect(heading).toBeVisible()

	const input = page.getByRole('textbox', { name: 'Message' })

	await tabTo(page, input)
	await page.keyboard.press('Enter')
	await page.keyboard.press('Space')
	await expect(input).toHaveValue(' ')
	await expect(heading).toBeVisible()

	const button = page.getByRole('button', { name: 'Activate', exact: true })

	await tabTo(page, button)
	await page.keyboard.press('Enter')
	await expect(page.getByRole('status', { name: 'Activations' })).toHaveText('1')
	await page.keyboard.press('Space')
	await expect(page.getByRole('status', { name: 'Activations' })).toHaveText('2')
	await expect(heading).toBeVisible()
})

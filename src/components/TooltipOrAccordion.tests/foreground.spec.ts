import type { Locator, Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

async function heldClick(page: Page, target: Locator) {
	await target.scrollIntoViewIfNeeded()
	const box = await target.boundingBox()

	if (!box) {
		throw new Error('Missing foreground action bounds')
	}

	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
	await page.mouse.down()

	try {
		await page.evaluate(
			() =>
				new Promise<void>(resolve => {
					requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
				}),
		)
		await expect(target).toBeVisible()
	} finally {
		await page.mouse.up()
	}
}

for (const width of [390, 1280]) {
	for (const javaScriptEnabled of [false, true]) {
		test.describe(`foreground actions at ${width}, scripts ${javaScriptEnabled}`, () => {
			test.use({ viewport: { width, height: 900 }, javaScriptEnabled })

			test('behind invocation preserves native foreground actions', async ({ page }) => {
				await page.goto('/__tooltip-hydration')

				if (javaScriptEnabled) {
					await expect(
						page.locator('astro-island[component-url*="TooltipHydration"]'),
					).not.toHaveAttribute('ssr')
				}

				const section = page.locator('[data-foreground-controls]')
				const disclosure = section.locator('#foreground-disclosure')
				const summary = disclosure.locator(':scope > summary')
				const foreground = section.locator('[data-foreground-summary]')
				const body = disclosure.locator(':scope > [popover]')

				await expect(disclosure).toHaveJSProperty('open', false)
				await heldClick(page, foreground)
				await expect(disclosure).toHaveJSProperty('open', true)
				await expect(body).toBeVisible()
				await summary.press('Enter')
				await expect(disclosure).toHaveJSProperty('open', false)

				const option = section.getByRole('checkbox', { name: 'Foreground option' })

				await option.check()
				await expect(option).toBeChecked()
				await expect(disclosure).toHaveJSProperty('open', false)

				await section.getByRole('button', { name: 'Foreground command', exact: true }).click()
				const independent = section.locator('#foreground-independent-popover')

				await expect
					.poll(() => independent.evaluate(node => node.matches(':popover-open')))
					.toBe(true)
				await expect(disclosure).toHaveJSProperty('open', false)
				await page.keyboard.press('Escape')
				await expect
					.poll(() => independent.evaluate(node => node.matches(':popover-open')))
					.toBe(false)

				await section.getByRole('link', { name: 'Foreground link', exact: true }).click()
				await expect(page).toHaveURL(/#foreground-destination$/)
				await expect(disclosure).toHaveJSProperty('open', false)

				if (javaScriptEnabled && width === 1280) {
					await page.mouse.move(0, 0)
					const invoker = summary.locator('[data-tooltip-trigger]')

					await invoker.focus()
					await expect(invoker).toBeFocused()
					await invoker.evaluate(element => {
						element.removeAttribute('data-trusted-keyboard-click')
						element.addEventListener(
							'click',
							event => {
								if (
									event.isTrusted &&
									event.target === element &&
									event instanceof MouseEvent &&
									event.detail === 0
								) {
									element.setAttribute('data-trusted-keyboard-click', 'true')
								}
							},
							{ once: true },
						)
					})
					await invoker.press('Enter')
					await expect(invoker).toHaveAttribute('data-trusted-keyboard-click', 'true')
					await expect.poll(() => body.evaluate(node => node.matches(':popover-open'))).toBe(true)
					await expect(disclosure).toHaveJSProperty('open', false)
					await page.keyboard.press('Escape')
					await expect.poll(() => body.evaluate(node => node.matches(':popover-open'))).toBe(false)
				}
			})
		})
	}
}

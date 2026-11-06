import type { Locator, Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

async function heldClick(page: Page, target: Locator) {
	await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')
	const measure = () =>
		target.evaluate(element => {
			element.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' })
			const bounds = element.getBoundingClientRect()

			return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
		})

	let previous = await measure()

	await expect
		.poll(
			async () => {
				const next = await measure()
				const stable = Math.abs(next.x - previous.x) < 0.5 && Math.abs(next.y - previous.y) < 0.5

				previous = next

				return stable
			},
			{ intervals: [100] },
		)
		.toBe(true)
	const box = await measure()

	if (box.width <= 0 || box.height <= 0) {
		throw new Error('Missing foreground action bounds')
	}

	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
	await page.mouse.down()

	try {
		await page.waitForTimeout(100)
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
				const disclosure = section.locator('details#foreground-disclosure')
				const summary = disclosure.locator(':scope > summary')
				const foreground = section.locator('[data-foreground-summary]')
				const body = disclosure.locator(':scope > [popover]')

				await expect(disclosure).toHaveCount(1)
				expect(
					await disclosure.evaluate(element => ({
						tag: element.tagName,
						namespace: element.namespaceURI,
						native: element instanceof HTMLDetailsElement,
						open: element instanceof HTMLDetailsElement ? element.open : null,
					})),
				).toEqual({
					tag: 'DETAILS',
					namespace: 'http://www.w3.org/1999/xhtml',
					native: true,
					open: false,
				})
				await expect(disclosure).not.toHaveAttribute('open')
				await heldClick(page, foreground)
				await expect(disclosure).toHaveAttribute('open')
				await expect(body).toBeVisible()
				await heldClick(page, foreground)
				await expect(disclosure).not.toHaveAttribute('open')
				await heldClick(page, foreground)
				await expect(disclosure).toHaveAttribute('open')
				await expect(body).toBeVisible()
				await summary.press('Enter')
				await expect(disclosure).not.toHaveAttribute('open')

				const option = section.getByRole('checkbox', { name: 'Foreground option' })

				await heldClick(page, option.locator('..'))
				await expect(option).toBeChecked()
				await expect(disclosure).not.toHaveAttribute('open')

				await heldClick(
					page,
					section.getByRole('button', { name: 'Foreground command', exact: true }),
				)
				const independent = section.locator('#foreground-independent-popover')

				await expect
					.poll(() => independent.evaluate(node => node.matches(':popover-open')))
					.toBe(true)
				await expect(disclosure).not.toHaveAttribute('open')
				await page.keyboard.press('Escape')
				await expect
					.poll(() => independent.evaluate(node => node.matches(':popover-open')))
					.toBe(false)

				await heldClick(page, section.getByRole('link', { name: 'Foreground link', exact: true }))
				await expect(page).toHaveURL(/#foreground-destination$/)
				await expect(disclosure).not.toHaveAttribute('open')

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
					await expect(disclosure).not.toHaveAttribute('open')
					await page.keyboard.press('Escape')
					await expect.poll(() => body.evaluate(node => node.matches(':popover-open'))).toBe(false)
				}
			})
		})
	}
}

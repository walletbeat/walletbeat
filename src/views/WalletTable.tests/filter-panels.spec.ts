import type { Locator, Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

const expectWithinViewport = async (panel: Locator, page: Page) => {
	const box = await panel.boundingBox()
	const viewport = page.viewportSize()

	if (!box || !viewport) {
		throw new Error('Panel and explicit viewport must have geometry')
	}

	expect(box.width).toBeGreaterThan(0)
	expect(box.height).toBeGreaterThan(0)
	expect(box.x).toBeGreaterThanOrEqual(-1)
	expect(box.y).toBeGreaterThanOrEqual(-1)
	expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
	expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)
}

const expectReachable = async (control: Locator, page: Page) => {
	await expectWithinViewport(control, page)
	const samples = await control.evaluate(async control => {
		const samples: boolean[] = []

		for (let frame = 0; frame < 3; frame++) {
			await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
			const box = control.getBoundingClientRect()

			samples.push(
				control.isConnected &&
					box.x >= -1 &&
					box.y >= -1 &&
					box.right <= innerWidth + 1 &&
					box.bottom <= innerHeight + 1 &&
					control.contains(
						document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
					),
			)
		}

		return samples
	})

	expect(samples).toEqual([true, true, true])
}

for (const viewport of [
	{ width: 1280, height: 900 },
	{ width: 1025, height: 320 },
	{ width: 1025, height: 240 },
	{ width: 390, height: 844 },
]) {
	for (const javaScriptEnabled of [true, false]) {
		test.describe(`${viewport.width} by ${viewport.height}, scripting ${javaScriptEnabled}`, () => {
			test.use({ viewport, javaScriptEnabled })

			test('filter surfaces preserve reachable controls within their viewport', async ({
				page,
			}) => {
				await page.goto('/wallet/summary/')

				if (javaScriptEnabled) {
					await expect(
						page.getByRole('button', { name: 'Sort by Wallet', exact: true }),
					).toHaveAttribute('type', 'button')
				}

				await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')
				const rows = page.locator('.wallet-table tbody tr')
				const initialRows = await rows.count()

				expect(initialRows).toBeGreaterThan(0)

				if (viewport.width === 390) {
					const bar = page.locator('.filters')

					await expect(bar).toHaveCount(1)

					for (const form of await bar.locator('form').all()) {
						await expect(form).toHaveCSS('display', 'contents')
					}
					const maxScroll = await bar.evaluate(bar => bar.scrollWidth - bar.clientWidth)

					await test.info().attach('compact-filter-scroll', {
						body: JSON.stringify({ maxScroll, exercised: maxScroll > 1 }),
						contentType: 'application/json',
					})

					if (maxScroll > 1) {
						const point = await bar.evaluate(bar => {
							const box = bar.getBoundingClientRect()
							const x = box.x + box.width / 2
							const y = box.y + box.height / 2

							return { x, y, hit: bar.contains(document.elementFromPoint(x, y)) }
						})

						expect(point.hit).toBe(true)
						await page.mouse.move(point.x, point.y)
						await page.mouse.wheel(10000, 0)
						await expect
							.poll(() =>
								bar.evaluate(bar => Math.abs(bar.scrollLeft - (bar.scrollWidth - bar.clientWidth))),
							)
							.toBeLessThanOrEqual(1)
					}

					const reset = bar.locator('button[data-reset="all"]').last()

					await expectWithinViewport(reset, page)
					const [resetBox, barBox] = await Promise.all([reset.boundingBox(), bar.boundingBox()])

					if (!resetBox || !barBox) {
						throw new Error('Compact controls must have geometry')
					}

					expect(resetBox.x).toBeGreaterThanOrEqual(barBox.x - 1)
					expect(resetBox.y).toBeGreaterThanOrEqual(barBox.y - 1)
					expect(resetBox.x + resetBox.width).toBeLessThanOrEqual(barBox.x + barBox.width + 1)
					expect(resetBox.y + resetBox.height).toBeLessThanOrEqual(barBox.y + barBox.height + 1)

					if (javaScriptEnabled) {
						expect(
							await reset.evaluate(reset => {
								const box = reset.getBoundingClientRect()

								return reset.contains(
									document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
								)
							}),
						).toBe(true)
						const group = reset.locator('..')

						await expect(group.locator('input').first()).toBeEnabled()
						const checkboxes = group.locator('input[type="checkbox"]')
						const input =
							(await checkboxes.count()) > 0 ? checkboxes.last() : group.locator('input[value=""]')

						await input.locator('..').click()
						await expect(input).toBeChecked()
						await expectReachable(input.locator('..'), page)
						await reset.click()
						await expect(input).not.toBeChecked()
					} else {
						await expect(reset).toBeDisabled()
					}

					await expect(rows).toHaveCount(initialRows)

					return
				}

				for (const column of ['wallet', 'stage', 'overall']) {
					const trigger = page.locator(`th[data-table-column="${column}"] .filter-trigger`)
					const id = await trigger.getAttribute('popovertarget')

					if (!id) {
						throw new Error('Filter trigger must own a native popover')
					}

					const panel = page.locator(`[id="${id}"]`)

					await trigger.click()
					await expect
						.poll(() => panel.evaluate(panel => panel.matches(':popover-open')))
						.toBe(true)
					await expectWithinViewport(panel, page)

					if (await panel.evaluate(panel => panel.scrollHeight > panel.clientHeight + 1)) {
						const point = await panel.evaluate(panel => {
							const box = panel.getBoundingClientRect()
							const x = box.x + box.width / 2
							const y = box.bottom - 12

							return { x, y, hit: panel.contains(document.elementFromPoint(x, y)) }
						})

						expect(point.hit).toBe(true)
						await page.mouse.move(point.x, point.y)
						await page.mouse.wheel(0, 1000)
						await expect.poll(() => panel.evaluate(panel => panel.scrollTop)).toBeGreaterThan(0)
					}

					if (javaScriptEnabled) {
						await expect(panel.locator('input').first()).toBeEnabled()
						const checkboxes = panel.locator('input[type="checkbox"]')
						const input =
							(await checkboxes.count()) > 0 ? checkboxes.last() : panel.locator('input[value=""]')

						await input.locator('..').click()
						await expect(input).toBeChecked()
						await expectReachable(input.locator('..'), page)
						await panel.getByRole('button', { name: /Reset/ }).filter({ visible: true }).click()
						await expect(input).not.toBeChecked()
						await expect
							.poll(() => panel.evaluate(panel => panel.matches(':popover-open')))
							.toBe(true)
					} else {
						expect(
							await panel
								.locator('input, button[type="reset"]')
								.evaluateAll(controls => controls.every(control => control.matches(':disabled'))),
						).toBe(true)
						const lastChoice = panel.locator('[data-filter-choice]').last()

						await lastChoice.scrollIntoViewIfNeeded()
						await expectWithinViewport(lastChoice, page)
					}

					await expectWithinViewport(panel, page)
					await expect(rows).toHaveCount(initialRows)
					await page.mouse.move(0, 0)
					await page.keyboard.press('Escape')
					await expect
						.poll(() => panel.evaluate(panel => panel.matches(':popover-open')))
						.toBe(false)
				}
			})
		})
	}
}

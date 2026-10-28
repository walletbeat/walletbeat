import type { Locator, Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

async function nativeTabTo(
	page: Page,
	target: Locator,
	browserName: string,
	direction: 'forward' | 'reverse' = 'forward',
) {
	if (await target.evaluate(element => element === document.activeElement)) {
		return
	}

	const key =
		direction === 'reverse'
			? browserName === 'webkit'
				? 'Alt+Shift+Tab'
				: 'Shift+Tab'
			: browserName === 'webkit'
				? 'Alt+Tab'
				: 'Tab'

	for (let index = 0; index < 80; index++) {
		await page.keyboard.press(key)

		if (await target.evaluate(element => element === document.activeElement)) {
			return
		}
	}
	const focus = await page.evaluate(() => ({
		tag: document.activeElement?.tagName,
		id: document.activeElement?.id,
		documentFocused: document.hasFocus(),
		modalCount: document.querySelectorAll('dialog:modal').length,
	}))

	throw new Error(
		`Native ${direction} keyboard did not reach the requested control: ${JSON.stringify(focus)}`,
	)
}

async function expectFixedScroll(target: Locator, expected: number) {
	const observation = await target.evaluate(
		element =>
			new Promise<{ complete: boolean; positions: number[] }>(resolve => {
				const positions: number[] = []
				const start = performance.now()
				let frame = 0
				const finish = (complete: boolean) => {
					clearTimeout(deadline)
					cancelAnimationFrame(frame)
					resolve({ complete, positions })
				}
				const deadline = setTimeout(() => finish(false), 3000)
				const sample = (now: number) => {
					positions.push(element.scrollTop)

					if (now - start >= 300) {
						finish(true)
					} else {
						frame = requestAnimationFrame(sample)
					}
				}

				frame = requestAnimationFrame(sample)
			}),
	)

	expect(observation.complete).toBe(true)
	expect(observation.positions.length).toBeGreaterThan(1)
	expect(observation.positions.every(position => position === expected)).toBe(true)
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test.describe(`modal lifecycle, motion ${reducedMotion}`, () => {
		test.use({ reducedMotion, hasTouch: true })

		test('native focus, child activation and nested dismissal retain their owners', async ({
			page,
			browserName,
		}) => {
			for (const width of [1280, 390]) {
				await page.setViewportSize({ width, height: 900 })
				await page.goto('/__modal-lifecycle')
				const invoker = page.locator('#open-basic')

				await expect(invoker).toBeEnabled()
				await nativeTabTo(page, invoker, browserName)
				await page.keyboard.press('Enter')
				const dialog = page.getByRole('dialog', { name: 'Shared basic modal' })

				await expect(dialog).toBeVisible()
				const box = await dialog.boundingBox()

				if (!box) {
					throw new Error('Visible modal has no bounds')
				}

				expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThanOrEqual(1)
				expect(Math.abs(box.y + box.height / 2 - 450)).toBeLessThanOrEqual(1)
				await expect(page.locator('#modal-action')).toBeFocused()
				await page.keyboard.press('Enter')
				await page.keyboard.press('Space')
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 2; closes: 0')

				for (const key of [
					browserName === 'webkit' ? 'Alt+Tab' : 'Tab',
					browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab',
				]) {
					for (let index = 0; index < 12; index++) {
						await page.keyboard.press(key)
						const focus = await dialog.evaluate(element => ({
							inside: element.contains(document.activeElement),
							body: document.activeElement === document.body,
							documentFocused: document.hasFocus(),
							modal: element.matches(':modal'),
							modalCount: document.querySelectorAll('dialog:modal').length,
						}))

						if (!focus.inside) {
							expect(focus).toMatchObject({
								body: true,
								documentFocused: false,
								modal: true,
								modalCount: 1,
							})
							await page.keyboard.press(key)
						}

						await expect
							.poll(() =>
								dialog.evaluate(
									element =>
										document.hasFocus() &&
										element.matches(':modal') &&
										document.querySelectorAll('dialog:modal').length === 1 &&
										element.contains(document.activeElement),
								),
							)
							.toBe(true)
					}
				}
				await page.getByRole('button', { name: 'Open help', exact: true }).click()
				await expect(page.locator('#modal-help')).toBeVisible()
				await page.keyboard.press('Escape')
				await expect(page.locator('#modal-help')).not.toBeVisible()
				await expect(dialog).toBeVisible()
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 2; closes: 0')
				await page.keyboard.press('Escape')
				await expect(dialog).not.toBeVisible()
				await expect(invoker).toBeFocused()
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 2; closes: 1')
			}
		})

		test('controlled reopening, closure and unmount release native state', async ({
			page,
			browserName,
		}) => {
			for (const width of [1280, 390]) {
				await page.setViewportSize({ width, height: 900 })
				await page.goto('/__modal-lifecycle')
				await page.locator('#open-basic').click()
				await page.locator('#modal-reopen').click()
				await expect(page.locator('dialog:modal')).toHaveCount(1)
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 0; closes: 0')
				await page.keyboard.press('Escape')
				await expect(page.locator('dialog:modal')).toHaveCount(0)
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 0; closes: 1')
				await page.locator('#open-basic').click()
				await page.locator('#modal-parent-close').click()
				await expect(page.locator('dialog:modal')).toHaveCount(0)
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 0; closes: 1')
				await page.locator('#open-basic').click()
				await page.locator('#modal-unmount').click()
				await expect(page.locator('dialog:modal')).toHaveCount(0)
				await expect
					.poll(() =>
						page.locator('#layout').evaluate(element => getComputedStyle(element).overflowY),
					)
					.toBe('auto')
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 0; closes: 1')
				await nativeTabTo(page, page.locator('#open-basic'), browserName, 'reverse')
				await page.keyboard.press('Enter')
				await page.locator('#modal-remove-invoker').click()
				await page.keyboard.press('Escape')
				await expect(page.locator('dialog:modal')).toHaveCount(0)
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 0; closes: 2')
				await nativeTabTo(page, page.locator('#open-empty'), browserName, 'reverse')
				await page.keyboard.press('Enter')
				await expect(page.locator('dialog:modal')).toHaveCount(1)

				for (const key of ['Tab', 'Shift+Tab']) {
					await page.keyboard.press(key)
					expect(
						await page
							.locator('dialog:modal')
							.evaluate(
								element =>
									element.contains(document.activeElement) ||
									document.activeElement === document.body ||
									document.activeElement === document.documentElement,
							),
					).toBe(true)
				}
				await page.keyboard.press('Escape')
				await expect(page.locator('dialog:modal')).toHaveCount(0)
			}
		})

		test('real consumers preserve actions and busy-state dismissal', async ({
			page,
			browserName,
		}) => {
			for (const width of [1280, 390]) {
				await page.setViewportSize({ width, height: 900 })
				await page.goto('/__modal-lifecycle')
				await page.locator('#open-chain').click()
				const chain = page.getByRole('dialog', { name: 'Switch to Ethereum Mainnet' })

				await nativeTabTo(
					page,
					page.getByRole('button', { name: 'Switch to Mainnet', exact: true }),
					browserName,
				)
				await page.keyboard.press('Enter')
				await page.keyboard.press('Space')
				await expect(chain).toBeVisible()
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 2; closes: 0')
				await page.getByRole('button', { name: 'Cancel', exact: true }).click()
				await expect(chain).not.toBeVisible()
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 2; closes: 1')
				await page.locator('#open-busy').click()
				await expect(chain.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
				await expect(chain.getByRole('button', { name: 'Switching…', exact: true })).toBeDisabled()
				await page.keyboard.press('Escape')
				await expect(chain).not.toBeVisible()
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 2; closes: 2')
				await page.locator('#open-connector').click()
				const connector = page.getByRole('dialog', { name: 'Select a wallet' })

				await expect(connector.locator('.connector-button')).toBeFocused()
				await page.keyboard.press('Enter')
				await page.keyboard.press('Space')
				await expect(connector).toBeVisible()
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 4; closes: 2')
				await page.getByRole('button', { name: 'Close', exact: true }).click()
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 4; closes: 3')
				await page.locator('#open-empty-connector').click()
				await expect(
					page.getByText('No wallet connectors available in this environment.'),
				).toBeVisible()
				await page.getByRole('button', { name: 'Close', exact: true }).click()
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 4; closes: 4')
				await page.locator('#open-connector-busy').click()
				await expect(connector.locator('.connector-button')).toBeDisabled()
				await expect(connector.getByRole('button', { name: 'Close', exact: true })).toBeDisabled()
				await page.keyboard.press('Escape')
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 4; closes: 5')
				await page.locator('#open-results').click()
				const results = page.getByRole('dialog', { name: 'All Tests Passed!' })

				await nativeTabTo(page, results.locator('.step-header').first(), browserName)
				await page.keyboard.press('Enter')
				await expect(results.locator('.step-header').first()).toHaveAttribute(
					'aria-expanded',
					'true',
				)
				await expect(results).toBeVisible()
				await page.keyboard.press('Escape')
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 4; closes: 6')
			}
		})

		test('modal scrolling stays local and pointer dismissal restores the page', async ({
			page,
		}) => {
			for (const width of [1280, 390]) {
				await page.setViewportSize({ width, height: 900 })
				await page.goto('/__modal-lifecycle')
				const layout = page.locator('#layout')

				await page.mouse.move(width - 8, 800)
				await page.mouse.wheel(0, 80)
				await expect.poll(() => layout.evaluate(element => element.scrollTop)).toBeGreaterThan(10)
				let lastPosition = Number.NaN
				let stableSamples = 0

				await expect
					.poll(async () => {
						const position = await layout.evaluate(element => element.scrollTop)

						stableSamples = position === lastPosition ? stableSamples + 1 : 0
						lastPosition = position

						return stableSamples
					})
					.toBeGreaterThanOrEqual(3)
				const beforeOpen = await layout.evaluate(element => element.scrollTop)

				await page.locator('#open-long').click()
				const dialog = page.getByRole('dialog', { name: 'Shared long modal' })
				const initial = await layout.evaluate(element => element.scrollTop)

				expect(initial).toBe(beforeOpen)
				await expect
					.poll(() => layout.evaluate(element => getComputedStyle(element).overflowY))
					.toBe('hidden')
				await dialog.hover()
				await page.mouse.wheel(0, 700)
				await expect.poll(() => dialog.evaluate(element => element.scrollTop)).toBeGreaterThan(100)
				await page.mouse.move(width - 8, 800)
				await page.mouse.wheel(0, 700)
				await expectFixedScroll(layout, initial)
				await page.mouse.click(width - 8, 800)
				await expect(dialog).not.toBeVisible()
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 0; closes: 1')
				await expect
					.poll(() => layout.evaluate(element => getComputedStyle(element).overflowY))
					.toBe('auto')
				await expectFixedScroll(layout, initial)
				await page.mouse.wheel(0, 160)
				await expect
					.poll(() => layout.evaluate(element => element.scrollTop))
					.toBeGreaterThan(initial + 20)
				await page.locator('#open-disabled').click()
				await expect(page.locator('dialog:modal')).toHaveCount(1)

				for (const key of ['Tab', 'Shift+Tab']) {
					await page.keyboard.press(key)
					expect(
						await page
							.locator('dialog:modal')
							.evaluate(
								element =>
									element.contains(document.activeElement) ||
									document.activeElement === document.body ||
									document.activeElement === document.documentElement,
							),
					).toBe(true)
				}
				await page.touchscreen.tap(4, 4)
				await expect(page.locator('dialog:modal')).toHaveCount(0)
				await expect(page.locator('#modal-counts')).toHaveText('Actions: 0; closes: 2')
			}
		})
	})
}

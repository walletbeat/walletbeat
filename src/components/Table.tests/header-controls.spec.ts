import type { Locator } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

for (const javaScriptEnabled of [true, false]) {
	for (const reducedMotion of ['no-preference', 'reduce'] as const) {
		test.describe(`table header controls, scripts ${javaScriptEnabled}, motion ${reducedMotion}`, () => {
			test.use({ javaScriptEnabled, reducedMotion })
			test('sorting and expansion retain separate native pointer surfaces', async ({ page }) => {
				for (const [width, route] of [
					[1280, '/__table-header-controls'],
					[390, '/__table-header-controls'],
					[1280, '/__table-header-controls-deep'],
					[390, '/__table-header-controls-deep'],
				] as const) {
					await page.setViewportSize({ width, height: 900 })
					await page.goto(route)
					const viewport = page.locator('[data-header-controls]')
					const table = route.endsWith('-deep')
						? viewport.locator(
								':scope > [data-sticky-container] > [data-sticky-container] > [data-sticky-container] > [data-sticky-container] > .container',
							)
						: viewport.locator(':scope > .container')

					await expect(table).toHaveCount(1)
					const header = viewport.locator('th[data-table-column="attributes"]')
					const sort = header.getByRole('button', { name: 'Sort by Attributes', exact: true })

					await expect
						.poll(() =>
							header.locator('button').evaluateAll(elements =>
								elements.every(element => {
									const box = element.getBoundingClientRect()
									const header = element.closest('th')?.getBoundingClientRect()

									return !!header && box.top >= header.top - 1 && box.bottom <= header.bottom + 1
								}),
							),
						)
						.toBe(true)

					if (!javaScriptEnabled) {
						await expect(sort).toBeDisabled()
						await expect(
							viewport.getByRole('button', { name: 'Custom action', exact: true }),
						).toBeDisabled()
						await expect(
							header.getByRole('button', { name: 'Collapse', exact: true }),
						).toBeDisabled()
						continue
					}

					await expect(sort).toBeEnabled()
					const click = async (control: Locator, blockFraction = 0.5) => {
						const read = () =>
							control.evaluate((element, blockFraction) => {
								const box = element.getBoundingClientRect()
								const header = element.closest('th')?.getBoundingClientRect()
								const viewport = element.closest('[data-header-controls]')?.getBoundingClientRect()

								if (!viewport) {
									throw new Error('Missing header viewport')
								}

								const left = Math.max(box.left, viewport.left, 0)
								const right = Math.min(box.right, viewport.right, innerWidth)
								const top = Math.max(box.top, viewport.top, 0)
								const bottom = Math.min(box.bottom, viewport.bottom, innerHeight)
								const x = (left + right) / 2
								const y = top + (bottom - top) * blockFraction
								const action = element instanceof HTMLLabelElement ? element.control : element
								const actionBox = action?.getBoundingClientRect()
								const ownsNewArea =
									!(element instanceof HTMLLabelElement) ||
									(document.elementFromPoint(x, y) === element &&
										!!actionBox &&
										(x < actionBox.left ||
											x >= actionBox.right ||
											y < actionBox.top ||
											y >= actionBox.bottom))
								const points = [0.2, 0.5, 0.8].flatMap(inline =>
									[0.2, 0.5, 0.8].map(block => {
										const target = document.elementFromPoint(
											left + (right - left) * inline,
											top + (bottom - top) * block,
										)

										return !!target && (element.contains(target) || !!action?.contains(target))
									}),
								)

								return {
									x,
									y,
									visible: right > left && bottom > top,
									hit: points.every(Boolean),
									withinHeader:
										!!header && box.top >= header.top - 1 && box.bottom <= header.bottom + 1,
									ownsNewArea,
								}
							}, blockFraction)

						await expect
							.poll(async () => {
								const point = await read()

								return point.visible && point.hit && point.withinHeader && point.ownsNewArea
							})
							.toBe(true)
						const point = await read()

						expect(point.visible).toBe(true)
						expect(point.hit).toBe(true)
						expect(point.withinHeader).toBe(true)
						expect(point.ownsNewArea).toBe(true)
						await page.mouse.move(point.x, point.y)
						await page.mouse.down()

						try {
							expect(
								await control.evaluate(async (element, point) => {
									if (element instanceof HTMLLabelElement) {
										await Promise.all(
											element.control
												?.getAnimations({ subtree: true })
												.filter(
													animation =>
														animation.timeline instanceof DocumentTimeline &&
														animation.effect?.getComputedTiming().iterations !== Infinity,
												)
												.map(animation => animation.finished.catch(() => {})) ?? [],
										)
									}

									const target = document.elementFromPoint(point.x, point.y)

									return element instanceof HTMLLabelElement
										? target === element && element.control?.matches(':active') === true
										: !!target &&
												(element.contains(target) ||
													(target instanceof HTMLLabelElement && target.control === element)) &&
												element.matches(':active')
								}, point),
							).toBe(true)
						} finally {
							await page.mouse.up()
						}
					}

					for (const left of [0, 350, 900]) {
						await viewport.evaluate(
							(element, left) => element.scrollTo({ left, behavior: 'instant' }),
							left,
						)
						const previousSort = await header.getAttribute('aria-sort')

						await click(sort)

						if (left === 0 && reducedMotion === 'no-preference') {
							const container = viewport.locator('.container')

							await expect(container).toHaveCSS('contain', 'layout')
							await expect(container).toHaveCSS('clip-path', 'none')
							await expect(container.locator('[data-layout-transition]')).toHaveCount(0)
							await expect(container).toHaveCSS('contain', 'none')
							await expect(container).toHaveCSS('clip-path', /^inset/)
						}

						await expect(header).not.toHaveAttribute('aria-sort', previousSort ?? '')
						await expect(header).toHaveAttribute('data-expanded', '')
						await click(header.locator('.expansion-hit-area'), 0.1)
						await expect(header).not.toHaveAttribute('data-expanded')
						await click(header.locator('.expansion-hit-area'), 0.9)
						await expect(header).toHaveAttribute('data-expanded', '')
					}

					await viewport.evaluate(element =>
						element.scrollTo({ left: element.scrollWidth, behavior: 'instant' }),
					)
					await click(viewport.getByRole('button', { name: 'Custom action', exact: true }))
					await expect(page.getByLabel('Extra action count')).toHaveText('1')
					await click(viewport.getByRole('button', { name: 'Sort by Custom', exact: true }))
					await expect(viewport.locator('th[data-table-column="custom"]')).toHaveAttribute(
						'aria-sort',
						'ascending',
					)
					await expect(page.getByLabel('Extra action count')).toHaveText('1')
				}
			})
		})
	}
}

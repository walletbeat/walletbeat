import type { Locator } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'
import { interestDelayMs } from '../interest'

async function observeTrustedClick(button: Locator) {
	await button.evaluate(element => {
		element.setAttribute('data-trusted-clicks', '0')
		element.addEventListener('click', event => {
			if (event.isTrusted) {
				element.setAttribute(
					'data-trusted-clicks',
					String(Number(element.getAttribute('data-trusted-clicks')) + 1),
				)
			}
		}, { once: true })
	})
}

async function titlePoint(label: Locator, blockFraction: number, atEnd = false) {
	return label.evaluate(
		(element, { blockFraction, atEnd }) => {
			if (!(element instanceof HTMLLabelElement)) {
				throw new Error('Missing native title label')
			}

			const header = element.closest('th')?.getBoundingClientRect()
			const title = element.closest('.header-title')?.getBoundingClientRect()
			const plane = element.getBoundingClientRect()
			const clippingOwner = element.closest('.header-cell-content')
			const clip = clippingOwner?.getBoundingClientRect()
			const button = element.control?.getBoundingClientRect()
			const viewport = element.closest('[data-header-controls]')?.getBoundingClientRect()
			const tableContainer = element.closest('.container')
			const containerBox = tableContainer?.getBoundingClientRect()
			const clipPath = tableContainer ? getComputedStyle(tableContainer).clipPath : 'none'
			const roundedClip = /^inset\(0px(?: 0px){0,3} round ([\d.]+)px\)$/.exec(clipPath)

			if (clipPath !== 'none' && !roundedClip) {
				throw new Error(`Unsupported table clipping shape: ${clipPath}`)
			}

			if (!header || !title || !viewport || !clip || !clippingOwner) {
				throw new Error('Missing title allocation owners')
			}

			const rtl = getComputedStyle(element).direction === 'rtl'
			const area = {
				left: rtl ? title.left : header.left,
				right: rtl ? header.right : title.right,
				top: header.top,
				bottom: header.bottom,
			}

			const sticky = element
				.closest('thead')
				?.querySelector('th[data-sticky]')
				?.getBoundingClientRect()
			const ownSticky = element.closest('th')?.hasAttribute('data-sticky')
			const left = Math.max(
				area.left,
				viewport.left,
				0,
				!ownSticky && !rtl ? (sticky?.right ?? 0) : 0,
			)
			const right = Math.min(
				area.right,
				viewport.right,
				innerWidth,
				!ownSticky && rtl ? (sticky?.left ?? innerWidth) : innerWidth,
			)
			const top = Math.max(area.top, viewport.top, 0)
			const bottom = Math.min(area.bottom, viewport.bottom, innerHeight)
			const y = top + (bottom - top) * blockFraction
			let visibleLeft = left
			let visibleRight = right

			if (roundedClip && containerBox) {
				const radius = Math.min(
					Number(roundedClip[1]),
					containerBox.width / 2,
					containerBox.height / 2,
				)
				const depth = Math.max(
					0,
					radius - (y - containerBox.top),
					radius - (containerBox.bottom - y),
				)
				const inset = radius - Math.sqrt(Math.max(0, radius * radius - depth * depth))

				visibleLeft = Math.max(left, containerBox.left + inset)
				visibleRight = Math.min(right, containerBox.right - inset)
			}

			const x = rtl !== atEnd ? visibleRight - 1 : visibleLeft + 1

			const describeBox = (box: DOMRectReadOnly) => ({
				x: box.x,
				y: box.y,
				width: box.width,
				height: box.height,
				left: box.left,
				right: box.right,
				top: box.top,
				bottom: box.bottom,
			})

			return {
				x,
				y,
				allocation: { left, right, top, bottom },
				container: containerBox ? describeBox(containerBox) : null,
				clipPath,
				header: describeBox(header),
				clip: describeBox(clip),
				plane: describeBox(plane),
				button: button ? describeBox(button) : null,
				context: {
					route: location.pathname,
					width: innerWidth,
					direction: rtl ? 'rtl' : 'ltr',
					column: element.closest('th')?.getAttribute('data-table-column'),
					blockFraction,
					atEnd,
				},
				scrollLeft: element.closest('[data-header-controls]')?.scrollLeft,
				scrollTop: element.closest('[data-header-controls]')?.scrollTop,
				hit: document.elementFromPoint(x, y)?.getAttribute('class'),
				hitTag: document.elementFromPoint(x, y)?.tagName,
				visible:
					visibleRight - visibleLeft > 2 &&
					bottom > top &&
					(!roundedClip || (!!containerBox && y >= containerBox.top && y < containerBox.bottom)),
				exactLabel: document.elementFromPoint(x, y) === element,
				outsideControl:
					!!button &&
					(x < button.left || x >= button.right || y < button.top || y >= button.bottom),
				coversAllocation:
					plane.left <= left &&
					plane.right >= right &&
					plane.top <= top &&
					plane.bottom >= bottom &&
					clip.left <= left &&
					clip.right >= right &&
					clip.top <= top &&
					clip.bottom >= bottom &&
					getComputedStyle(clippingOwner).overflowX === 'clip' &&
					getComputedStyle(clippingOwner).overflowY === 'clip',
			}
		},
		{ blockFraction, atEnd },
	)
}

async function expectTitlePoint(label: Locator, block: number, atEnd: boolean) {
	let point = await titlePoint(label, block, atEnd)
	const observation = { type: 'title-hit-state', description: JSON.stringify(point) }

	test.info().annotations.push(observation)
	await expect
		.poll(async () => {
			point = await titlePoint(label, block, atEnd)
			observation.description = JSON.stringify(point)

			return {
				visible: point.visible,
				exactLabel: point.exactLabel,
				outsideControl: point.outsideControl,
				coversAllocation: point.coversAllocation,
			}
		})
		.toEqual({ visible: true, exactLabel: true, outsideControl: true, coversAllocation: true })

	return point
}

for (const javaScriptEnabled of [true, false]) {
	for (const reducedMotion of ['no-preference', 'reduce'] as const) {
		test.describe(`title controls, scripts ${javaScriptEnabled}, motion ${reducedMotion}`, () => {
			test.use({ javaScriptEnabled, reducedMotion })
			test('title regions spanning multiple rows cover the full native cell', async ({ page }) => {
				for (const width of [1280, 390]) {
					await page.setViewportSize({ width, height: 900 })

					for (const route of ['/__table-title-controls', '/__table-title-controls-deep']) {
						await page.goto(route)

						if (javaScriptEnabled) {
							await expect(page.locator('astro-island')).not.toHaveAttribute('ssr')
						}

						const viewport = page.locator('[data-header-controls]')

						for (const direction of ['ltr', 'rtl']) {
							await viewport.evaluate((element, direction) => {
								element.setAttribute('dir', direction)
							}, direction)

							for (const column of ['name', 'custom']) {
								await viewport.evaluate(
									(element, { column, direction }) => {
										const maximum = element.scrollWidth - element.clientWidth

										element.scrollTo({
											left: column === 'name' ? 0 : maximum * (direction === 'rtl' ? -1 : 1),
											behavior: 'instant',
										})
									},
									{ column, direction },
								)
								const header = viewport.locator(`th[data-table-column="${column}"]`)

								await expect(header).toHaveJSProperty('rowSpan', 2)
								const label = header.locator('.title-hit-area')
								const button = header.locator('.title-control')
								const panel = page.locator('#header-panel-name')

								for (const [block, atEnd] of [
									[0.1, false],
									[0.1, true],
									[0.9, false],
									[0.9, true],
								] as const) {
									const point = await expectTitlePoint(label, block, atEnd)

									if (javaScriptEnabled) {
										await observeTrustedClick(button)
									}

									await page.mouse.move(point.x, point.y)
									await page.mouse.down()

									try {
										expect(
											await label.evaluate(
												element =>
													element instanceof HTMLLabelElement &&
													element.control?.matches(':active'),
											),
										).toBe(true)
									} finally {
										await page.mouse.up()
									}

									if (javaScriptEnabled) {
										await expect(button).toHaveAttribute('data-trusted-clicks', '1')
									}

									await expect
										.poll(() => panel.evaluate(element => element.matches(':popover-open')))
										.toBe(true)
									await page.keyboard.press('Escape')
									await expect
										.poll(() => panel.evaluate(element => element.matches(':popover-open')))
										.toBe(false)
									await header.locator('.title-control').evaluate(element => {
										if (element instanceof HTMLElement) {
											element.blur()
										}
									})
									await page.mouse.move(1, 1)
								}
							}
						}
					}
				}
			})
			test('companion targets preserve activation, clipping and adjacent actions', async ({
				page,
			}) => {
				const clippedSamples = [0, 0, 0, 0]

				for (const width of [1600, 1280, 390]) {
					await page.setViewportSize({ width, height: 900 })

					for (const route of ['/__table-title-controls', '/__table-title-controls-deep']) {
						await page.goto(route)

						if (javaScriptEnabled) {
							await expect(page.locator('astro-island')).not.toHaveAttribute('ssr')
						}

						const viewport = page.locator('[data-header-controls]')
						const table = route.endsWith('-deep')
							? viewport.locator(
									':scope > [data-sticky-container] > [data-sticky-container] > [data-sticky-container] > [data-sticky-container] > .container',
								)
							: viewport.locator(':scope > .container')

						await expect(table).toHaveCount(1)

						for (const direction of ['ltr', 'rtl']) {
							await viewport.evaluate((element, direction) => {
								element.setAttribute('dir', direction)
							}, direction)

							for (const left of [0, 350, 900]) {
								await viewport.evaluate(
									(element, left) => element.scrollTo({ left, behavior: 'instant' }),
									direction === 'rtl' ? -left : left,
								)
								const header = viewport.locator('th[data-table-column="attributes"]')
								const scroll = await viewport.evaluate(element => ({
									actual: element.scrollLeft,
									maximum: element.scrollWidth - element.clientWidth,
								}))
								const requested = direction === 'rtl' ? -left : left
								const expected = Math.min(left, scroll.maximum) * (direction === 'rtl' ? -1 : 1)

								test.info().annotations.push({
									type: 'actual-title-scroll-pose',
									description: JSON.stringify({ width, route, direction, requested, ...scroll }),
								})
								expect(Math.abs(scroll.actual - expected)).toBeLessThanOrEqual(1)
								const label = header.locator('.title-hit-area')
								const button = header.locator('.title-control')

								expect(
									await viewport.evaluate(element => element.scrollHeight - element.clientHeight),
								).toBe(0)
								await expect(button).toHaveAccessibleName('Attributes')
								const direct = await button.evaluate(element => {
									const box = element.getBoundingClientRect()
									const viewport = element
										.closest('[data-header-controls]')
										?.getBoundingClientRect()
									const x = box.left + box.width / 2,
										y = box.top + box.height / 2

									return {
										visible:
											!!viewport &&
											x >= Math.max(viewport.left, 0) &&
											x < Math.min(viewport.right, innerWidth) &&
											y >= Math.max(viewport.top, 0) &&
											y < Math.min(viewport.bottom, innerHeight),
										nativeHit: element.contains(document.elementFromPoint(x, y)),
									}
								})

								if (direct.visible) {
									expect(direct.nativeHit).toBe(true)
								}

								const target = page.locator('#header-panel-attributes')

								for (const [block, atEnd] of [
									[0.1, false],
									[0.1, true],
									[0.9, false],
									[0.9, true],
								] as const) {
									const point = await expectTitlePoint(label, block, atEnd)

									const previousSort = await header.getAttribute('aria-sort')
									const previousExpansion = await header.getAttribute('data-expanded')

									if (javaScriptEnabled) {
										await observeTrustedClick(button)
									}

									if (javaScriptEnabled) {
										await label.evaluate(element => {
											element.removeAttribute('data-trusted-pointer-down')
											element.addEventListener(
												'pointerdown',
												event => {
													element.setAttribute(
														'data-trusted-pointer-down',
														String(event.isTrusted && event.target === element),
													)
												},
												{ once: true },
											)
										})
									}

									await page.mouse.move(point.x, point.y)
									await page.mouse.down()

									try {
										if (javaScriptEnabled) {
											await expect(label).toHaveAttribute('data-trusted-pointer-down', 'true')
										}

										await button.evaluate(element =>
											Promise.all(
												element
													.getAnimations({ subtree: true })
													.filter(
														animation =>
															animation.timeline instanceof DocumentTimeline &&
															!!animation.effect &&
															Number.isFinite(animation.effect.getComputedTiming().endTime),
													)
													.map(animation => animation.finished.catch(() => {})),
											),
										)
										expect(
											await label.evaluate(
												(element, p) =>
													element instanceof HTMLLabelElement &&
													document.elementFromPoint(p.x, p.y) === element &&
													element.control?.matches(':active'),
												point,
											),
										).toBe(true)
									} finally {
										await page.mouse.up()
									}

									if (javaScriptEnabled) {
										await expect(button).toHaveAttribute('data-trusted-clicks', '1')
									}

									await expect
										.poll(() => target.evaluate(element => element.matches(':popover-open')))
										.toBe(true)
									await expect(header).toHaveAttribute('aria-sort', previousSort ?? '')
									await expect(header).toHaveAttribute('data-expanded', previousExpansion ?? '')
									await page.keyboard.press('Escape')
									await expect
										.poll(() => target.evaluate(element => element.matches(':popover-open')))
										.toBe(false)
									await button.evaluate(element => {
										if (element instanceof HTMLElement) {
											element.blur()
										}
									})
									await page.mouse.move(1, 1)
								}
								const clipping = await label.evaluate(element => {
									const area = element.getBoundingClientRect()
									const clippingOwner = element
										.closest('th')
										?.querySelector(':scope > .header-cell-content')
									const clip = clippingOwner?.getBoundingClientRect()
									const viewportOwner = element.closest('[data-header-controls]')
									const viewport = viewportOwner?.getBoundingClientRect()

									if (!clip || !viewport || !clippingOwner || !viewportOwner) {
										throw new Error('Missing title clipping owners')
									}

									const x =
										(Math.max(area.left, clip.left, viewport.left, 0) +
											Math.min(area.right, clip.right, viewport.right, innerWidth)) /
										2
									const y =
										(Math.max(area.top, clip.top, viewport.top, 0) +
											Math.min(area.bottom, clip.bottom, viewport.bottom, innerHeight)) /
										2

									const describeBox = (box: DOMRectReadOnly) => ({
										left: box.left, right: box.right, top: box.top, bottom: box.bottom,
									})
									const style = getComputedStyle(clippingOwner)
									const samples = [
										{ edge: 'left', x: clip.left - 1, y },
										{ edge: 'right', x: clip.right + 1, y },
										{ edge: 'top', x, y: clip.top - 1 },
										{ edge: 'bottom', x, y: clip.bottom + 1 },
									].map(({ edge, x, y }) => {
										const hit = document.elementFromPoint(x, y)

										return {
										edge, x, y,
										exercised:
											x >= 0 &&
											x < innerWidth &&
											x >= area.left &&
											x < area.right &&
											y >= 0 &&
											y < innerHeight &&
											y >= area.top &&
											y < area.bottom,
										escaped: hit === element,
										hit: hit ? { tag: hit.tagName, id: hit.id, class: hit.getAttribute('class') } : null,
										}
									})

									return {
										samples, area: describeBox(area), clip: describeBox(clip), viewport: describeBox(viewport),
										overflowX: style.overflowX, overflowY: style.overflowY,
										scrollLeft: viewportOwner.scrollLeft, scrollTop: viewportOwner.scrollTop,
									}
								})

								test.info().annotations.push({
									type: 'outside-title-clipping',
									description: JSON.stringify({ width, route, direction, scroll, ...clipping }),
								})

								for (const [edge, sample] of clipping.samples.entries()) {
									if (sample.exercised) {
										clippedSamples[edge] = (clippedSamples[edge] ?? 0) + 1
										expect(sample.escaped).toBe(false)
									}
								}
							}
						}
					}
				}

				for (const count of clippedSamples) {
					expect(count).toBeGreaterThan(0)
				}
			})
		})
	}
}

test('opt-in sort planes and custom header actions remain independently usable', async ({
	page,
}) => {
	for (const width of [1280, 390]) {
		await page.setViewportSize({ width, height: 900 })

		for (const route of ['/__table-title-controls', '/__table-title-controls-deep']) {
			await page.goto(route)
			await expect(page.locator('astro-island')).not.toHaveAttribute('ssr')
			const viewport = page.locator('[data-header-controls]')

			for (const direction of ['ltr', 'rtl']) {
				await viewport.evaluate((element, direction) => {
					element.setAttribute('dir', direction)
					const maximum = element.scrollWidth - element.clientWidth

					element.scrollTo({ left: maximum * (direction === 'rtl' ? -1 : 1), behavior: 'instant' })
				}, direction)
				const header = viewport.locator('th[data-table-column="custom"]')
				const sortPlane = header.locator('.sort-hit-area')
				const previousSort = await header.getAttribute('aria-sort')
				const count = page.getByRole('status', { name: 'Extra action count' })
				const previousCount = Number(await count.textContent())
				const point = await sortPlane.evaluate(element => {
					const header = element.closest('th')?.getBoundingClientRect()
					const title = element.closest('.header-title')?.getBoundingClientRect()

					if (!header || !title || !(element instanceof HTMLLabelElement) || !element.control) {
						throw new Error('Missing native sort allocation')
					}

					const rtl = getComputedStyle(element).direction === 'rtl'
					const x = rtl ? title.left - 1 : title.right + 1
					const y = header.top + 1
					const control = element.control.getBoundingClientRect()

					return {
						x,
						y,
						exact: document.elementFromPoint(x, y) === element,
						outsideControl:
							x < control.left || x >= control.right || y < control.top || y >= control.bottom,
					}
				})

				expect(point.exact && point.outsideControl).toBe(true)
				await sortPlane.evaluate(element => {
					for (const type of ['pointerdown', 'mousedown']) {
						element.removeAttribute(`data-sort-${type}`)
						document.addEventListener(type, event => {
							const target = event.target

							element.setAttribute(`data-sort-${type}`, JSON.stringify({
								trusted: event.isTrusted,
								target: target instanceof Element ? { tag: target.tagName, id: target.id, class: target.getAttribute('class') } : null,
							}))
						}, { capture: true, once: true })
					}
				})
				const observePress = async (phase: string) => {
					const state = await sortPlane.evaluate((element, point) => {
						const control = element instanceof HTMLLabelElement ? element.control : null
						const viewport = element.closest('[data-header-controls]')
						const hit = document.elementFromPoint(point.x, point.y)
						const describeBox = (box: DOMRectReadOnly) => ({
							left: box.left, right: box.right, top: box.top, bottom: box.bottom,
						})

						return {
							point,
							plane: describeBox(element.getBoundingClientRect()),
							control: control ? {
								id: control.id,
								disabled: control.matches(':disabled, [aria-disabled="true"]'),
								active: control.matches(':active'),
								box: describeBox(control.getBoundingClientRect()),
							} : null,
							hit: hit ? { tag: hit.tagName, id: hit.id, class: hit.getAttribute('class') } : null,
							scrollLeft: viewport?.scrollLeft,
							scrollTop: viewport?.scrollTop,
							pointerdown: element.getAttribute('data-sort-pointerdown'),
							mousedown: element.getAttribute('data-sort-mousedown'),
							openPanels: [...document.querySelectorAll('.title-panel')].filter(node => node.matches(':popover-open')).map(node => node.id),
						}
						}, point)

						test.info().annotations.push({
							type: 'sort-plane-press',
							description: JSON.stringify({ width, route, direction, phase, ...state }),
						})
				}

				await observePress('before-move')
				await page.mouse.move(point.x, point.y)
				await observePress('after-move')
				await page.mouse.down()

				try {
					await observePress('held')
					expect(
						await sortPlane.evaluate(
							element => element instanceof HTMLLabelElement && element.control?.matches(':active'),
						),
					).toBe(true)
				} finally {
					await page.mouse.up()
				}

				await expect.poll(() => header.getAttribute('aria-sort')).not.toBe(previousSort)
				const sorted = await header.getAttribute('aria-sort')

				await expect(count).toHaveText(String(previousCount))
				await header.getByRole('button', { name: 'Custom action', exact: true }).click()
				await expect(count).toHaveText(String(previousCount + 1))
				await expect(header).toHaveAttribute('aria-sort', sorted ?? '')
				await expect
					.poll(() =>
						page
							.locator('.title-panel')
							.evaluateAll(elements => elements.some(element => element.matches(':popover-open'))),
					)
					.toBe(false)
			}
		}
	}
})

test('native and companion hover regions retain one popover through transfers', async ({
	page,
}) => {
	await page.goto('/__table-title-controls')
	await expect(page.locator('astro-island')).not.toHaveAttribute('ssr')
	const header = page.locator('th[data-table-column="name"]')
	const button = header.locator('.title-control')
	const label = header.locator('.title-hit-area')
	const target = page.locator('#header-panel-name')

	await target.evaluate(element => {
		element.setAttribute('data-closes', '0')
		element.addEventListener('beforetoggle', event => {
			if (event instanceof ToggleEvent && event.newState === 'closed') {
				element.setAttribute('data-closes', String(Number(element.getAttribute('data-closes')) + 1))
			}
		})
	})
	await button.hover()
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(true)
	const p = await titlePoint(label, 0.1)

	expect(p.visible && p.exactLabel && p.outsideControl).toBe(true)
	await page.mouse.move(p.x, p.y)
	await expect.poll(() => label.evaluate(element => element.matches(':hover'))).toBe(true)
	await page.waitForTimeout(interestDelayMs.end * 3)
	await expect(target).toHaveAttribute('data-closes', '0')
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(true)
	await target.getByRole('button').hover()
	await page.waitForTimeout(interestDelayMs.end * 3)
	await expect(target).toHaveAttribute('data-closes', '0')
	await page.mouse.move(1, 1)
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(false)
	await page.mouse.move(p.x, p.y)
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(true)
	const previousCloses = await target.getAttribute('data-closes')

	await button.hover()
	await page.waitForTimeout(interestDelayMs.end * 3)
	await expect(target).toHaveAttribute('data-closes', previousCloses ?? '')
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(true)
	await page.keyboard.press('Escape')
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(false)
})

test('companion hover respects the associated control availability', async ({ page }) => {
	await page.goto('/__table-title-controls')
	await expect(page.locator('astro-island')).not.toHaveAttribute('ssr')
	const header = page.locator('th[data-table-column="name"]')
	const button = header.locator('.title-control')
	const label = header.locator('.title-hit-area')
	const targets = page.locator('.title-panel')

	for (const state of ['disabled', 'hidden', 'orphan', 'different-target'] as const) {
		await test.step(`unavailable companion: ${state}`, async () => {
			await page.mouse.move(1, 1)
			await button.evaluate((element, state) => {
				if (!(element instanceof HTMLButtonElement)) {
					throw new Error('Missing native title button')
				}

				element.disabled = state === 'disabled'
				element.hidden = state === 'hidden'
				element.setAttribute(
					'popovertarget',
					state === 'different-target' ? 'header-panel-custom' : 'header-panel-name',
				)
			}, state)
			await label.evaluate((element, state) => {
				if (!(element instanceof HTMLLabelElement)) {
					throw new Error('Missing companion label')
				}

				const control = element.closest('th')?.querySelector('button.title-control')

				if (!control) {
					throw new Error('Missing associated control')
				}

				element.htmlFor = state === 'orphan' ? 'missing-title-control' : control.id
			}, state)

			if (state === 'hidden') {
				await expect(button).toBeHidden()
			} else {
				await expect(button).toBeVisible()
			}

			const point = await titlePoint(label, 0.1)

			expect(point.exactLabel).toBe(true)
			await page.mouse.move(point.x, point.y)
			await expect.poll(() => label.evaluate(element => element.matches(':hover'))).toBe(true)
			await page.waitForTimeout(interestDelayMs.start * 3)
			await expect
				.poll(() =>
					targets.evaluateAll(elements =>
						elements.every(element => !element.matches(':popover-open')),
					),
				)
				.toBe(true)
		})
	}
})

test('different title controls retain their shared popover through companion transfers', async ({
	page,
}) => {
	await page.goto('/__table-title-controls')
	await expect(page.locator('astro-island')).not.toHaveAttribute('ssr')
	const viewport = page.locator('[data-header-controls]')
	const attributes = viewport.locator('th[data-table-column="attributes"]')

	await attributes.getByRole('button', { name: 'Collapse', exact: true }).click()
	await expect(attributes).not.toHaveAttribute('data-expanded')
	await page.mouse.move(1, 1)
	await expect(viewport.locator('.container')).toHaveCSS('contain', 'none')
	const first = viewport.locator('th[data-table-column="name"] .title-control')
	const second = viewport.locator('th[data-table-column="custom"] .title-control')
	const companion = viewport.locator('th[data-table-column="custom"] .title-hit-area')
	const target = page.locator('#header-panel-name')

	await expect(first).toHaveAttribute('popovertarget', 'header-panel-name')
	await expect(second).toHaveAttribute('popovertarget', 'header-panel-name')
	await target.evaluate(element => {
		element.setAttribute('data-closes', '0')
		element.addEventListener('beforetoggle', event => {
			if (event instanceof ToggleEvent && event.newState === 'closed') {
				element.setAttribute('data-closes', String(Number(element.getAttribute('data-closes')) + 1))
			}
		})
	})
	const nativePoint = await first.evaluate(element => {
		const box = element.getBoundingClientRect(),
			x = box.left + box.width / 2,
			y = box.top + box.height / 2

		return { x, y, hit: element.contains(document.elementFromPoint(x, y)) }
	})

	expect(nativePoint.hit).toBe(true)
	await page.mouse.move(nativePoint.x, nativePoint.y)
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(true)
	await expect
		.poll(async () => {
			const p = await titlePoint(companion, 0.1)

			return p.visible && p.exactLabel && p.outsideControl && p.coversAllocation
		})
		.toBe(true)
	const point = await titlePoint(companion, 0.1)

	await page.mouse.move(point.x, point.y)
	await expect.poll(() => companion.evaluate(element => element.matches(':hover'))).toBe(true)
	await page.waitForTimeout(interestDelayMs.end * 3)
	await expect(target).toHaveAttribute('data-closes', '0')
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(true)
	await page.keyboard.press('Escape')
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(false)
	await page.mouse.move(1, 1)
	await attributes.getByRole('button', { name: 'Expand', exact: true }).click()
	await expect(attributes).toHaveAttribute('data-expanded', '')
	await expect(viewport.locator('.container')).toHaveCSS('contain', 'none')
	const restored = await titlePoint(
		viewport.locator('th[data-table-column="name"] .title-hit-area'),
		0.9,
	)

	expect(
		restored.visible && restored.exactLabel && restored.outsideControl && restored.coversAllocation,
	).toBe(true)
})

test('keyboard navigation retains the original title and sort controls', async ({
	page,
	browserName,
}) => {
	await page.goto('/__table-title-controls')
	await expect(page.locator('astro-island')).not.toHaveAttribute('ssr')
	const name = page.locator('th[data-table-column="name"] .title-control')
	const attributes = page.locator('th[data-table-column="attributes"] .title-control')
	const sort = page.getByRole('button', { name: 'Sort by Attributes', exact: true })
	const target = page.locator('#header-panel-attributes')

	await expect(name).toHaveAccessibleName('Wallet')
	await expect(attributes).toHaveAccessibleName('Attributes')
	await name.focus()
	await page.keyboard.press('Escape')
	await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab')
	await expect(attributes).toBeFocused()
	await page.keyboard.press('Escape')
	await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab')
	await expect(sort).toBeFocused()
	await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab')
	await expect(attributes).toBeFocused()
	await attributes.evaluate(element => {
		element.setAttribute('data-trusted-keys', '0')
		element.addEventListener('click', event => {
			if (event.isTrusted) {
				element.setAttribute(
					'data-trusted-keys',
					String(Number(element.getAttribute('data-trusted-keys')) + 1),
				)
			}
		})
	})

	for (const [index, key] of ['Enter', 'Space'].entries()) {
		await page.keyboard.press('Escape')
		await page.keyboard.press(key)
		await expect(attributes).toHaveAttribute('data-trusted-keys', String(index + 1))
		await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(true)
	}
})

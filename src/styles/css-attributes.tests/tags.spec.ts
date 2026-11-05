import type { Locator, Page, TestInfo } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

type Sizing = 'current' | 'unclamped'

async function applySizing(page: Page, sizing: Sizing) {
	if (sizing === 'unclamped') {
		await page.addStyleTag({
			content:
				'[data-tag]:is(button, a[href]), :is(button, a[href]):has(> [data-tag]) { min-inline-size: 0 !important; min-block-size: 0 !important; }',
		})
	}
}

async function load(page: Page, hydrated: boolean, sizing: Sizing) {
	await page.goto('/__tag-composition')
	await applySizing(page, sizing)

	if (hydrated) {
		await expect(page.locator('astro-island[component-url*="TagComposition"]')).not.toHaveAttribute(
			'ssr',
		)
	}
}

async function probe(target: Locator) {
	return target.evaluate(element => {
		const selector = 'button, a[href], summary, input, select, textarea, [role="button"]'
		const owner = (x: number, y: number) => document.elementFromPoint(x, y)?.closest(selector)
		const box = element.getBoundingClientRect()
		const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
		const points = (start: number, end: number) => [...new Set([start, (start + end) / 2, end])]
		const describe = (control: Element | null | undefined) =>
			control
				? {
						tag: control.tagName,
						id: control.id,
						name: control.getAttribute('aria-label') ?? control.textContent?.trim().slice(0, 80),
					}
				: null
		const bounds = (control: Element) => {
			const rect = control.getBoundingClientRect()

			return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
		}
		// These bounded native samples are evidence for review, not complete conformance proof.
		// https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
		const size = 24
		const square = (control: Element) => {
			const rect = control.getBoundingClientRect()

			if (rect.width < size || rect.height < size) {
				return false
			}

			return points(rect.x + size / 2, rect.right - size / 2).some(x =>
				points(rect.y + size / 2, rect.bottom - size / 2).some(y =>
					[-11.99, -6, 0, 6, 11.99].every(dx =>
						[-11.99, -6, 0, 6, 11.99].every(dy => owner(x + dx, y + dy) === control),
					),
				),
			)
		}
		const circleConflicts = []
		let emptyCircleSamples = 0
		let outsideViewportSamples = 0

		for (let dx = -12; dx <= 12; dx++) {
			for (let dy = -12; dy <= 12; dy++) {
				if (dx * dx + dy * dy >= 144) {
					continue
				}

				const x = center.x + dx,
					y = center.y + dy

				if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) {
					outsideViewportSamples++
				}

				const hit = owner(x, y)

				if (!hit) {
					emptyCircleSamples++
				} else if (hit !== element) {
					circleConflicts.push({ x, y, owner: describe(hit) })
				}
			}
		}
		const neighbors = [...document.querySelectorAll(selector)]
			.filter(other => {
				if (other === element || !other.getClientRects().length) {
					return false
				}

				const rect = other.getBoundingClientRect()

				return (
					rect.right >= center.x - size &&
					rect.x <= center.x + size &&
					rect.bottom >= center.y - size &&
					rect.y <= center.y + size
				)
			})
			.map(other => {
				const rect = other.getBoundingClientRect()
				const hitSamples = points(rect.x + 0.5, rect.right - 0.5).flatMap(x =>
					points(rect.y + 0.5, rect.bottom - 0.5).map(y => ({
						x,
						y,
						owns: owner(x, y) === other,
						owner: describe(owner(x, y)),
					})),
				)

				return {
					control: describe(other),
					box: bounds(other),
					hitSamples,
					keyboardBehind: other.matches(
						'[data-tooltip-placement="behind"] > [data-tooltip-trigger]',
					),
					inactive: other.matches(':disabled') || other.closest('[inert]') !== null,
					centerDistance: Math.hypot(
						center.x - rect.x - rect.width / 2,
						center.y - rect.y - rect.height / 2,
					),
					sampledSquare: square(other),
				}
			})
		const competitors = neighbors.filter(
			other =>
				!other.keyboardBehind &&
				!other.inactive &&
				other.hitSamples.some(sample => sample.owns) &&
				other.centerDistance < size &&
				!other.sampledSquare,
		)
		const unresolvedRegions = neighbors.filter(
			other =>
				!other.keyboardBehind && !other.inactive && !other.hitSamples.some(sample => sample.owns),
		)
		let point: { x: number; y: number } | null = null

		if (owner(center.x, center.y) === element) {
			point = center
		}

		for (let x = Math.max(0, box.x) + 0.5; !point && x < Math.min(innerWidth, box.right); x++) {
			for (let y = Math.max(0, box.y) + 0.5; !point && y < Math.min(innerHeight, box.bottom); y++) {
				if (owner(x, y) === element) {
					point = { x, y }
				}
			}
		}
		const style = getComputedStyle(element)

		return {
			sampleTime: performance.now(),
			fontStatus: document.fonts.status,
			control: describe(element),
			box: bounds(element),
			viewport: { width: innerWidth, height: innerHeight },
			fontSize: style.fontSize,
			padding: style.padding,
			minInlineSize: style.minInlineSize,
			minBlockSize: style.minBlockSize,
			sampledSquare: square(element),
			sampledSpacing:
				circleConflicts.length === 0 && competitors.length === 0 && outsideViewportSamples === 0,
			point,
			neighbors,
			circleConflicts,
			emptyCircleSamples,
			outsideViewportSamples,
			requiresGeometryReview:
				unresolvedRegions.length > 0 ||
				Math.min(box.width, box.height) <= size + 1 ||
				competitors.some(other => Math.abs(other.centerDistance - size) <= 1),
			scrollOwners: (() => {
				const rows = []

				for (let parent = element.parentElement; parent; parent = parent.parentElement) {
					if (
						parent.scrollHeight > parent.clientHeight ||
						parent.scrollWidth > parent.clientWidth
					) {
						rows.push({
							tag: parent.tagName,
							scrollTop: parent.scrollTop,
							scrollLeft: parent.scrollLeft,
							width: parent.clientWidth,
							height: parent.clientHeight,
						})
					}
				}

				return rows
			})(),
			method:
				'Bounded square/circle/neighbor samples can miss narrow regions; inspect raw geometry and captures before a sizing decision.',
		}
	})
}

async function reachable(target: Locator) {
	const result = await probe(target)

	expect(result.point, 'The intended native control must receive real pointer input').not.toBeNull()

	if (!result.point) {
		throw new Error('Native control has no reachable hit region')
	}

	return result.point
}

async function tabTo(page: Page, target: Locator) {
	const count = await page
		.locator('a[href], button, input, select, textarea, [tabindex]')
		.evaluateAll(
			elements =>
				elements.filter(
					element =>
						element instanceof HTMLElement &&
						element.tabIndex >= 0 &&
						element.getClientRects().length,
				).length,
		)

	if (
		await target.evaluate(
			element => document.activeElement === element && !element.matches(':focus-visible'),
		)
	) {
		await page.keyboard.press('Shift+Tab')
	}

	for (let index = 0; index <= count; index++) {
		if (await target.evaluate(element => document.activeElement === element)) {
			break
		}

		await page.keyboard.press('Tab')
	}
	await expect(target).toBeFocused()
	expect(await target.evaluate(element => element.matches(':focus-visible'))).toBe(true)
}

async function popoverFor(page: Page, button: Locator) {
	const id = await button.getAttribute('popovertarget')

	if (!id) {
		throw new Error('Missing native popover target')
	}

	return page.locator(`[id="${id}"]`)
}

async function tooltip(page: Page, kind: 'native' | 'wrapper') {
	const section = page.locator(`[data-tag-case="${kind}"]`)
	const button = section.locator('[popovertarget]')

	return { section, button, target: await popoverFor(page, button) }
}

async function outsidePoint(page: Page) {
	const point = await page.evaluate(() => {
		for (let y = 8; y < innerHeight; y += 16) {
			for (let x = 8; x < innerWidth; x += 16) {
				const hit = document.elementFromPoint(x, y)

				if (
					hit &&
					!hit.closest(
						':popover-open, button, a[href], summary, input, select, textarea, [role="button"]',
					)
				) {
					return { x, y }
				}
			}
		}

		return null
	})

	if (!point) {
		throw new Error('No reachable noninteractive outside region')
	}

	return point
}

async function expectOpen(target: Locator) {
	await expect
		.poll(() =>
			target.evaluate(element => {
				const style = getComputedStyle(element)
				const box = element.getBoundingClientRect()

				return (
					element.matches(':popover-open') &&
					style.visibility !== 'hidden' &&
					style.display !== 'none' &&
					Number(style.opacity) > 0 &&
					box.width > 0 &&
					box.height > 0 &&
					box.right > 0 &&
					box.x < innerWidth &&
					box.bottom > 0 &&
					box.y < innerHeight
				)
			}),
		)
		.toBe(true)
}

async function keyboardShowAndDismiss(page: Page, button: Locator) {
	const target = await popoverFor(page, button)

	await tabTo(page, button)
	await page.keyboard.press('Enter')
	await expectOpen(target)
	await page.keyboard.press('Enter')
	await expectOpen(target)
	const outside = await outsidePoint(page)

	await page.mouse.click(outside.x, outside.y)
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(false)
}

async function hoverAndKeyboard(page: Page, button: Locator, hover: Locator) {
	const target = await popoverFor(page, button)
	const point = await reachable(hover)

	await page.mouse.move(0, 0)
	await page.mouse.move(point.x, point.y)
	await expectOpen(target)
	await page.mouse.move(0, 0)
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(false)
	await keyboardShowAndDismiss(page, button)
}

async function recordConsumer(scope: Locator, info: TestInfo, name: string, sizing: Sizing) {
	const tags = await scope.locator('[data-tag]:visible').evaluateAll(elements =>
		elements.map(element => {
			const box = element.getBoundingClientRect()

			return {
				text: element.textContent,
				tag: element.tagName,
				x: box.x,
				y: box.y,
				width: box.width,
				height: box.height,
			}
		}),
	)
	const controls = scope.locator(
		'button[data-tag]:visible:not(:disabled), a[data-tag][href]:visible, button:has(> [data-tag]):visible:not(:disabled), a[href]:has(> [data-tag]):visible',
	)
	const targets = await Promise.all((await controls.all()).map(probe))

	await info.attach(`${name}-target-neighbors`, {
		body: JSON.stringify({
			sizing,
			tags,
			targets,
			limits:
				'Viewport capture and bounded samples only; off-viewport/narrow/borderline regions need inspection. Fixture spacing does not qualify this consumer.',
		}),
		contentType: 'application/json',
	})
	await info.attach(`${name}-capture`, {
		body: await scope.page().screenshot(),
		contentType: 'image/png',
	})

	return targets
}

async function walletTrigger(page: Page, sizing: Sizing, hydrated = true) {
	await page.goto('/metamask/')
	await applySizing(page, sizing)
	const overview = page.locator('.wallet-overview')

	if (hydrated) {
		await expect(page.locator('astro-island[ssr]:has(.wallet-overview)')).toHaveCount(0)
	}

	return {
		overview,
		trigger: overview
			.locator('[data-tooltip-trigger]:visible')
			.filter({ has: page.locator('[data-tag]') })
			.first(),
	}
}

async function trustedTouch(page: Page, button: Locator, expectedOpen: boolean | null) {
	await button.evaluate(button =>
		button.addEventListener(
			'pointerdown',
			event => {
				if (!(event instanceof PointerEvent)) {
					throw new Error('Missing pointer input')
				}

				const target = document.getElementById(button.getAttribute('popovertarget') ?? '')

				button.setAttribute(
					'data-touch-down',
					JSON.stringify({
						trusted: event.isTrusted,
						type: event.pointerType,
						open: target?.matches(':popover-open') ?? null,
					}),
				)
			},
			{ capture: true },
		),
	)
	const point = await reachable(button)

	await page.touchscreen.tap(point.x, point.y)
	await expect(button).toHaveAttribute(
		'data-touch-down',
		JSON.stringify({ trusted: true, type: 'touch', open: expectedOpen }),
	)
}

async function touchShowAndDismiss(page: Page, button: Locator) {
	const target = await popoverFor(page, button)

	await trustedTouch(page, button, false)
	await expectOpen(target)
	const outside = await outsidePoint(page)

	await page.touchscreen.tap(outside.x, outside.y)
	await expect.poll(() => target.evaluate(element => element.matches(':popover-open'))).toBe(false)
}

async function eipFilter(page: Page, sizing: Sizing) {
	await page.goto('/wallet/7702/')
	await applySizing(page, sizing)
	await expect(page.locator('astro-island[ssr]:has([data-tag])')).toHaveCount(0)
	const filter = page.locator('button[data-tag~="eoa"]:visible:not(:disabled)').first()

	await filter.scrollIntoViewIfNeeded()

	return { filter, state: page.locator('[data-filter-choice="accountType-eoa"] input').first() }
}

for (const theme of ['light', 'dark'] as const) {
	for (const width of [375, 1440]) {
		for (const sizing of ['current', 'unclamped'] as const) {
			test.describe(`${theme} tags at ${width}, ${sizing}`, () => {
				test.use({ colorScheme: theme, viewport: { width, height: 900 } })

				test('passive labels remain compact and native targets have usable hit area or spacing', async ({
					page,
				}, info) => {
					await load(page, true, sizing)
					await info.attach('tag-composition', {
						body: await page.locator('[data-tag-composition]').screenshot(),
						contentType: 'image/png',
					})
					const labels = page.locator('[data-tag-palette] [data-tag]')

					expect(await labels.count()).toBe(7)

					for (const label of await labels.all()) {
						expect(
							await label.evaluate(
								element => element.closest('button, a[href], [role="button"]') === null,
							),
						).toBe(true)
						expect(await label.evaluate(element => getComputedStyle(element).cursor)).not.toBe(
							'pointer',
						)
						const geometry = await label.evaluate(element => {
							const style = getComputedStyle(element)
							const canvas = document.createElement('canvas')

							canvas.width = canvas.height = 1
							const context = canvas.getContext('2d')

							if (!context) {
								throw new Error('Missing canvas color reader')
							}

							const luminance = (color: string) => {
								context.clearRect(0, 0, 1, 1)
								context.fillStyle = color
								context.fillRect(0, 0, 1, 1)
								const rgba = context.getImageData(0, 0, 1, 1).data

								if (rgba[3] !== 255) {
									throw new Error('Fixture tag colors must be opaque')
								}

								return [...rgba]
									.slice(0, 3)
									.map(value => value / 255)
									.map(value =>
										value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
									)
									.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
							}
							const foreground = luminance(style.color)
							const background = luminance(style.backgroundColor)

							return {
								contrast:
									(Math.max(foreground, background) + 0.05) /
									(Math.min(foreground, background) + 0.05),
								height: element.getBoundingClientRect().height,
								intrinsic: [
									style.lineHeight,
									style.paddingTop,
									style.paddingBottom,
									style.borderTopWidth,
									style.borderBottomWidth,
								].reduce((sum, value) => sum + Number.parseFloat(value), 0),
							}
						})

						expect(geometry.height).toBeLessThanOrEqual(geometry.intrinsic + 1)
						expect(geometry.contrast).toBeGreaterThanOrEqual(4.5)
					}
					const measurements = []

					for (const control of await page
						.locator(
							'[data-tag-case="direct"] button, [data-tag-case="native"] [data-tooltip-trigger], [data-tag-case="wrapper"] button[data-tag], [data-input-reference], [data-tag-outside]',
						)
						.all()) {
						const result = await probe(control)

						measurements.push({
							name: (await control.getAttribute('aria-label')) ?? (await control.innerText()),
							...result,
						})
					}
					await info.attach('native-target-geometry', {
						body: JSON.stringify(measurements),
						contentType: 'application/json',
					})

					for (const result of measurements) {
						expect(result.point, result.name).not.toBeNull()
						expect(
							result.sampledSquare || result.sampledSpacing,
							`${result.name}: bounded samples only; raw geometry review is required`,
						).toBe(true)
					}
				})

				test('sizing state records the shared input and tag controls', async ({ page }, info) => {
					await load(page, true, sizing)
					const measurements = await Promise.all(
						(await page.locator('[data-tag-composition] button').all()).map(probe),
					)

					await info.attach('tag-minimum-comparison', {
						body: JSON.stringify({
							sizing,
							fixtureScope: 'Separate sections and gap-6; not evidence for other consumers',
							measurements,
						}),
						contentType: 'application/json',
					})
				})

				test('direct filter pointer and keyboard activation each run once', async ({ page }) => {
					await load(page, true, sizing)
					const button = page.locator('[data-tag-case="direct"] button')
					const output = page.getByRole('status', { name: 'Direct filter count' })
					const point = await reachable(button)

					await page.mouse.click(point.x, point.y)
					await expect(output).toHaveText('1')
					await tabTo(page, button)
					await page.keyboard.press('Space')
					await expect(output).toHaveText('2')
					await page.keyboard.press('Enter')
					await expect(output).toHaveText('3')
				})

				for (const kind of ['native', 'wrapper'] as const) {
					test(`${kind} genuine hover, explicit show, keyboard and outside dismissal`, async ({
						page,
					}) => {
						await load(page, true, sizing)
						const { section, button } = await tooltip(page, kind)

						await hoverAndKeyboard(
							page,
							button,
							kind === 'native' ? button : section.locator('button[data-tag]'),
						)
					})
				}

				test('real wallet records neighbors and preserves native actions', async ({
					page,
				}, info) => {
					const { overview, trigger } = await walletTrigger(page, sizing)

					await recordConsumer(overview, info, 'wallet', sizing)
					const result = await probe(trigger)

					expect(result.point).not.toBeNull()
					expect(
						result.sampledSquare || result.sampledSpacing,
						'Sampled evidence only; inspect raw neighbors',
					).toBe(true)
					await hoverAndKeyboard(page, trigger, trigger)
				})

				test('actual EIP layout records current neighbors and filter actions', async ({
					page,
				}, info) => {
					const { filter, state } = await eipFilter(page, sizing)

					await recordConsumer(page.locator('main'), info, 'eip-layout', sizing)
					await expect(state).not.toBeChecked()
					const point = await reachable(filter)

					await page.mouse.click(point.x, point.y)
					await expect(state).toBeChecked()
					await tabTo(page, filter)
					await page.keyboard.press('Space')
					await expect(state).not.toBeChecked()
				})

				test.describe('touch', () => {
					test.use({ hasTouch: true })
					test('native show and foreground wrapper filtering retain separate actions', async ({
						page,
					}) => {
						await load(page, true, sizing)
						const native = await tooltip(page, 'native')

						await touchShowAndDismiss(page, native.button)
						const direct = page.locator('[data-tag-case="direct"] button')

						await trustedTouch(page, direct, null)
						await expect(page.getByRole('status', { name: 'Direct filter count' })).toHaveText('1')
						const wrapper = await tooltip(page, 'wrapper')

						await trustedTouch(page, wrapper.section.locator('button[data-tag]'), null)
						await expect(page.getByRole('status', { name: 'Wrapper filter count' })).toHaveText('1')
						await expect
							.poll(() => wrapper.target.evaluate(element => element.matches(':popover-open')))
							.toBe(false)
					})
					test('actual wallet and compact EIP layout keep native touch actions', async ({
						page,
					}, info) => {
						const { overview, trigger } = await walletTrigger(page, sizing)

						await recordConsumer(overview, info, 'wallet-touch', sizing)
						await touchShowAndDismiss(page, trigger)
						const { filter, state } = await eipFilter(page, sizing)

						await recordConsumer(page.locator('main'), info, 'eip-touch', sizing)
						await expect(state).not.toBeChecked()
						await trustedTouch(page, filter, null)
						await expect(state).toBeChecked()
					})
				})

				test.describe('without scripts', () => {
					test.use({ javaScriptEnabled: false })

					for (const kind of ['native', 'wrapper'] as const) {
						test(`${kind} keeps native show and dismissal`, async ({ page }) => {
							await load(page, false, sizing)
							const { button, target } = await tooltip(page, kind)

							await tabTo(page, button)
							await page.keyboard.press('Enter')
							await expectOpen(target)
							const outside = await reachable(page.locator('[data-tag-outside]'))

							await page.mouse.click(outside.x, outside.y)
							await expect
								.poll(() => target.evaluate(element => element.matches(':popover-open')))
								.toBe(false)
						})
					}
					test('actual wallet and EIP native fallback remains usable', async ({ page }, info) => {
						const { overview, trigger } = await walletTrigger(page, sizing, false)

						await recordConsumer(overview, info, 'wallet-no-script', sizing)
						await keyboardShowAndDismiss(page, trigger)
						await page.goto('/wallet/7702/')
						await applySizing(page, sizing)
						const source = page
							.locator('button[data-tooltip-trigger]:visible:has(> [data-tag])')
							.first()

						await source.scrollIntoViewIfNeeded()
						await recordConsumer(page.locator('main'), info, 'eip-no-script', sizing)
						await keyboardShowAndDismiss(page, source)
					})
				})
			})
		}
	}
}

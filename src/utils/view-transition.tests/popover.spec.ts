import type { Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

type Box = { x: number; y: number; width: number; height: number; glyphWidth: number }
type Motion = { before: Box[]; frames: { time: number; boxes: Box[] }[]; timeout: boolean }
const route = '/__native-popover-motion'

test.use({ reducedMotion: 'no-preference', viewport: { width: 1280, height: 900 } })

async function nextMotion(page: Page, state: 'open' | 'closed', trigger: () => Promise<unknown>) {
	const sample = page.evaluate(
		state =>
			new Promise<Motion>(resolve => {
				const panel = document.getElementById('native-motion-panel')

				if (!panel) {
					throw new Error('Missing native panel')
				}

				const items = [...panel.querySelectorAll<HTMLElement>('[data-motion-id]')]
				const read = () =>
					items.map(item => {
						const rect = item.getBoundingClientRect()
						const glyph = item.querySelector('.glyph')

						if (!glyph) {
							throw new Error('Missing scaled visual child')
						}

						return {
							x: rect.x,
							y: rect.y,
							width: rect.width,
							height: rect.height,
							glyphWidth: glyph.getBoundingClientRect().width,
						}
					})
				const result: Motion = { before: [], frames: [], timeout: false }
				let frame = 0
				let quiet = 0
				const finish = (timeout: boolean) => {
					clearTimeout(timer)
					cancelAnimationFrame(frame)
					panel.removeEventListener('beforetoggle', start)
					result.timeout = timeout
					resolve(result)
				}
				const start = (event: Event) => {
					if (
						!(event instanceof ToggleEvent) ||
						event.target !== panel ||
						event.newState !== state
					) {
						return
					}

					panel.removeEventListener('beforetoggle', start)
					panel.removeAttribute('data-motion-probe-ready')
					result.before = read()
					const began = performance.now()
					const tick = (time: number) => {
						result.frames.push({ time: time - began, boxes: read() })
						const moving = panel
							.getAnimations({ subtree: true })
							.some(a => a.pending || a.playState === 'running')

						quiet = moving ? 0 : quiet + 1

						if (quiet >= 3 && result.frames.length >= 3) {
							finish(false)
						} else {
							frame = requestAnimationFrame(tick)
						}
					}

					queueMicrotask(() => {
						frame = requestAnimationFrame(tick)
					})
				}
				const timer = setTimeout(() => finish(true), 2500)

				panel.addEventListener('beforetoggle', start)
				panel.setAttribute('data-motion-probe-ready', state)
			}),
		state,
	)

	await expect(page.locator('#native-motion-panel')).toHaveAttribute(
		'data-motion-probe-ready',
		state,
	)
	await trigger()

	return sample
}

const distance = (a: Box | undefined, b: Box | undefined) => {
	if (!a || !b) {
		throw new Error('Missing native motion peer')
	}

	return Math.hypot(a.x - b.x, a.y - b.y)
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test.describe(reducedMotion, () => {
		test.use({ reducedMotion })
		test('native close after panel scroll preserves fixed position owners and independent scale', async ({
			page,
		}, info) => {
			await page.goto(route)
			await expect(page.locator('[data-native-motion-ready]')).toHaveCount(1)
			const panel = page.locator('#native-motion-panel')
			const items = panel.locator('[data-motion-id]')
			const originals = await items.elementHandles()
			const opening = await nextMotion(page, 'open', () => page.locator('#native-toggle').click())

			expect(opening.timeout).toBe(false)
			await panel.hover({ position: { x: 30, y: 180 } })
			await page.mouse.wheel(0, 102)
			await expect.poll(() => panel.evaluate(panel => panel.scrollTop)).toBeGreaterThan(0)
			await expect
				.poll(() =>
					items.evaluateAll(items =>
						items.every(item => {
							const a = item.getBoundingClientRect(),
								b = item.parentElement?.getBoundingClientRect()

							return (
								!!b &&
								Math.hypot(
									a.x + a.width / 2 - b.x - b.width / 2,
									a.y + a.height / 2 - b.y - b.height / 2,
								) < 0.6
							)
						}),
					),
				)
				.toBe(true)
			const closing = await nextMotion(page, 'closed', () => page.keyboard.press('Escape'))

			await info.attach('native-scrolled-popover-motion', {
				body: JSON.stringify({ reducedMotion, opening, closing }),
				contentType: 'application/json',
			})
			expect(closing.timeout).toBe(false)
			const first = closing.frames[0],
				last = closing.frames.at(-1)

			if (!first || !last) {
				throw new Error('Missing native motion frames')
			}

			for (const [index, before] of closing.before.entries()) {
				const end = last.boxes[index]

				if (!end) {
					throw new Error('Missing retained endpoint')
				}

				expect(end.width).toBeCloseTo(before.width, 4)

				if (reducedMotion === 'reduce') {
					for (const frame of closing.frames) {
						expect(distance(frame.boxes[index], end)).toBeLessThan(0.6)
					}
				} else {
					expect(distance(first.boxes[index], before)).toBeLessThan(0.6)
					expect(
						closing.frames.some(
							frame =>
								distance(frame.boxes[index], before) > 1 && distance(frame.boxes[index], end) > 1,
						),
					).toBe(true)
				}

				expect(before.glyphWidth).toBeGreaterThan(end.glyphWidth)
				expect(
					await items
						.nth(index)
						.evaluate((node, original) => node === original && node.isConnected, originals[index]),
				).toBe(true)
			}
			const reopening = await nextMotion(page, 'open', () => page.locator('#native-toggle').click())

			expect(reopening.timeout).toBe(false)
			await page.getByRole('checkbox', { name: 'Native choice 2', exact: true }).check()
			await expect(
				page.getByRole('checkbox', { name: 'Native choice 2', exact: true }),
			).toBeChecked()
			await expect(panel.locator('[data-layout-transition]')).toHaveCount(0)
		})
	})
}

test('native API coalescing and frame callbacks retain the first unpainted pose', async ({
	page,
}, info) => {
	await page.goto(route)
	await expect(page.locator('[data-native-motion-ready]')).toHaveCount(1)
	const panel = page.locator('#native-motion-panel')
	const coalesced = await nextMotion(page, 'open', () =>
		panel.evaluate(panel => {
			if (!(panel instanceof HTMLElement)) {
				throw new Error('Expected native HTML popover')
			}

			panel.showPopover()
			panel.hidePopover()
			panel.showPopover()
		}),
	)

	await info.attach('native-coalesced-motion', {
		body: JSON.stringify(coalesced),
		contentType: 'application/json',
	})
	expect(coalesced.timeout).toBe(false)
	const firstOpen = coalesced.frames[0]

	if (!firstOpen) {
		throw new Error('Missing coalesced frame')
	}

	for (const [index, before] of coalesced.before.entries()) {
		expect(distance(firstOpen.boxes[index], before)).toBeLessThan(0.6)
	}
	const closing = await nextMotion(page, 'closed', () =>
		panel.evaluate(
			panel =>
				new Promise<void>(resolve => {
					requestAnimationFrame(() => {
						if (!(panel instanceof HTMLElement)) {
							throw new Error('Expected native HTML popover')
						}

						panel.hidePopover()
						resolve()
					})
				}),
		),
	)

	await info.attach('native-frame-callback-motion', {
		body: JSON.stringify(closing),
		contentType: 'application/json',
	})
	expect(closing.timeout).toBe(false)
	const firstClose = closing.frames[0]

	if (!firstClose) {
		throw new Error('Missing frame-callback pose')
	}

	for (const [index, before] of closing.before.entries()) {
		expect(distance(firstClose.boxes[index], before)).toBeLessThan(0.6)
	}
})

test.describe('interruption', () => {
	test('native controls remain usable through an admitted close and reentry', async ({
		page,
	}, info) => {
		await page.goto(route)
		await expect(page.locator('[data-native-motion-ready]')).toHaveCount(1)
		const panel = page.locator('#native-motion-panel')
		const owner = panel.locator('[data-motion-id]').first()
		const original = await owner.elementHandle()

		if (!original) {
			throw new Error('Missing retained position owner')
		}

		const closed = await owner.evaluate(node => {
			const r = node.getBoundingClientRect()

			return { x: r.x, y: r.y }
		})

		await page.locator('#native-toggle').click()
		await page.waitForFunction(
			owner =>
				owner
					.getAnimations()
					.some(
						a =>
							a instanceof CSSAnimation &&
							a.animationName === 'layout-transition' &&
							a.playState === 'running',
					),
			original,
		)
		const input = page.getByRole('checkbox', { name: 'Native choice 2', exact: true })
		const point = await input.evaluate(input => {
			input.addEventListener(
				'pointerdown',
				event => {
					input.setAttribute(
						'data-motion-input',
						String(
							event.isTrusted &&
								!!document
									.querySelector('[data-layout-transition]')
									?.getAnimations()
									.some(
										a =>
											a instanceof CSSAnimation &&
											a.animationName === 'layout-transition' &&
											a.playState === 'running',
									),
						),
					)
				},
				{ once: true },
			)
			const r = input.getBoundingClientRect(),
				x = r.x + r.width / 2,
				y = r.y + r.height / 2

			return { x, y, hit: document.elementFromPoint(x, y) === input }
		})

		expect(point.hit).toBe(true)
		await page.mouse.click(point.x, point.y)
		await expect(input).toBeChecked()
		await expect(input).toHaveAttribute('data-motion-input', 'true')
		await panel.hover({ position: { x: 30, y: 180 } })
		await page.mouse.wheel(0, 102)
		await expect.poll(() => panel.evaluate(panel => panel.scrollTop)).toBeGreaterThan(0)
		const closeStart = await owner.evaluate(node => {
			const r = node.getBoundingClientRect()

			return { x: r.x, y: r.y }
		})
		let reentry: Motion | undefined
		const closing = await nextMotion(page, 'closed', async () => {
			await page.keyboard.press('Escape')
			await page.evaluate(
				() =>
					new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					),
			)
			await page.waitForFunction(
				({ owner, start, end }) => {
					if (!owner) {
						return false
					}

					const r = owner.getBoundingClientRect()

					return (
						owner
							.getAnimations()
							.some(
								a =>
									a instanceof CSSAnimation &&
									a.animationName === 'layout-transition' &&
									a.playState === 'running',
							) &&
						Math.hypot(r.x - start.x, r.y - start.y) > 1 &&
						Math.hypot(r.x - end.x, r.y - end.y) > 1
					)
				},
				{ owner: original, start: closeStart, end: closed },
			)
			reentry = await nextMotion(page, 'open', () =>
				panel.evaluate(panel => {
					if (!(panel instanceof HTMLElement)) {
						throw new Error('Expected native HTML popover')
					}

					panel.showPopover()
				}),
			)
		})

		await info.attach('native-control-interruption', {
			body: JSON.stringify({ closing, reentry }),
			contentType: 'application/json',
		})
		expect(closing.timeout).toBe(false)

		if (!reentry || !closing.frames[0] || !reentry.frames[0]) {
			throw new Error('Missing admitted reversal frames')
		}

		expect(reentry.timeout).toBe(false)

		for (const [index, before] of closing.before.entries()) {
			expect(distance(closing.frames[0].boxes[index], before)).toBeLessThan(0.6)
		}

		for (const [index, before] of reentry.before.entries()) {
			expect(distance(reentry.frames[0].boxes[index], before)).toBeLessThan(0.6)
		}
		expect(
			await owner.evaluate((node, original) => node === original && node.isConnected, original),
		).toBe(true)
		await expect(input).toBeChecked()
	})
})

test('canceled native state, CSS participation and teardown do not retain live ownership', async ({
	page,
}) => {
	await page.goto(route)
	await expect(page.locator('[data-native-motion-ready]')).toHaveCount(1)
	const panel = page.locator('#native-motion-panel')

	await page.locator('#cancel-opening').check()
	await page.locator('#native-toggle').click()
	await page.evaluate(
		() =>
			new Promise<void>(resolve =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			),
	)
	await expect.poll(() => panel.evaluate(panel => panel.matches(':popover-open'))).toBe(false)
	await expect(panel.locator('[data-layout-transition]')).toHaveCount(0)
	await page.locator('#cancel-opening').uncheck()
	await page.locator('#native-motion').check()
	await page.locator('#native-toggle').click()
	await expect.poll(() => panel.evaluate(panel => panel.matches(':popover-open'))).toBe(true)
	await expect(panel.locator('[data-layout-transition]')).toHaveCount(0)
	await page.keyboard.press('Escape')
	await page.locator('#native-motion').uncheck()
	await page.locator('#native-toggle').click()
	const originals = await panel.locator('[data-motion-id]').elementHandles()

	await page.locator('#remove-panel').click()
	await expect(panel).toHaveCount(0)

	for (const original of originals) {
		expect(
			await original.evaluate(
				node =>
					node instanceof HTMLElement &&
					!node.hasAttribute('data-layout-transition') &&
					!node.style.getPropertyValue('--layoutTransition-beforeX'),
			),
		).toBe(true)
	}
})

test('canceling a native opening preserves an admitted closing clock', async ({ page }) => {
	await page.goto(route)
	await expect(page.locator('[data-native-motion-ready]')).toHaveCount(1)
	const panel = page.locator('#native-motion-panel')

	await nextMotion(page, 'open', () => page.locator('#native-toggle').click())
	await page.keyboard.press('Escape')
	await page.waitForFunction(() =>
		document
			.querySelector('[data-layout-transition]')
			?.getAnimations()
			.some(
				a =>
					a instanceof CSSAnimation &&
					a.animationName === 'layout-transition' &&
					a.playState === 'running',
			),
	)
	const retained = await panel.evaluate(async panel => {
		if (!(panel instanceof HTMLElement)) {
			throw new Error('Expected native HTML popover')
		}

		const owner = panel.querySelector('[data-motion-id]')
		const animation = owner
			?.getAnimations()
			.find(
				a =>
					a instanceof CSSAnimation &&
					a.animationName === 'layout-transition' &&
					a.playState === 'running',
			)

		if (!owner || !animation) {
			throw new Error('Missing admitted closing animation')
		}

		const startTime = animation.startTime

		panel.addEventListener('beforetoggle', event => event.preventDefault(), { once: true })
		panel.showPopover()
		await new Promise<void>(resolve =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
		)

		return (
			!panel.matches(':popover-open') &&
			owner.getAnimations().includes(animation) &&
			animation.startTime === startTime
		)
	})

	expect(retained).toBe(true)
})

test.describe('native baseline', () => {
	test.use({ javaScriptEnabled: false })
	test('native endpoints and scale work without the live enhancement', async ({ page }) => {
		await page.goto(route)
		const panel = page.locator('#native-motion-panel')
		const read = () =>
			panel.locator('[data-motion-id]').evaluateAll(items =>
				items.map(item => {
					const r = item.getBoundingClientRect(),
						glyph = item.querySelector('.glyph')

					if (!glyph) {
						throw new Error('Missing native visual child')
					}

					return {
						x: r.x,
						y: r.y,
						width: r.width,
						height: r.height,
						glyphWidth: glyph.getBoundingClientRect().width,
					}
				}),
			)
		const closed = await read()

		await page.locator('#native-toggle').click()
		await expect.poll(() => panel.evaluate(panel => panel.matches(':popover-open'))).toBe(true)
		await expect(panel.locator('[data-layout-transition]')).toHaveCount(0)
		await expect
			.poll(() =>
				panel.locator('[data-motion-id]').evaluateAll(items =>
					items.every(item => {
						const a = item.getBoundingClientRect(),
							b = item.parentElement?.getBoundingClientRect()

						return (
							!!b &&
							Math.hypot(
								a.x + a.width / 2 - b.x - b.width / 2,
								a.y + a.height / 2 - b.y - b.height / 2,
							) < 0.6
						)
					}),
				),
			)
			.toBe(true)
		await expect
			.poll(async () =>
				(await read()).every((box, index) => {
					const before = closed[index]

					return !!before && box.glyphWidth > before.glyphWidth
				}),
			)
			.toBe(true)
		await page.keyboard.press('Escape')
		await expect.poll(() => panel.evaluate(panel => panel.matches(':popover-open'))).toBe(false)
		await expect
			.poll(async () =>
				(await read()).every((box, index) => {
					const before = closed[index]

					return (
						!!before &&
						distance(box, before) < 0.6 &&
						Math.abs(box.glyphWidth - before.glyphWidth) < 0.6
					)
				}),
			)
			.toBe(true)
	})
})

test('CSS cancellation between capture and activation does not restart retained clocks', async ({
	page,
}, info) => {
	await page.goto(route)
	await expect(page.locator('[data-native-motion-ready]')).toHaveCount(1)
	await page.addStyleTag({
		content: '[data-cancel-prepared-clock] [data-motion-id] { animation-name: none !important; }',
	})
	await page.evaluate(() => {
		const scope = document.querySelector('[data-native-motion-ready]')

		if (!(scope instanceof HTMLElement)) {
			throw new Error('Missing motion scope')
		}

		const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'getAnimations')
		const original: unknown = descriptor?.value

		if (!descriptor || typeof original !== 'function') {
			throw new Error('Missing native animation reader')
		}

		function isAnimationList(value: unknown): value is Animation[] {
			return Array.isArray(value) && value.every((entry: unknown) => entry instanceof Animation)
		}

		const captured = new Set<CSSAnimation>()
		let queued = false

		Element.prototype.getAnimations = function (this: Element, options?: GetAnimationsOptions) {
			const animations: unknown = Reflect.apply(original, this, [options])

			if (!isAnimationList(animations)) {
				throw new Error('Expected native animations')
			}

			if (this.hasAttribute('data-layout-transition')) {
				for (const animation of animations) {
					if (
						animation instanceof CSSAnimation &&
						animation.animationName === 'layout-transition'
					) {
						captured.add(animation)
					}
				}

				if (captured.size && !queued) {
					queued = true
					queueMicrotask(() => {
						scope.setAttribute('data-cancel-prepared-clock', '')
						requestAnimationFrame(() =>
							requestAnimationFrame(() => {
								Object.defineProperty(Element.prototype, 'getAnimations', descriptor)
								scope.setAttribute(
									'data-clock-cancellation',
									JSON.stringify(
										[...captured].map(animation => ({
											state: animation.playState,
											start: animation.startTime,
										})),
									),
								)
							}),
						)
					})
				}
			}

			return animations
		}
	})
	await page.locator('#native-toggle').click()
	const scope = page.locator('[data-native-motion-ready]')

	await expect(scope).toHaveAttribute('data-clock-cancellation', /idle/)
	const observation = await scope.getAttribute('data-clock-cancellation')

	if (!observation) {
		throw new Error('Missing native cancellation observation')
	}

	const clocks: unknown = JSON.parse(observation)

	if (!Array.isArray(clocks)) {
		throw new Error('Expected native clock observations')
	}

	expect(clocks.length).toBeGreaterThan(0)
	expect(
		clocks.every(
			(clock: unknown) =>
				typeof clock === 'object' &&
				clock !== null &&
				'state' in clock &&
				clock.state === 'idle' &&
				'start' in clock &&
				clock.start === null,
		),
	).toBe(true)
	await expect(page.locator('[data-layout-transition],[data-view-transition-active]')).toHaveCount(
		0,
	)
	await page.getByRole('checkbox', { name: 'Native choice 1', exact: true }).check()
	await info.attach('canceled-native-clocks', {
		body: observation,
		contentType: 'application/json',
	})
})

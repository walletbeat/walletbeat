import type { Locator, Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

async function setup(page: Page, kind: 'native' | 'wrapper' | 'stacked') {
	const section = page.locator(`[data-timing-case="${kind}"]`)
	const sourceSelector = kind === 'wrapper' ? '[data-stack]' : '[data-tooltip-trigger]'
	const source = section.locator(sourceSelector)
	const button = section.locator('[popovertarget]')
	const id = await button.getAttribute('popovertarget')

	if (!id) {
		throw new Error('Missing timing target')
	}

	const target = page.locator(`[id="${id}"]`)

	await section.evaluate((section, sourceSelector) => {
		const source = section.querySelector(sourceSelector)
		const button = section.querySelector('[popovertarget]')
		const target = document.getElementById(button?.getAttribute('popovertarget') ?? '')

		if (!source || !target) {
			throw new Error('Missing timing elements')
		}

		const events: { kind: string; time: number }[] = []
		const record = (kind: string) => {
			const time = performance.now()

			events.push({ kind, time })
			section.setAttribute(`data-${kind}`, String(time))
			section.setAttribute('data-events', JSON.stringify(events))
		}

		for (const [type, kind] of [
			['pointerenter', 'enter'],
			['pointerleave', 'leave'],
			['pointerdown', 'down'],
			['keydown', 'key'],
		] as const) {
			source.addEventListener(
				type,
				event => {
					if ((type === 'pointerenter' || type === 'pointerleave') && event.target !== source) {
						return
					}

					record(kind)
				},
				{ capture: true },
			)
		}
		target.addEventListener('pointerleave', () => record('target-leave'))
		target.addEventListener('beforetoggle', event => {
			if (!(event instanceof ToggleEvent)) {
				throw new Error('Missing native toggle event')
			}

			record(event.newState === 'open' ? 'open' : 'close')
		})
	}, sourceSelector)

	return { section, source, button, target }
}

async function elapsed(section: Locator, start: string, end: string) {
	return section.evaluate(
		(section, { start, end }) => {
			const first = section.getAttribute(`data-${start}`)
			const last = section.getAttribute(`data-${end}`)

			if (!first || !last) {
				throw new Error('Missing timing events')
			}

			return Number(last) - Number(first)
		},
		{ start, end },
	)
}

test('hover opening and closing clocks agree across native and wrapper paths', async ({
	page,
}, info) => {
	await page.goto('/__tooltip-timing')
	await expect(page.locator('astro-island[component-url*="TooltipTiming"]')).not.toHaveAttribute(
		'ssr',
	)
	const measurements: {
		kind: string
		open: number[]
		close: number[]
		native: boolean
		start: string
		end: string
	}[] = []

	for (const kind of ['native', 'wrapper', 'stacked'] as const) {
		const { section, source, button, target } = await setup(page, kind)
		const sample = {
			kind,
			open: [] as number[],
			close: [] as number[],
			...(await button.evaluate(button => ({
				native:
					'interestForElement' in HTMLButtonElement.prototype && button.hasAttribute('interestfor'),
				start: getComputedStyle(button).getPropertyValue('interest-delay-start'),
				end: getComputedStyle(button).getPropertyValue('interest-delay-end'),
			}))),
		}

		for (let i = 0; i < 3; i++) {
			await page.mouse.move(5, 5)
			await source.hover()
			await expect
				.poll(() =>
					target.evaluate(target => {
						const style = getComputedStyle(target)
						const rect = target.getBoundingClientRect()

						return (
							target.matches(':popover-open') &&
							style.visibility === 'visible' &&
							style.display !== 'none' &&
							Number(style.opacity) > 0 &&
							rect.width > 0 &&
							rect.height > 0
						)
					}),
				)
				.toBe(true)
			sample.open.push(await elapsed(section, 'enter', 'open'))
			const link = target.locator('a')
			const point = await link.evaluate(link => {
				const rect = link.getBoundingClientRect()
				const x = rect.x + rect.width / 2,
					y = rect.y + rect.height / 2

				return { x, y, hit: link.contains(document.elementFromPoint(x, y)) }
			})

			expect(point.hit).toBe(true)
			await page.mouse.move(point.x, point.y)
			await expect.poll(() => link.evaluate(link => link.matches(':hover'))).toBe(true)
			await page.waitForTimeout(250)
			await expect.poll(() => target.evaluate(target => target.matches(':popover-open'))).toBe(true)
			await page.mouse.move(5, 5)
			await expect
				.poll(() => target.evaluate(target => target.matches(':popover-open')))
				.toBe(false)
			sample.close.push(await elapsed(section, 'target-leave', 'close'))
		}
		measurements.push(sample)
		await info.attach(`clock-${kind}`, {
			body: (await section.getAttribute('data-events')) ?? '[]',
			contentType: 'application/json',
		})
	}
	await info.attach('hover-measurements', {
		body: JSON.stringify(measurements),
		contentType: 'application/json',
	})

	for (const sample of measurements) {
		expect(sample.open.toSorted((a, b) => a - b)[1]).toBeGreaterThanOrEqual(100)
		expect(sample.open.toSorted((a, b) => a - b)[1]).toBeLessThan(350)
		expect(sample.close.toSorted((a, b) => a - b)[1]).toBeGreaterThanOrEqual(130)
		expect(sample.close.toSorted((a, b) => a - b)[1]).toBeLessThan(450)

		if (sample.native) {
			expect(sample.start).toBe('0.15s')
			expect(sample.end).toBe('0.2s')
		}
	}
})

test('explicit activation is immediate and a brief hover cannot open late', async ({ page }) => {
	await page.goto('/__tooltip-timing')
	await expect(page.locator('astro-island[component-url*="TooltipTiming"]')).not.toHaveAttribute(
		'ssr',
	)
	const { section, source, button, target } = await setup(page, 'native')

	await button.focus()

	for (const key of ['Enter', 'Space']) {
		await page.keyboard.press('Escape')
		await expect.poll(() => target.evaluate(target => target.matches(':popover-open'))).toBe(false)
		await button.press(key)
		await expect.poll(() => target.evaluate(target => target.matches(':popover-open'))).toBe(true)
		const keyDelay = await elapsed(section, 'key', 'open')

		expect(keyDelay).toBeGreaterThanOrEqual(0)
		expect(keyDelay).toBeLessThan(100)
	}
	await page.keyboard.press('Escape')
	await button.evaluate(button => {
		if (button instanceof HTMLElement) {
			button.blur()
		}
	})
	await button.click()
	await expect.poll(() => target.evaluate(target => target.matches(':popover-open'))).toBe(true)
	const clickDelay = await elapsed(section, 'down', 'open')

	expect(clickDelay).toBeGreaterThanOrEqual(0)
	expect(clickDelay).toBeLessThan(100)
	await page.mouse.move(5, 5)
	await page.keyboard.press('Escape')
	await button.evaluate(button => {
		if (button instanceof HTMLElement) {
			button.blur()
		}
	})

	for (const kind of ['native', 'wrapper'] as const) {
		const {
			section: currentSection,
			source: currentSource,
			target: currentTarget,
		} = kind === 'native' ? { section, source, target } : await setup(page, kind)
		const previousOpen = await currentSection.getAttribute('data-open')

		await currentSource.hover()
		await page.waitForTimeout(60)
		await page.mouse.move(5, 5)
		await page.waitForTimeout(250)
		await expect
			.poll(() => currentTarget.evaluate(target => target.matches(':popover-open')))
			.toBe(false)
		expect(await currentSection.getAttribute('data-open')).toBe(previousOpen)
		await currentSource.hover()
		await page.waitForTimeout(60)
		await page.mouse.move(5, 5)
		await page.waitForTimeout(40)
		await currentSource.hover()
		await expect
			.poll(() => currentTarget.evaluate(target => target.matches(':popover-open')))
			.toBe(true)
		expect(await elapsed(currentSection, 'enter', 'open')).toBeGreaterThanOrEqual(100)
		expect(await elapsed(currentSection, 'enter', 'open')).toBeLessThan(350)
		await page.mouse.move(5, 5)
		await expect
			.poll(() => currentTarget.evaluate(target => target.matches(':popover-open')))
			.toBe(false)
	}
})

test.describe('native baseline', () => {
	test.use({ javaScriptEnabled: false })
	test('buttons and foreground links work without scripts', async ({ page }) => {
		await page.goto('/__tooltip-timing')
		const { button, target } = await setup(page, 'native')

		await button.press('Enter')
		await expect.poll(() => target.evaluate(target => target.matches(':popover-open'))).toBe(true)
		await expect
			.poll(() =>
				target.evaluate(target =>
					target
						.getAnimations({ subtree: true })
						.every(animation => animation.playState !== 'running' && !animation.pending),
				),
			)
			.toBe(true)
		await target.getByRole('link').click()
		await expect(page).toHaveURL(/#timing-end$/)
		await page.goto('/__tooltip-timing#reset')
		await page.getByRole('link', { name: 'Wrapper hover', exact: true }).click()
		await expect(page).toHaveURL(/#timing-end$/)
	})
})

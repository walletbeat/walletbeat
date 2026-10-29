import type { Locator, Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

const nativePoint = async (page: Page, control: Locator) => {
	const box = await control.boundingBox()
	const viewport = page.viewportSize()

	if (!box || !viewport) {
		throw new Error('The native control needs a visible viewport box')
	}

	expect(box.x).toBeGreaterThanOrEqual(0)
	expect(box.y).toBeGreaterThanOrEqual(0)
	expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
	expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)

	const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

	expect(
		await control.evaluate((element, point) => {
			const hit = document.elementFromPoint(point.x, point.y)

			return (
				!!hit &&
				(element.contains(hit) || (hit instanceof HTMLLabelElement && hit.control === element))
			)
		}, point),
	).toBe(true)

	return point
}

const nativeClick = async (page: Page, control: Locator) => {
	const point = await nativePoint(page, control)

	await page.mouse.click(point.x, point.y)
}

const presentation = async (control: Locator) => {
	await expect
		.poll(() =>
			control.evaluate(
				element =>
					element
						.getAnimations()
						.filter(animation => animation.playState === 'running' || animation.pending).length,
			),
		)
		.toBe(0)

	return control.evaluate(element => {
		const style = getComputedStyle(element)
		const icon = element.querySelector('svg')

		if (!icon) {
			throw new Error('A variant control needs its visible icon')
		}

		const iconStyle = getComputedStyle(icon)

		return {
			width: style.width,
			height: style.height,
			font: style.font,
			padding: style.padding,
			border: style.border,
			radius: style.borderRadius,
			background: style.backgroundColor,
			color: style.color,
			opacity: style.opacity,
			scale: style.scale,
			filter: style.filter,
			iconWidth: iconStyle.width,
			iconHeight: iconStyle.height,
		}
	})
}

const heldPresentation = async (page: Page, control: Locator) => {
	const point = await nativePoint(page, control)

	await page.mouse.move(point.x, point.y)
	await page.mouse.down()

	try {
		await expect.poll(() => control.evaluate(element => element.matches(':active'))).toBe(true)
		await expect
			.poll(() =>
				control.evaluate(element => {
					const style = getComputedStyle(element)

					return {
						scale: Number(style.scale),
						expectedScale: Number(style.getPropertyValue('--pressable-pressed-scale')),
						opacity: Number(style.opacity),
						expectedOpacity: Number(style.getPropertyValue('--pressable-pressed-opacity')),
					}
				}),
			)
			.toEqual(
				expect.objectContaining({
					scale: 0.99,
					expectedScale: 0.99,
					opacity: 0.8,
					expectedOpacity: 0.8,
				}),
			)

		return await presentation(control)
	} finally {
		await page.mouse.up()
	}
}

for (const width of [1280, 390]) {
	test.describe(`variant presentation at ${width}`, () => {
		test.use({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' })

		test('native presentation and selection survive column topology changes', async ({ page }) => {
			await page.goto('/wallet/summary/')
			await expect(
				page.getByRole('button', { name: 'Sort by Wallet', exact: true }),
			).toHaveAttribute('type', 'button')
			await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')

			const settled = () =>
				expect(page.locator('[data-layout-transition], [data-view-transition-active]')).toHaveCount(
					0,
				)
			const rows = page.locator('.wallet-table tbody tr')
			const rowCount = await rows.count()
			const name = await rows.evaluateAll(rows =>
				rows
					.find(row => row.querySelectorAll('.variants button').length > 1)
					?.querySelector('h3 a')
					?.textContent?.trim(),
			)

			if (!name) {
				throw new Error('The table needs a wallet with multiple variant controls')
			}

			const row = rows.filter({ has: page.getByRole('link', { name, exact: true }) })
			const controls = row.locator('.variants button')
			const labels = await controls.evaluateAll(buttons =>
				buttons.map(button => button.getAttribute('aria-label')),
			)
			const heading = page.getByRole('heading', { name: 'Software Wallets', exact: true })

			await nativeClick(page, controls.first())
			await settled()
			await expect(controls.first()).toHaveAttribute('aria-pressed', 'true')
			await nativeClick(page, heading)

			const before = await Promise.all((await controls.all()).map(presentation))
			const heldBefore = await heldPresentation(page, controls.first())

			await settled()
			await expect(controls.first()).toHaveAttribute('aria-pressed', 'false')
			await nativeClick(page, controls.first())
			await settled()
			await nativeClick(page, heading)
			await nativeClick(
				page,
				page
					.locator('thead th[data-table-column="wallet"]')
					.getByRole('button', { name: 'Expand', exact: true }),
			)
			await settled()

			const expanded = row.locator('td[data-table-column="facet-variant"] .variants button')

			await expect(expanded).toHaveCount(labels.length)
			expect(
				await expanded.evaluateAll(buttons =>
					buttons.map(button => button.getAttribute('aria-label')),
				),
			).toEqual(labels)
			await expect(expanded.first()).toHaveAttribute('aria-pressed', 'true')
			expect(await Promise.all((await expanded.all()).map(presentation))).toEqual(before)
			expect(await heldPresentation(page, expanded.first())).toEqual(heldBefore)
			await settled()
			await expect(expanded.first()).toHaveAttribute('aria-pressed', 'false')
			await expect(rows).toHaveCount(rowCount)
		})
	})
}

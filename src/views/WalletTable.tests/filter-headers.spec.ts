import { expect, test } from '../../../tests/browser/verified-test'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test.describe(`filter heading activation, motion ${reducedMotion}`, () => {
		test.use({ viewport: { width: 900, height: 1000 }, reducedMotion })

		test('closed filter glyphs activate their owning header across horizontal scroll positions', async ({
			page,
		}) => {
			test.setTimeout(90000)
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
			const stage = page.locator('thead th[data-table-column="stage"]')
			const baselineAlignment = await stage.evaluate(stage => getComputedStyle(stage).verticalAlign)
			const trigger = stage.locator('.filter-trigger')
			const panelId = await trigger.getAttribute('popovertarget')

			if (!panelId) {
				throw new Error('Stage filter needs its native popover target')
			}

			const panel = page.locator(`[id="${panelId}"]`)
			const glyph = panel.locator('[data-active-choice] .choice-icon')

			await expect(glyph).toHaveCount(1)
			const retainedGlyph = await glyph.elementHandle()

			if (!retainedGlyph) {
				throw new Error('Default Stage selection needs its retained glyph')
			}

			for (const column of ['overall', 'wallet']) {
				await page
					.locator(`thead th[data-table-column="${column}"]`)
					.getByRole('button', {
						name: 'Expand',
						exact: true,
					})
					.press('Enter')
				await settled()
			}
			await expect
				.poll(() =>
					stage.evaluate(cell => (cell instanceof HTMLTableCellElement ? cell.rowSpan : 0)),
				)
				.toBeGreaterThan(1)

			const layout = page.locator('#layout')
			const readSort = () =>
				page
					.locator('thead th[aria-sort]')
					.evaluateAll(headers =>
						headers.map(header => [
							header.getAttribute('data-table-column'),
							header.getAttribute('aria-sort'),
						]),
					)
			const sort = await readSort()

			const maximum = await layout.evaluate(layout => layout.scrollWidth - layout.clientWidth)

			expect(maximum).toBeGreaterThan(1)

			let referencePaint: Buffer | undefined

			for (const fraction of [0, 0.5, 1]) {
				expect(await layout.evaluate(layout => layout.scrollWidth - layout.clientWidth)).toBe(
					maximum,
				)
				const target = Math.round(maximum * fraction)

				await page.locator('#nav header .logo').hover()
				await page.locator('#nav header .logo').focus()
				await expect
					.poll(
						async () => {
							const before = await layout.evaluate(layout => layout.scrollLeft)

							if (Math.abs(before - target) > 1) {
								await page.mouse.wheel(target - before, 0)
							}

							return Math.abs((await layout.evaluate(layout => layout.scrollLeft)) - target)
						},
						{ timeout: 15000 },
					)
					.toBeLessThanOrEqual(1)

				const slot = trigger.locator('.filter-cluster-target')
				const slotBox = await slot.boundingBox()

				if (!slotBox) {
					throw new Error('Closed filter glyph needs its header slot geometry')
				}

				const paint = await page.screenshot({ clip: slotBox })

				await test.info().attach(`closed-filter-glyph-${fraction}`, {
					body: paint,
					contentType: 'image/png',
				})

				if (!referencePaint) {
					const visibility = await glyph.evaluate(glyph => {
						const previous = glyph.style.visibility

						glyph.style.visibility = 'hidden'

						return previous
					})
					let hiddenPaint: Buffer

					try {
						hiddenPaint = await page.screenshot({ clip: slotBox })
					} finally {
						await glyph.evaluate((glyph, visibility) => {
							glyph.style.visibility = visibility
						}, visibility)
					}

					expect(hiddenPaint).not.toEqual(paint)
					referencePaint = paint
				}

				await expect.poll(() => page.screenshot({ clip: slotBox })).toEqual(referencePaint)

				for (const [xFraction, yFraction] of [
					[0.5, 0.5],
					[0.15, 0.5],
					[0.85, 0.5],
					[0.5, 0.15],
					[0.5, 0.85],
				]) {
					await settled()
					const box = await slot.boundingBox()

					if (!box) {
						throw new Error('Closed filter glyph needs its header slot geometry')
					}

					const point = { x: box.x + box.width * xFraction, y: box.y + box.height * yFraction }

					expect(
						await trigger.evaluate(
							(trigger, point) => trigger.contains(document.elementFromPoint(point.x, point.y)),
							point,
						),
					).toBe(true)
					await page.mouse.click(point.x, point.y)
					await expect
						.poll(() => panel.evaluate(panel => panel.matches(':popover-open')))
						.toBe(true)
					expect(await readSort()).toEqual(sort)
					await expect(rows).toHaveCount(rowCount)
					await page.mouse.move(5, 5)
					await page.keyboard.press('Escape')
					await expect
						.poll(() => panel.evaluate(panel => panel.matches(':popover-open')))
						.toBe(false)
					await settled()
					expect(await glyph.evaluate((glyph, original) => glyph === original, retainedGlyph)).toBe(
						true,
					)
				}
			}
			await trigger.press('Enter')
			await expect.poll(() => panel.evaluate(panel => panel.matches(':popover-open'))).toBe(true)
			await panel.locator('[data-filter-set="stageStatus"] [data-filter-choice="all"]').click()
			await settled()
			await page.mouse.move(5, 5)
			await page.keyboard.press('Escape')
			await expect.poll(() => panel.evaluate(panel => panel.matches(':popover-open'))).toBe(false)
			await settled()
			await expect(glyph).toHaveCount(0)
			expect(await stage.evaluate(stage => getComputedStyle(stage).verticalAlign)).toBe(
				baselineAlignment,
			)
			await expect(rows).toHaveCount(rowCount)
		})
	})
}

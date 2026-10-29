import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 690]) {
	test(`compact pie hit targets follow group visibility at ${width}`, async ({ page }, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('animation-timeline: scroll()') &&
					CSS.supports('animation-range: 0% 100%') &&
					CSS.supports('width: anchor-size(--source inline)') &&
					CSS.supports('timeline-scope: --breadcrumb-size') &&
					CSS.supports('color: if(style(---breadcrumb-wrap: 1): red; else: blue)') &&
					CSS.supports('clip-path: shape(from 0 0, line to 1px 1px, close)'),
			)),
			'Compact petal visibility requires the native sticky enhancement',
		)
		await page.mouse.move(3, 880)
		const leaf = page.locator('.pie-navigation a[href="#open-source"]')
		const group = page.locator('.pie-navigation summary > a[href="#transparency"]')
		const root = page.locator('#layout')
		const read = () =>
			leaf.evaluate(element => {
				const menu = element.closest('menu')!
				const style = getComputedStyle(menu)
				const box = element.getBoundingClientRect()

				return {
					visibility: style.visibility,
					opacity: Number(style.opacity),
					scroll: document.querySelector('#layout')!.scrollTop,
					box: { x: box.x, y: box.y, width: box.width, height: box.height },
				}
			})

		await root.evaluate(element => {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Expected page scroll area')
			}

			element.style.scrollSnapType = 'none'
			element.style.scrollBehavior = 'auto'
			element.scrollTop = 0
		})
		await expect(leaf).toBeVisible()
		await expect.poll(async () => (await read()).opacity).toBe(1)
		const natural = await read()

		expect(natural.scroll).toBe(0)
		const compactScroll = await page.evaluate(() => {
			const root = document.querySelector<HTMLElement>('#layout')!
			const scope = document.getElementById('security')!
			const flow = scope.querySelector<HTMLElement>(
				':scope > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
			)!
			const row = scope
				.querySelector('[data-sticky-breadcrumb~="source"] a[data-pressable-name="#security"]')!
				.closest<HTMLElement>('[data-sticky]')!
			const inset = Number.parseFloat(getComputedStyle(row).insetBlockStart)

			if (!Number.isFinite(inset)) {
				throw new Error('Expected native Security sticky inset')
			}

			root.scrollTop += flow.getBoundingClientRect().top - inset + 100

			return root.scrollTop
		})

		expect(compactScroll).toBeGreaterThan(0)
		await expect.poll(() => root.evaluate(element => element.scrollTop)).toBe(compactScroll)
		const focusGroup = () =>
			group.evaluate(element => {
				if (!(element instanceof HTMLElement)) {
					throw new Error('Expected group link')
				}

				element.focus({ preventScroll: true })
			})

		await focusGroup()
		await expect(group).toBeFocused()
		expect(await group.evaluate(element => element.matches(':focus-visible'))).toBe(true)
		await expect(leaf).toBeVisible()
		await expect.poll(async () => (await read()).opacity).toBe(1)
		const point = await leaf.evaluate(element => {
			const box = element.getBoundingClientRect()

			for (let y = 1; y < 17; y++) {
				for (let x = 1; x < 17; x++) {
					const point = { x: box.x + (box.width * x) / 17, y: box.y + (box.height * y) / 17 }

					if (point.x < 1 || point.y < 1 || point.x >= innerWidth || point.y >= innerHeight) {
						continue
					}

					if (document.elementFromPoint(point.x, point.y)?.closest('a') === element) {
						return point
					}
				}
			}
			throw new Error('The visible petal needs an actual clipped hit target')
		})
		const focused = await read()

		await group.evaluate(element => {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Expected group link')
			}

			element.blur()
		})
		await expect(leaf).toBeHidden()
		await expect.poll(async () => (await read()).opacity).toBe(0)
		const hidden = await read()

		expect(hidden.scroll).toBe(compactScroll)
		expect(hidden.box).toEqual(focused.box)
		expect(
			await leaf.evaluate(
				(element, point) => document.elementFromPoint(point.x, point.y)?.closest('a') === element,
				point,
			),
		).toBe(false)
		await focusGroup()
		await expect(group).toBeFocused()
		expect(await group.evaluate(element => element.matches(':focus-visible'))).toBe(true)
		await expect(leaf).toBeVisible()
		await expect.poll(async () => (await read()).opacity).toBe(1)
		expect(
			await leaf.evaluate(
				(element, point) => document.elementFromPoint(point.x, point.y)?.closest('a') === element,
				point,
			),
		).toBe(true)
		await info.attach('petal-visibility-hit', {
			body: JSON.stringify({
				width,
				natural,
				focused,
				hidden,
				point,
				restored: await read(),
				limit:
					'Natural and compact group visibility, focus re-entry and native hit exclusion; no hover latency or intermediate-paint claim.',
			}),
			contentType: 'application/json',
		})
	})
}

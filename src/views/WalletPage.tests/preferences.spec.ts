import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 1440]) {
	for (const direction of ['ltr', 'rtl'] as const) {
		test(`native layout and navigation with reduced motion: ${direction} ${width}px`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: 900 })
			await page.emulateMedia({ reducedMotion: 'reduce' })
			await page.goto('/__wallet-page/software/')
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.locator('html').evaluate((element: HTMLElement, value) => {
				element.dir = value
			}, direction)
			await page.evaluate(() => document.fonts.ready)
			expect(
				await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
			).toBe(true)
			const title = await page.locator('#top h1 > a').boundingBox()
			const prose = await page.locator('#top .wallet-overview > p').boundingBox()

			expect(title).not.toBeNull()
			expect(prose).not.toBeNull()

			if (!title || !prose) {
				throw new Error('The real wallet title and description must have flow boxes')
			}

			if (direction === 'ltr') {
				expect(prose.x).toBeGreaterThanOrEqual(title.x - 1)
			} else {
				expect(prose.x + prose.width).toBeLessThanOrEqual(title.x + title.width + 1)
			}

			const target = page.locator('#security')

			await target.evaluate(element =>
				element.scrollIntoView({ block: 'start', behavior: 'instant' }),
			)
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
			const compact = await page.evaluate(() =>
				[
					'animation-timeline: scroll()',
					'animation-range: 0% 100%',
					'width: anchor-size(--breadcrumb-source inline)',
					'timeline-scope: --breadcrumb-size',
					'color: if(style(---breadcrumb-wrap: 1): red)',
				].every(feature => CSS.supports(feature)),
			)
			const geometry = await page.locator('.pie-navigation-geometry').boundingBox()

			expect(geometry).not.toBeNull()

			if (!geometry) {
				throw new Error('Missing rendered pie geometry')
			}

			if (width > 1024 || compact) {
				if (direction === 'ltr') {
					expect(geometry.x + geometry.width / 2).toBeGreaterThan(width / 2)
				} else {
					expect(geometry.x + geometry.width / 2).toBeLessThan(width / 2)
				}
			} else {
				const trigger = page.getByRole('button', { name: 'Table of contents', exact: true })

				await trigger.focus()
				await page.keyboard.press('Enter')
				await expect(
					page.getByRole('navigation', { name: 'Table of contents', exact: true }),
				).toBeVisible()
				await page.keyboard.press('Escape')
				await expect(trigger).toBeFocused()
			}

			const sizes = await page
				.locator('#layout, #content')
				.evaluateAll(elements =>
					elements.map(element => ({ width: element.clientWidth, content: element.scrollWidth })),
				)

			for (const size of sizes) {
				expect(size.content).toBeLessThanOrEqual(size.width + 1)
			}
			const summary = page.locator('.attribute-group section.attribute > details > summary').first()

			await summary.focus()
			await page.keyboard.press('Space')
			await expect(summary.locator('..')).not.toHaveAttribute('open')
			await page.keyboard.press('Space')
			await expect(summary.locator('..')).toHaveAttribute('open')
		})
	}
}

test('shared surfaces require an explicit normal transparency preference for blur', async ({
	page,
}, info) => {
	await page.goto('/__wallet-page/software/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	const observed = await page.evaluate(() => {
		const surface = document.createElement('div')
		const badge = document.createElement('span')

		surface.setAttribute('data-sticky', 'block backdrop-self backdrop-always')
		badge.setAttribute('data-badge', 'small')
		badge.style.setProperty('--badge-backdropFilter', 'blur(6px)')
		badge.textContent = 'Surface preference'
		surface.append(badge)
		const root = document.querySelector('#layout')

		if (!root) {
			throw new Error('Native scroll container absent')
		}

		root.append(surface)

		try {
			const style = getComputedStyle(surface)

			return {
				normal: matchMedia('(prefers-reduced-transparency: no-preference)').matches,
				reduce: matchMedia('(prefers-reduced-transparency: reduce)').matches,
				surfaceFilter: style.backdropFilter,
				badgeFilter: getComputedStyle(badge).backdropFilter,
				backgroundImage: style.backgroundImage,
				backgroundColor: style.backgroundColor,
			}
		} finally {
			surface.remove()
		}
	})

	await info.attach('native-transparency-capability', {
		body: JSON.stringify(observed),
		contentType: 'application/json',
	})
	expect(observed.normal && observed.reduce).toBe(false)
	expect(observed.surfaceFilter).toBe(observed.normal ? 'blur(20px)' : 'none')
	expect(observed.badgeFilter).toBe(observed.normal ? 'blur(6px)' : 'none')

	if (!observed.normal) {
		expect(observed.backgroundImage).toContain('linear-gradient')
	}
})

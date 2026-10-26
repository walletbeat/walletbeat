import { expect, test } from '../../../tests/browser/verified-test'

test.use({ headless: false })

for (const wallet of ['metamask', 'ambire']) {
	for (const width of [390, 768]) {
		for (const family of ['stage', 'attribute', 'group']) {
			test(`breadcrumb surfaces preserve natural support and cover compact content: ${wallet} ${width} ${family}`, async ({
				page,
			}, info) => {
				await page.setViewportSize({ width, height: 900 })
				await page.goto(`/${wallet}/`)
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				await page.evaluate(() => document.fonts.ready)
				const scope = page
					.locator(
						family === 'group'
							? '.attribute-group[data-sticky-breadcrumb~="scope"]'
							: family === 'stage'
								? '[id^="stage:"][data-sticky-breadcrumb~="scope"]'
								: '.attribute-group section.attribute[data-sticky-breadcrumb~="scope"]',
					)
					.filter({
						has: page.locator(
							family === 'group'
								? ':scope > header > .section-caption'
								: ':scope > details[open] > summary[data-column~="span-start"] > [data-sticky-breadcrumb~="support"]',
						),
					})
					.first()

				await expect(scope).toHaveCount(1)
				const observations = []

				for (const top of [300, -100]) {
					const observed = await scope.evaluate(async (element, top) => {
						const root = document.querySelector('#layout')

						if (!(root instanceof HTMLElement)) {
							throw new Error('Scroll owner absent')
						}

						root.style.scrollSnapType = 'none'
						root.style.scrollBehavior = 'auto'
						root.style.overflowAnchor = 'none'

						for (let attempt = 0; attempt < 8; attempt++) {
							root.scrollTop += element.getBoundingClientRect().top - top
							await new Promise(resolve =>
								requestAnimationFrame(() => requestAnimationFrame(resolve)),
							)

							if (Math.abs(element.getBoundingClientRect().top - top) < 1) {
								break
							}
						}
						const summary = element.querySelector(':scope > details > summary, :scope > header')
						const header = summary?.querySelector(':scope > header, :scope > [data-sticky]')
						const support = summary?.querySelector(
							':scope > [data-sticky-breadcrumb~="support"], :scope > .section-caption',
						)

						if (!header || !support) {
							throw new Error('Native foreground/support owners absent')
						}

						const surface = getComputedStyle(header, '::before')
						const rectangle = (target: Element) => {
							const { top, bottom, left, right, width, height } = target.getBoundingClientRect()

							return { top, bottom, left, right, width, height }
						}

						return {
							top: element.getBoundingClientRect().top,
							scroll: root.scrollTop,
							header: rectangle(header),
							support: rectangle(support),
							surface: {
								opacity: Number(surface.opacity),
								height: Number.parseFloat(surface.height),
							},
							surfaces: [...document.querySelectorAll('[data-sticky]')].flatMap(owner =>
								['::before', '::after'].flatMap(pseudo => {
									const style = getComputedStyle(owner, pseudo)
									const box = owner.getBoundingClientRect()

									if (
										style.content === 'none' ||
										style.content === 'normal' ||
										Number(style.opacity) < 0.99 ||
										style.filter === 'opacity(0)' ||
										style.backgroundColor === 'rgba(0, 0, 0, 0)'
									) {
										return []
									}

									return [
										{
											top: box.top,
											bottom: box.top + Number.parseFloat(style.height),
											left: box.left,
											right: box.left + Number.parseFloat(style.width),
										},
									]
								}),
							),
							paint: [
								...header.querySelectorAll(
									'[data-sticky-breadcrumb~="item"], [data-sticky-breadcrumb~="end"] > *',
								),
							].map(child => rectangle(child)),
						}
					}, top)

					observations.push(observed)
					await info.attach(`surface-pose-${top}`, {
						body: JSON.stringify(observed),
						contentType: 'application/json',
					})
					expect(
						Math.abs(observed.top - top),
						'Requested scene must actually be delivered',
					).toBeLessThan(1)
					expect(observed.paint.length).toBeGreaterThan(0)

					if (top > 0) {
						expect(
							observed.header.bottom,
							'Natural foreground must not cover its supporting paragraph',
						).toBeLessThanOrEqual(observed.support.top + 0.5)
						expect(
							observed.surface.opacity,
							'Compact backdrop must not obscure natural supporting content',
						).toBe(0)
					} else {
						for (const box of observed.paint) {
							expect(
								observed.surfaces.some(
									surface =>
										surface.top <= box.top + 0.5 &&
										surface.bottom >= box.bottom - 0.5 &&
										surface.left <= box.left + 0.5 &&
										surface.right >= box.right - 0.5,
								),
								'An occupied row surface must cover its heading and badges, including shared rows',
							).toBe(true)
						}
					}
				}
				const [natural, compact] = observations

				expect(
					Math.abs(compact.support.top - natural.support.top + (compact.scroll - natural.scroll)),
					'Supporting content must retain ordinary document travel',
				).toBeLessThan(0.5)
				await info.attach('surface-geometry', {
					body: JSON.stringify(observations),
					contentType: 'application/json',
				})
			})
		}
	}
}

import { expect, test } from '../../../tests/browser/verified-test'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	for (const direction of ['ltr', 'rtl'] as const) {
		test(`breadcrumb font detail follows actual painted size through scroll: ${direction} ${reducedMotion}`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 390, height: 900 })
			await page.emulateMedia({ reducedMotion })
			await page.goto('/metamask/')
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(async direction => {
				document.documentElement.dir = direction
				await document.fonts.ready
			}, direction)
			const observations = await page.evaluate(async () => {
				const root = document.querySelector('#layout')

				if (!(root instanceof HTMLElement)) {
					throw new Error('Missing scroll owner')
				}

				root.style.scrollSnapType = 'none'
				root.style.overflowAnchor = 'none'
				const out = []

				for (const id of ['transparency', 'open-source']) {
					const section = document.getElementById(id)
					const icon = section?.querySelector('[data-sticky-breadcrumb~="item"] [data-icon]')

					if (!section || !icon) {
						throw new Error(`Missing actual heading glyph: ${id}`)
					}

					for (const top of [350, 80, 50, 30, 20, 15, 10, 0, -50, -150, 0, 15, 30, 80, 350]) {
						for (let attempt = 0; attempt < 8; attempt++) {
							root.scrollTo({
								top: root.scrollTop + section.getBoundingClientRect().top - top,
								behavior: 'instant',
							})
							await new Promise(resolve => setTimeout(resolve, 100))

							if (Math.abs(section.getBoundingClientRect().top - top) < 1) {
								break
							}
						}

						if (Math.abs(section.getBoundingClientRect().top - top) >= 1) {
							throw new Error(`Unsettled pose: ${id} ${top}`)
						}

						let ancestorScale = 1

						for (let element: Element | null = icon; element; element = element.parentElement) {
							ancestorScale *= new DOMMatrix(getComputedStyle(element).transform).d
						}
						const visible = ['::before', '::after']
							.map(pseudo => getComputedStyle(icon, pseudo))
							.filter(
								style =>
									style.content !== 'none' &&
									style.content !== 'normal' &&
									Number(style.opacity) > 0.5,
							)
						const glyphs = visible.map(style => {
							const text: unknown = JSON.parse(style.content)

							if (typeof text !== 'string') {
								throw new Error('Missing glyph content')
							}

							const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
							const primaryFont = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily.split(',')[0]}`

							if (!document.fonts.check(primaryFont, text)) {
								throw new Error(`Glyph font not ready: ${primaryFont}`)
							}

							const canvas = document.createElement('canvas')
							const context = canvas.getContext('2d')

							if (!context) {
								throw new Error('Missing glyph measurement context')
							}

							context.font = font
							const ink = context.measureText(text)
							const resolution = 4
							const left = Math.ceil(Math.max(0, ink.actualBoundingBoxLeft) + 2)
							const ascent = Math.ceil(Math.max(0, ink.actualBoundingBoxAscent) + 2)

							canvas.width =
								(left + Math.ceil(Math.max(ink.width, ink.actualBoundingBoxRight) + 2)) * resolution
							canvas.height =
								(ascent + Math.ceil(Math.max(0, ink.actualBoundingBoxDescent) + 2)) * resolution
							context.scale(resolution, resolution)
							context.font = font
							context.fillText(text, left, ascent)
							const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
							let first = canvas.height,
								last = -1

							for (let y = 0; y < canvas.height; y++) {
								for (let x = 0; x < canvas.width; x++) {
									if (pixels[(y * canvas.width + x) * 4 + 3] > 0) {
										first = Math.min(first, y)
										last = Math.max(last, y)
									}
								}
							}

							if (last < first || first === 0 || last === canvas.height - 1) {
								throw new Error('Glyph ink was not fully captured')
							}

							return {
								complex: style.fontFamily.includes('wbicons-complex'),
								height:
									((last - first + 1) / resolution) *
									new DOMMatrix(style.transform).d *
									ancestorScale,
							}
						})

						out.push({ id, top, glyphs })
					}
				}

				return out
			})

			for (const sample of observations) {
				expect(sample.glyphs, `${sample.id} at ${sample.top}: one visible glyph`).toHaveLength(1)
				const glyph = sample.glyphs[0]

				expect(glyph.height).toBeGreaterThan(0)

				if (Math.abs(glyph.height - 32) > 1) {
					expect(
						glyph.complex,
						`${sample.id} at ${sample.top}: ${glyph.height}px painted height`,
					).toBe(glyph.height > 32)
				}
			}
		})
	}
}

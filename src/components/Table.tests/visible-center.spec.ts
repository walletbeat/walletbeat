import { expect, test } from '../../../tests/browser/verified-test'

for (const javaScriptEnabled of [true, false]) {
	for (const reducedMotion of ['no-preference', 'reduce'] as const) {
		test.describe(`visible table headings, JavaScript ${javaScriptEnabled}, motion ${reducedMotion}`, () => {
			test.use({ javaScriptEnabled, reducedMotion })

			test('independent tables retain scroll bounds and center visible header groups', async ({
				page,
			}) => {
				await page.setViewportSize({ width: 1280, height: 1000 })
				await page.goto('/__table-sticky-size')
				await expect(page.locator('[data-fixture]')).toHaveCount(3)
				const firstStage = page.locator('[data-fixture="first"] th[data-table-column="stage"]')
				const sortButton = firstStage.getByRole('button', { name: 'Sort by Stage', exact: true })

				if (javaScriptEnabled) {
					await expect(sortButton).toBeEnabled()
					await sortButton.press('Enter')
					await expect(firstStage).toHaveAttribute('aria-sort', 'ascending')
				} else {
					await expect(sortButton).toBeDisabled()
				}

				for (const [width, height] of [
					[1280, 1000],
					[1280, 700],
					[900, 1000],
					[390, 1000],
				]) {
					await page.setViewportSize({ width, height })
					await page.locator('#layout').evaluate(
						(element, top) => {
							element.scrollTop = top
						},
						height === 700 ? 100 : 0,
					)

					for (const scroll of [0, 200, 2000]) {
						await page.locator('[data-fixture]').evaluateAll((elements, left) => {
							for (const element of elements) {
								element.scrollLeft = left
							}
						}, scroll)
						await expect
							.poll(async () =>
								page.locator('[data-fixture]').evaluateAll(elements => {
									return elements.map(viewport => {
										const bounds = viewport.getBoundingClientRect()
										const sources = [...viewport.querySelectorAll('th[data-sticky]')]
										const errors: number[] = []
										let enhanced = 0

										for (const band of viewport.querySelectorAll<HTMLElement>(
											'.header-cell-content > [data-scroll-item]',
										)) {
											const style = getComputedStyle(band)

											if (style.animationName !== 'scroll-item-visible-center') {
												continue
											}

											enhanced++
											const parent = band.offsetParent

											if (!(parent instanceof HTMLElement)) {
												throw new Error('Missing header containing block')
											}

											const parentBounds = parent.getBoundingClientRect()
											const left = parentBounds.left + parent.clientLeft + band.offsetLeft
											const right = left + band.offsetWidth
											const insets = style.animationTimeline
												.match(/[-+]?(?:[0-9]*\.)?[0-9]+px/g)
												?.map(Number.parseFloat)

											if (!insets || insets.length !== 2) {
												throw new Error('Missing resolved native timeline insets')
											}

											const area = band.getBoundingClientRect()
											const occlusion = sources
												.map(source => source.getBoundingClientRect())
												.filter(source => source.top < area.bottom && source.bottom > area.top)
											const visibleLeft = Math.max(
												left,
												bounds.left,
												...occlusion.map(source => source.right),
											)
											const visibleRight = Math.min(right, bounds.right - insets[1])

											if (visibleRight > visibleLeft) {
												errors.push(
													Math.abs((area.left + area.right - visibleLeft - visibleRight) / 2),
												)
											}
										}
										const supported =
											CSS.supports('animation-timeline: view(inline)') &&
											CSS.supports('animation-range: cover -100% cover 200%') &&
											CSS.supports('width: anchor-size(--table-sticky inline)') &&
											CSS.supports('timeline-scope: --table-sticky')
										const active =
											supported &&
											matchMedia('(prefers-reduced-motion: no-preference)').matches &&
											viewport.clientWidth >= 768
										const activationValid = [
											...viewport.querySelectorAll('.header-cell-content > [data-scroll-item]'),
										].every(
											band =>
												(getComputedStyle(band).animationName === 'scroll-item-visible-center') ===
												(active && !band.closest('th')?.hasAttribute('data-sticky')),
										)

										return {
											scrollWidth: viewport.scrollWidth,
											verticalOverflow: viewport.scrollHeight > viewport.clientHeight,
											valid:
												activationValid &&
												(active
													? enhanced > 0 && errors.length > 0 && Math.max(...errors) < 1
													: enhanced === 0),
										}
									})
								}),
							)
							.toEqual([
								{ scrollWidth: 1600, verticalOverflow: false, valid: true },
								{ scrollWidth: 1600, verticalOverflow: false, valid: true },
								{ scrollWidth: 1600, verticalOverflow: false, valid: true },
							])
					}
				}
			})
		})
	}
}

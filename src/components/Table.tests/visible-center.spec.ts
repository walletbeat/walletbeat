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
				await expect(page.locator('[data-fixture]')).toHaveCount(4)
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

					for (const [scroll, top] of [
						[0, 0],
						[200, 0],
						[200, 300],
						[200, 1500],
						[2000, 1500],
						[0, 0],
					]) {
						await page.locator('[data-fixture]').evaluateAll(
							(elements, position) => {
								for (const element of elements) {
									element.scrollTo({
										left: position.left,
										top: element.getAttribute('data-fixture') === 'first' ? position.top : 0,
										behavior: 'instant',
									})
								}
							},
							{ left: scroll, top },
						)
						await expect
							.poll(() =>
								page.locator('[data-fixture="first"]').evaluate(element => element.scrollTop),
							)
							.toBe(top)

						// Native capture advances script-disabled pages without awaiting page callbacks.
						if (top) {
							await page.screenshot({ animations: 'allow' })
						}

						await expect
							.poll(async () =>
								page.locator('[data-fixture]').evaluateAll(elements => {
									return elements.map(viewport => {
										const bounds = viewport.getBoundingClientRect()
										const content = viewport.querySelector(':scope > .container')

										if (!(content instanceof HTMLElement)) {
											throw new Error('Missing table content bounds')
										}

										const naturalHeight = Math.max(
											viewport.clientHeight,
											content.getBoundingClientRect().bottom - bounds.top + viewport.scrollTop,
										)
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
											const parent = band.parentElement

											if (!(parent instanceof HTMLElement)) {
												throw new Error('Missing header containing block')
											}

											const parentBounds = parent.getBoundingClientRect()
											const parentStyle = getComputedStyle(parent)
											const area = band.getBoundingClientRect()
											const left =
												parentBounds.left +
												Number.parseFloat(parentStyle.borderLeftWidth) +
												Number.parseFloat(parentStyle.paddingLeft)
											const right = left + area.width
											const insets = style.animationTimeline
												.match(/[-+]?(?:[0-9]*\.)?[0-9]+px/g)
												?.map(Number.parseFloat)

											if (!insets || insets.length !== 2) {
												throw new Error('Missing resolved native timeline insets')
											}

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
											CSS.supports('animation-range: entry') &&
											CSS.supports('width: anchor-size(--table-sticky inline)') &&
											CSS.supports('timeline-scope: --table-sticky')
										const active =
											supported &&
											matchMedia('(prefers-reduced-motion: no-preference)').matches &&
											viewport.clientWidth >= 768 &&
											viewport.getAttribute('data-fixture') !== 'unsupported'
										const activationValid = [
											...viewport.querySelectorAll('.header-cell-content > [data-scroll-item]'),
										].every(
											band =>
												(getComputedStyle(band).animationName === 'scroll-item-visible-center') ===
												(active && !band.closest('th')?.hasAttribute('data-sticky')),
										)
										const measurementsValid = [...viewport.querySelectorAll('thead tr')].every(
											row => {
												const rowBounds = row.getBoundingClientRect()
												const source = sources.find(element => {
													const rect = element.getBoundingClientRect()

													return rect.top < rowBounds.bottom && rect.bottom > rowBounds.top
												})

												if (!active || !source) {
													return row.getAnimations().length === 0
												}

												const probe = source.querySelector('.sticky-size-probe')

												if (!(probe instanceof HTMLElement)) {
													return false
												}

												const pixelInset = Math.ceil(source.getBoundingClientRect().width)

												return (
													row
														.getAnimations()
														.some(
															animation =>
																animation.timeline &&
																'source' in animation.timeline &&
																animation.timeline.source === probe,
														) &&
													probe.scrollTop === 0 &&
													probe.clientHeight === pixelInset &&
													Math.abs(probe.scrollHeight - probe.clientHeight - innerHeight) <= 1 &&
													Math.abs(
														Number.parseFloat(
															getComputedStyle(row).getPropertyValue('---table-sticky-size'),
														) - pixelInset,
													) < 0.0625
												)
											},
										)

										return {
											scrollWidth: viewport.scrollWidth,
											extentValid: Math.abs(viewport.scrollHeight - naturalHeight) < 1,
											valid:
												activationValid &&
												measurementsValid &&
												(active
													? enhanced > 0 && errors.length > 0 && Math.max(...errors) <= 0.6
													: enhanced === 0),
										}
									})
								}),
							)
							.toEqual([
								{ scrollWidth: 1600, extentValid: true, valid: true },
								{ scrollWidth: 1600, extentValid: true, valid: true },
								{ scrollWidth: 1600, extentValid: true, valid: true },
								{ scrollWidth: 1600, extentValid: true, valid: true },
							])
					}
				}
			})
		})
	}
}

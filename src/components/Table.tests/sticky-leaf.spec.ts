import { expect, test } from '../../../tests/browser/verified-test'

for (const javaScriptEnabled of [true, false]) {
	for (const reducedMotion of ['no-preference', 'reduce'] as const) {
		test.describe(`shared sticky leaf, JavaScript ${javaScriptEnabled}, motion ${reducedMotion}`, () => {
			test.use({ javaScriptEnabled, reducedMotion })

			test('shares one leaf width across header and body without changing scroll bounds', async ({
				page,
			}) => {
				await page.goto('/__table-sticky-size')

				for (const width of [1280, 900, 390]) {
					await page.setViewportSize({ width, height: 900 })

					for (const direction of ['ltr', 'rtl']) {
						await page.locator('[data-leaf-fixture]').evaluateAll((elements, dir) => {
							for (const viewport of elements) {
								viewport.setAttribute('dir', dir)
							}
						}, direction)

						for (const scroll of [0, 600, 2000, 0]) {
							await page.locator('[data-leaf-fixture]').evaluateAll((elements, position) => {
								for (const viewport of elements) {
									viewport.scrollLeft =
										viewport.getAttribute('dir') === 'rtl' ? -position : position
								}
							}, scroll)
							await page.screenshot({ animations: 'allow' })
							await expect
								.poll(
									() =>
										page.locator('[data-leaf-fixture]').evaluateAll(
											(elements, requestedScroll) =>
												elements
													.filter(viewport => viewport.getAttribute('data-measure-leaf') === 'true')
													.map(viewport => {
														const name = viewport.getAttribute('data-leaf-fixture')
														const reference = elements.find(
															element =>
																element.getAttribute('data-leaf-fixture') === name &&
																element.getAttribute('data-measure-leaf') === 'false',
														)
														const table = viewport.querySelector('table')
														const referenceTable = reference?.querySelector('table')

														if (
															!(table instanceof HTMLTableElement) ||
															!(referenceTable instanceof HTMLTableElement) ||
															!(reference instanceof HTMLElement)
														) {
															throw new Error('Missing comparison tables')
														}

														const supported =
															CSS.supports('animation-timeline: view(inline)') &&
															CSS.supports('animation-range: entry') &&
															CSS.supports('width: anchor-size(--table-sticky inline)') &&
															CSS.supports('timeline-scope: --table-sticky')
														const eligible = name === 'flat' || name === 'expanded'
														const active = eligible && supported && viewport.clientWidth >= 768
														const allCells = [...table.querySelectorAll<HTMLElement>('th, td')]
														const referenceCells = [
															...referenceTable.querySelectorAll<HTMLElement>('th, td'),
														]
														const naturalWidthsValid =
															allCells.length === referenceCells.length &&
															allCells.every(
																(cell, index) =>
																	Math.abs(
																		cell.getBoundingClientRect().width -
																			referenceCells[index].getBoundingClientRect().width,
																	) < 0.05,
															)
														const cells = allCells.filter(cell =>
															cell.hasAttribute('data-sticky-leaf'),
														)
														const source = table.querySelector<HTMLElement>('th[data-sticky-leaf]')
														const measured = Number.parseFloat(
															getComputedStyle(table).getPropertyValue(
																'--table-stickyLeaf-inlineSize',
															),
														)
														const expected = source
															? Math.ceil(source.getBoundingClientRect().width)
															: 0
														const validCells =
															cells.length === (eligible ? 2 : 0) &&
															cells.every(cell => {
																const style = getComputedStyle(cell)
																const baseline = referenceCells[allCells.indexOf(cell)]

																if (
																	cell.dataset.tableColumn !== 'name' ||
																	Number.parseFloat(
																		style.getPropertyValue('--table-stickyLeaf-inlineSize'),
																	) !== measured
																) {
																	return false
																}

																const nested = [
																	...cell.querySelectorAll<HTMLElement>('[data-sticky]'),
																]
																const baselineNested = [
																	...baseline.querySelectorAll<HTMLElement>('[data-sticky]'),
																]

																if (
																	nested.length !== baselineNested.length ||
																	nested.some((element, index) => {
																		const actualStyle = getComputedStyle(element)
																		const baselineStyle = getComputedStyle(baselineNested[index])

																		return (
																			actualStyle.insetInlineStart !==
																				baselineStyle.insetInlineStart ||
																			actualStyle.insetBlockStart !==
																				baselineStyle.insetBlockStart ||
																			actualStyle.getPropertyValue('--sticky-offset') !==
																				baselineStyle.getPropertyValue('--sticky-offset')
																		)
																	})
																) {
																	return false
																}

																if (!active) {
																	return (
																		style.insetInlineStart ===
																			getComputedStyle(baseline).insetInlineStart &&
																		style.insetInlineEnd ===
																			getComputedStyle(baseline).insetInlineEnd
																	)
																}

																const retained =
																	6 *
																	Number.parseFloat(
																		getComputedStyle(document.documentElement).fontSize,
																	)

																if (
																	requestedScroll >=
																	viewport.scrollWidth - viewport.clientWidth
																) {
																	const rect = cell.getBoundingClientRect()
																	const baselineRect = baseline.getBoundingClientRect()
																	const frame = viewport.getBoundingClientRect()
																	const baselineFrame = reference.getBoundingClientRect()
																	const rtl = viewport.getAttribute('dir') === 'rtl'
																	const extent = rtl
																		? frame.right - rect.left
																		: rect.right - frame.left
																	const start = rtl
																		? baselineFrame.right - baselineRect.right
																		: baselineRect.left - baselineFrame.left

																	if (Math.abs(extent - start - retained) > 1) {
																		return false
																	}
																}

																return (
																	Math.abs(
																		Number.parseFloat(style.insetInlineStart) -
																			(retained - measured),
																	) < 0.1
																)
															})
														const headingClearanceValid = [
															...table.querySelectorAll<HTMLElement>(
																'thead .header-cell-content > [data-sticky-container]',
															),
														].every(container => {
															const cell = container.closest('th')

															if (
																!cell ||
																cell.hasAttribute('data-sticky') ||
																!container.matches(':dir(ltr)')
															) {
																return true
															}

															const index = allCells.indexOf(cell)
															const baseline = referenceCells[index].querySelector<HTMLElement>(
																'.header-cell-content > [data-sticky-container]',
															)

															if (!baseline) {
																throw new Error('Missing heading comparison')
															}

															const compact =
																active &&
																matchMedia('(prefers-reduced-motion: no-preference)').matches &&
																cell.parentElement?.hasAttribute('data-sticky-leaf')
															const expectedMargin = compact
																? '6rem'
																: getComputedStyle(baseline)
																		.getPropertyValue('--sticky-marginInlineStart')
																		.trim()

															return (
																getComputedStyle(container)
																	.getPropertyValue('--sticky-marginInlineStart')
																	.trim() === expectedMargin
															)
														})

														const maxScroll = viewport.scrollWidth - viewport.clientWidth
														const rangeValid =
															maxScroll === reference.scrollWidth - reference.clientWidth &&
															Math.abs(
																Math.abs(viewport.scrollLeft) -
																	Math.min(requestedScroll, maxScroll),
															) < 1 &&
															Math.abs(viewport.scrollLeft - reference.scrollLeft) < 1

														return {
															width: viewport.scrollWidth,
															valid:
																table.hasAttribute('data-sticky-leaf') === eligible &&
																naturalWidthsValid &&
																headingClearanceValid &&
																rangeValid &&
																validCells &&
																(active ? Math.abs(measured - expected) < 0.1 : measured === 0) &&
																(name !== 'empty' || table.tHead?.rows.length === 1),
														}
													}),
											scroll,
										),
									{ timeout: 5000 },
								)
								.toEqual(Array.from({ length: 4 }, () => ({ width: 1600, valid: true })))
						}
					}
				}
			})
		})
	}
}

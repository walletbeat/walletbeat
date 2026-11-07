import {
	observeStickyChain,
	selectStickyChain,
} from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

for (const direction of ['ltr', 'rtl'] as const) {
	for (const kind of ['attribute', 'stage', 'detail'] as const) {
		test(`closed ${kind} fragment activation and retained-hash closure remain readable: ${direction}`, async ({
			page,
			browserName,
		}, info) => {
			test.skip(browserName !== 'chromium', 'Painted pie qualification uses native CDP quads')
			await page.setViewportSize({ width: 390, height: 900 })
			await page.goto('/__wallet-page/software/')
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(async direction => {
				document.documentElement.dir = direction
				await document.fonts.ready
			}, direction)
			const ordinary = await page.evaluate(selectStickyChain)
			const chain =
				kind === 'stage'
					? [
							ordinary[0],
							...(await page.evaluate(() => {
								const stage = document.querySelector(
									'#stages section:has(> details[name="wallet-stages"])',
								)

								if (!stage?.id) {
									throw new Error('A real identified Stage disclosure is required')
								}

								const scope = '#' + CSS.escape(stage.id)

								return [
									{ level: 2, scope: '#stages', heading: '#stages > header h2' },
									{ level: 3, scope, heading: scope + ' > details > summary h3' },
								]
							})),
						]
					: ordinary.slice(0, kind === 'attribute' ? 3 : 4)
			const target = chain.at(-1)!
			const scope = page.locator(target.scope)
			const details = kind === 'detail' ? scope : scope.locator(':scope > details')
			const summary = details.locator(':scope > summary')
			const id = await scope.getAttribute('id')

			expect(id).toBeTruthy()
			const link = summary.locator(`a[href="#${id}"]`).first()

			await expect(link).toHaveCount(1)
			await details.evaluate(element => {
				if (!(element instanceof HTMLDetailsElement)) {
					throw new Error('Native disclosure required')
				}

				for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
					if (ancestor instanceof HTMLDetailsElement) {
						ancestor.open = true
					}
				}
				element.open = false
			})
			const sample = () => page.evaluate(observeStickyChain, chain)
			const settle = async () => {
				let previous = await sample()
				let stable = 0

				await expect
					.poll(
						async () => {
							const current = await sample()
							const pending = await page.evaluate(() =>
								document
									.getAnimations()
									.some(
										animation =>
											animation.timeline instanceof DocumentTimeline &&
											Number.isFinite(animation.effect?.getComputedTiming().endTime) &&
											(animation.pending || animation.playState === 'running'),
									),
							)
							const before = previous.rows.at(-1)!.headingBox
							const after = current.rows.at(-1)!.headingBox

							stable =
								!pending &&
								Math.abs(current.scroll - previous.scroll) < 0.25 &&
								Math.abs(after.top - before.top) < 0.25 &&
								Math.abs(after.left - before.left) < 0.25 &&
								Math.abs(after.width - before.width) < 0.25 &&
								Math.abs(after.height - before.height) < 0.25
									? stable + 1
									: 0
							previous = current

							return stable
						},
						{
							message: 'Native scrolling, disclosure and heading geometry settle together',
							intervals: [100],
						},
					)
					.toBeGreaterThanOrEqual(3)

				return sample()
			}

			await settle()
			await expect(details).not.toHaveAttribute('open')
			const cdp = await page.context().newCDPSession(page)
			const observation = await link.evaluateHandle(element => {
				const root = document.querySelector('#layout')!
				let ends = 0
				let trusted = false
				const onEnd = () => {
					ends++
				}
				const onClick = (event: Event) => {
					trusted = event.isTrusted
				}

				root.addEventListener('scrollend', onEnd)
				element.addEventListener('click', onClick)

				return {
					read: () => ({ ends, trusted }),
					dispose: () => {
						root.removeEventListener('scrollend', onEnd)
						element.removeEventListener('click', onClick)
					},
				}
			})
			const records: unknown[] = []

			try {
				const inspect = async (phase: string) => {
					const state = await settle()
					const { root } = await cdp.send('DOM.getDocument')
					const { nodeId } = await cdp.send('DOM.querySelector', {
						nodeId: root.nodeId,
						selector: '.pie-navigation-geometry > .navigation-items',
					})

					if (!nodeId) {
						throw new Error('Actual painted pie owner is required')
					}

					const { model } = await cdp.send('DOM.getBoxModel', { nodeId })
					const points = Array.from({ length: 4 }, (_, index) => ({
						x: model.border[index * 2],
						y: model.border[index * 2 + 1],
					}))
					const edges = points.map((point, index) => ({
						x: points[(index + 1) % 4].x - point.x,
						y: points[(index + 1) % 4].y - point.y,
					}))
					const sides = edges.map(edge => Math.hypot(edge.x, edge.y))

					expect(sides.every(side => Number.isFinite(side) && side > 0)).toBe(true)
					expect(Math.max(...sides) - Math.min(...sides)).toBeLessThan(0.5)
					expect(
						Math.abs(edges[0].x * edges[1].x + edges[0].y * edges[1].y) / (sides[0] * sides[1]),
					).toBeLessThan(0.001)
					const pieRadiusFraction = await page.locator('.pie-navigation').evaluate(element => {
						const style = getComputedStyle(element)
						const maximum = Number.parseFloat(style.getPropertyValue('--pie-maxR'))
						const padding = Number.parseFloat(style.getPropertyValue('--pie-padding'))

						if (
							!Number.isFinite(maximum) ||
							maximum <= 0 ||
							!Number.isFinite(padding) ||
							padding < 0
						) {
							throw new Error('Finite painted slice radius and padding are required')
						}

						return maximum / (maximum + padding)
					})
					const circle = {
						x: points.reduce((sum, point) => sum + point.x, 0) / 4,
						y: points.reduce((sum, point) => sum + point.y, 0) / 4,
						radius: (sides[0] / 2) * pieRadiusFraction,
					}
					const actual = await page.locator(target.heading).evaluate(
						(heading, precedingSelectors) => {
							const summary = heading.closest('summary')!
							const range = document.createRange()
							const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT)
							const fragments = []

							while (walker.nextNode()) {
								const text = walker.currentNode

								if (
									!text.textContent?.trim() ||
									text.parentElement?.closest('[aria-hidden="true"]')
								) {
									continue
								}

								range.selectNodeContents(text)

								for (const box of range.getClientRects()) {
									if (box.width <= 0 || box.height <= 0) {
										continue
									}

									fragments.push({
										text: text.textContent.trim(),
										box: { top: box.top, bottom: box.bottom, left: box.left, right: box.right },
										ownsHit: [0.1, 0.5, 0.9].every(fraction => {
											const hit = document.elementFromPoint(
												box.left + box.width * fraction,
												box.top + box.height / 2,
											)

											return hit !== null && heading.contains(hit)
										}),
									})
								}
							}
							const root = document.querySelector('#layout')!
							const viewport = root.getBoundingClientRect()
							const ownership = precedingSelectors.map(selector => {
								const precedingHeading = document.querySelector(selector)

								if (!precedingHeading) {
									throw new Error('Preceding heading owner is required')
								}

								const owner = precedingHeading.closest('[data-sticky]')

								if (!owner) {
									throw new Error('Preceding heading must retain its sticky owner')
								}

								const style = getComputedStyle(owner)
								const box = owner.getBoundingClientRect()

								return {
									selector,
									position: style.position,
									visible: owner.checkVisibility({
										opacityProperty: true,
										visibilityProperty: true,
									}),
									intersectsViewport:
										box.bottom > viewport.top &&
										box.top < viewport.bottom &&
										box.right > viewport.left &&
										box.left < viewport.right,
								}
							})

							return {
								fragments,
								ownership,
								hash: location.hash,
								open: summary.parentElement?.hasAttribute('open'),
								visible: heading.checkVisibility({
									opacityProperty: true,
									visibilityProperty: true,
								}),
								sticky: [summary, ...summary.querySelectorAll('[data-sticky]')].filter(
									node => getComputedStyle(node).position === 'sticky',
								).length,
								scroll: document.querySelector('#layout')!.scrollTop,
							}
						},
						chain.slice(0, -1).map(owner => owner.heading),
					)
					const preceding = state.rows.slice(0, -1).filter((row, index) => {
						const owner = actual.ownership[index]

						return (
							owner.position === 'sticky' &&
							owner.visible &&
							owner.intersectsViewport &&
							row.opacity > 0.01 &&
							row.visibility === 'visible' &&
							row.occupiedRow.bottom > 0 &&
							row.occupiedRow.top < state.viewport.height
						)
					})

					expect(
						preceding.length,
						'A real preceding sticky owner participates at the landing',
					).toBeGreaterThan(0)
					const occupiedBottom = Math.max(
						state.siteBottom,
						...preceding.map(row => row.occupiedRow.bottom),
					)

					records.push({ phase, state, circle, actual, occupiedBottom })
					await info.attach(phase, {
						body: JSON.stringify(records.at(-1)),
						contentType: 'application/json',
					})
					expect(Math.abs(actual.scroll - state.scroll), 'One settled geometry batch').toBeLessThan(
						0.25,
					)
					expect(actual.visible).toBe(true)
					expect(actual.fragments.length, 'Visible heading text is required').toBeGreaterThan(0)

					for (const { text, box, ownsHit } of actual.fragments) {
						expect(box.top, text).toBeGreaterThanOrEqual(occupiedBottom - 1)
						expect(box.bottom, text).toBeLessThanOrEqual(state.viewport.height + 1)
						expect(box.left, text).toBeGreaterThanOrEqual(-1)
						expect(box.right, text).toBeLessThanOrEqual(state.viewport.width + 1)
						const x = Math.max(box.left, Math.min(circle.x, box.right))
						const y = Math.max(box.top, Math.min(circle.y, box.bottom))

						expect(
							Math.hypot(x - circle.x, y - circle.y) - circle.radius,
							text + ': painted slice envelope clearance',
						).toBeGreaterThanOrEqual(-1)
						expect(ownsHit, text + ': native title hit ownership').toBe(true)
					}

					return actual
				}
				const before = await page.locator('#layout').evaluate(element => element.scrollTop)

				await link.evaluate(element => element.focus({ preventScroll: true }))
				await page.keyboard.press('Enter')
				await expect.poll(() => decodeURIComponent(new URL(page.url()).hash)).toBe('#' + id)
				await expect(details).toHaveAttribute('open')
				const opened = await inspect('native-fragment-opened')

				expect(opened.scroll - before, 'The anchor delivers a real page journey').toBeGreaterThan(
					100,
				)
				expect(await observation.evaluate(value => value.read())).toEqual({
					ends: expect.any(Number),
					trusted: true,
				})
				expect(
					(await observation.evaluate(value => value.read())).ends,
					'Native fragment scrolling ends',
				).toBeGreaterThan(0)
				await summary.evaluate(element => element.focus({ preventScroll: true }))
				await page.keyboard.press('Space')
				await expect(details).not.toHaveAttribute('open')
				const closed = await inspect('retained-hash-closed')

				expect(closed.hash).toBe(opened.hash)
				expect(closed.open).toBe(false)
				expect(closed.sticky).toBe(0)
			} finally {
				try {
					await info.attach('closed-fragment-journey', {
						body: JSON.stringify({
							kind,
							direction,
							records,
							limits:
								'Native fragment activation starts closed and opens the destination; subsequent native closure retains its hash. The circle measures the slice envelope; hit ownership is separate from visual clearance. Backdrop blur, still-closed wheel snap arrivals, between-frame motion and compositor execution remain separate coverage.',
						}),
						contentType: 'application/json',
					})
				} finally {
					await observation.evaluate(value => value.dispose())
					await observation.dispose()
					await cdp.detach()
				}
			}
		})
	}
}

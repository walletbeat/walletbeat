import { writeFile } from 'node:fs/promises'

import {
	observeStickyChain,
	qualifyNativeBreadcrumbClock,
	selectStickyChain,
} from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 1440]) {
	test(`departing sticky rows preserve painted ancestor hit ownership at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		await expect
			.poll(() => page.evaluate(qualifyNativeBreadcrumbClock))
			.toMatchObject({ resolved: true })
		const qualification = await page.evaluate(qualifyNativeBreadcrumbClock)

		await info.attach('paint-order-clock', {
			body: JSON.stringify(qualification),
			contentType: 'application/json',
		})
		test.skip(
			!qualification.applicable,
			'Enhanced breadcrumb departure requires native resolved scroll clocks',
		)
		const chain = await page.evaluate(selectStickyChain)

		expect(chain.map(owner => owner.level)).toEqual([1, 2, 3, 4])
		const scrollControl = await page.addStyleTag({
			content: '#layout { scroll-snap-type: none !important; }',
		})
		const sample = (requested: number, index: number) =>
			page.evaluate(
				async ({ requested, chain, index }) => {
					const root = document.querySelector<HTMLElement>('#layout')!

					root.scrollTo({ top: requested, behavior: 'instant' })
					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
					const rect = (element: Element) => {
						const { left, right, top, bottom, width, height } = element.getBoundingClientRect()

						return { left, right, top, bottom, width, height }
					}
					const paintTarget = (target: Element, level: number) => {
						const box = rect(target),
							x = box.left + box.width / 2,
							y = box.top + box.height / 2
						let alpha = 1

						for (let element: Element | null = target; element; element = element.parentElement) {
							alpha *= Number(getComputedStyle(element).opacity)
						}
						const visible = target.checkVisibility({
							checkVisibilityCSS: true,
							opacityProperty: true,
						})
						const active =
							alpha > 0.01 &&
							visible &&
							box.width > 0 &&
							box.height > 0 &&
							x >= 0 &&
							x < innerWidth &&
							y >= 0 &&
							y < innerHeight
						const hit = active ? document.elementFromPoint(x, y) : null

						return {
							level,
							box,
							x,
							y,
							alpha,
							visible,
							active,
							owned: !!hit && target.contains(hit),
							hit: hit && {
								tag: hit.tagName,
								text: hit.textContent?.trim().slice(0, 80),
								scope: hit.closest('[data-sticky-breadcrumb~="scope"]')?.id,
							},
						}
					}
					const paint = (owner: (typeof chain)[number]) => {
						const heading = document.querySelector(owner.heading)

						if (!heading) {
							throw new Error('The native chain heading must remain present')
						}

						return paintTarget(heading.querySelector('a') ?? heading, owner.level)
					}
					const persistent = [
						...document.querySelectorAll(
							'#top .wallet-device-controls select, #top button[popovertarget="wallet-toc"], #top .pie-navigation-geometry',
						),
					].map(element => ({
						...paintTarget(element, 0),
						tag: element.tagName,
						label: element.getAttribute('aria-label'),
						kind: element.matches('.pie-navigation-geometry') ? 'pie-envelope' : 'native-control',
					}))
					const owner = chain[index],
						scope = document.querySelector(owner.scope)!,
						heading = document.querySelector(owner.heading)!
					const clocks = []

					for (let element: Element | null = heading; element; element = element.parentElement) {
						for (const animation of element.getAnimations()) {
							if (
								!(animation instanceof CSSAnimation) ||
								!['breadcrumb-backdrop', 'breadcrumb-fade'].includes(animation.animationName) ||
								!(animation.effect instanceof KeyframeEffect) ||
								animation.effect.target !== element ||
								!!animation.effect.pseudoElement ||
								animation.effect.getTiming().direction !== 'reverse'
							) {
								continue
							}

							clocks.push({
								owner: element.tagName,
								name: animation.animationName,
								direction: animation.effect.getTiming().direction,
								pseudoElement: animation.effect.pseudoElement,
								targetIsOwner: animation.effect.target === element,
								progress: animation.effect?.getComputedTiming().progress ?? null,
								native: !!animation.timeline && !(animation.timeline instanceof DocumentTimeline),
								currentTime: animation.currentTime == null ? null : String(animation.currentTime),
								timelineTime:
									animation.timeline?.currentTime == null
										? null
										: String(animation.timeline.currentTime),
							})
						}

						if (element === scope) {
							break
						}
					}

					return {
						requested,
						delivered: root.scrollTop,
						scope: rect(scope),
						outgoing: paint(owner),
						clocks,
						persistent,
						scopeOpen:
							scope instanceof HTMLDetailsElement
								? scope.open
								: (scope.querySelector(':scope > details')?.hasAttribute('open') ?? null),
						hits: chain.slice(0, index).map(paint),
					}
				},
				{ requested, chain, index },
			)

		type Sample = Awaited<ReturnType<typeof sample>>
		const captures: {
			level: number
			mode: string
			start: number
			finish: number
			samples: (Sample & { direction: number })[]
		}[] = []

		try {
			for (const index of [2, 3]) {
				const owner = chain[index]
				const initial = await page.evaluate(observeStickyChain, chain)
				const parentHeight = initial.rows
					.slice(0, index)
					.reduce((sum, row) => sum + row.occupiedRow.bottom - row.occupiedRow.top, 0)
				const estimate =
					initial.scroll + initial.rows[index].scopeBox.bottom - initial.siteBottom - parentHeight

				await sample(estimate, index)
				const reference = await page.evaluate(observeStickyChain, chain)
				const row = reference.rows[index],
					rowHeight = Math.ceil(row.occupiedRow.bottom - row.occupiedRow.top)
				const parentBottom = Math.max(
					reference.siteBottom,
					...reference.rows
						.slice(0, index)
						.filter(
							row =>
								row.opacity > 0.01 &&
								row.occupiedRow.bottom > 0 &&
								row.occupiedRow.top < reference.viewport.height,
						)
						.map(row => row.occupiedRow.bottom),
				)
				const worldBottom = reference.scroll + row.scopeBox.bottom
				let start: number, finish: number
				let mode: string
				let endpoints: { before: Sample; after: Sample }

				if (owner.level === 3) {
					const low = Math.max(0, reference.scroll + row.scopeBox.top - reference.viewport.height)
					const high = Math.min(reference.range, worldBottom + reference.viewport.height)
					const before = await sample(low, index),
						after = await sample(high, index)

					const departedFocus = await page.locator(owner.heading).evaluate(heading => {
						const link = heading.querySelector('a')

						if (!link) {
							throw new Error('The departed heading must retain its native link')
						}

						link.focus({ preventScroll: true })
						const focused = document.activeElement === link

						link.blur()

						return focused
					})

					expect(
						departedFocus,
						'Fully departed headings cannot take invisible keyboard focus',
					).toBe(false)

					for (const endpoint of [before, after]) {
						expect(Math.abs(endpoint.delivered - endpoint.requested)).toBeLessThanOrEqual(1)
						expect(
							endpoint.clocks.some(
								clock =>
									clock.native &&
									clock.progress !== null &&
									clock.currentTime !== null &&
									clock.timelineTime !== null,
							),
							'The outgoing H3 owns a resolved native departure effect',
						).toBe(true)
					}
					expect(
						before.outgoing.alpha,
						'The physical search begins fully painted',
					).toBeGreaterThanOrEqual(0.99)
					expect(after.outgoing.alpha, 'The physical search ends departed').toBeLessThanOrEqual(
						0.01,
					)
					const first = async (threshold: number) => {
						let left = Math.ceil(low),
							right = Math.floor(high)

						while (left < right) {
							const middle = Math.floor((left + right) / 2),
								state = await sample(middle, index)

							expect(Math.abs(state.delivered - middle)).toBeLessThanOrEqual(1)

							if (state.outgoing.alpha <= threshold) {
								right = middle
							} else {
								left = middle + 1
							}
						}

						return left
					}

					start = Math.max(0, (await first(0.99)) - 2)
					finish = Math.min(reference.range, (await first(0.01)) + 2)
					endpoints = { before: await sample(start, index), after: await sample(finish, index) }
					expect(endpoints.before.outgoing.alpha).toBeGreaterThanOrEqual(0.99)
					expect(endpoints.after.outgoing.alpha).toBeLessThanOrEqual(0.01)
					mode = 'native-full-paint-to-departed'
				} else {
					expect(rowHeight, 'Native H4 contact requires a nonempty measured row').toBeGreaterThan(0)
					start = Math.max(0, Math.floor(worldBottom - parentBottom - rowHeight - 2))
					finish = Math.min(reference.range, Math.ceil(worldBottom - parentBottom + 2))
					endpoints = { before: await sample(start, index), after: await sample(finish, index) }
					expect(endpoints.before.scope.bottom).toBeGreaterThan(parentBottom)
					expect(endpoints.after.scope.bottom).toBeLessThanOrEqual(parentBottom)
					mode = 'physical-H4-contact-only-no-full-fade-claim'
				}

				const capture: (typeof captures)[number] = {
					level: owner.level,
					mode,
					start,
					finish,
					samples: [],
				}

				captures.push(capture)
				const windowPath = info.outputPath(`level-${owner.level}-native-window.json`)

				await writeFile(
					windowPath,
					JSON.stringify(
						{
							owner,
							mode,
							start,
							finish,
							span: finish - start,
							rowHeight,
							parentBottom,
							reference,
							endpoints,
						},
						null,
						2,
					),
				)
				await info.attach(`level-${owner.level}-native-window`, {
					path: windowPath,
					contentType: 'application/json',
				})

				for (const direction of [1, -1]) {
					await test.step(`level ${owner.level}: ${direction === 1 ? 'forward' : 'reverse'} one-pixel departure`, async () => {
						for (
							let requested = direction === 1 ? start : finish;
							direction === 1 ? requested <= finish : requested >= start;
							requested += direction
						) {
							capture.samples.push({ ...(await sample(requested, index)), direction })
						}
					})
				}
			}
		} finally {
			try {
				await info.attach('native-departure-paint-order', {
					body: JSON.stringify({
						captures,
						limits:
							'Native one-pixel seeks in both directions; snap disabled only. H3 requires native full-paint/departed endpoint qualification. H4 certifies physical contact samples only. Hit centers do not certify full raster coverage, clipping correctness, smoothness, or performance.',
					}),
					contentType: 'application/json',
				})
			} finally {
				await scrollControl.evaluate(element => element.parentNode?.removeChild(element))
			}
		}

		for (const capture of captures) {
			for (const direction of [1, -1]) {
				const states = capture.samples.filter(sample => sample.direction === direction)

				expect(states.length).toBeGreaterThan(0)

				if (capture.level === 3) {
					const ordered = direction === 1 ? states : [...states].reverse()

					expect(ordered[0].outgoing.alpha).toBeGreaterThanOrEqual(0.99)
					expect(ordered.at(-1)!.outgoing.alpha).toBeLessThanOrEqual(0.01)
				}
			}

			for (const state of capture.samples) {
				expect(
					Math.abs(state.delivered - state.requested),
					'Native delivery preserves the one-pixel window',
				).toBeLessThanOrEqual(1)

				for (const hit of state.hits.filter(hit => hit.active)) {
					expect(
						hit.owned,
						`Outgoing H${capture.level}, direction ${state.direction}, requested ${state.requested}, delivered ${state.delivered}: H${hit.level} hit ${JSON.stringify(hit.hit)}`,
					).toBe(true)
				}
			}
			expect(
				capture.samples.some(state => state.hits.some(hit => hit.active)),
				'The window includes painted ancestor targets',
			).toBe(true)
		}
	})
}

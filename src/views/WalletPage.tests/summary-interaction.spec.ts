import { observeStickyChain } from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 1440]) {
	test(`painted summary surfaces preserve native pointer and keyboard interaction at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		await page.evaluate(() => {
			const details = document.createElement('details')

			details.setAttribute('data-native-summary-calibration', '')
			details.open = true
			details.style.cssText =
				'position:fixed;left:8px;top:80px;width:240px;z-index:2147483647;background:white;color:black;padding:8px'
			details.innerHTML =
				'<summary>Native disclosure control</summary><p>Native disclosure body</p>'
			document.body.append(details)
		})
		const control = page.locator('[data-native-summary-calibration]')
		let nativeSpaceActive: boolean

		try {
			const nativeSummary = control.locator(':scope > summary')

			await nativeSummary.hover()
			await page.mouse.down()
			const pointerActive = await nativeSummary.evaluate(element => element.matches(':active'))

			expect(pointerActive, 'The control observes native pointer activation').toBe(true)
			await page.mouse.up()
			await expect(control).not.toHaveAttribute('open')
			await nativeSummary.evaluate(element => element.focus({ preventScroll: true }))
			await expect(nativeSummary).toBeFocused()
			await page.keyboard.down('Space')
			nativeSpaceActive = await nativeSummary.evaluate(element => element.matches(':active'))
			await page.keyboard.up('Space')
			await expect(control).toHaveAttribute('open')
			await info.attach('native-summary-Space-calibration', {
				body: JSON.stringify({
					pointerActive,
					closedBeforeSpace: true,
					nativeSpaceActive,
					openedAfterRelease: true,
				}),
				contentType: 'application/json',
			})
		} finally {
			await control.evaluate(element => element.remove())
		}

		const owners = await page.evaluate(() => {
			const selectors = [
				'.security-news .news-items summary:has(h3)',
				'.attribute > details > summary:has(h3)',
				'#stages section > details > summary:has(h3)',
				'.attribute-accordions > details > summary:has(h4)',
			]

			return selectors.map(selector => {
				const summary = document.querySelector(selector)!

				if (!summary) {
					throw new Error(`Missing real summary class: ${selector}`)
				}

				const details = summary.parentElement!
				const scope = details.id
					? `#${CSS.escape(details.id)}`
					: details.parentElement?.id
						? `#${CSS.escape(details.parentElement.id)} > details`
						: null

				if (!scope) {
					throw new Error(`Summary scope needs a stable real selector: ${selector}`)
				}

				const ownsPosition = summary.matches('[data-sticky-breadcrumb~="position"]')
				const stickyScope = ownsPosition
					? (summary.closest('[data-sticky-breadcrumb~="scope"]') ?? details)
					: details
				const ownsEntryClock =
					ownsPosition &&
					summary
						.getAnimations()
						.some(
							animation =>
								animation instanceof CSSAnimation && animation.animationName === 'breadcrumb-entry',
						)

				if (!stickyScope.id) {
					throw new Error(`Sticky scope needs a real id: ${selector}`)
				}

				return {
					scope: `#${CSS.escape(stickyScope.id)}`,
					phaseProducer: ownsEntryClock ? 'breadcrumb-entry' : 'native-sticky',
					summary: `${scope} > summary`,
					heading: `${scope} > summary :is(h2,h3,h4)`,
					level: Number(summary.querySelector('h2,h3,h4')!.tagName.slice(1)),
				}
			})
		})

		for (const owner of owners) {
			for (const phase of ['natural', 'sticky']) {
				const summary = page.locator(owner.summary)
				const delegated = await summary.evaluate(element =>
					element.matches('[data-sticky-breadcrumb~="position"]:has(> header > [data-row])'),
				)
				const pressOwner = delegated
					? summary.locator(':scope > header > [data-row]').first()
					: summary

				await summary.evaluate(async element => {
					const changed: HTMLDetailsElement[] = []

					for (
						let owner: Element | null = element.parentElement;
						owner;
						owner = owner.parentElement
					) {
						if (owner instanceof HTMLDetailsElement && !owner.open) {
							owner.open = true
							changed.push(owner)
						}
					}
					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)

					for (const owner of changed) {
						const animations = owner
							.getAnimations({ subtree: true })
							.filter(
								animation =>
									animation.timeline instanceof DocumentTimeline &&
									animation.playState !== 'finished' &&
									Number.isFinite(animation.effect?.getComputedTiming().endTime),
							)
						let timer: ReturnType<typeof setTimeout> | undefined

						try {
							await Promise.race([
								Promise.all(animations.map(animation => animation.finished.catch(() => undefined))),
								new Promise((_, reject) => {
									timer = setTimeout(
										() =>
											reject(
												new Error(
													'Native disclosure setup did not finish: ' +
														owner.id +
														' ' +
														JSON.stringify(
															animations.map(animation => ({
																state: animation.playState,
																time: String(animation.currentTime),
																timing: animation.effect?.getComputedTiming(),
															})),
														),
												),
											),
										3000,
									)
								}),
							])
						} finally {
							if (timer) {
								clearTimeout(timer)
							}
						}
					}
				})
				owner.phaseProducer = await summary.evaluate(element =>
					element.matches('[data-sticky-breadcrumb~="position"]') &&
					element
						.getAnimations()
						.some(
							animation =>
								animation instanceof CSSAnimation && animation.animationName === 'breadcrumb-entry',
						)
						? 'breadcrumb-entry'
						: 'native-sticky',
				)
				const travel = await summary.evaluate(element => {
					const root = document.querySelector<HTMLElement>('#layout')!

					root.style.scrollSnapType = 'none'
					const scope = element.matches('[data-sticky-breadcrumb~="position"]')
						? (element.closest('[data-sticky-breadcrumb~="scope"]') ?? element.parentElement!)
						: element.parentElement!

					return {
						natural: Math.max(0, root.scrollTop + scope.getBoundingClientRect().top - 300),
						end: Math.min(
							root.scrollHeight - root.clientHeight,
							root.scrollTop + scope.getBoundingClientRect().bottom - 25,
						),
						step: Math.max(
							20,
							Math.ceil(
								(
									element.querySelector('h2,h3,h4')!.closest('[data-sticky~="backdrop-self"]') ??
									element.querySelector('h2,h3,h4')!
								).getBoundingClientRect().height,
							),
						),
					}
				})
				const seek = async (top: number) => {
					await page.locator('#layout').evaluate(async (root, top) => {
						root.scrollTo({ top, behavior: 'instant' })
						await new Promise<void>(resolve =>
							requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
						)
					}, top)

					return page.evaluate(observeStickyChain, [owner])
				}
				let observed = await seek(travel.natural)
				const phaseSamples = [observed]

				if (phase === 'sticky') {
					let witnessed = false

					for (let attempt = 0; attempt < 20 && observed.scroll + 20 <= travel.end; attempt++) {
						observed = await seek(
							Math.min(travel.end - 20, travel.natural + (attempt + 1) * travel.step),
						)
						const next = await seek(observed.scroll + 20)

						phaseSamples.push(observed, next)
						const state = await summary.evaluate(element => {
							const style = getComputedStyle(element)
							let row = element.querySelector('h2,h3,h4')

							while (row && row !== element.parentElement) {
								if (getComputedStyle(row).position === 'sticky') {
									break
								}

								row = row.parentElement
							}

							return {
								position: row && element.contains(row) ? getComputedStyle(row).position : null,
								entry: style.getPropertyValue('---breadcrumb-entry').trim(),
							}
						})

						if (
							next.scroll - observed.scroll >= 19 &&
							Math.abs(next.rows[0].occupiedRow.top - observed.rows[0].occupiedRow.top) <= 1 &&
							next.rows[0].occupiedRow.bottom > 0 &&
							next.rows[0].occupiedRow.top < 900 &&
							state.position === 'sticky' &&
							(owner.phaseProducer === 'native-sticky' || state.entry === '1')
						) {
							observed = next
							witnessed = true
							break
						}
					}
					await info.attach(`${owner.level}-sticky-phase`, {
						body: JSON.stringify(phaseSamples),
						contentType: 'application/json',
					})
					expect(
						witnessed,
						`${owner.scope}: delivered native movement must establish a visible sticky plateau`,
					).toBe(true)
				} else {
					const state = await summary.evaluate(element => {
						const style = getComputedStyle(element)

						return {
							entry: style.getPropertyValue('---breadcrumb-entry').trim(),
							top: element.getBoundingClientRect().top,
							inset: parseFloat(style.top),
						}
					})

					if (owner.phaseProducer === 'breadcrumb-entry') {
						expect(state.entry, `${owner.scope}: natural phase precedes its own entry clock`).toBe(
							'0',
						)
					}

					expect(
						state.top,
						`${owner.scope}: natural summary remains below its sticky inset`,
					).toBeGreaterThan((Number.isFinite(state.inset) ? state.inset : 0) + 10)
				}

				const coordinateWitness = await page.evaluate(() => {
					const root = document.querySelector('#layout')

					if (!root) {
						throw new Error('The page scroll owner is required')
					}

					const { x, y, width, height } = root.getBoundingClientRect()

					return {
						windowScroll: { x: scrollX, y: scrollY },
						root: { x, y, width, height },
						rootScroll: root.scrollTop,
					}
				})
				const point = await summary.evaluate(
					(element, { observedRow, phase }) => {
						const position = element.closest('[data-sticky-breadcrumb~="position"]') ?? element
						const paintOwners = [
							position,
							...position.querySelectorAll(
								'[data-sticky~="backdrop-self"], [data-sticky~="backdrop-before"], [data-sticky~="backdrop-after"]',
							),
						]

						for (const owner of paintOwners) {
							for (
								let ancestor: Element | null = owner;
								ancestor;
								ancestor = ancestor.parentElement
							) {
								const style = getComputedStyle(ancestor)
								const matrix =
									style.transform === 'none' ? new DOMMatrix() : new DOMMatrix(style.transform)

								if (
									!matrix.is2D ||
									Math.abs(matrix.a - 1) > 0.0001 ||
									Math.abs(matrix.d - 1) > 0.0001 ||
									Math.abs(matrix.b) > 0.0001 ||
									Math.abs(matrix.c) > 0.0001 ||
									!['none', '1', '1 1'].includes(style.scale) ||
									!['none', '0deg'].includes(style.rotate)
								) {
									throw new Error(
										'Inconclusive painted bounds: nonidentity ancestor linear transform ' +
											JSON.stringify({
												paintOwner: {
													tag: owner.tagName,
													class: owner.getAttribute('class'),
													sticky: owner.getAttribute('data-sticky'),
												},
												ancestor: {
													tag: ancestor.tagName,
													id: ancestor.id,
													class: ancestor.className,
													sticky: ancestor.getAttribute('data-sticky'),
													breadcrumb: ancestor.getAttribute('data-sticky-breadcrumb'),
													active: ancestor.matches(':active'),
												},
												nativePress: {
													delegatedMatch: ancestor.matches(
														'summary:active:where(:not(:has(:where([data-pressable], [role="button"], summary, a, select, option, button, input, label:has(> input:is([type="checkbox"], [type="radio"]), button)):active))) > header > [data-row]',
													),
													summaryActive: ancestor.closest('summary')?.matches(':active'),
													activeDescendants: [
														...(ancestor.closest('summary')?.querySelectorAll(':active') ?? []),
													].map(active => ({
														tag: active.tagName,
														href: active.getAttribute('href'),
													})),
													focused: document.activeElement && {
														tag: document.activeElement.tagName,
														id: document.activeElement.id,
														href: document.activeElement.getAttribute('href'),
													},
												},
												transform: style.transform,
												scale: style.scale,
												rotate: style.rotate,
												matrix: {
													is2D: matrix.is2D,
													a: matrix.a,
													b: matrix.b,
													c: matrix.c,
													d: matrix.d,
													e: matrix.e,
													f: matrix.f,
												},
												finiteAnimations: ancestor
													.getAnimations()
													.filter(
														animation =>
															animation.timeline instanceof DocumentTimeline &&
															Number.isFinite(animation.effect?.getComputedTiming().endTime),
													)
													.map(animation => ({
														name:
															animation instanceof CSSAnimation ? animation.animationName : null,
														playState: animation.playState,
														currentTime: animation.currentTime,
														progress: animation.effect?.getComputedTiming().progress,
														endTime: animation.effect?.getComputedTiming().endTime,
													})),
											}),
									)
								}
							}
						}
						const glyphs: DOMRect[] = []
						const walker = document.createTreeWalker(position, NodeFilter.SHOW_TEXT)

						while (walker.nextNode()) {
							if (walker.currentNode.textContent?.trim()) {
								const range = document.createRange()

								range.selectNodeContents(walker.currentNode)
								glyphs.push(...range.getClientRects())
							}
						}
						const surfaces = observedRow.surfaces.map(surface => {
							if ('source' in surface && surface.source === 'actual-backdrop-self') {
								return {
									left: surface.left,
									right: surface.right,
									top: surface.top,
									bottom: surface.bottom,
								}
							}

							if (!('inputs' in surface)) {
								throw new Error('Projected pseudo inputs are unavailable')
							}

							const matrix =
								surface.inputs.transform === 'none'
									? new DOMMatrix()
									: new DOMMatrix(surface.inputs.transform)

							if (!matrix.is2D || Math.abs(matrix.b) > 0.0001 || Math.abs(matrix.c) > 0.0001) {
								throw new Error('Inconclusive painted bounds: non-axis-aligned pseudo')
							}

							if (!Number.isFinite(surface.left) || !Number.isFinite(surface.right)) {
								throw new Error('Painted horizontal bounds are unavailable')
							}

							return {
								left: surface.left,
								right: surface.right,
								top: surface.top,
								bottom: surface.bottom,
							}
						})

						if (!surfaces.length && phase === 'sticky') {
							for (const leaf of element.querySelectorAll('[data-sticky-breadcrumb~="end"] *')) {
								if (
									leaf.children.length ||
									!leaf.textContent?.trim() ||
									leaf.closest('a,button,select,input,[role="button"]')
								) {
									continue
								}

								const style = getComputedStyle(leaf)

								if (style.visibility !== 'visible' || Number(style.opacity) <= 0.01) {
									continue
								}

								const range = document.createRange()

								range.selectNodeContents(leaf)

								for (const box of range.getClientRects()) {
									if (!(box.width > 0 && box.height > 0)) {
										continue
									}

									const x = (box.left + box.right) / 2,
										y = (box.top + box.bottom) / 2

									if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) {
										continue
									}

									const hit = document.elementFromPoint(x, y)

									return {
										kind: 'end-content-control',
										x,
										y,
										hit: hit?.tagName,
										summaryHit: hit?.closest('summary') === element,
										text: leaf.textContent,
									}
								}
							}

							for (const end of element.querySelectorAll('[data-sticky-breadcrumb~="end"]')) {
								const box = end.getBoundingClientRect(),
									pseudo = getComputedStyle(end, '::after')
								const width = parseFloat(pseudo.width),
									height = parseFloat(pseudo.height)
								const origin = pseudo.transformOrigin.split(/\s+/).map(parseFloat)

								if (
									end.textContent?.trim() ||
									[...end.children].some(child => child.getClientRects().length) ||
									getComputedStyle(end).display === 'contents'
								) {
									continue
								}

								if (
									!pseudo.content ||
									['none', 'normal'].includes(pseudo.content) ||
									pseudo.visibility !== 'visible' ||
									Number(pseudo.opacity) <= 0.01 ||
									!pseudo.maskImage ||
									pseudo.maskImage === 'none'
								) {
									continue
								}

								if (
									!Number.isFinite(width) ||
									!Number.isFinite(height) ||
									!(width > 0 && height > 0) ||
									Math.abs(width - box.width) > 0.125 ||
									Math.abs(height - box.height) > 0.125
								) {
									continue
								}

								if (
									origin.length < 2 ||
									!origin.every(Number.isFinite) ||
									Math.abs(origin[0] - width / 2) > 0.125 ||
									Math.abs(origin[1] - height / 2) > 0.125
								) {
									continue
								}

								if (
									pseudo.transform !== 'none' ||
									pseudo.translate !== 'none' ||
									!['none', '1', '1 1'].includes(pseudo.scale) ||
									!['none', '0deg', 'x 180deg', 'x 0deg'].includes(pseudo.rotate)
								) {
									continue
								}

								const x = (box.left + box.right) / 2,
									y = (box.top + box.bottom) / 2

								if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) {
									continue
								}

								const hit = document.elementFromPoint(x, y)

								return {
									kind: 'end-chevron-control',
									x,
									y,
									hit: hit?.tagName,
									summaryHit: hit?.closest('summary') === element,
									control: {
										box: { x: box.x, y: box.y, width: box.width, height: box.height },
										width,
										height,
										rotate: pseudo.rotate,
										mask: pseudo.maskImage,
									},
								}
							}
							throw new Error(
								'Sticky Summary has no owned painted padding and no independently measurable visible END chevron control',
							)
						}

						if (!surfaces.length) {
							const painted = position.querySelector('[data-sticky~="backdrop-self"]') ?? position
							const style = getComputedStyle(painted)
							const card = element.closest('[data-card]')
							const cardStyle = card ? getComputedStyle(card) : null

							if (
								style.backgroundColor === 'rgba(0, 0, 0, 0)' &&
								(!cardStyle || cardStyle.backgroundColor === 'rgba(0, 0, 0, 0)')
							) {
								throw new Error('No actual painted summary surface')
							}

							const b = painted.getBoundingClientRect()
							const cardBox = card?.getBoundingClientRect() ?? b

							surfaces.push({
								left: Math.max(b.left, cardBox.left),
								right: Math.min(b.right, cardBox.right),
								top: Math.max(b.top, cardBox.top),
								bottom: Math.min(b.bottom, cardBox.bottom),
							})
						}

						for (const surface of surfaces) {
							const top = Math.max(surface.top, 0),
								bottom = Math.min(surface.bottom, innerHeight)

							if (
								!(bottom > top) ||
								!(Math.min(innerWidth, surface.right) > Math.max(0, surface.left))
							) {
								throw new Error('Inconclusive painted bounds: empty visible intersection')
							}

							const inset = Math.min(3, (bottom - top) / 2)

							const uniformPrincipalSurface = paintOwners.some(owner => {
								const box = owner.getBoundingClientRect()

								if (
									Math.max(
										Math.abs(box.left - surface.left),
										Math.abs(box.right - surface.right),
										Math.abs(box.top - surface.top),
										Math.abs(box.bottom - surface.bottom),
									) > 0.125
								) {
									return false
								}

								const paints = [
									...(owner.matches('[data-sticky~="backdrop-self"]')
										? [getComputedStyle(owner)]
										: []),
									...(owner.matches('[data-sticky~="backdrop-before"]')
										? [getComputedStyle(owner, '::before')]
										: []),
									...(owner.matches('[data-sticky~="backdrop-after"]')
										? [getComputedStyle(owner, '::after')]
										: []),
								]

								return paints.some(style =>
									[
										style.borderTopRightRadius,
										style.borderBottomRightRadius,
										style.borderBottomLeftRadius,
									].every(radius => radius === style.borderTopLeftRadius),
								)
							})
							const centerY = (surface.top + surface.bottom) / 2
							const centerX = (surface.left + surface.right) / 2
							const candidateY = uniformPrincipalSurface
								? [
										centerY,
										...Array.from(
											{ length: Math.max(0, Math.ceil((bottom - top - 2 * inset) / 4)) },
											(_, index) => top + inset + index * 4,
										),
									]
								: [top + inset, bottom - inset, (top + bottom) / 2]

							for (const y of candidateY) {
								if (y < top || y > bottom) {
									continue
								}

								const candidateX =
									uniformPrincipalSurface && y !== centerY
										? [centerX]
										: Array.from(
												{
													length: Math.max(
														0,
														Math.ceil(
															(Math.min(innerWidth, surface.right) -
																4 -
																(Math.max(0, surface.left) + 4)) /
																4,
														),
													),
												},
												(_, index) => Math.max(0, surface.left) + 4 + index * 4,
											)

								for (const x of candidateX) {
									if (
										glyphs.some(
											rect =>
												x >= rect.left - 2 &&
												x <= rect.right + 2 &&
												y >= rect.top - 2 &&
												y <= rect.bottom + 2,
										)
									) {
										continue
									}

									const hit = document.elementFromPoint(x, y)

									if (hit?.closest('a,button,select,input')) {
										continue
									}

									return {
										kind: 'painted-padding',
										x,
										y,
										hit: hit?.tagName,
										summaryHit: hit?.closest('summary') === element,
									}
								}
							}
						}

						return null
					},
					{ observedRow: observed.rows[0], phase },
				)

				await info.attach(`${owner.level}-${phase}-painted-hit`, {
					body: JSON.stringify({ owner, phase, observed, coordinateWitness, point }, null, 2),
					contentType: 'application/json',
				})
				expect(
					point,
					'An actual painted-padding or independently measured chevron control witness exists',
				).not.toBeNull()
				expect(point!.summaryHit, `${point!.kind} must hit its summary, not ${point!.hit}`).toBe(
					true,
				)
				const nativeSummaryBox = await summary.boundingBox()

				await page.mouse.move(point!.x, point!.y)
				await page.mouse.down()
				await expect
					.poll(() =>
						summary.evaluate(element => ({
							active: element.matches(':active'),
							scale: getComputedStyle(element).scale,
						})),
					)
					.toMatchObject({ active: true })
				await expect
					.poll(() => pressOwner.evaluate(element => parseFloat(getComputedStyle(element).scale)))
					.toBeLessThan(1)
				await expect
					.poll(() => pressOwner.evaluate(element => Number(getComputedStyle(element).opacity)))
					.toBeLessThan(1)

				if (delegated) {
					await expect
						.poll(() => summary.evaluate(element => getComputedStyle(element).scale))
						.toMatch(/^(none|1(?: 1)?)$/)
					await expect
						.poll(() => summary.evaluate(element => Number(getComputedStyle(element).opacity)))
						.toBe(1)
				}

				if (delegated) {
					const heldSummaryBox = await summary.boundingBox()

					await info.attach(`${owner.level}-${phase}-native-summary-hit area`, {
						body: JSON.stringify({ before: nativeSummaryBox, held: heldSummaryBox }),
						contentType: 'application/json',
					})
					expect(nativeSummaryBox).not.toBeNull()
					expect(heldSummaryBox).not.toBeNull()

					for (const axis of ['x', 'y', 'width', 'height'] as const) {
						expect(
							Math.abs(heldSummaryBox![axis] - nativeSummaryBox![axis]),
							`The native Summary ${axis} stays stable during delegated feedback`,
						).toBeLessThanOrEqual(1)
					}
				}

				await page.mouse.up()
				await expect
					.poll(() =>
						summary.evaluate(element => {
							const details = element.parentElement

							if (!(details instanceof HTMLDetailsElement)) {
								throw new Error('The Summary owner must be native details')
							}

							return details.open
						}),
					)
					.toBe(false)
				await summary.evaluate(async element => {
					await Promise.allSettled(
						element
							.parentElement!.getAnimations({ subtree: true })
							.filter(
								animation =>
									animation.timeline === document.timeline &&
									Number.isFinite(animation.effect?.getComputedTiming().endTime),
							)
							.map(animation => animation.finished),
					)
				})
				await expect
					.poll(() => pressOwner.evaluate(element => getComputedStyle(element).scale))
					.toMatch(/^(none|1(?: 1)?)$/)
				await expect
					.poll(() => pressOwner.evaluate(element => Number(getComputedStyle(element).opacity)))
					.toBe(1)
				const closedPoint = await summary.evaluate(element => {
					const box = element.getBoundingClientRect()
					const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
					const glyphs: DOMRect[] = []

					while (walker.nextNode()) {
						if (!walker.currentNode.textContent?.trim()) {
							continue
						}

						const range = document.createRange()

						range.selectNodeContents(walker.currentNode)
						glyphs.push(...range.getClientRects())
					}

					for (const fy of [0.1, 0.9, 0.5]) {
						for (const fx of [0.1, 0.9, 0.5]) {
							const x = box.left + box.width * fx,
								y = box.top + box.height * fy

							if (
								x < 0 ||
								x >= innerWidth ||
								y < 0 ||
								y >= innerHeight ||
								glyphs.some(g => x >= g.left && x <= g.right && y >= g.top && y <= g.bottom)
							) {
								continue
							}

							const hit = document.elementFromPoint(x, y)

							if (
								hit?.closest('summary') === element &&
								!hit.closest('a,button,select,input,label,[role="button"],[data-pressable]')
							) {
								return { x, y, hit: hit.tagName }
							}
						}
					}
					throw new Error(
						'Closed Summary requires an actual native bare-padding hit: ' +
							JSON.stringify({
								box: { x: box.x, y: box.y, width: box.width, height: box.height },
								rootScroll: document.querySelector('#layout')?.scrollTop,
								windowScrollY: scrollY,
								entry: getComputedStyle(element).getPropertyValue('---breadcrumb-entry'),
								parentOpen: element.parentElement?.hasAttribute('open'),
								ancestors: [element, ...element.querySelectorAll('header, [data-sticky]')].map(
									owner => ({
										tag: owner.tagName,
										sticky: owner.getAttribute('data-sticky'),
										pointerEvents: getComputedStyle(owner).pointerEvents,
										visibility: getComputedStyle(owner).visibility,
										opacity: getComputedStyle(owner).opacity,
										box: {
											x: owner.getBoundingClientRect().x,
											y: owner.getBoundingClientRect().y,
											width: owner.getBoundingClientRect().width,
											height: owner.getBoundingClientRect().height,
										},
									}),
								),
								candidates: [0.1, 0.9, 0.5].flatMap(fy =>
									[0.1, 0.9, 0.5].map(fx => {
										const x = box.left + box.width * fx,
											y = box.top + box.height * fy,
											hit = document.elementFromPoint(x, y)

										return { x, y, hit: hit?.outerHTML.slice(0, 400) }
									}),
								),
							}),
					)
				})

				await page.mouse.move(closedPoint.x, closedPoint.y)
				await page.mouse.down()

				try {
					await expect
						.poll(() => summary.evaluate(element => element.matches(':active')))
						.toBe(true)
					await expect
						.poll(() => pressOwner.evaluate(element => parseFloat(getComputedStyle(element).scale)))
						.toBeLessThan(1)
					await expect
						.poll(() => pressOwner.evaluate(element => Number(getComputedStyle(element).opacity)))
						.toBeLessThan(1)
				} finally {
					await page.mouse.up()
				}

				await expect(summary.locator('..')).toHaveAttribute('open')
				await summary.press('Space')
				await expect(summary.locator('..')).not.toHaveAttribute('open')
				await summary.evaluate(element => element.focus({ preventScroll: true }))
				await expect(summary).toBeFocused()
				await expect
					.poll(() => pressOwner.evaluate(element => getComputedStyle(element).scale))
					.toMatch(/^(none|1(?: 1)?)$/)

				await expect
					.poll(() => pressOwner.evaluate(element => Number(getComputedStyle(element).opacity)))
					.toBe(1)
				await page.keyboard.down('Space')
				expect(await summary.evaluate(element => element.matches(':active'))).toBe(
					nativeSpaceActive,
				)

				if (nativeSpaceActive) {
					await expect
						.poll(() => pressOwner.evaluate(element => parseFloat(getComputedStyle(element).scale)))
						.toBeLessThan(1)
					await expect
						.poll(() => pressOwner.evaluate(element => Number(getComputedStyle(element).opacity)))
						.toBeLessThan(1)
				} else {
					await expect
						.poll(() => pressOwner.evaluate(element => getComputedStyle(element).scale))
						.toMatch(/^(none|1(?: 1)?)$/)
					await expect
						.poll(() => pressOwner.evaluate(element => Number(getComputedStyle(element).opacity)))
						.toBe(1)
				}

				if (delegated) {
					await expect
						.poll(() => summary.evaluate(element => getComputedStyle(element).scale))
						.toMatch(/^(none|1(?: 1)?)$/)
					await expect
						.poll(() => summary.evaluate(element => Number(getComputedStyle(element).opacity)))
						.toBe(1)
				}

				await page.keyboard.up('Space')
				await expect
					.poll(() =>
						summary.evaluate(element => {
							const details = element.parentElement

							if (!(details instanceof HTMLDetailsElement)) {
								throw new Error('The Summary owner must be native details')
							}

							return details.open
						}),
					)
					.toBe(true)
				const anchor = summary.locator('a[href]').first()

				await expect
					.poll(() => pressOwner.evaluate(element => getComputedStyle(element).scale))
					.toMatch(/^(none|1(?: 1)?)$/)
				await expect(anchor).toBeVisible()
				await anchor.evaluate(element => {
					document.addEventListener(
						'pointerdown',
						event => {
							const box = element.getBoundingClientRect()

							element.setAttribute(
								'data-probe-pointer',
								JSON.stringify({
									x: event.clientX,
									y: event.clientY,
									target:
										event.target instanceof Element ? event.target.outerHTML.slice(0, 500) : null,
									anchor: { x: box.x, y: box.y, width: box.width, height: box.height },
									pathContainsAnchor: event.composedPath().includes(element),
								}),
							)
						},
						{ once: true, capture: true },
					)
				})
				await anchor.hover()
				await page.mouse.down()
				await info.attach('anchor-pointer-admission', {
					body: (await anchor.getAttribute('data-probe-pointer')) ?? 'No pointerdown observed',
					contentType: 'application/json',
				})
				await anchor.evaluate(element => element.removeAttribute('data-probe-pointer'))
				await expect.poll(() => anchor.evaluate(element => element.matches(':active'))).toBe(true)
				await expect
					.poll(() => anchor.evaluate(element => parseFloat(getComputedStyle(element).scale)))
					.toBeLessThan(1)
				await expect
					.poll(() => anchor.evaluate(element => Number(getComputedStyle(element).opacity)))
					.toBeLessThan(1)
				await expect
					.poll(() => pressOwner.evaluate(element => getComputedStyle(element).scale))
					.toMatch(/^(none|1(?: 1)?)$/)
				await page.mouse.move(0, 0)
				await page.mouse.up()
				await expect
					.poll(() =>
						summary.evaluate(element => {
							const details = element.parentElement

							if (!(details instanceof HTMLDetailsElement)) {
								throw new Error('The Summary owner must be native details')
							}

							return details.open
						}),
					)
					.toBe(true)

				if (
					delegated &&
					phase === 'natural' &&
					(await summary.locator(':scope > [data-sticky-breadcrumb~="support"]').count()) > 0
				) {
					await summary.evaluate(element => {
						const support = element.querySelector(':scope > [data-sticky-breadcrumb~="support"]')

						if (!support) {
							throw new Error('The structural summary needs real support content')
						}

						const walker = document.createTreeWalker(support, NodeFilter.SHOW_TEXT)
						let text = walker.nextNode()

						while (text) {
							if (text.textContent?.trim() && !text.parentElement?.closest('a')) {
								break
							}

							text = walker.nextNode()
						}

						if (!text) {
							throw new Error('The support content needs real text outside an existing link')
						}

						const link = document.createElement('a')

						link.href = element.querySelector<HTMLAnchorElement>(':scope > header a[href]')!.href
						link.setAttribute('data-native-summary-support-control', '')
						text.parentNode!.replaceChild(link, text)
						link.append(text)
					})
					const supportLink = summary.locator(
						':scope > [data-sticky-breadcrumb~="support"] a[data-native-summary-support-control]',
					)
					const beforeURL = page.url()
					let held = false

					try {
						await expect(supportLink).toBeVisible()
						await supportLink.hover()
						await page.mouse.down()
						held = true
						await expect
							.poll(() => supportLink.evaluate(element => element.matches(':active')))
							.toBe(true)
						await expect
							.poll(() =>
								supportLink.evaluate(element => parseFloat(getComputedStyle(element).scale)),
							)
							.toBeCloseTo(0.99, 3)
						await expect
							.poll(() =>
								supportLink.evaluate(element => Number(getComputedStyle(element).opacity)),
							)
							.toBeCloseTo(0.8, 3)
						const supportPressed = await supportLink.evaluate(link => {
							const summary = link.closest('summary')!
							const row = summary.querySelector(':scope > header > [data-row]')!
							const read = (element: Element) => ({
								active: element.matches(':active'),
								scale: getComputedStyle(element).scale,
								opacity: getComputedStyle(element).opacity,
							})

							return {
								outsideForeground: !row.contains(link),
								link: read(link),
								row: read(row),
								summary: read(summary),
							}
						})

						await info.attach(`${owner.level}-support-link-pressed`, {
							body: JSON.stringify({ owner, phase, supportPressed }),
							contentType: 'application/json',
						})
						expect(supportPressed.outsideForeground).toBe(true)

						for (const neutral of [pressOwner, summary]) {
							await expect
								.poll(() => neutral.evaluate(element => getComputedStyle(element).scale))
								.toMatch(/^(none|1(?: 1)?)$/)
							await expect
								.poll(() => neutral.evaluate(element => Number(getComputedStyle(element).opacity)))
								.toBe(1)
						}
						await page.mouse.move(0, 0)
						await page.mouse.up()
						held = false
						await expect.poll(() => page.url()).toBe(beforeURL)
						await expect
							.poll(() =>
								summary.evaluate(element => {
									const details = element.parentElement

									if (!(details instanceof HTMLDetailsElement)) {
										throw new Error('The Summary owner must be native details')
									}

									return details.open
								}),
							)
							.toBe(true)
					} finally {
						if (held) {
							await page.mouse.move(0, 0)
							await page.mouse.up()
						}

						const neutralPoint = await page.evaluate(() => {
							for (const y of [innerHeight / 2, innerHeight - 20, 80]) {
								for (const x of [1, innerWidth - 2]) {
									const hit = document.elementFromPoint(x, y)

									if (
										hit?.closest('#content') &&
										!hit.closest(
											'a,button,input,select,option,summary,label,[role="button"],[data-pressable]',
										)
									) {
										return { x, y }
									}
								}
							}
							throw new Error(
								'The support-link fixture needs an actual noninteractive content hit for native activation cleanup',
							)
						})

						await page.mouse.move(neutralPoint.x, neutralPoint.y)
						await page.mouse.down()
						await page.mouse.up()
						await expect
							.poll(() => summary.evaluate(element => element.matches(':active')))
							.toBe(false)
						await expect
							.poll(() => supportLink.evaluate(element => element.matches(':active')))
							.toBe(false)
						await expect.poll(() => page.url()).toBe(beforeURL)
						await supportLink.evaluate(element => element.replaceWith(...element.childNodes))
					}
				}
			}
		}
	})
}

for (const width of [390, 1440]) {
	test(`ordinary summaries with header rows retain whole native press ownership at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const summary = page
			.locator(
				'summary:not([data-sticky-breadcrumb~="position"]):has(> header[data-row] > [data-row]):has(a)',
			)
			.first()

		await expect(
			summary,
			'A real ordinary disclosure has a header containing row fragments',
		).toHaveCount(1)
		await summary.evaluate(async element => {
			for (let owner = element.parentElement; owner; owner = owner.parentElement) {
				if (owner instanceof HTMLDetailsElement) {
					owner.open = true
				}
			}
			element.scrollIntoView({ block: 'center', behavior: 'instant' })
			await new Promise<void>(resolve =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			)
		})
		const details = summary.locator('..')
		const point = await summary.evaluate(element => {
			const box = element.getBoundingClientRect()

			for (const fy of [0.5, 0.2, 0.8]) {
				for (const fx of [0.9, 0.7, 0.5, 0.3, 0.1]) {
					const x = box.left + box.width * fx,
						y = box.top + box.height * fy

					if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) {
						continue
					}

					const hit = document.elementFromPoint(x, y)

					if (
						hit &&
						element.contains(hit) &&
						!hit.closest('a,button,select,input,label,[role="button"],[data-pressable]')
					) {
						return { x, y, hit: hit.tagName }
					}
				}
			}
			throw new Error('The ordinary summary needs a verified noninteractive native pointer target')
		})

		await page.mouse.move(point.x, point.y)
		await page.mouse.down()

		try {
			await expect.poll(() => summary.evaluate(element => element.matches(':active'))).toBe(true)
			await expect
				.poll(() => summary.evaluate(element => getComputedStyle(element).scale))
				.toBe('0.99')
			await expect
				.poll(() => summary.evaluate(element => Number(getComputedStyle(element).opacity)))
				.toBeCloseTo(0.8, 2)
			await info.attach('ordinary-summary-held', {
				body: JSON.stringify({
					point,
					state: await summary.evaluate(element => ({
						active: element.matches(':active'),
						scale: getComputedStyle(element).scale,
						opacity: getComputedStyle(element).opacity,
						fragments: [...element.querySelectorAll(':scope > header > [data-row]')].map(row => ({
							tag: row.tagName,
							scale: getComputedStyle(row).scale,
						})),
					})),
				}),
				contentType: 'application/json',
			})
		} finally {
			await page.mouse.up()
		}

		await expect(details).not.toHaveAttribute('open')
		await summary.evaluate(element => {
			if (!(element.parentElement instanceof HTMLDetailsElement)) {
				throw new Error('The summary must belong to native details')
			}

			element.parentElement.open = true
		})
		const link = summary.locator('a').first()

		await link.hover()
		const linkPoint = await link.evaluate(element => {
			const box = element.getBoundingClientRect(),
				x = box.left + box.width / 2,
				y = box.top + box.height / 2
			const hit = document.elementFromPoint(x, y)

			return {
				x,
				y,
				ownsTarget: hit !== null && element.contains(hit),
				hit: hit?.outerHTML.slice(0, 500),
				link: element.outerHTML.slice(0, 500),
				rects: [...element.getClientRects()].map(({ x, y, width, height }) => ({
					x,
					y,
					width,
					height,
				})),
			}
		})

		await info.attach('ordinary-link-pointer-admission', {
			body: JSON.stringify(linkPoint),
			contentType: 'application/json',
		})
		expect(
			linkPoint.ownsTarget,
			'The real descendant link must own the native pointer target',
		).toBe(true)

		await page.mouse.move(linkPoint.x, linkPoint.y)
		await page.mouse.down()

		try {
			await expect.poll(() => link.evaluate(element => element.matches(':active'))).toBe(true)
			await expect
				.poll(() => link.evaluate(element => getComputedStyle(element).scale))
				.toBe('0.99')
			await expect
				.poll(() => summary.evaluate(element => getComputedStyle(element).scale))
				.toMatch(/^(none|1(?: 1)?)$/)
			await expect
				.poll(() => summary.evaluate(element => Number(getComputedStyle(element).opacity)))
				.toBe(1)
		} finally {
			await page.mouse.move(0, 0)
			await page.mouse.up()
		}

		await expect(details).toHaveAttribute('open')
	})
}

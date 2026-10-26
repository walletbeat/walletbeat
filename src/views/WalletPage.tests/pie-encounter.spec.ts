import { expect, test } from '../../../tests/browser/verified-test'

type Frame = {
	direction: number
	scroll: number
	circle: { x: number; y: number; radius: number; valid: boolean }
	controls: {
		box: {
			x: number
			y: number
			width: number
			height: number
			top: number
			right: number
			bottom: number
			left: number
		}
		clearance: number
		target: boolean
		literalMarker: boolean
		tag: string
		text: string | undefined
		open: boolean | undefined
	}[]
}

declare global {
	interface Window {
		__walletPieEncounter?: { active: boolean; frames: Frame[] }
	}
}

for (const open of [true, false]) {
	test(`real pie end content clears the silhouette in both directions with details ${open ? 'open' : 'closed'}`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width: 390, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		await page.locator('#layout').evaluate(element => {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Native scroll root required')
			}

			element.style.scrollSnapType = 'none'
		})
		const owner = open
			? page.locator('article .attribute-group').first()
			: page.locator('article section:has(> details[name="wallet-stages"])').first()
		const details = open
			? owner.locator('section.attribute > details').first()
			: owner.locator(':scope > details')

		await details.evaluate((element, desired) => {
			if (!(element instanceof HTMLDetailsElement)) {
				throw new Error('Disclosure owner must be a native details element')
			}

			element.open = desired
		}, open)

		if (open) {
			const ownership = await details.evaluate(element => {
				const end = element.querySelector(':scope > summary [data-sticky-breadcrumb~="end"]')

				if (!end) {
					throw new Error('Actual attribute END owner required')
				}

				const marker = end.querySelector(':scope > [data-collapsible-marker]')
				const effects = end.getAnimations({ subtree: true })

				return {
					capable:
						getComputedStyle(end).getPropertyValue('---breadcrumb-clearance-supported').trim() ===
						'1',
					literal: Boolean(marker),
					own: effects
						.filter(
							animation =>
								animation.effect instanceof KeyframeEffect && animation.effect.target === end,
						)
						.map(animation => ({
							class: animation.constructor.name,
							name: animation instanceof CSSAnimation ? animation.animationName : animation.id,
						})),
					pseudoContent: getComputedStyle(end, '::after').content,
					markerEffects: effects.flatMap(animation =>
						animation instanceof CSSAnimation &&
						animation.effect instanceof KeyframeEffect &&
						animation.effect.target === marker
							? [animation.animationName]
							: [],
					),
				}
			})

			await info.attach('open-marker-motion-ownership', {
				body: JSON.stringify(ownership),
				contentType: 'application/json',
			})

			if (ownership.capable) {
				expect(ownership.literal).toBe(true)
				expect(ownership.own, 'Open END and its pseudo retain no animation effects').toEqual([])
				expect(ownership.pseudoContent).toBe('none')
				expect(ownership.markerEffects).toEqual(
					expect.arrayContaining(['breadcrumb-clearance-inline', 'breadcrumb-clearance-block']),
				)
			}
		}

		const targetId = await owner.getAttribute('id')

		expect(targetId).toBeTruthy()
		const target = open
			? owner.locator(':scope > [data-sticky-breadcrumb~="position"]')
			: details.locator(':scope > summary')

		await target.evaluate(element =>
			element.scrollIntoView({ block: 'center', behavior: 'instant' }),
		)
		await page.evaluate(
			() =>
				new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				),
		)
		await target.evaluate(element => {
			const end = element.querySelector('[data-sticky-breadcrumb~="end"]')
			const control = end

			if (!control) {
				throw new Error('The actual heading or summary has no end content')
			}

			const pie = document.querySelector('.pie-navigation-geometry')!.getBoundingClientRect()

			document.querySelector('#layout')!.scrollBy({
				top: control.getBoundingClientRect().top - pie.bottom - 96,
				behavior: 'instant',
			})
		})
		const start = await page.locator('#layout').evaluate(element => element.scrollTop)

		const evidence: { direction: number; frames: Frame[] }[] = []

		try {
			for (const direction of [1, -1]) {
				await page.evaluate(
					({ direction, targetId }) => {
						const root = document.querySelector('#layout')!
						const capture: { active: boolean; frames: Frame[] } = { active: true, frames: [] }

						window.__walletPieEncounter = capture
						const frame = () => {
							const pie = document.querySelector('.pie-navigation')!
							const geometry = pie
								.querySelector('.pie-navigation-geometry')!
								.getBoundingClientRect()
							const style = getComputedStyle(pie)
							const maximum = parseFloat(style.getPropertyValue('--pie-maxR'))
							const padding = parseFloat(style.getPropertyValue('--pie-padding'))
							const radius =
								((Math.min(geometry.width, geometry.height) / 2) * maximum) / (maximum + padding)
							const circle = {
								x: geometry.left + geometry.width / 2,
								y: geometry.top + geometry.height / 2,
								radius,
								valid:
									Number.isFinite(maximum) &&
									maximum > 0 &&
									Number.isFinite(padding) &&
									padding >= 0 &&
									Number.isFinite(radius) &&
									radius > 0,
							}
							const controls = [
								...document.querySelectorAll('article [data-sticky-breadcrumb~="end"]'),
							]
								.flatMap(element =>
									element.matches('[data-sticky-breadcrumb~="contents"]')
										? [...element.children]
										: [element],
								)
								.filter(element =>
									element.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
								)
								.map(element => {
									const box = element.getBoundingClientRect()
									const nearestX = Math.max(box.left, Math.min(circle.x, box.right))
									const nearestY = Math.max(box.top, Math.min(circle.y, box.bottom))

									return {
										box: {
											x: box.x,
											y: box.y,
											width: box.width,
											height: box.height,
											top: box.top,
											right: box.right,
											bottom: box.bottom,
											left: box.left,
										},
										clearance: Math.hypot(nearestX - circle.x, nearestY - circle.y) - circle.radius,
										tag: element.tagName,
										literalMarker: element.matches('[data-collapsible-marker]'),
										target:
											document
												.getElementById(targetId!)
												?.querySelector(
													':scope > [data-sticky-breadcrumb~="position"], :scope > details > summary',
												)
												?.contains(element) === true,
										text: element.textContent?.trim(),
										open: element.closest('details')?.open,
									}
								})
								.filter(
									control =>
										control.box.width > 0 &&
										control.box.height > 0 &&
										control.box.bottom > 0 &&
										control.box.top < innerHeight &&
										control.box.right > 0 &&
										control.box.left < innerWidth,
								)

							capture.frames.push({ direction, scroll: root.scrollTop, circle, controls })

							if (capture.active && capture.frames.length < 600) {
								requestAnimationFrame(frame)
							}
						}

						frame()
					},
					{ direction, targetId },
				)
				await page.mouse.move(20, 700)

				for (let step = 0; step < 32; step++) {
					await page.mouse.wheel(0, direction * 48)
					await page.evaluate(
						() =>
							new Promise<void>(resolve =>
								requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
							),
					)
				}
				const frames = await page.evaluate(() => {
					const capture = window.__walletPieEncounter

					if (!capture) {
						throw new Error('Native encounter capture was not initialized')
					}

					capture.active = false

					return capture.frames
				})

				evidence.push({ direction, frames })
				await info.attach(`pie-encounter-${open}-${direction}`, {
					body: JSON.stringify(frames),
					contentType: 'application/json',
				})
			}

			for (const { direction, frames } of evidence) {
				expect(frames.length).toBeGreaterThan(1)
				expect(
					frames.every(frame => frame.circle.valid),
					'Actual rendered radius metadata must be finite and positive',
				).toBe(true)
				const movement = frames.at(-1)!.scroll - frames[0].scroll

				expect(
					movement * direction,
					'Native input traverses the requested direction',
				).toBeGreaterThan(0)
				const encounters = frames.flatMap(frame =>
					frame.controls.filter(
						control =>
							control.box.top < frame.circle.y + frame.circle.radius &&
							control.box.bottom > frame.circle.y - frame.circle.radius,
					),
				)

				expect(
					encounters.filter(control => control.target).length,
					'The actual control must enter the pie encounter band; absent coverage is inconclusive',
				).toBeGreaterThan(0)

				if (open) {
					expect(
						encounters.filter(control => control.literalMarker).length,
						'The literal marker must enter the encounter band in each direction; absent coverage is inconclusive',
					).toBeGreaterThan(0)
				}

				for (const control of encounters) {
					expect(control.clearance, JSON.stringify(control)).toBeGreaterThanOrEqual(-1)
				}
			}
		} finally {
			await info.attach('pie-encounter-all-evidence', {
				body: JSON.stringify({
					start,
					open,
					evidence,
					limits:
						'Native wheel geometry with root scroll snapping disabled; no native snap acceptance.',
				}),
				contentType: 'application/json',
			})
			await page.evaluate(() => {
				const capture = window.__walletPieEncounter

				if (capture) {
					capture.active = false
				}
			})
		}
	})
}

// CDP exposes native pseudo geometry without reconstructing its CSS motion.
for (const [width, direction] of [
	[390, 'ltr'],
	[390, 'rtl'],
	[580, 'ltr'],
	[580, 'rtl'],
] as const) {
	test(`breadcrumb painted owners clear the pie during wheel reversal ${width} ${direction}`, async ({
		page,
		browserName,
	}, info) => {
		test.skip(browserName !== 'chromium', 'This pseudo-geometry witness requires Chromium CDP')
		await page.setViewportSize({ width, height: 900 })
		await page.goto(
			width === 390 && direction === 'ltr' ? '/metamask/' : '/__wallet-page/software/',
		)
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(direction => {
			document.documentElement.dir = direction
		}, direction)
		await page.evaluate(() => document.fonts.ready)
		const owners = await page.evaluate(
			includeClosed => {
				const root = document.querySelector<HTMLElement>('#layout')!

				root.style.scrollSnapType = 'none'
				root.style.overflowAnchor = 'none'
				const native = [
					...document.querySelectorAll<HTMLElement>(
						'article details > summary[data-sticky~="block-start"]:not([data-sticky-breadcrumb~="position"])',
					),
				].find(
					element =>
						element.querySelector(':scope > h4') &&
						getComputedStyle(element, '::after').content !== 'none',
				)
				const relocated = [
					...document.querySelectorAll<HTMLElement>(
						'article summary[data-sticky~="block-start"] [data-row-item~="wrap-end"]:not([data-sticky-breadcrumb~="end"])',
					),
				].find(element => getComputedStyle(element, '::after').content !== 'none')

				if (!native || !relocated) {
					throw new Error('Native H4 and relocated stage markers required')
				}

				const closed = includeClosed
					? document.querySelector<HTMLElement>(
							'#stages section[data-sticky-breadcrumb~="scope"] > details[name="wallet-stages"] > summary [data-sticky-breadcrumb~="end"]',
						)
					: null

				if (includeClosed && !closed) {
					throw new Error('Actual closed END paint owner required')
				}

				const subjects = [native, relocated, ...(closed ? [closed] : [])]

				for (const [index, owner] of subjects.entries()) {
					owner.dataset.markerGeometryProbe = String(index)
				}

				return subjects.map((owner, index) => ({
					index,
					kind: index === 0 ? 'native-h4' : index === 1 ? 'relocated-end' : 'closed-end',
					closed: index === 2,
					text: owner.textContent?.trim(),
				}))
			},
			width === 390 && direction === 'ltr',
		)
		const cdp = await page.context().newCDPSession(page)
		const evidence = []
		const quad = async (selector: string, pseudo = false) => {
			const { root } = await cdp.send('DOM.getDocument')
			const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })

			if (!nodeId) {
				throw new Error(`Actual geometry owner absent: ${selector}`)
			}

			const { node } = await cdp.send('DOM.describeNode', { nodeId, depth: 1 })
			const backendNodeId = pseudo
				? node.pseudoElements?.find(element => element.pseudoType === 'after')?.backendNodeId
				: node.backendNodeId

			if (!backendNodeId) {
				throw new Error(`Native ::after identity unavailable: ${selector}`)
			}

			const { model } = await cdp.send('DOM.getBoxModel', { backendNodeId })
			const points = Array.from({ length: 4 }, (_, index) => ({
				x: model.border[index * 2],
				y: model.border[index * 2 + 1],
			}))

			if (!points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))) {
				throw new Error('Invalid native transformed quad')
			}

			return { backendNodeId, points, width: model.width, height: model.height }
		}
		const separation = (
			points: { x: number; y: number }[],
			circle: { x: number; y: number; radius: number },
		) => {
			const signs = points.map((a, index) => {
				const b = points[(index + 1) % points.length]

				return (b.x - a.x) * (circle.y - a.y) - (b.y - a.y) * (circle.x - a.x)
			})

			if (signs.every(value => value >= 0) || signs.every(value => value <= 0)) {
				return -circle.radius
			}

			return Math.min(
				...points.map((a, index) => {
					const b = points[(index + 1) % points.length]
					const dx = b.x - a.x,
						dy = b.y - a.y
					const denominator = dx * dx + dy * dy

					if (denominator <= 0) {
						throw new Error('Degenerate pseudo quad')
					}

					const t = Math.max(
						0,
						Math.min(1, ((circle.x - a.x) * dx + (circle.y - a.y) * dy) / denominator),
					)

					return Math.hypot(circle.x - a.x - t * dx, circle.y - a.y - t * dy) - circle.radius
				}),
			)
		}

		try {
			for (const owner of owners) {
				const selector = `[data-marker-geometry-probe="${owner.index}"]`

				await page.locator(selector).evaluate(async (element, closed) => {
					const changed: HTMLDetailsElement[] = []

					for (
						let parent: Element | null = element.parentElement;
						parent;
						parent = parent.parentElement
					) {
						if (
							parent instanceof HTMLDetailsElement &&
							parent.open !== !(closed && parent === element.closest('details'))
						) {
							parent.open = !(closed && parent === element.closest('details'))
							changed.push(parent)
						}
					}
					const effects = changed
						.flatMap(details => details.getAnimations({ subtree: true }))
						.filter(
							animation =>
								animation.timeline instanceof DocumentTimeline &&
								Number.isFinite(animation.effect?.getComputedTiming().endTime),
						)

					await Promise.race([
						Promise.allSettled(effects.map(animation => animation.finished)),
						new Promise((_, reject) =>
							setTimeout(() => reject(new Error('Disclosure setup did not settle')), 3000),
						),
					])
					const root = document.querySelector<HTMLElement>('#layout')!

					const flow = element.closest('details[id], section[id]')

					if (!flow) {
						throw new Error('An ordinary-flow disclosure/section source is required')
					}

					root.scrollTo({
						top:
							root.scrollTop +
							flow.getBoundingClientRect().bottom -
							root.getBoundingClientRect().top -
							root.clientHeight / 2,
						behavior: 'instant',
					})
					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
				}, owner.closed)
				const principal = await quad(selector)
				const actual = await page.locator(selector).boundingBox()

				if (!actual) {
					throw new Error('Observable native marker owner required')
				}

				expect(
					Math.abs(Math.min(...principal.points.map(point => point.x)) - actual.x),
				).toBeLessThan(0.5)
				expect(
					Math.abs(Math.min(...principal.points.map(point => point.y)) - actual.y),
				).toBeLessThan(0.5)
				const clocks = await page
					.locator(selector)
					.evaluateHandle(element => element.getAnimations({ subtree: true }))
				const nativeOverride = await page.addStyleTag({
					content: `${owner.closed ? `${selector}, ` : ''}${selector}::after { transform: none !important; }`,
				})
				const initialMarker = await quad(selector, true)
				const nativePrincipal = await quad(selector)

				await page.evaluate(element => {
					if (!(element instanceof Element)) {
						throw new Error('Native reference style owner absent')
					}

					element.remove()
				}, nativeOverride)
				expect(
					await page
						.locator(selector)
						.evaluate(
							(element, originals) =>
								originals.every(animation =>
									element.getAnimations({ subtree: true }).includes(animation),
								),
							clocks,
						),
					'Native reference preserves motion owners',
				).toBe(true)
				await clocks.dispose()
				const localInline = (marker: typeof initialMarker, parent: typeof principal) => {
					const origin = parent.points[0],
						end = parent.points[1]
					const dx = end.x - origin.x,
						dy = end.y - origin.y
					const lengthSquared = dx * dx + dy * dy

					if (lengthSquared <= 0 || parent.width <= 0) {
						throw new Error('Qualified parent inline basis required')
					}

					return Math.min(
						...marker.points.map(
							point =>
								(((point.x - origin.x) * dx + (point.y - origin.y) * dy) / lengthSquared) *
								parent.width,
						),
					)
				}
				const initialInline = localInline(initialMarker, principal)
				let ordinarySamples = 0

				for (const direction of [1, -1]) {
					let delivered = 0
					let encounters = 0

					for (let step = 0; step < 12; step++) {
						const before = await page.locator('#layout').evaluate(element => element.scrollTop)

						await page.mouse.move(20, 700)
						await page.mouse.wheel(0, direction * 48)
						await page.evaluate(
							() =>
								new Promise<void>(resolve =>
									requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
								),
						)
						const pose = await page.locator(selector).evaluate(element => {
							const pseudo = getComputedStyle(element, '::after')
							const pie = document.querySelector('.pie-navigation')!
							const geometry = pie
								.querySelector('.pie-navigation-geometry')!
								.getBoundingClientRect()
							const style = getComputedStyle(pie)
							const maximum = Number.parseFloat(style.getPropertyValue('--pie-maxR'))
							const padding = Number.parseFloat(style.getPropertyValue('--pie-padding'))

							const rawGap =
								pseudo.getPropertyValue('--stickyBreadcrumb-clearanceGap').trim() ||
								pseudo.getPropertyValue('--stickyBreadcrumb-gap').trim() ||
								'0px'
							const gapLength = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(px|rem|em)?$/.exec(rawGap)

							if (!gapLength) {
								throw new Error(`Unsupported physical gap value: ${rawGap}`)
							}

							const amount = Number(gapLength[1])
							const unit = gapLength[2]
							const factor =
								unit === 'rem'
									? Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
									: unit === 'em'
										? Number.parseFloat(pseudo.fontSize)
										: 1
							const gap = amount * factor

							if ((!unit && amount !== 0) || !Number.isFinite(gap) || gap < 0) {
								throw new Error(`Invalid physical gap: ${rawGap}`)
							}

							return {
								gap,
								rawGap,
								scroll: document.querySelector('#layout')!.scrollTop,
								content: pseudo.content,
								opacity: Number(pseudo.opacity),
								visibility: pseudo.visibility,
								width: Number.parseFloat(pseudo.width),
								height: Number.parseFloat(pseudo.height),
								circle: {
									x: geometry.x + geometry.width / 2,
									y: geometry.y + geometry.height / 2,
									radius: ((geometry.width / 2) * maximum) / (maximum + padding),
								},
							}
						})
						const marker = await quad(selector, true)
						const parent = await quad(selector)
						const pieQuad = await quad('.pie-navigation-geometry')
						const sides = pieQuad.points.map((a, index) => {
							const b = pieQuad.points[(index + 1) % 4]

							return Math.hypot(a.x - b.x, a.y - b.y)
						})

						expect(
							Math.max(...sides) - Math.min(...sides),
							'Qualified square pie geometry',
						).toBeLessThan(0.5)
						expect(
							Math.abs(pieQuad.points[0].y - pieQuad.points[1].y),
							'Pie geometry has no rotated inline axis',
						).toBeLessThan(0.5)
						const painted = [marker]

						if (owner.closed) {
							const children = await page.locator(selector).evaluate(element => {
								const details = element.closest('details')!,
									summary = details.querySelector(':scope > summary')!

								if (
									details.hasAttribute('open') ||
									[summary, ...summary.querySelectorAll('[data-sticky]')].some(
										node => getComputedStyle(node).position === 'sticky',
									)
								) {
									throw new Error('Closed END must retain ordinary flow')
								}

								return element.matches('[data-sticky-breadcrumb~="contents"]')
									? [...element.children].map((child, index) => {
											child.setAttribute('data-closed-end-child', String(index))

											return index
										})
									: [-1]
							})

							for (const index of children) {
								painted.push(
									await quad(
										index < 0 ? selector : `${selector} > [data-closed-end-child="${index}"]`,
									),
								)
							}
						}

						const after = await page.locator(selector).evaluate(element => {
							const owner = element.getBoundingClientRect()
							const pie = document
								.querySelector('.pie-navigation-geometry')!
								.getBoundingClientRect()

							return {
								scroll: document.querySelector('#layout')!.scrollTop,
								owner: { top: owner.top },
								pie: { x: pie.x, y: pie.y, width: pie.width, height: pie.height },
							}
						})

						expect(after.scroll, 'One stationary geometry batch').toBe(pose.scroll)
						expect(
							Math.abs(after.owner.top - Math.min(...parent.points.map(point => point.y))),
						).toBeLessThan(0.5)
						expect(Math.abs(after.pie.x + after.pie.width / 2 - pose.circle.x)).toBeLessThan(0.5)
						expect(Math.abs(after.pie.y + after.pie.height / 2 - pose.circle.y)).toBeLessThan(0.5)
						expect(pose.content).not.toBe('none')
						expect(pose.opacity).toBeGreaterThan(0)
						expect(pose.visibility).toBe('visible')
						expect(pose.width).toBeGreaterThan(0)
						expect(pose.height).toBeGreaterThan(0)
						expect(Number.isFinite(pose.circle.radius) && pose.circle.radius > 0).toBe(true)
						const clearance = Math.min(...painted.map(box => separation(box.points, pose.circle)))

						delivered += direction * (pose.scroll - before)

						if (
							Math.min(...marker.points.map(point => point.y)) <=
								pose.circle.y + pose.circle.radius &&
							Math.max(...marker.points.map(point => point.y)) >= pose.circle.y - pose.circle.radius
						) {
							encounters++
						}

						const local = localInline(marker, parent)
						const verticalDistance = Math.max(
							0,
							Math.min(...marker.points.map(point => point.y)) - pose.circle.y,
							pose.circle.y - Math.max(...marker.points.map(point => point.y)),
						)

						evidence.push({
							owner,
							direction,
							step,
							...pose,
							marker,
							painted,
							parent,
							clearance,
							local,
							initialInline,
							verticalDistance,
						})

						if (verticalDistance > pose.circle.radius + pose.gap + 1) {
							ordinarySamples++
							expect(
								owner.closed
									? Math.abs(
											Math.min(...parent.points.map(point => point.x)) -
												Math.min(...nativePrincipal.points.map(point => point.x)),
										)
									: Math.abs(local - initialInline),
								'Outside the declared rounded encounter the marker retains its native inline position',
							).toBeLessThan(1)
						}

						expect(clearance, `${owner.kind} native pseudo border quad`).toBeGreaterThanOrEqual(-1)
					}
					expect(delivered, `Delivered scroll in direction ${direction}`).toBeGreaterThan(500)
					expect(
						encounters,
						`Actual marker/pie encounter in direction ${direction}`,
					).toBeGreaterThan(0)
				}
				expect(
					ordinarySamples,
					'An actual position outside the rounded encounter was witnessed',
				).toBeGreaterThan(0)
			}
		} finally {
			await cdp.detach()
			await info.attach('native-marker-geometry', {
				body: JSON.stringify({
					owners,
					evidence,
					limits:
						'Native transformed pseudo border quads, conservative for masked chevron ink. Both native H4 and relocated stage marker required. No compositor or between-sample acceptance.',
				}),
				contentType: 'application/json',
			})
		}
	})
}

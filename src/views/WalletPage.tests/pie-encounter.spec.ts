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
		source: { top: number; bottom: number } | null
		clearance: number
		target: boolean
		witness: boolean
		literalMarker: boolean
		tag: string
		text: string | undefined
		open: boolean | undefined
	}[]
}

declare global {
	interface Window {
		__walletPieEncounter?: { active: boolean; frames: Frame[] }
		__walletPieSources?: Map<Element, { scope: Element; offset: number; height: number }>
		__walletPieWitness?: Element
	}
}

for (const open of [true, false]) {
	for (const reducedMotion of ['no-preference', 'reduce'] as const) {
		test(`real pie end content clears the silhouette in both directions with details ${open ? 'open' : 'closed'} and motion ${reducedMotion}`, async ({
			page,
		}, info) => {
			await page.emulateMedia({ reducedMotion })
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
			const compactPieSupported = await page.evaluate(() =>
				[
					'clip-path: shape(from 0 0, line to 1px 1px, close)',
					'animation-timeline: scroll()',
					'animation-range: 0% 100%',
					'width: anchor-size(--breadcrumb-source inline)',
					'timeline-scope: --breadcrumb-size',
					'color: if(style(---breadcrumb-wrap: 1): red)',
				].every(feature => CSS.supports(feature)),
			)

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

			if (!compactPieSupported) {
				const pie = page.locator('.pie-navigation-geometry')
				const root = page.locator('#layout')
				const initial = await pie.boundingBox()

				expect(initial).not.toBeNull()
				expect(initial!.height).toBeGreaterThan(0)
				expect(initial!.y).toBeGreaterThanOrEqual(0)
				expect(initial!.y).toBeLessThan(900)
				await page.mouse.move(20, 700)
				await page.mouse.wheel(0, 900)
				await expect.poll(() => root.evaluate(element => element.scrollTop)).toBeGreaterThan(600)
				await expect
					.poll(async () => {
						const box = await pie.boundingBox()

						return box ? box.y + box.height : Infinity
					})
					.toBeLessThanOrEqual(0)
				await page.mouse.wheel(0, -1200)
				await expect.poll(async () => (await pie.boundingBox())?.y ?? -Infinity).toBeGreaterThan(0)
				const restored = await pie.evaluate(
					element =>
						element.getBoundingClientRect().top + document.querySelector('#layout')!.scrollTop,
				)

				expect(restored).toBeCloseTo(initial!.y, 0)
				await info.attach('ordinary-flow-pie', {
					body: JSON.stringify({ initial, restored }),
					contentType: 'application/json',
				})

				return
			}

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

			const natural = await owner.evaluate(async (owner, open) => {
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
				const root = document.querySelector('#layout')!

				if (Math.abs(root.scrollTop) > 2) {
					throw new Error('Natural source capture requires the initial scroll position')
				}

				const sources = new Map<Element, { scope: Element; offset: number; height: number }>()
				const ends = [...owner.querySelectorAll('[data-sticky-breadcrumb~="end"]')]
				const controls = ends.flatMap(end =>
					end.matches('[data-sticky-breadcrumb~="contents"]') ? [...end.children] : [end],
				)

				for (const element of controls) {
					if (!element.checkVisibility({ visibilityProperty: true })) {
						continue
					}

					const scope = element.closest('[data-sticky-breadcrumb~="scope"]')!
					const scopeBox = scope.getBoundingClientRect()

					if (scopeBox.top <= 0) {
						throw new Error('Natural source scope must precede sticky engagement')
					}

					for (let node: Element | null = element; node; node = node.parentElement) {
						const style = getComputedStyle(node)

						if (
							(style.transform !== 'none' && !new DOMMatrixReadOnly(style.transform).isIdentity) ||
							(style.translate !== 'none' &&
								style.translate.split(/\s+/).some(value => Number.parseFloat(value) !== 0)) ||
							(style.scale !== 'none' &&
								style.scale.split(/\s+/).some(value => Number.parseFloat(value) !== 1))
						) {
							throw new Error(
								'Natural source capture requires undisturbed clearance and ancestor geometry',
							)
						}

						if (node === scope) {
							break
						}
					}
					const box = element.getBoundingClientRect()

					if (box.width > 0 && box.height > 0) {
						sources.set(element, { scope, offset: box.top - scopeBox.top, height: box.height })
					}
				}
				window.__walletPieSources = sources

				return {
					controls: sources.size,
					markers: [...sources.keys()].filter(element =>
						element.matches('[data-collapsible-marker]'),
					).length,
					open,
				}
			}, open)

			expect(natural.controls, 'Actual natural source controls were captured').toBeGreaterThan(0)

			if (open) {
				expect(
					natural.markers,
					'The descendant H3 literal marker has its own natural scope',
				).toBeGreaterThan(0)
			}

			await target.evaluate(element =>
				element.scrollIntoView({ block: 'center', behavior: 'instant' }),
			)
			await page.evaluate(
				() =>
					new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					),
			)
			const evidence: {
				window: string
				direction: number
				span: number
				steps: number
				start: number
				end: number
				frames: Frame[]
			}[] = []

			try {
				for (const encounter of open ? ['target', 'marker'] : ['target']) {
					const placement = await owner.evaluate((owner, encounter) => {
						const target = owner.querySelector(
							':scope > [data-sticky-breadcrumb~="position"], :scope > details > summary',
						)!
						const entry = [...(window.__walletPieSources ?? [])].find(([element]) =>
							encounter === 'marker'
								? element.matches('[data-collapsible-marker]')
								: target.contains(element),
						)

						if (!entry) {
							throw new Error(`Missing independent natural ${encounter} source`)
						}

						const [element, source] = entry

						window.__walletPieWitness = element
						const root = document.querySelector('#layout')!
						const pieOwner = document.querySelector('.pie-navigation-geometry')!
						const paint =
							getComputedStyle(pieOwner).position === 'fixed'
								? pieOwner.querySelector(':scope > .navigation-items')!
								: pieOwner
						const pie = paint.getBoundingClientRect()
						const sourceTop =
							root.scrollTop + source.scope.getBoundingClientRect().top + source.offset
						const span = pie.height + source.height + 2 * 96
						const start = sourceTop - pie.bottom - 96

						if (start < 0 || start + span > root.scrollHeight - root.clientHeight) {
							throw new Error('Natural source window must fit the scroll range')
						}

						root.scrollTo({ top: start, behavior: 'instant' })

						return { span, steps: Math.ceil(span / 48) + 1 }
					}, encounter)

					await page.evaluate(
						() =>
							new Promise<void>(resolve =>
								requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
							),
					)

					for (const direction of [1, -1]) {
						await page.evaluate(
							({ direction, targetId }) => {
								const root = document.querySelector('#layout')!
								const capture: { active: boolean; frames: Frame[] } = { active: true, frames: [] }

								window.__walletPieEncounter = capture
								const frame = () => {
									const pie = document.querySelector('.pie-navigation')!
									const pieOwner = pie.querySelector('.pie-navigation-geometry')!
									const compactOwner = getComputedStyle(pieOwner).position === 'fixed'
									const paint = compactOwner
										? pieOwner.querySelector(':scope > .navigation-items')!
										: pieOwner
									const geometry = paint.getBoundingClientRect()
									const diameter = compactOwner
										? geometry.height
										: Math.min(geometry.width, geometry.height)
									const style = getComputedStyle(pie)
									const maximum = parseFloat(style.getPropertyValue('--pie-maxR'))
									const padding = parseFloat(style.getPropertyValue('--pie-padding'))
									const radius = ((diameter / 2) * maximum) / (maximum + padding)
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
											const native = window.__walletPieSources?.get(element)
											const sourceTop = native
												? native.scope.getBoundingClientRect().top + native.offset
												: null
											const nearestX = Math.max(box.left, Math.min(circle.x, box.right))
											const nearestY = Math.max(box.top, Math.min(circle.y, box.bottom))

											return {
												source:
													native && sourceTop !== null
														? { top: sourceTop, bottom: sourceTop + native.height }
														: null,
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
												witness: element === window.__walletPieWitness,
												clearance:
													Math.hypot(nearestX - circle.x, nearestY - circle.y) - circle.radius,
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

						for (let step = 0; step < placement.steps; step++) {
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

						evidence.push({
							window: encounter,
							direction,
							...placement,
							start: frames[0].scroll,
							end: frames.at(-1)!.scroll,
							frames,
						})
						await info.attach(`pie-encounter-${open}-${encounter}-${direction}`, {
							body: JSON.stringify(frames),
							contentType: 'application/json',
						})
					}
				}

				for (const { window: encounter, direction, frames } of evidence) {
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
								control.source !== null &&
								control.source.top < frame.circle.y + frame.circle.radius &&
								control.source.bottom > frame.circle.y - frame.circle.radius,
						),
					)

					expect(
						encounters.filter(control => control.witness).length,
						`The independent natural ${encounter} source crosses the pie band in direction ${direction}`,
					).toBeGreaterThan(0)

					for (const control of frames.flatMap(frame => frame.controls)) {
						expect(control.clearance, JSON.stringify(control)).toBeGreaterThanOrEqual(-1)
					}
				}
			} finally {
				await info.attach('pie-encounter-all-evidence', {
					body: JSON.stringify({
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
}

// CDP exposes native pseudo geometry without reconstructing its CSS motion.
for (const [width, direction, scenario] of [
	[390, 'ltr', 'default'],
	[390, 'rtl', 'default'],
	[580, 'ltr', 'default'],
	[580, 'rtl', 'default'],
	[390, 'ltr', 'ordinary'],
	[390, 'ltr', 'zero-gap'],
	[580, 'rtl', 'reduced-large-font'],
] as const) {
	test(`breadcrumb painted owners clear the pie during wheel reversal ${width} ${direction} ${scenario}`, async ({
		page,
		browserName,
	}, info) => {
		test.skip(browserName !== 'chromium', 'This pseudo-geometry witness requires Chromium CDP')
		const ordinaryOnly = scenario !== 'default'

		await page.emulateMedia({
			reducedMotion: scenario === 'reduced-large-font' ? 'reduce' : 'no-preference',
		})
		await page.setViewportSize({ width, height: 900 })
		await page.goto(width === 390 ? '/metamask/' : '/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(
			({ direction, scenario }) => {
				document.documentElement.dir = direction

				if (scenario === 'zero-gap' || scenario === 'reduced-large-font') {
					document.documentElement.style.fontSize = '18px'
				}
			},
			{ direction, scenario },
		)
		await page.evaluate(() => document.fonts.ready)
		const owners = await page.evaluate(
			({ includeClosed, ordinaryOnly, scenario }) => {
				const root = document.querySelector<HTMLElement>('#layout')!

				root.style.scrollSnapType = 'none'
				root.style.overflowAnchor = 'none'
				const native = [
					...document.querySelectorAll<HTMLElement>(
						'article details > summary[data-sticky~="block-start"]:not([data-sticky-breadcrumb~="position"])',
					),
				]
					.filter(
						element =>
							element.querySelector(':scope > h4') &&
							getComputedStyle(element, '::after').content !== 'none',
					)
					.filter((element, index) => index === 0 || element.closest('#open-source'))
				const relocated = [
					...document.querySelectorAll<HTMLElement>(
						'article summary[data-sticky~="block-start"] [data-row-item~="wrap-end"]:not([data-sticky-breadcrumb~="end"])',
					),
				].find(element => getComputedStyle(element, '::after').content !== 'none')

				if (native.length === 0 || (!ordinaryOnly && !relocated)) {
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

				const subjects = ordinaryOnly
					? native.slice(0, 1)
					: [...native, relocated!, ...(closed ? [closed] : [])]

				for (const [index, owner] of subjects.entries()) {
					owner.dataset.markerGeometryProbe = String(index)

					if (scenario === 'zero-gap') {
						owner.style.setProperty('--stickyBreadcrumb-clearanceGap', '0px')
					}
				}

				return subjects.flatMap((owner, index) =>
					(index < native.length
						? ['native-h4', 'closed-h4']
						: [index === native.length ? 'relocated-end' : 'closed-end']
					).map(kind => ({
						index,
						kind,
						text: owner.textContent?.trim(),
					})),
				)
			},
			{
				includeClosed: !ordinaryOnly && width === 390 && direction === 'ltr',
				ordinaryOnly,
				scenario,
			},
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
				const closed = owner.kind === 'closed-h4' || owner.kind === 'closed-end'
				const cluster = owner.kind === 'closed-end'

				if (owner.kind === 'closed-h4') {
					await page.locator(selector).evaluate(element => {
						element.closest('details')!.open = true

						if (!(element instanceof HTMLElement)) {
							throw new Error('A native summary is required')
						}

						element.focus({ preventScroll: true })
					})
					await page.locator(selector).press('Space')
					expect(
						await page.locator(selector).evaluate(element => element.closest('details')!.open),
					).toBe(false)
				}

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
					const effects = [...new Set([...changed, element.closest('details')!])]
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
				}, closed)

				if (scenario === 'ordinary') {
					const properties = await page
						.locator(selector)
						.evaluate(element =>
							element
								.getAnimations({ subtree: true })
								.flatMap(animation =>
									animation.effect instanceof KeyframeEffect &&
									animation.effect.target === element &&
									animation.effect.pseudoElement === '::after'
										? animation.effect.getKeyframes().flatMap(frame => Object.keys(frame))
										: [],
								),
						)

					expect(
						properties,
						'The selected ordinary pseudo exercises both native motion properties',
					).toEqual(expect.arrayContaining(['transform', 'translate']))
				}

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
					content: `${cluster ? `${selector}, ` : ''}${selector}::after { transform: none !important;${cluster ? '' : ' translate: none !important;'} }`,
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
					let requiredDodges = 0
					let passed = false

					for (let step = 0; step < (ordinaryOnly ? 96 : 24); step++) {
						const before = await page.locator('#layout').evaluate(element => element.scrollTop)

						await page.mouse.move(20, 700)
						await page.mouse.wheel(0, direction * (ordinaryOnly ? 12 : 48))
						await page.evaluate(
							() =>
								new Promise<void>(resolve =>
									requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
								),
						)
						const pose = await page.locator(selector).evaluate(element => {
							const pseudo = getComputedStyle(element, '::after')
							const pie = document.querySelector('.pie-navigation')!
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
								pieRadiusFraction: maximum / (maximum + padding),
							}
						})

						if (scenario === 'zero-gap') {
							expect(pose.gap, 'Public gap override reached the actual pseudo').toBe(0)
						}

						const marker = await quad(selector, true)
						const parent = await quad(selector)
						const pieQuad = await quad('.pie-navigation-geometry > .navigation-items > menu')
						const sides = pieQuad.points.map((a, index) => {
							const b = pieQuad.points[(index + 1) % 4]

							return Math.hypot(a.x - b.x, a.y - b.y)
						})

						expect(
							Math.max(...sides) - Math.min(...sides),
							'Qualified square pie geometry',
						).toBeLessThan(0.5)
						expect(sides.every(side => Number.isFinite(side) && side > 0)).toBe(true)
						const edges = pieQuad.points.slice(0, 2).map((point, index) => ({
							x: pieQuad.points[index + 1].x - point.x,
							y: pieQuad.points[index + 1].y - point.y,
						}))

						expect(
							Math.abs(edges[0].x * edges[1].x + edges[0].y * edges[1].y) / (sides[0] * sides[1]),
							'Orthogonal painted pie basis',
						).toBeLessThan(0.001)
						expect(pose.pieRadiusFraction).toBeGreaterThan(0)
						expect(pose.pieRadiusFraction).toBeLessThanOrEqual(1)
						const circle = {
							x: pieQuad.points.reduce((sum, point) => sum + point.x, 0) / 4,
							y: pieQuad.points.reduce((sum, point) => sum + point.y, 0) / 4,
							radius: (sides[0] / 2) * pose.pieRadiusFraction,
						}
						const painted = [marker]

						if (closed) {
							const participation = await page.locator(selector).evaluate(element => {
								const details = element.closest('details')!,
									summary = details.querySelector(':scope > summary')!

								return {
									open: details.hasAttribute('open'),
									positions: [summary, ...summary.querySelectorAll('[data-sticky]')].map(
										node => getComputedStyle(node).position,
									),
								}
							})

							expect(participation.open).toBe(false)
							expect(participation.positions, 'Closed controls retain ordinary flow').not.toContain(
								'sticky',
							)
						}

						if (cluster) {
							const children = await page.locator(selector).evaluate(element => {
								return element.matches('[data-sticky-breadcrumb~="contents"]')
									? [...element.children]
											.filter(child => !child.matches('[data-sticky-breadcrumb~="size-export"]'))
											.map((child, index) => {
												if (
													!child.checkVisibility({
														visibilityProperty: true,
														opacityProperty: true,
													})
												) {
													throw new Error('Required closed END content is not visible')
												}

												child.setAttribute('data-closed-end-child', String(index))

												return index
											})
									: [-1]
							})

							expect(children.length, 'Visible closed END content is required').toBeGreaterThan(0)

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
								.querySelector('.pie-navigation-geometry > .navigation-items > menu')!
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
						expect(Math.abs(after.pie.x + after.pie.width / 2 - circle.x)).toBeLessThan(0.5)
						expect(Math.abs(after.pie.y + after.pie.height / 2 - circle.y)).toBeLessThan(0.5)
						expect(pose.content).not.toBe('none')
						expect(pose.opacity).toBeGreaterThan(0)
						expect(pose.visibility).toBe('visible')
						expect(pose.width).toBeGreaterThan(0)
						expect(pose.height).toBeGreaterThan(0)
						expect(Number.isFinite(circle.radius) && circle.radius > 0).toBe(true)
						const clearance = Math.min(...painted.map(box => separation(box.points, circle)))

						delivered += direction * (pose.scroll - before)

						if (
							Math.min(...marker.points.map(point => point.y)) <= circle.y + circle.radius &&
							Math.max(...marker.points.map(point => point.y)) >= circle.y - circle.radius
						) {
							encounters++
						}

						const local = localInline(marker, parent)
						const withoutDodge = marker.points.map(point => ({
							x:
								point.x -
								((local - initialInline) * (parent.points[1].x - parent.points[0].x)) /
									parent.width,
							y:
								point.y -
								((local - initialInline) * (parent.points[1].y - parent.points[0].y)) /
									parent.width,
						}))

						if (!cluster && separation(withoutDodge, circle) < -1) {
							requiredDodges++
							expect(
								Math.abs(local - initialInline),
								'Actual collision requires a dodge',
							).toBeGreaterThan(1)
						}

						const verticalDistance = Math.max(
							0,
							Math.min(...marker.points.map(point => point.y)) - circle.y,
							circle.y - Math.max(...marker.points.map(point => point.y)),
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
							withoutDodge,
							verticalDistance,
							circle,
						})

						const nativeDisplacement = cluster
							? Math.abs(
									Math.min(...parent.points.map(point => point.x)) -
										Math.min(...nativePrincipal.points.map(point => point.x)),
								)
							: Math.abs(local - initialInline)

						if (verticalDistance > circle.radius + pose.gap + 1) {
							ordinarySamples++
							expect(
								nativeDisplacement,
								'Outside the declared rounded encounter the marker retains its native inline position',
							).toBeLessThan(1)
						}

						expect(clearance, `${owner.kind} native pseudo border quad`).toBeGreaterThanOrEqual(-1)
						passed =
							nativeDisplacement < 1 &&
							(direction > 0
								? Math.max(...painted.flatMap(box => box.points.map(point => point.y))) <
									circle.y - circle.radius - 1
								: Math.min(...painted.flatMap(box => box.points.map(point => point.y))) >
									circle.y + circle.radius + 1)

						if (delivered > 500 && passed) {
							break
						}
					}
					expect(passed, 'The painted owner traversed the complete pie encounter').toBe(true)
					expect(delivered, `Delivered scroll in direction ${direction}`).toBeGreaterThan(500)

					if (!cluster) {
						expect(
							requiredDodges,
							'The marker would collide with the pie without a dodge',
						).toBeGreaterThan(0)
					}

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
			try {
				await info.attach('native-marker-geometry', {
					body: JSON.stringify({
						owners,
						evidence,
						limits:
							'Native transformed pseudo border quads, conservative for masked ink, including hidden poses. Ordinary variants require a collision without their measured dodge. No visibility, compositor, physical-paint or between-sample acceptance.',
					}),
					contentType: 'application/json',
				})
			} finally {
				await cdp.detach()
			}
		}
	})
}

for (const input of [
	{ width: 690, padding: 24, direction: 'ltr', wrapped: false },
	{ width: 690, padding: 40.375, direction: 'ltr', wrapped: false },
	{ width: 390, padding: 40, direction: 'ltr', wrapped: true },
] as const) {
	test(`native circle coordinates follow row geometry: ${input.width}/${input.padding}/${input.direction}`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width: input.width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const end = page.locator('#scam-prevention .attribute-summary-companions')

		await expect(end).toHaveCount(1)
		const capable = await end.evaluate(
			element =>
				getComputedStyle(element).getPropertyValue('---breadcrumb-clearance-supported').trim() ===
				'1',
		)

		test.skip(!capable, 'The complete native circle-clearance capability is unavailable')
		await end.evaluate((element, input) => {
			document.documentElement.dir = input.direction
			const root = document.querySelector<HTMLElement>('#layout')!

			root.style.scrollSnapType = 'none'
			root.style.scrollBehavior = 'auto'
			const scope = element.closest<HTMLElement>('[data-sticky-breadcrumb~="scope"]')!

			scope.style.setProperty('--stickyBreadcrumb-sourcePaddingInline', `${input.padding}px`)
			element.closest('details')!.open = true
			scope.scrollIntoView({ block: 'start', behavior: 'instant' })
		}, input)
		const samples = await end.evaluate(async element => {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Native HTML end owner required')
			}

			const end = element
			const samples = []

			for (let frame = 0; frame < 8; frame++) {
				await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
				const value = end.style.getPropertyValue('scroll-margin-inline-start')
				const priority = end.style.getPropertyPriority('scroll-margin-inline-start')

				try {
					end.style.setProperty(
						'scroll-margin-inline-start',
						'var(--stickyBreadcrumb-clearanceInlineOffset)',
						'important',
					)
					const style = getComputedStyle(end)
					const box = end.getBoundingClientRect()
					const row = end.parentElement!.getBoundingClientRect()
					const pieOwner = document.querySelector('.pie-navigation-geometry')!
					const paint =
						getComputedStyle(pieOwner).position === 'fixed'
							? pieOwner.querySelector(':scope > .navigation-items')!
							: pieOwner
					const pie = paint.getBoundingClientRect()
					const direction = style.direction === 'rtl' ? -1 : 1
					const edge = direction === 1 ? box.right : box.left

					samples.push({
						frame,
						published: Number.parseFloat(style.scrollMarginInlineStart),
						physical: direction * (edge - (pie.left + pie.width / 2)),
						endEdge: edge,
						rowEdge: direction === 1 ? row.right : row.left,
						rowWidth: row.width,
						pieWidth: pie.width,
						pieHeight: pie.height,
						wrapped: style.getPropertyValue('---breadcrumb-sourceEndWrap').trim() === '1',
					})
				} finally {
					if (value) {
						end.style.setProperty('scroll-margin-inline-start', value, priority)
					} else {
						end.style.removeProperty('scroll-margin-inline-start')
					}
				}
			}

			return samples
		})

		await info.attach('native-circle-coordinate-samples', {
			body: JSON.stringify({
				input,
				samples,
				limits: 'Eight bounded geometry frames; no paint or latency acceptance.',
			}),
			contentType: 'application/json',
		})
		const settled = samples.at(-1)!

		expect(settled.rowWidth).toBeGreaterThan(0)
		expect(Math.min(settled.pieWidth, settled.pieHeight)).toBeGreaterThan(0)
		expect(settled.wrapped).toBe(input.wrapped)
		expect(Math.abs(settled.endEdge - settled.rowEdge)).toBeLessThanOrEqual(0.25)
		expect(Number.isFinite(settled.published)).toBe(true)
		expect(Math.abs(settled.published - settled.physical)).toBeLessThanOrEqual(0.25)
	})
}

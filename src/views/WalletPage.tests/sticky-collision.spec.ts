import { selectStickyChain } from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

type Box = { left: number; right: number; top: number; bottom: number }
type Ink = { owner: string; kind: string; box: Box }
type CollisionFrame = {
	time: number
	scroll: number
	edge: number
	horizontalOverflow: number
	ink: Ink[]
	unsupported: string[]
	occlusions: { a: number; b: number; surface: string; box: Box }[]
}
declare global {
	interface Window {
		__stickyCollisionCapture?: { active: boolean; frames: CollisionFrame[] }
	}
}

for (const width of [390, 1440]) {
	test(`visible sticky content stays separated through native forward and reverse boundaries at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const chain = await page.evaluate(selectStickyChain)
		const windows = []

		for (const owner of chain.slice(1)) {
			for (const boundary of ['entry', 'exit'] as const) {
				for (const direction of [1, -1]) {
					const initial = await page.evaluate(
						({ owner, boundary, direction }) => {
							const root = document.querySelector('#layout')!
							const scope = document.querySelector(owner.scope)!
							const box = scope.getBoundingClientRect()
							const edge = boundary === 'entry' ? box.top : box.bottom

							root.scrollTo({
								top: root.scrollTop + edge - (direction === 1 ? 450 : -250),
								behavior: 'instant',
							})

							return { scroll: root.scrollTop }
						},
						{ owner, boundary, direction },
					)

					await page.evaluate(
						() =>
							new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
					)
					await page.evaluate(
						({ owner, boundary }) => {
							const root = document.querySelector('#layout')!
							const scope = document.querySelector(owner.scope)!
							const headings = [...document.querySelectorAll<HTMLElement>('#top :is(h1,h2,h3,h4)')]
								.map(heading => ({
									heading,
									position: heading.closest<HTMLElement>(
										'[data-sticky-breadcrumb~="position"], summary[data-sticky]',
									),
								}))
								.filter(item => item.position)

							const state: { active: boolean; frames: CollisionFrame[] } = {
								active: true,
								frames: [],
							}

							Object.assign(window, { __stickyCollisionCapture: state })
							const glyphContext = new OffscreenCanvas(1, 1).getContext('2d')!
							const frame = () => {
								if (!state.active || state.frames.length >= 1200) {
									return
								}

								const ink: Ink[] = []
								const paintNodes = new Map<Ink, Element>()
								const addInk = (entry: Ink, node: Element) => {
									ink.push(entry)
									paintNodes.set(entry, node)
								}
								const unsupported: string[] = []
								const visible = headings.filter(item => {
									const box = item.heading.getBoundingClientRect()

									return (
										box.bottom > 0 &&
										box.top < innerHeight &&
										box.right > 0 &&
										box.left < innerWidth
									)
								})

								for (const { heading, position } of visible.slice(0, 12)) {
									let opacity = 1

									for (
										let element: Element | null = heading;
										element && element !== root;
										element = element.parentElement
									) {
										const style = getComputedStyle(element)

										if (style.visibility === 'hidden') {
											opacity = 0
										}

										opacity *= Number(style.opacity)
									}

									if (opacity < 0.05) {
										continue
									}

									const key = position!.closest('[id]')!.id + ':' + heading.tagName
									const range = document.createRange()
									const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT)

									while (walker.nextNode()) {
										const text = walker.currentNode

										if (
											!text.textContent?.trim() ||
											text.parentElement?.closest('[aria-hidden="true"], [data-badge]')
										) {
											continue
										}

										range.selectNodeContents(text)

										for (const box of range.getClientRects()) {
											if (box.width && box.height) {
												addInk(
													{
														owner: key,
														kind: 'title',
														box: {
															left: box.left,
															right: box.right,
															top: box.top,
															bottom: box.bottom,
														},
													},
													heading,
												)
											}
										}
									}

									for (const end of position!.querySelectorAll<HTMLElement>(
										'[data-sticky-breadcrumb~="end"], button, select',
									)) {
										if (
											end.closest('[data-sticky-breadcrumb~="position"], summary[data-sticky]') !==
											position
										) {
											continue
										}

										const outer = end.parentElement?.closest(
											'[data-sticky-breadcrumb~="end"], button, select',
										)

										if (outer && position!.contains(outer)) {
											continue
										}

										const style = getComputedStyle(end)
										const box = end.getBoundingClientRect()

										if (
											style.visibility === 'hidden' ||
											Number(style.opacity) < 0.05 ||
											!box.width ||
											!box.height
										) {
											continue
										}

										addInk(
											{
												owner: key,
												kind: end.matches('[data-sticky-breadcrumb~="end"]') ? 'end' : 'control',
												box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom },
											},
											end,
										)
									}
									const link = heading.closest('a') ?? heading.querySelector('a')

									for (const glyph of link?.querySelectorAll<HTMLElement>('[data-icon], img') ??
										[]) {
										const box = glyph.getBoundingClientRect()

										if (glyph.matches('img')) {
											addInk(
												{
													owner: key,
													kind: 'glyph',
													box: {
														left: box.left,
														right: box.right,
														top: box.top,
														bottom: box.bottom,
													},
												},
												heading,
											)
											continue
										}

										const style = getComputedStyle(glyph, '::before')

										if (style.content === 'none' || Number(style.opacity) < 0.05) {
											continue
										}

										const length = (value: string, basis: number) => {
											if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:px|%)?$/.test(value)) {
												throw new Error('Unsupported glyph length ' + value)
											}

											return parseFloat(value) * (value.endsWith('%') ? basis / 100 : 1)
										}

										try {
											const content = style.content
												.replace(/^"|"$/g, '')
												.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex: string) =>
													String.fromCodePoint(parseInt(hex, 16)),
												)

											glyphContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
											const metrics = glyphContext.measureText(content)
											const w =
												style.width === 'auto'
													? metrics.width
													: length(style.width, glyph.clientWidth)
											const h =
												style.height === 'auto'
													? length(style.lineHeight, 0)
													: length(style.height, glyph.clientHeight)
											const origin = style.transformOrigin.split(/\s+/)
											const ox = length(origin[0], w),
												oy = length(origin[1], h)
											const shift =
												style.translate === 'none' ? ['0', '0'] : style.translate.split(/\s+/)
											const scale =
												style.scale === 'none'
													? [1, 1]
													: style.scale.split(/\s+/).map(value => length(value, 1))

											if (shift.length > 2 || scale.length > 2 || style.rotate !== 'none') {
												throw new Error('Unsupported 3D glyph transform')
											}

											const native =
												style.transform === 'none'
													? new DOMMatrixReadOnly()
													: new DOMMatrixReadOnly(style.transform)

											if (!native.is2D) {
												throw new Error('Unsupported glyph perspective')
											}

											const transform = new DOMMatrix()
												.translate(length(shift[0], w), length(shift[1] ?? '0', h))
												.translate(ox, oy)
												.scale(scale[0], scale[1] ?? scale[0])
												.multiply(native)
											const sx = glyph.offsetWidth ? box.width / glyph.offsetWidth : 1
											const sy = glyph.offsetHeight ? box.height / glyph.offsetHeight : 1
											const parentStyle = getComputedStyle(glyph)
											const flexX =
												parentStyle.justifyContent === 'center' ? (glyph.clientWidth - w) / 2 : 0
											const flexY =
												parentStyle.alignItems === 'center' ? (glyph.clientHeight - h) / 2 : 0
											const corners = [
												[0, 0],
												[w, 0],
												[0, h],
												[w, h],
											].map(([x, y]) => new DOMPoint(x - ox, y - oy).matrixTransform(transform))

											addInk(
												{
													owner: key,
													kind: 'glyph',
													box: {
														left:
															box.left +
															sx * flexX +
															sx * Math.min(...corners.map(point => point.x)),
														right:
															box.left +
															sx * flexX +
															sx * Math.max(...corners.map(point => point.x)),
														top:
															box.top +
															sy * flexY +
															sy * Math.min(...corners.map(point => point.y)),
														bottom:
															box.top +
															sy * flexY +
															sy * Math.max(...corners.map(point => point.y)),
													},
												},
												heading,
											)
										} catch (error) {
											unsupported.push(key + ': ' + String(error))
										}
									}
								}

								if (visible.length > 12) {
									unsupported.push(
										'More than twelve visible heading owners exceeds bounded capture scope',
									)
								}

								const box = scope.getBoundingClientRect()
								const occlusions: { a: number; b: number; surface: string; box: Box }[] = []

								for (let a = 0; a < ink.length; a++) {
									for (let b = a + 1; b < ink.length; b++) {
										const first = ink[a],
											second = ink[b]

										if (
											!['title', 'glyph'].includes(first.kind) &&
											!['title', 'glyph'].includes(second.kind)
										) {
											continue
										}

										if (first.owner === second.owner && first.kind === second.kind) {
											continue
										}

										const overlap = {
											left: Math.max(first.box.left, second.box.left),
											right: Math.min(first.box.right, second.box.right),
											top: Math.max(first.box.top, second.box.top),
											bottom: Math.min(first.box.bottom, second.box.bottom),
										}

										if (overlap.right - overlap.left <= 1 || overlap.bottom - overlap.top <= 1) {
											continue
										}

										const nodes = [paintNodes.get(first)!, paintNodes.get(second)!]
										const stack = document.elementsFromPoint(
											(overlap.left + overlap.right) / 2,
											(overlap.top + overlap.bottom) / 2,
										)
										const indices = nodes.map(node =>
											stack.findIndex(element => node.contains(element)),
										)

										if (indices.some(index => index < 0) || indices[0] === indices[1]) {
											continue
										}

										const back = indices[0] > indices[1] ? 0 : 1
										const surfaces = new Set(stack.slice(Math.min(...indices) + 1, indices[back]))

										for (
											let ancestor: Element | null = nodes[1 - back];
											ancestor && !ancestor.contains(nodes[back]);
											ancestor = ancestor.parentElement
										) {
											const style = getComputedStyle(ancestor)

											if (style.position !== 'static' && style.zIndex !== 'auto') {
												surfaces.add(ancestor)
											}
										}
										const uncertain: string[] = []
										const rectangles = [...surfaces].flatMap(surface => {
											const bounds = surface.getBoundingClientRect()
											const paints = [
												{ surface, pseudo: '', style: getComputedStyle(surface), box: bounds },
											]

											if (
												!(surface instanceof HTMLElement) ||
												getComputedStyle(surface).position === 'static'
											) {
												return paints
											}

											for (const pseudo of ['::before', '::after']) {
												const style = getComputedStyle(surface, pseudo)

												if (
													style.content === 'none' ||
													!style.backgroundColor.startsWith('rgb(') ||
													Number(style.opacity) !== 1
												) {
													continue
												}

												const values = [style.left, style.top, style.width, style.height]

												if (
													style.position !== 'absolute' ||
													!values.every(value => /^-?(?:\d+(?:\.\d*)?|\.\d+)px$/.test(value)) ||
													(style.transform !== 'none' &&
														!new DOMMatrixReadOnly(style.transform).isIdentity) ||
													!['none', '0px', '0px 0px'].includes(style.translate) ||
													!['none', '1', '1 1'].includes(style.scale) ||
													style.rotate !== 'none'
												) {
													uncertain.push(
														'Inconclusive opaque foreground ' + surface.tagName + pseudo,
													)
													continue
												}

												const [left, top, width, height] = values.map(parseFloat)
												const sx = bounds.width / surface.offsetWidth,
													sy = bounds.height / surface.offsetHeight

												paints.push({
													surface,
													pseudo,
													style,
													box: new DOMRect(
														bounds.left + (surface.clientLeft + left) * sx,
														bounds.top + (surface.clientTop + top) * sy,
														width * sx,
														height * sy,
													),
												})
											}

											return paints
										})

										for (const { surface, pseudo, style, box } of rectangles) {
											if (surface.contains(nodes[back])) {
												continue
											}

											if (
												!style.backgroundColor.startsWith('rgb(') ||
												Number(style.opacity) !== 1 ||
												style.clipPath !== 'none' ||
												style.maskImage !== 'none' ||
												style.filter !== 'none' ||
												style.borderRadius !== '0px' ||
												box.left > overlap.left ||
												box.right < overlap.right ||
												box.top > overlap.top ||
												box.bottom < overlap.bottom
											) {
												continue
											}

											let opaque = true

											for (
												let ancestor: Element | null = surface;
												ancestor;
												ancestor = ancestor.parentElement
											) {
												const paint = getComputedStyle(ancestor),
													bounds = ancestor.getBoundingClientRect()

												if (
													Number(paint.opacity) !== 1 ||
													(paint.clipPath !== 'none' &&
														!(
															paint.clipPath.startsWith('inset(') &&
															[
																[overlap.left + 0.01, overlap.top + 0.01],
																[overlap.right - 0.01, overlap.top + 0.01],
																[overlap.left + 0.01, overlap.bottom - 0.01],
																[overlap.right - 0.01, overlap.bottom - 0.01],
															].every(([x, y]) =>
																document.elementsFromPoint(x, y).includes(surface),
															)
														)) ||
													paint.maskImage !== 'none' ||
													paint.filter !== 'none' ||
													(paint.overflowX !== 'visible' &&
														(bounds.left > overlap.left || bounds.right < overlap.right)) ||
													(paint.overflowY !== 'visible' &&
														(bounds.top > overlap.top || bounds.bottom < overlap.bottom))
												) {
													opaque = false
												}
											}

											if (opaque) {
												occlusions.push({
													a,
													b,
													surface: surface.tagName + (surface.id ? '#' + surface.id : '') + pseudo,
													box: {
														left: box.left,
														right: box.right,
														top: box.top,
														bottom: box.bottom,
													},
												})
												break
											}
										}

										if (!occlusions.some(proof => proof.a === a && proof.b === b)) {
											unsupported.push(...uncertain)
										}
									}
								}
								state.frames.push({
									time: performance.now(),
									scroll: root.scrollTop,
									edge: boundary === 'entry' ? box.top : box.bottom,
									horizontalOverflow: Math.max(
										document.documentElement.scrollWidth - document.documentElement.clientWidth,
										root.scrollWidth - root.clientWidth,
									),
									ink,
									unsupported,
									occlusions,
								})
								requestAnimationFrame(frame)
							}

							requestAnimationFrame(frame)
						},
						{ owner, boundary },
					)
					await page.mouse.move(width / 2, 700)

					for (let step = 0; step < 8; step++) {
						await page.mouse.wheel(0, direction * 110)
						await page.waitForTimeout(60)
					}
					await page.waitForTimeout(250)
					const capture = await page.evaluate(() => {
						const state = window.__stickyCollisionCapture

						if (!state) {
							throw new Error('Native sticky collision capture was not initialized')
						}

						state.active = false

						return state.frames
					})

					windows.push({ owner, boundary, direction, initial, frames: capture })
				}
			}
		}
		await info.attach('native-dense-sticky-collision-frames', {
			body: JSON.stringify({
				width,
				windows,
				limitations:
					'One real ancestor chain and bounded native journeys; no full-contract pass is inferred. Pseudo geometry outside supported affine pixel values is inconclusive.',
			}),
			contentType: 'application/json',
		})

		for (const window of windows) {
			const label = `${window.owner.level} ${window.boundary} ${window.direction}`

			expect(window.frames.length, `${label}: native frames must be captured`).toBeGreaterThan(3)
			expect(
				Math.max(...window.frames.map(frame => frame.scroll)) -
					Math.min(...window.frames.map(frame => frame.scroll)),
				`${label}: native input must cause actual scrolling`,
			).toBeGreaterThan(100)
			expect(
				window.frames.some(frame => frame.edge > 200) &&
					window.frames.some(frame => frame.edge < 100),
				`${label}: the real scope boundary must cross the sticky band`,
			).toBe(true)

			for (const frame of window.frames) {
				expect(frame.unsupported, `${label}: unsupported painted geometry is inconclusive`).toEqual(
					[],
				)
				expect(
					frame.horizontalOverflow,
					`${label}: no horizontal overflow during motion at ${frame.time}`,
				).toBeLessThanOrEqual(1)

				for (let a = 0; a < frame.ink.length; a++) {
					for (let b = a + 1; b < frame.ink.length; b++) {
						const first = frame.ink[a],
							second = frame.ink[b]

						if (first.owner === second.owner && first.kind === second.kind) {
							continue
						}

						if (
							!['title', 'glyph'].includes(first.kind) &&
							!['title', 'glyph'].includes(second.kind)
						) {
							continue
						}

						const overlapWidth =
							Math.min(first.box.right, second.box.right) -
							Math.max(first.box.left, second.box.left)
						const overlapHeight =
							Math.min(first.box.bottom, second.box.bottom) -
							Math.max(first.box.top, second.box.top)

						expect(
							overlapWidth > 1 &&
								overlapHeight > 1 &&
								!frame.occlusions.some(proof => proof.a === a && proof.b === b),
							`${label}: ${first.owner}/${first.kind} collides with ${second.owner}/${second.kind} at root ${frame.scroll}`,
						).toBe(false)
					}
				}
			}
		}
	})
}

for (const { width, wallet, direction, boundary } of [
	...[390, 768].flatMap(width =>
		['metamask', 'ambire', 'software'].map(wallet => ({
			width,
			wallet,
			direction: 'ltr',
			boundary: false,
		})),
	),
	...[540, 580].flatMap(width =>
		['ltr', 'rtl'].map(direction => ({ width, wallet: 'metamask', direction, boundary: true })),
	),
]) {
	test(`heading labels and end badges stay separated across approach and compact poses: ${wallet} ${width}px ${direction}`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto(
			wallet === 'software' ? '/__wallet-page/software/' : `/${wallet}/?variant=MOBILE`,
		)
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(async direction => {
			document.documentElement.dir = direction
			await document.fonts.ready
		}, direction)
		const observations = await page.evaluate(
			async ({ scored, boundary }) => {
				const root = document.querySelector<HTMLElement>('#layout')

				if (!root) {
					throw new Error('Native scroll root absent')
				}

				root.style.scrollSnapType = 'none'
				root.style.scrollBehavior = 'auto'
				root.style.overflowAnchor = 'none'
				const samples = []
				const settle = () =>
					new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)

				for (const id of boundary
					? ['security-audits-and-bounties']
					: scored
						? ['security', 'transparency', 'open-source', 'scam-prevention']
						: ['open-source', 'scam-prevention']) {
					const section = document.getElementById(id)

					if (!section) {
						throw new Error(`Real attribute ${id} absent`)
					}

					for (
						let ancestor: HTMLElement | null = section;
						ancestor;
						ancestor = ancestor.parentElement
					) {
						if (ancestor instanceof HTMLDetailsElement) {
							ancestor.open = true
						}
					}
					const details = section.querySelector<HTMLDetailsElement>(':scope > details')

					if (details) {
						details.open = true
					}

					await settle()
					await Promise.all(
						section
							.getAnimations({ subtree: true })
							.filter(
								animation =>
									animation.timeline instanceof DocumentTimeline &&
									Number.isFinite(animation.effect?.getComputedTiming().endTime) &&
									animation.playState !== 'finished',
							)
							.map(animation => animation.finished.catch(() => undefined)),
					)
					const heading = section.querySelector('h2,h3')
					const label = heading?.matches('h2')
						? heading
						: heading?.querySelector(`a[href="#${id}"] > span:not([data-icon])`)
					const end = section
						.querySelector('[data-sticky-breadcrumb~="source"]')
						?.parentElement?.querySelector(':scope > [data-sticky-breadcrumb~="end"]')

					if (!heading || !label || !end) {
						throw new Error('Actual heading label/end absent')
					}

					const targets = [
						350, 135, 133, 125, 117, 110, 103, 85, 60, 0, -80, -250, -80, 103, 117, 133, 350,
					]
					let refined = false

					for (const target of targets) {
						for (let attempt = 0; attempt < 8; attempt++) {
							root.scrollTop += section.getBoundingClientRect().top - target
							await settle()

							if (Math.abs(section.getBoundingClientRect().top - target) < 1) {
								break
							}
						}
						const range = document.createRange()

						range.selectNodeContents(label)
						const text = [...range.getClientRects()]
							.filter(rect => rect.width > 0 && rect.height > 0)
							.map(rect => ({
								left: rect.left,
								right: rect.right,
								top: rect.top,
								bottom: rect.bottom,
							}))
						const badges = (end.matches('[data-badge]') ? [end] : [...end.children])
							.filter(element => element.matches('[data-badge]'))
							.map(element => ({
								text: element.textContent?.trim(),
								box: (() => {
									const rect = element.getBoundingClientRect()

									return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
								})(),
							}))
						const overlaps = text.flatMap(title =>
							badges.flatMap(badge => {
								const x =
									Math.min(title.right, badge.box.right) - Math.max(title.left, badge.box.left)
								const y =
									Math.min(title.bottom, badge.box.bottom) - Math.max(title.top, badge.box.top)

								return x > 1 && y > 1 ? [{ badge: badge.text, x, y }] : []
							}),
						)

						const encounter =
							heading.matches('h3') &&
							getComputedStyle(end).getPropertyValue('---breadcrumb-clearance-supported').trim() ===
								'1'
								? (() => {
										const style = getComputedStyle(end)
										const value = (name: string) => {
											const raw = style.getPropertyValue(name).trim()

											if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)px$/.test(raw)) {
												throw new Error(`Unresolved encounter fact ${name}: ${raw}`)
											}

											return Number.parseFloat(raw)
										}
										const pie = document.querySelector('.pie-navigation')!
										const geometry = pie
											.querySelector('.pie-navigation-geometry')!
											.getBoundingClientRect()
										const pieStyle = getComputedStyle(pie)
										const maximum = Number.parseFloat(pieStyle.getPropertyValue('--pie-maxR'))
										const padding = Number.parseFloat(pieStyle.getPropertyValue('--pie-padding'))
										const circle = {
											x: geometry.x + geometry.width / 2,
											y: geometry.y + geometry.height / 2,
											radius: ((geometry.width / 2) * maximum) / (maximum + padding),
										}
										const rawGap =
											style.getPropertyValue('--stickyBreadcrumb-clearanceGap').trim() || '0px'
										const match = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(px|rem|em)?$/.exec(rawGap)

										if (!match || (!match[2] && Number(match[1]) !== 0)) {
											throw new Error(`Unresolved encounter gap: ${rawGap}`)
										}

										const gap =
											Number(match[1]) *
											(match[2] === 'rem'
												? Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
												: match[2] === 'em'
													? Number.parseFloat(style.fontSize)
													: 1)
										const paints = (end.matches('[data-badge]') ? [end] : [...end.children])
											.filter(element =>
												element.checkVisibility({
													visibilityProperty: true,
													opacityProperty: true,
												}),
											)
											.map(element => {
												const box = element.getBoundingClientRect()
												const transform = getComputedStyle(element).transform
												const x = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41
												const vertical = Math.max(0, box.top - circle.y, circle.y - box.bottom)
												const closestX = Math.max(box.left, Math.min(circle.x, box.right))
												const closestY = Math.max(box.top, Math.min(circle.y, box.bottom))

												return {
													tag: element.tagName,
													marker: element.matches('[data-collapsible-marker]'),
													badge: element.matches('[data-badge]'),
													top: box.top,
													bottom: box.bottom,
													width: box.width,
													height: box.height,
													x,
													vertical,
													clearance:
														Math.hypot(closestX - circle.x, closestY - circle.y) - circle.radius,
												}
											})

										return {
											offset: value('---breadcrumb-clearance-inlineOffset'),
											radius: value('---breadcrumb-clearance-arc-radius'),
											inlineRadius: value('---breadcrumb-clearance-arc-inlineRadius'),
											gap,
											circle,
											paints,
										}
									})()
								: null

						if (!refined && target === 350 && encounter && encounter.offset > 0) {
							const contact =
								target +
								encounter.circle.y +
								encounter.circle.radius +
								encounter.gap -
								Math.min(...encounter.paints.map(paint => paint.top))
							const band = [8, 4, 2, 1, 0, -1, -2, -4, -8].map(delta => contact + delta)

							targets.splice(1, 0, ...band)
							targets.splice(targets.length - 1, 0, ...[...band].reverse())
							refined = true
						}

						samples.push({
							encounter,
							id,
							target,
							scroll: root.scrollTop,
							actualSectionTop: section.getBoundingClientRect().top,
							leaf: end.matches('[data-badge]'),
							tracks: end.getAnimations().flatMap(animation =>
								animation.effect instanceof KeyframeEffect && animation.effect.target === end
									? [
											{
												properties: [
													...new Set(
														animation.effect.getKeyframes().flatMap(frame => Object.keys(frame)),
													),
												],
												resolved:
													animation.currentTime !== null &&
													!(animation.timeline instanceof DocumentTimeline),
											},
										]
									: [],
							),
							text,
							badges,
							overlaps,
							endWrap: getComputedStyle(end).getPropertyValue('---breadcrumb-endWrap'),
							sourceEndWrap: getComputedStyle(end).getPropertyValue('---breadcrumb-sourceEndWrap'),
						})
					}
				}

				return samples
			},
			{ scored: wallet === 'software', boundary },
		)

		await info.attach('heading-end-painted-geometry', {
			body: JSON.stringify(observations),
			contentType: 'application/json',
		})

		if (wallet === 'metamask' && observations.some(sample => sample.encounter)) {
			expect(
				observations.some(sample => sample.encounter && sample.encounter.offset > 0),
				'The real open H3 exercises a positive inline offset',
			).toBe(true)
		}

		for (const sample of observations) {
			const label = `${wallet}/${sample.id} ${width}px at section ${sample.target}`

			if (sample.encounter) {
				const { radius, inlineRadius, gap, circle, paints } = sample.encounter

				expect(
					[radius, inlineRadius, gap, circle.radius, circle.x, circle.y].every(Number.isFinite),
					`${label}: finite physical encounter`,
				).toBe(true)
				expect(
					Math.abs(radius - circle.radius),
					`${label}: physical radius with existing chord allowance`,
				).toBeLessThan(0.1)
				expect(gap, `${label}: positive rounded contact gap`).toBeGreaterThan(0)
				expect(Math.abs(radius - inlineRadius), `${label}: one physical circle`).toBeLessThan(0.001)
				expect(
					paints.some(paint => paint.marker),
					`${label}: actual marker paint`,
				).toBe(true)
				expect(
					paints.some(paint => paint.badge),
					`${label}: actual badge paint`,
				).toBe(true)

				for (const paint of paints) {
					expect(paint.width).toBeGreaterThan(0)
					expect(paint.height).toBeGreaterThan(0)
					expect(
						paint.clearance,
						`${label}: ${paint.tag} physical silhouette`,
					).toBeGreaterThanOrEqual(-1)

					if (Math.min(...paints.map(item => item.top)) > circle.y + circle.radius + gap + 1) {
						expect(
							Math.abs(paint.x),
							`${label}: no displacement before physical contact`,
						).toBeLessThan(1)
					}
				}
			}

			expect(
				Math.abs(sample.actualSectionTop - sample.target),
				`${label}: actual scroll delivery`,
			).toBeLessThan(1)
			expect(sample.text.length, `${label}: actual label lines`).toBeGreaterThan(0)
			expect(sample.badges.length, `${label}: actual painted badges`).toBeGreaterThan(0)

			for (const badge of sample.badges) {
				expect(badge.box.right - badge.box.left, `${label}: badge width`).toBeGreaterThan(0)
				expect(badge.box.bottom - badge.box.top, `${label}: badge height`).toBeGreaterThan(0)
			}

			if (sample.leaf) {
				for (const property of ['transform', 'translate']) {
					expect(
						sample.tracks.some(track => track.resolved && track.properties.includes(property)),
						`${label}: resolved ${property} motion`,
					).toBe(true)
				}
			}

			expect(sample.overlaps, `${label}: text lines overlap badge paint`).toEqual([])

			if (
				sample.target === -250 &&
				((boundary && width === 580) ||
					(wallet === 'software' && width === 390 && sample.id === 'transparency'))
			) {
				for (const badge of sample.badges) {
					expect(
						sample.text.some(
							line =>
								Math.min(line.bottom, badge.box.bottom) - Math.max(line.top, badge.box.top) > 1,
						),
						'Compact label and badge share a row when space permits',
					).toBe(true)
				}
			}
		}
	})
}

for (const { width, direction, open } of [
	{ width: 390, direction: 'ltr' },
	{ width: 390, direction: 'rtl' },
	{ width: 768, direction: 'ltr' },
].flatMap(config => [false, true].map(open => ({ ...config, open })))) {
	test(`ordinary end text clears heading labels in ${open ? 'open' : 'closed'} summaries: ${width}px ${direction}`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 180_000 })
		await page.evaluate(() => document.fonts.ready)
		const journeys = await page.evaluate(
			async ({ direction, open }) => {
				document.documentElement.dir = direction
				const root = document.querySelector<HTMLElement>('#layout')

				if (!root) {
					throw new Error('Native scroll root absent')
				}

				root.style.scrollSnapType = 'none'
				root.style.scrollBehavior = 'auto'
				root.style.overflowAnchor = 'none'
				const settle = () =>
					new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
				const textBoxes = (owner: Element) => {
					const boxes = []
					const walker = document.createTreeWalker(owner, NodeFilter.SHOW_TEXT)

					while (walker.nextNode()) {
						const node = walker.currentNode

						if (
							!node.textContent?.trim() ||
							node.parentElement?.closest('[data-icon], [aria-hidden="true"]')
						) {
							continue
						}

						const range = document.createRange()

						range.selectNodeContents(node)

						for (const rect of range.getClientRects()) {
							if (rect.width > 0 && rect.height > 0) {
								boxes.push({
									text: node.textContent.trim(),
									left: rect.left,
									right: rect.right,
									top: rect.top,
									bottom: rect.bottom,
								})
							}
						}
					}

					return boxes
				}
				const journeys = []

				for (const subject of [
					'[id="stage:software-2"]',
					'#security-news .news-items > [data-sticky-breadcrumb~="scope"]',
				].map(selector => ({ selector, open }))) {
					const scope = document.querySelector<HTMLElement>(subject.selector)

					if (!scope) {
						throw new Error(`Real disclosure absent: ${subject.selector}`)
					}

					for (let ancestor = scope.parentElement; ancestor; ancestor = ancestor.parentElement) {
						if (ancestor instanceof HTMLDetailsElement) {
							ancestor.open = true
						}
					}
					const details =
						scope instanceof HTMLDetailsElement
							? scope
							: scope.querySelector<HTMLDetailsElement>(':scope > details')

					if (!details) {
						throw new Error('Native disclosure owner absent')
					}

					details.open = subject.open
					await settle()
					await Promise.all(
						scope
							.getAnimations({ subtree: true })
							.filter(
								animation =>
									animation.timeline instanceof DocumentTimeline &&
									Number.isFinite(animation.effect?.getComputedTiming().endTime) &&
									animation.playState !== 'finished',
							)
							.map(animation => animation.finished.catch(() => undefined)),
					)
					const summary = details.querySelector<HTMLElement>(':scope > summary')
					const heading = summary?.querySelector('h3')
					const label = heading?.querySelector('[data-sticky-breadcrumb~="item"]')
					const end = summary?.querySelector('[data-sticky-breadcrumb~="end"]')

					if (!summary || !heading || !label || !end) {
						throw new Error('Actual H3 title/count paint owners absent')
					}

					const samples = []

					for (const target of [350, 160, 120, 100, 80, 0, -80, 100, 350]) {
						for (let attempt = 0; attempt < 8; attempt++) {
							root.scrollTop += scope.getBoundingClientRect().top - target
							await settle()

							if (Math.abs(scope.getBoundingClientRect().top - target) < 1) {
								break
							}
						}
						const title = textBoxes(label)
						const count = [...end.children].flatMap(textBoxes)
						const collisions = title.flatMap(a =>
							count.flatMap(b => {
								const x = Math.min(a.right, b.right) - Math.max(a.left, b.left)
								const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)

								return x > 1 && y > 1 ? [{ title: a.text, end: b.text, x, y }] : []
							}),
						)

						const enhanced =
							CSS.supports('animation-timeline: scroll()') &&
							CSS.supports('width: anchor-size(--breadcrumb-source inline)') &&
							CSS.supports('color: if(style(---breadcrumb-wrap: 1): red)')
						const supported = getComputedStyle(end)
							.getPropertyValue('---breadcrumb-clearance-supported')
							.trim()
						const pie = document.querySelector('.pie-navigation')
						const geometry = pie?.querySelector('.pie-navigation-geometry')?.getBoundingClientRect()
						const encounter =
							enhanced && subject.open && pie && geometry
								? (() => {
										const style = getComputedStyle(pie)
										const maximum = Number.parseFloat(style.getPropertyValue('--pie-maxR'))
										const padding = Number.parseFloat(style.getPropertyValue('--pie-padding'))
										const x = geometry.x + geometry.width / 2
										const y = geometry.y + geometry.height / 2
										const radius = ((geometry.width / 2) * maximum) / (maximum + padding)

										return {
											supported,
											radius,
											clearances: [...end.children]
												.filter(element =>
													element.checkVisibility({
														visibilityProperty: true,
														opacityProperty: true,
													}),
												)
												.map(element => {
													const box = element.getBoundingClientRect()

													return (
														Math.hypot(
															Math.max(box.left, Math.min(x, box.right)) - x,
															Math.max(box.top, Math.min(y, box.bottom)) - y,
														) - radius
													)
												}),
										}
									})()
								: null

						samples.push({
							enhanced,
							encounter,
							target,
							actualTop: scope.getBoundingClientRect().top,
							scroll: root.scrollTop,
							open: details.open,
							summaryTop: summary.getBoundingClientRect().top,
							headingTop: heading.getBoundingClientRect().top,
							title,
							count,
							collisions,
						})
					}
					journeys.push({ selector: subject.selector, open: subject.open, samples })
				}

				return journeys
			},
			{ direction, open },
		)

		await info.attach('ordinary-end-text-geometry', {
			body: JSON.stringify(journeys),
			contentType: 'application/json',
		})

		for (const journey of journeys) {
			for (const sample of journey.samples) {
				const context = `${journey.selector} ${width}px ${direction} at ${sample.target}`

				expect(
					Math.abs(sample.actualTop - sample.target),
					`${context}: actual delivered pose`,
				).toBeLessThan(1)
				expect(sample.open, `${context}: native disclosure state`).toBe(journey.open)
				expect(sample.title.length, `${context}: nonempty title text`).toBeGreaterThan(0)
				expect(sample.count.length, `${context}: nonempty transformed end text`).toBeGreaterThan(0)
				expect(sample.collisions, `${context}: actual text lines remain separated`).toEqual([])

				if (sample.enhanced && journey.open) {
					expect(sample.encounter, `${context}: physical pie encounter observed`).not.toBeNull()

					if (!sample.encounter) {
						throw new Error('Missing physical pie encounter')
					}

					expect(sample.encounter.supported, `${context}: shared curved clearance owner`).toBe('1')
					expect(Number.isFinite(sample.encounter.radius)).toBe(true)
					expect(sample.encounter.radius).toBeGreaterThan(0)
					expect(sample.encounter.clearances.length).toBeGreaterThan(0)

					for (const clearance of sample.encounter.clearances) {
						expect(
							clearance,
							`${context}: end paint clears actual pie silhouette`,
						).toBeGreaterThanOrEqual(-1)
					}
				}
			}

			if (!journey.open) {
				for (const key of ['summaryTop', 'headingTop'] as const) {
					const world = journey.samples.map(sample => sample[key] + sample.scroll)

					expect(
						Math.max(...world) - Math.min(...world),
						`Closed ${key} retains ordinary world flow`,
					).toBeLessThan(1.5)
				}
			}
		}
	})
}

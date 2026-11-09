import type { Page } from '@playwright/test'

import { observeStickyChain } from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

async function observeIconBoxes(page: Page, scope: string, heading: string) {
	const selector = scope + ' [data-icon]'
	const icons = await page.locator(selector).evaluateAll((elements, heading) => {
		const owner = document.querySelector(heading)?.closest('[data-sticky-breadcrumb~="position"]')

		return elements.map(element => {
			if (
				!owner ||
				element.closest('[data-sticky-breadcrumb~="position"]') !== owner ||
				!element.closest('[data-sticky-breadcrumb~="item"]') ||
				!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })
			) {
				return []
			}

			return ['before', 'after'].filter(pseudo => {
				const style = getComputedStyle(element, '::' + pseudo)

				return (
					style.content !== 'none' &&
					style.content !== 'normal' &&
					style.display !== 'none' &&
					style.visibility === 'visible' &&
					Number(style.opacity) > 0.01 &&
					style.filter !== 'opacity(0)'
				)
			})
		})
	}, heading)
	const cdp = await page.context().newCDPSession(page)

	try {
		const { root } = await cdp.send('DOM.getDocument')
		const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector })

		expect(nodeIds.length, 'Native and DOM icon inventories must agree').toBe(icons.length)
		const boxes = []

		for (const [index, pseudos] of icons.entries()) {
			if (!pseudos.length) {
				continue
			}

			const { node } = await cdp.send('DOM.describeNode', { nodeId: nodeIds[index] })

			for (const type of pseudos) {
				const pseudo = node.pseudoElements?.find(element => element.pseudoType === type)

				expect(pseudo, 'Visible icon layer must have a native paint owner').toBeDefined()
				const { model } = await cdp.send('DOM.getBoxModel', {
					backendNodeId: pseudo!.backendNodeId,
				})
				const xs = model.border.filter((_, index) => index % 2 === 0)
				const ys = model.border.filter((_, index) => index % 2 === 1)

				boxes.push({
					left: Math.min(...xs),
					right: Math.max(...xs),
					top: Math.min(...ys),
					bottom: Math.max(...ys),
				})
			}
		}

		return boxes
	} finally {
		await cdp.detach()
	}
}

test.use({ headless: false })

for (const wallet of ['metamask', 'ambire']) {
	for (const width of [390, 768, 1006]) {
		for (const family of ['stage', 'attribute', 'group']) {
			test(`breadcrumb surfaces preserve natural support and cover compact content: ${wallet} ${width} ${family}`, async ({
				page,
				browserName,
			}, info) => {
				await page.setViewportSize({ width, height: 900 })
				await page.goto(`/${wallet}/`)
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				await page.evaluate(() => document.fonts.ready)
				const scope = page
					.locator(
						family === 'group'
							? '.attribute-group[data-sticky-breadcrumb~="scope"]'
							: family === 'stage'
								? '[id^="stage:"][data-sticky-breadcrumb~="scope"]'
								: '.attribute-group section.attribute[data-sticky-breadcrumb~="scope"]',
					)
					.filter({
						has: page.locator(
							family === 'group'
								? ':scope > header > .section-caption'
								: ':scope > details[open] > summary[data-column~="span-start"] > [data-sticky-breadcrumb~="support"]',
						),
					})
					.first()

				await expect(scope).toHaveCount(1)
				const { chain, arrivalTops } = await scope.evaluate(element => {
					const chain = []

					for (
						let owner: Element | null = element;
						owner;
						owner = owner.parentElement?.closest('[data-sticky-breadcrumb~="scope"]') ?? null
					) {
						const heading = owner.querySelector('h1, h2, h3, h4')

						if (!heading || !owner.id) {
							throw Error('Surface observation requires an identified heading scope')
						}

						chain.unshift({
							level: Number(heading.tagName.slice(1)),
							scope: '#' + CSS.escape(owner.id),
							heading: '#' + CSS.escape(owner.id) + ' ' + heading.tagName.toLowerCase(),
						})
					}
					const heading = element.querySelector('h2, h3')!
					const flow = element.querySelector('[data-sticky-breadcrumb~="flow"]')!
					const style = getComputedStyle(heading)
					const length =
						flow.getBoundingClientRect().height -
						parseFloat(style.getPropertyValue('---breadcrumb-parentBlockEnd'))

					return {
						chain,
						arrivalTops:
							style.getPropertyValue('---breadcrumb-wrap').trim() === '0' && length > 0
								? [0.2, 0.5, 0.8].map(
										fraction =>
											element.getBoundingClientRect().top -
											flow.getBoundingClientRect().top -
											length * fraction,
									)
								: [],
					}
				})

				if (wallet === 'metamask' && width === 1006 && family === 'attribute') {
					expect(
						arrivalTops,
						'The wide attribute case must exercise a shared-row arrival',
					).not.toHaveLength(0)
				}

				const observations = []

				for (const top of [300, ...arrivalTops, -100]) {
					const observed = await scope.evaluate(async (element, top) => {
						const root = document.querySelector('#layout')

						if (!(root instanceof HTMLElement)) {
							throw new Error('Scroll owner absent')
						}

						root.style.scrollSnapType = 'none'
						root.style.scrollBehavior = 'auto'
						root.style.overflowAnchor = 'none'

						for (let attempt = 0; attempt < 8; attempt++) {
							root.scrollTop += element.getBoundingClientRect().top - top
							await new Promise(resolve =>
								requestAnimationFrame(() => requestAnimationFrame(resolve)),
							)

							if (Math.abs(element.getBoundingClientRect().top - top) < 1) {
								break
							}
						}
						const summary = element.querySelector(':scope > details > summary, :scope > header')
						const header = summary?.querySelector(':scope > header, :scope > [data-sticky]')
						const support = summary?.querySelector(
							':scope > [data-sticky-breadcrumb~="support"], :scope > .section-caption',
						)

						if (!header || !support) {
							throw new Error('Native foreground/support owners absent')
						}

						const surface = getComputedStyle(header, '::before')
						const rectangle = (target: Element) => {
							const { top, bottom, left, right, width, height } = target.getBoundingClientRect()

							return { top, bottom, left, right, width, height }
						}

						return {
							top: element.getBoundingClientRect().top,
							scroll: root.scrollTop,
							entry: getComputedStyle(header).getPropertyValue('---breadcrumb-entry').trim(),
							header: rectangle(header),
							support: rectangle(support),
							surface: {
								opacity: Number(surface.opacity),
								height: Number.parseFloat(surface.height),
							},
						}
					}, top)

					const occupied = await page.evaluate(observeStickyChain, chain)
					const surfaces = occupied.rows.flatMap(row => row.surfaces)
					const foreground = occupied.rows.at(-1)!
					const owner = chain.at(-1)!
					const iconBoxes =
						browserName === 'chromium'
							? await observeIconBoxes(page, owner.scope, owner.heading)
							: []
					const paint = foreground.foreground

					observations.push(observed)
					await info.attach(`surface-pose-${top}`, {
						body: JSON.stringify({
							...observed,
							surfaces,
							paint,
							iconBoxes,
							nativePseudoBounds: browserName === 'chromium',
							iconInkCoverage: false,
						}),
						contentType: 'application/json',
					})
					expect(
						Math.abs(observed.top - top),
						'Requested scene must actually be delivered',
					).toBeLessThan(1)
					expect(paint.length).toBeGreaterThan(0)

					if (arrivalTops.includes(top)) {
						expect(observed.entry, 'The sampled heading must be in its arrival state').toBe('0.5')
					}

					if (top === 300) {
						expect(
							observed.header.bottom,
							'Natural foreground must not cover its supporting paragraph',
						).toBeLessThanOrEqual(observed.support.top + 0.5)

						for (const surface of surfaces) {
							const overlapsSupport =
								surface.opacity > 0 &&
								surface.left < observed.support.right - 0.5 &&
								surface.right > observed.support.left + 0.5 &&
								surface.top < observed.support.bottom - 0.5 &&
								surface.bottom > observed.support.top + 0.5

							expect(
								overlapsSupport,
								'Natural supporting content must clear foreground backdrops',
							).toBe(false)
						}
					} else {
						for (const box of paint) {
							const coveredBottom = surfaces
								.filter(
									surface =>
										surface.opacity >= 0.99 &&
										surface.left <= box.left + 0.5 &&
										surface.right >= box.right - 0.5,
								)
								.sort((a, b) => a.top - b.top)
								.reduce(
									(bottom, surface) =>
										surface.top <= bottom + 0.5 ? Math.max(bottom, surface.bottom) : bottom,
									box.top,
								)

							expect(
								coveredBottom,
								'Occupied row surfaces must continuously cover DOM foreground owners',
							).toBeGreaterThanOrEqual(box.bottom - 0.5)
						}
					}
				}
				const [natural] = observations
				const compact = observations.at(-1)!

				expect(
					Math.abs(compact.support.top - natural.support.top + (compact.scroll - natural.scroll)),
					'Supporting content must retain ordinary document travel',
				).toBeLessThan(0.5)
				const outgoing = await scope.evaluate(async element => {
					const applicable = CSS.supports(
						'(animation-timeline: scroll()) and (animation-range: 0% 100%) and (width: anchor-size(--breadcrumb-source inline)) and (timeline-scope: --breadcrumb-size) and (color: if(style(---breadcrumb-wrap: 1): red))',
					)

					if (!applicable) {
						return {
							applicable: false as const,
							reason: 'Native breadcrumb enhancement unavailable',
						}
					}

					const root = document.querySelector<HTMLElement>('#layout')
					const position = element.querySelector<HTMLElement>(
						':scope > [data-sticky-breadcrumb~="position"], :scope > details > [data-sticky-breadcrumb~="position"]',
					)
					const header = position?.querySelector<HTMLElement>(':scope > [data-sticky]')
					const support = position?.querySelector(':scope > [data-sticky-breadcrumb~="support"]')
					const child = support?.firstElementChild

					if (!root || !position || !header || !child || !child.getClientRects().length) {
						throw Error('Rendered outgoing foreground/support owners absent')
					}

					const ancestors: Element[] = []

					for (
						let ancestor = child.parentElement;
						ancestor && ancestors.length < 3;
						ancestor = ancestor.parentElement
					) {
						ancestors.push(ancestor)
					}
					const subjects = [child, ...ancestors, header]
					const settle = async () => {
						let previous = '',
							stable = 0
						const start = performance.now()

						do {
							await new Promise(resolve => requestAnimationFrame(resolve))
							const geometry = JSON.stringify([
								root.scrollTop,
								child.getBoundingClientRect().top,
								header.getBoundingClientRect().top,
							])
							const finite = subjects.some(subject =>
								subject
									.getAnimations()
									.some(
										animation =>
											animation.timeline?.constructor.name === 'DocumentTimeline' &&
											(animation.pending || animation.playState === 'running') &&
											Number.isFinite(animation.effect?.getComputedTiming().endTime),
									),
							)

							stable = geometry === previous && !finite ? stable + 1 : 0
							previous = geometry

							if (stable >= 3) {
								return
							}
						} while (performance.now() - start < 10000)
						throw Error('Outgoing support geometry or finite transitions did not settle')
					}

					await settle()
					const contentBottom = () => {
						const style = getComputedStyle(position)

						return (
							position.getBoundingClientRect().bottom -
							Number.parseFloat(style.borderBlockEndWidth) -
							Number.parseFloat(style.paddingBlockEnd)
						)
					}
					const origin = () => root.getBoundingClientRect().top + root.clientTop
					const inset = Number.parseFloat(getComputedStyle(header).insetBlockStart)
					const containerWorldBottom = contentBottom() + root.scrollTop - origin()
					const rowHeight = header.getBoundingClientRect().height
					const boundary = containerWorldBottom - inset - rowHeight

					if (
						getComputedStyle(header).position !== 'sticky' ||
						!Number.isFinite(boundary) ||
						boundary < 16 ||
						boundary + 16 > root.scrollHeight - root.clientHeight
					) {
						throw Error('Enhanced outgoing row lacks a reachable native release boundary')
					}

					const read = (subject: Element) => {
						const style = getComputedStyle(subject)
						const { x, y, top, bottom, left, right, width, height } =
							subject.getBoundingClientRect()

						return {
							tag: subject.tagName,
							breadcrumb: subject.getAttribute('data-sticky-breadcrumb'),
							rect: { x, y, top, bottom, left, right, width, height },
							transform: style.transform,
							translate: style.translate,
							opacity: style.opacity,
							animationName: style.animationName,
							animationTimeline: style.getPropertyValue('animation-timeline'),
							animationRange: style.getPropertyValue('animation-range'),
						}
					}
					const capture = () => ({
						scroll: root.scrollTop,
						worldTop: child.getBoundingClientRect().top + root.scrollTop - origin(),
						containerGap: contentBottom() - header.getBoundingClientRect().bottom,
						scopeGap:
							element.getBoundingClientRect().bottom - header.getBoundingClientRect().bottom,
						child: read(child),
						header: read(header),
						ancestors: ancestors.map(read),
					})
					const samples = []

					for (const offset of [-16, 0, 16, 2, -2, -16]) {
						const requested = boundary + offset

						root.scrollTo({ top: requested, behavior: 'instant' })
						await settle()
						const observed = capture()

						await new Promise(resolve => requestAnimationFrame(resolve))

						if (JSON.stringify(observed) !== JSON.stringify(capture())) {
							throw Error('Outgoing support observation changed the settled pose')
						}

						samples.push({ offset, requested, ...observed })
					}

					return {
						applicable: true as const,
						derivation: { containerWorldBottom, inset, rowHeight, boundary },
						samples,
					}
				})

				await info.attach('outgoing-support-geometry', {
					body: JSON.stringify(outgoing),
					contentType: 'application/json',
				})

				if (outgoing.applicable) {
					for (const sample of outgoing.samples) {
						expect(
							Math.abs(sample.scroll - sample.requested),
							'Outgoing pose delivered',
						).toBeLessThanOrEqual(1)
						expect(
							Math.abs(sample.worldTop - outgoing.samples[0].worldTop),
							'Support retains ordinary travel through release and reverse',
						).toBeLessThanOrEqual(0.5)

						if (sample.offset < 0) {
							expect(
								sample.containerGap,
								'Native row has containing-block space before release',
							).toBeGreaterThan(1)
						} else {
							expect(
								Math.abs(sample.containerGap),
								'Native row follows its content edge after release',
							).toBeLessThanOrEqual(1)
						}
					}
				} else {
					info.annotations.push({ type: 'coverage', description: outgoing.reason })
				}

				await info.attach('surface-geometry', {
					body: JSON.stringify(observations),
					contentType: 'application/json',
				})
			})
		}
	}
}

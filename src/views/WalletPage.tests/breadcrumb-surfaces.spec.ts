import { expect, test } from '../../../tests/browser/verified-test'

test.use({ headless: false })

for (const wallet of ['metamask', 'ambire']) {
	for (const width of [390, 768]) {
		for (const family of ['stage', 'attribute', 'group']) {
			test(`breadcrumb surfaces preserve natural support and cover compact content: ${wallet} ${width} ${family}`, async ({
				page,
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
				const observations = []

				for (const top of [300, -100]) {
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
							header: rectangle(header),
							support: rectangle(support),
							surface: {
								opacity: Number(surface.opacity),
								height: Number.parseFloat(surface.height),
							},
							surfaces: [...document.querySelectorAll('[data-sticky]')].flatMap(owner =>
								['::before', '::after'].flatMap(pseudo => {
									const style = getComputedStyle(owner, pseudo)
									const box = owner.getBoundingClientRect()

									if (
										style.content === 'none' ||
										style.content === 'normal' ||
										Number(style.opacity) < 0.99 ||
										style.filter === 'opacity(0)' ||
										style.backgroundColor === 'rgba(0, 0, 0, 0)'
									) {
										return []
									}

									return [
										{
											top: box.top,
											bottom: box.top + Number.parseFloat(style.height),
											left: box.left,
											right: box.left + Number.parseFloat(style.width),
										},
									]
								}),
							),
							paint: [
								...header.querySelectorAll(
									'[data-sticky-breadcrumb~="item"], [data-sticky-breadcrumb~="end"] > *',
								),
							].map(child => rectangle(child)),
						}
					}, top)

					observations.push(observed)
					await info.attach(`surface-pose-${top}`, {
						body: JSON.stringify(observed),
						contentType: 'application/json',
					})
					expect(
						Math.abs(observed.top - top),
						'Requested scene must actually be delivered',
					).toBeLessThan(1)
					expect(observed.paint.length).toBeGreaterThan(0)

					if (top > 0) {
						expect(
							observed.header.bottom,
							'Natural foreground must not cover its supporting paragraph',
						).toBeLessThanOrEqual(observed.support.top + 0.5)
						expect(
							observed.surface.opacity,
							'Compact backdrop must not obscure natural supporting content',
						).toBe(0)
					} else {
						for (const box of observed.paint) {
							expect(
								observed.surfaces.some(
									surface =>
										surface.top <= box.top + 0.5 &&
										surface.bottom >= box.bottom - 0.5 &&
										surface.left <= box.left + 0.5 &&
										surface.right >= box.right - 0.5,
								),
								'An occupied row surface must cover its heading and badges, including shared rows',
							).toBe(true)
						}
					}
				}
				const [natural, compact] = observations

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

					const ancestors = []

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

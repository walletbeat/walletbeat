import { observeStickyChain } from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 1440]) {
	test(`closed disclosures exclude hidden layout, motion and focus at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await page.locator('astro-island[ssr]:has(#top)').waitFor({ state: 'detached', timeout: 60000 })
		const details = page.locator('.attribute-group section.attribute > details').first()
		const summary = details.locator(':scope > summary')
		const nestedHeadings = details.locator('h4')

		expect(await nestedHeadings.count()).toBeGreaterThan(0)
		await summary.focus()
		await page.keyboard.press('Space')
		await expect(details).not.toHaveAttribute('open')
		await details.evaluate(async element => {
			await Promise.all(
				element
					.getAnimations({ subtree: true })
					.filter(animation => {
						const timing = animation.effect?.getComputedTiming()

						return (
							animation.timeline instanceof DocumentTimeline &&
							timing &&
							Number.isFinite(timing.endTime)
						)
					})
					.map(animation => animation.finished.catch(() => undefined)),
			)
		})
		await expect
			.poll(() =>
				details.evaluate(element => {
					const summary = element.querySelector(':scope > summary')!

					return [...element.children]
						.filter(child => child !== summary)
						.every(child => !child.checkVisibility())
				}),
			)
			.toBe(true)
		const hidden = await details.evaluate(element => {
			const summary = element.querySelector(':scope > summary')!

			return [...element.querySelectorAll('*')]
				.filter(child => !summary.contains(child) && child !== summary)
				.map(child => {
					const style = getComputedStyle(child)
					const motions = child
						.getAnimations({ subtree: true })
						.filter(
							animation =>
								!(animation.effect instanceof KeyframeEffect) || animation.effect.target === child,
						)
						.map(animation => {
							const effect = animation.effect
							const targetMatches = effect instanceof KeyframeEffect && effect.target === child
							const pseudo = effect instanceof KeyframeEffect ? effect.pseudoElement : null
							const ownerStyle = getComputedStyle(child, pseudo)
							const names = ownerStyle.animationName
								.split(',')
								.map(name => name.trim())
								.filter(name => name && name !== 'none')
							const name =
								animation instanceof CSSAnimation
									? animation.animationName
									: animation.constructor.name
							const expectedOutputs: Record<string, string> | null =
								name === 'link-current'
									? { '---link-active': '0', '---link-current': '0' }
									: name === 'clearance-inline-measure'
										? { '---clearance-inlineFraction': '1' }
										: null
							const outputs = Object.entries(expectedOutputs ?? {}).map(([property, expected]) => ({
								property,
								expected,
								actual: ownerStyle.getPropertyValue(property).trim(),
							}))
							const properties =
								effect instanceof KeyframeEffect
									? [
											...new Set(
												effect
													.getKeyframes()
													.flatMap(frame =>
														Object.keys(frame).filter(
															property =>
																!['offset', 'computedOffset', 'easing', 'composite'].includes(
																	property,
																),
														),
													),
											),
										]
									: []
							const progress = effect?.getComputedTiming().progress ?? null
							const neutral =
								expectedOutputs !== null &&
								properties.every(property => property in expectedOutputs) &&
								outputs.every(output => output.actual === output.expected)
							const unresolved =
								!animation.timeline && animation.currentTime === null && progress === null
							// Retained handles are neutral only when CSS attachment and sampled state agree.
							const unapplied =
								animation instanceof CSSAnimation &&
								targetMatches &&
								names.length === 0 &&
								(unresolved || neutral)

							return {
								pseudo,
								names,
								name,
								targetMatches,
								unapplied,
								outputs,
								properties,
								unresolved,
								timeline: animation.timeline?.constructor.name ?? null,
								currentTime: animation.currentTime === null ? null : String(animation.currentTime),
								pending: animation.pending,
								playState: animation.playState,
								progress,
							}
						})

					return {
						tag: child.tagName,
						boxes: child.getClientRects().length,
						rendered: child.checkVisibility(),
						animationNames: style.animationName
							.split(',')
							.map(name => name.trim())
							.filter(name => name && name !== 'none'),
						activeMotion: motions.filter(
							motion =>
								!motion.unapplied &&
								(motion.pending || motion.playState === 'running' || motion.progress !== null),
						).length,
						unownedMotion: motions.filter(motion => !motion.targetMatches),
						pseudoAnimations: [
							'::before',
							'::after',
							...(child.matches('details') && CSS.supports('selector(::details-content)')
								? ['::details-content']
								: []),
						].flatMap(pseudo =>
							getComputedStyle(child, pseudo)
								.animationName.split(',')
								.map(name => name.trim())
								.filter(name => name && name !== 'none')
								.map(name => ({ pseudo, name })),
						),
						unappliedMotion: motions.filter(motion => motion.unapplied),
						state: child.hasAttribute('data-pressable-name')
							? {
									active: style.getPropertyValue('---link-active').trim(),
									current: style.getPropertyValue('---link-current').trim(),
								}
							: null,
					}
				})
		})

		await info.attach('closed-descendants', {
			body: JSON.stringify(hidden),
			contentType: 'application/json',
		})
		expect(hidden.length).toBeGreaterThan(0)
		expect(
			hidden.filter(
				child =>
					child.rendered ||
					child.activeMotion ||
					child.animationNames.length ||
					child.pseudoAnimations.length ||
					child.unownedMotion.length ||
					(child.state && (child.state.active !== '0' || child.state.current !== '0')),
			),
		).toEqual([])

		await expect(summary).toBeVisible()
		expect(
			await nestedHeadings.evaluateAll(
				elements => elements.filter(element => element.checkVisibility()).length,
			),
		).toBe(0)

		for (const key of ['Tab', 'Shift+Tab']) {
			await summary.focus()
			await page.keyboard.press(key)
			expect(
				await details.evaluate(element => {
					const summary = element.querySelector(':scope > summary')!

					return (
						element.contains(document.activeElement) && !summary.contains(document.activeElement)
					)
				}),
			).toBe(false)
		}
		const travel = await summary.evaluate(async element => {
			const root = document.querySelector<HTMLElement>('#layout')!
			const heading = element.querySelector('h3')!
			const previousStyle = root.getAttribute('style')
			const samples: {
				requestedScroll: number
				scroll: number
				summary: number
				heading: number
				closed: boolean
			}[] = []

			try {
				root.style.scrollSnapType = 'none'
				root.style.overflowAnchor = 'none'
				const start = root.scrollTop + element.getBoundingClientRect().top - 400

				for (let offset = 0; offset <= 560; offset += 80) {
					root.scrollTo({ top: start + offset, behavior: 'instant' })
					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
					samples.push({
						requestedScroll: start + offset,
						scroll: root.scrollTop,
						closed:
							element.parentElement instanceof HTMLDetailsElement && !element.parentElement.open,
						summary: element.getBoundingClientRect().top,
						heading: heading.getBoundingClientRect().top,
					})
				}
			} finally {
				if (previousStyle === null) {
					root.removeAttribute('style')
				} else {
					root.setAttribute('style', previousStyle)
				}
			}

			return samples
		})

		await info.attach('closed-summary-scroll-travel', {
			body: JSON.stringify(travel),
			contentType: 'application/json',
		})

		for (const sample of travel) {
			expect(
				Math.abs(sample.scroll - sample.requestedScroll),
				'Actual scroll reaches each requested closed-summary pose',
			).toBeLessThan(1)
			expect(sample.closed, 'The native disclosure remains closed during travel').toBe(true)
		}
		expect(
			travel[0].summary,
			'Closed summary begins below the viewport sticky region',
		).toBeGreaterThan(399)
		expect(
			travel.at(-1)!.summary,
			'Closed summary travels above the viewport instead of sticking',
		).toBeLessThan(-159)
		expect(travel.at(-1)!.scroll - travel[0].scroll).toBeGreaterThan(400)

		for (const part of ['summary', 'heading'] as const) {
			const worldPositions = travel.map(sample => sample[part] + sample.scroll)

			expect(
				Math.max(...worldPositions) - Math.min(...worldPositions),
				`Closed ${part} follows document scrolling across the sticky boundary`,
			).toBeLessThan(1.5)
		}
		await summary.focus()
		await page.keyboard.press('Space')
		await expect(details).toHaveAttribute('open')
		expect(
			await nestedHeadings.first().evaluate(element => element.getClientRects().length),
		).toBeGreaterThan(0)
	})
}

test('multi-child cards animate natively and close to their summary and borders', async ({
	page,
}, info) => {
	await page.goto('/__wallet-page/software/')
	await page.locator('astro-island[ssr]:has(#top)').waitFor({ state: 'detached', timeout: 60000 })
	await page.evaluate(() => document.fonts.ready)
	const initial = await page.locator('#top > article').evaluate(article => {
		const card = document.createElement('details')

		card.id = 'disclosure-padding-control'
		card.setAttribute('data-card', 'padding-5 secondary radius-4')
		card.open = true
		card.innerHTML =
			'<summary>Disclosure padding</summary><p style="block-size:60px">First body child</p><p style="block-size:90px">Second body child</p>'
		article.append(card)
		const summary = card.querySelector('summary')!
		const style = getComputedStyle(card)

		return {
			actual: card.getBoundingClientRect().height,
			expected:
				summary.getBoundingClientRect().height +
				150 +
				parseFloat(getComputedStyle(summary).paddingBlockEnd) +
				parseFloat(style.borderTopWidth) +
				parseFloat(style.borderBottomWidth),
		}
	})

	await info.attach('initial-open-disclosure-geometry', {
		body: JSON.stringify(initial),
		contentType: 'application/json',
	})
	expect(
		Math.abs(initial.actual - initial.expected),
		'Initially open content includes both body children and padding before any transition frame',
	).toBeLessThanOrEqual(0.5)
	const card = page.locator('#disclosure-padding-control')
	const settleVisibleSummary = async () => {
		await card.locator('summary').evaluate(summary => {
			summary.focus({ preventScroll: true })
			summary.scrollIntoView({ block: 'center', behavior: 'instant' })
		})
		await expect
			.poll(() =>
				card.locator('summary').evaluate(async summary => {
					const root = document.querySelector('#layout')!
					const before = root.scrollTop

					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
					const box = summary.getBoundingClientRect()
					const x = box.left + box.width / 2,
						y = box.top + box.height / 2

					return (
						Math.abs(root.scrollTop - before) <= 0.5 &&
						box.top >= 0 &&
						box.bottom <= innerHeight &&
						document.elementFromPoint(x, y)?.closest('summary') === summary
					)
				}),
			)
			.toBe(true)
	}

	await settleVisibleSummary()
	const openHeight = await card.evaluate(element => element.getBoundingClientRect().height)
	const prepareNativeMotion = (opening: boolean) =>
		card.evaluate(
			(element, desired) => {
				if (!(element instanceof HTMLDetailsElement)) {
					throw new Error('Expected native disclosure')
				}

				const style = getComputedStyle(element)
				const target = desired.opening
					? desired.openHeight
					: element.querySelector('summary')!.getBoundingClientRect().height +
						parseFloat(style.borderTopWidth) +
						parseFloat(style.borderBottomWidth)
				const before = element.getBoundingClientRect().height
				const observation = {
					before,
					target,
					sizes: [before],
					frames: [] as {
						height: number
						top: number
						bottom: number
						viewportHeight: number
						pseudoSize: string
						pseudoDisplay: string
						visibility: string
					}[],
					complete: false,
				}
				const started = performance.now()
				const frame = () => {
					if (element.open === desired.opening) {
						const height = element.getBoundingClientRect().height

						observation.sizes.push(height)
						const box = element.querySelector('summary')!.getBoundingClientRect()
						const pseudo = getComputedStyle(element, '::details-content')

						observation.frames.push({
							height,
							top: box.top,
							bottom: box.bottom,
							viewportHeight: innerHeight,
							pseudoSize: pseudo.blockSize,
							pseudoDisplay: pseudo.display,
							visibility: pseudo.contentVisibility,
						})
						observation.complete = Math.abs(height - target) <= 0.5
					}

					element.setAttribute('data-test-motion', JSON.stringify(observation))

					if (!observation.complete && performance.now() - started < 5000) {
						requestAnimationFrame(frame)
					}
				}

				frame()
			},
			{ opening, openHeight },
		)
	const assertNativeMotion = async (phase: string) => {
		try {
			await expect
				.poll(() =>
					card.evaluate(element => {
						const value: unknown = JSON.parse(element.getAttribute('data-test-motion') ?? '{}')

						return typeof value === 'object' && value !== null && 'complete' in value
							? value.complete
							: undefined
					}),
				)
				.toBe(true)
			const supported = await card.evaluate(
				() =>
					CSS.supports('interpolate-size', 'allow-keywords') &&
					CSS.supports('transition-behavior', 'allow-discrete') &&
					!matchMedia('(prefers-reduced-motion: reduce)').matches,
			)

			if (supported) {
				const observation: unknown = JSON.parse(
					(await card.getAttribute('data-test-motion')) ?? '{}',
				)

				if (
					typeof observation !== 'object' ||
					observation === null ||
					!('before' in observation) ||
					typeof observation.before !== 'number' ||
					!('target' in observation) ||
					typeof observation.target !== 'number' ||
					!('sizes' in observation) ||
					!Array.isArray(observation.sizes)
				) {
					throw new Error('Invalid native disclosure motion observation')
				}

				const sizes: unknown[] = observation.sizes

				if (!sizes.every((size): size is number => typeof size === 'number')) {
					throw new Error('Invalid native disclosure size samples')
				}

				const low = Math.min(observation.before, observation.target),
					high = Math.max(observation.before, observation.target)

				expect(
					sizes.some(height => height > low + 0.5 && height < high - 0.5),
					'Native disclosure layout passes through an intermediate size',
				).toBe(true)
			}
		} finally {
			await info.attach(`${phase}-native-motion`, {
				body: (await card.getAttribute('data-test-motion')) ?? '{}',
				contentType: 'application/json',
			})
		}
	}

	await prepareNativeMotion(false)
	await page.keyboard.press('Space')
	await expect(card).not.toHaveAttribute('open')
	await assertNativeMotion('close')
	await expect
		.poll(() =>
			card.evaluate(element => {
				const style = getComputedStyle(element)
				const summary = element.querySelector('summary')!

				return Math.abs(
					element.getBoundingClientRect().height -
						summary.getBoundingClientRect().height -
						parseFloat(style.borderTopWidth) -
						parseFloat(style.borderBottomWidth),
				)
			}),
		)
		.toBeLessThanOrEqual(1)
	await settleVisibleSummary()
	await prepareNativeMotion(true)
	await page.keyboard.press('Space')
	await expect(card).toHaveAttribute('open')
	await assertNativeMotion('open')
})

for (const wallet of ['metamask', 'ambire']) {
	test(`disclosure markers have one paint owner across wrapped summary layouts: ${wallet}`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 900 })
		await page.goto(`/${wallet}/`)
		await page.locator('astro-island[ssr]:has(#top)').waitFor({ state: 'detached', timeout: 60000 })
		await page.evaluate(() => document.fonts.ready)
		const markers = await page.locator('#top article summary').evaluateAll(summaries =>
			summaries
				.filter(summary => summary.checkVisibility())
				.map(summary => ({
					heading: summary.querySelector('h2,h3,h4')?.tagName ?? null,
					text: summary.textContent?.trim().slice(0, 100),
					owners: [summary, ...summary.querySelectorAll('*')]
						.flatMap(element =>
							(element.matches('[data-collapsible-marker]') ? [null, '::after'] : ['::after']).map(
								pseudo => ({ element, pseudo }),
							),
						)
						.filter(({ element, pseudo }) => {
							if (element.closest('summary') !== summary) {
								return false
							}

							const style = getComputedStyle(element, pseudo)

							return (
								element.checkVisibility() &&
								(pseudo === null || (style.content !== 'none' && style.content !== 'normal')) &&
								style.display !== 'none' &&
								style.maskImage !== 'none'
							)
						})
						.map(
							({ element, pseudo }) => `${element.tagName}${pseudo ?? '[data-collapsible-marker]'}`,
						),
				})),
		)

		expect(markers.some(marker => marker.heading === 'H3')).toBe(true)
		expect(markers.some(marker => marker.heading === 'H4')).toBe(true)
		expect(markers.filter(marker => marker.owners.length !== 1)).toEqual([])
	})
}

for (const selector of [
	'.attribute-group section.attribute > details',
	'#stages section > details',
	'#security-news .news-items > [data-sticky-breadcrumb~="scope"] > details',
]) {
	test(`native closure keeps the closed card top visible from every scroll region: ${selector}`, async ({
		page,
	}, info) => {
		test.setTimeout(180_000)
		await page.setViewportSize({ width: 390, height: 900 })
		const observations = []
		const deliveredRegion = (state: {
			card: { top: number; bottom: number }
			header: { bottom: number }
			viewport: number
		}) =>
			state.card.top >= state.header.bottom - 1 && state.card.top < state.viewport
				? 'top'
				: state.card.bottom < 0
					? 'deep'
					: state.card.bottom <= state.viewport / 2
						? 'end'
						: 'body'

		try {
			await page.goto('/__wallet-page/software/')
			await page
				.locator('astro-island[ssr]:has(#top)')
				.waitFor({ state: 'detached', timeout: 60000 })
			await page.evaluate(() => document.fonts.ready)
			const candidates = page.locator(selector)
			const selectedIndex =
				selector.includes('#stages') || selector.includes('.news-items')
					? await candidates.evaluateAll(elements => {
							let selected = 0,
								mostContent = -1

							for (const [index, element] of elements.entries()) {
								if (!(element instanceof HTMLDetailsElement)) {
									throw new Error('The disclosure owner must be native details')
								}

								const content = [...element.children]
									.filter(child => child.tagName !== 'SUMMARY')
									.reduce((length, child) => length + (child.textContent?.length ?? 0), 0)

								if (content > mostContent) {
									mostContent = content
									selected = index
								}
							}

							return selected
						})
					: 0
			const details = candidates.nth(selectedIndex)

			await expect(details).toHaveCount(1)
			const summary = details.locator(':scope > summary')
			const precedingChain = await details.evaluate(element => {
				const owners = []
				const card = element.closest('[data-card]') ?? element

				for (let scope = card.parentElement; scope; scope = scope.parentElement) {
					if (
						!scope.matches('[data-sticky-container], [data-sticky-breadcrumb~="scope"]') ||
						!scope.id
					) {
						continue
					}

					const position = scope.querySelector(
						':scope > [data-sticky-breadcrumb~="position"], :scope > details > [data-sticky-breadcrumb~="position"], :scope > [data-sticky], :scope > details > [data-sticky]',
					)
					const heading = position?.querySelector('h1,h2,h3,h4')

					if (!heading) {
						continue
					}

					owners.unshift({
						level: Number(heading.tagName.slice(1)),
						scope: '#' + CSS.escape(scope.id),
						heading: '#' + CSS.escape(scope.id) + ' ' + heading.tagName.toLowerCase(),
					})
				}

				return owners
			})
			const settle = (phase: string) =>
				test.step(
					`${selector}: ${phase}`,
					() =>
						details.evaluate(async element => {
							const root = document.querySelector<HTMLElement>('#layout')!
							const owners = new Set<HTMLDetailsElement>()

							for (let owner: Element | null = element; owner; owner = owner.parentElement) {
								if (owner instanceof HTMLDetailsElement) {
									owners.add(owner)

									if (owner.name) {
										for (const sibling of document.querySelectorAll('details')) {
											if (sibling.name === owner.name) {
												owners.add(sibling)
											}
										}
									}
								}
							}
							await Promise.race([
								Promise.allSettled(
									[...owners].flatMap(owner =>
										owner
											.getAnimations()
											.filter(
												animation =>
													animation instanceof CSSTransition && animation.playState === 'running',
											)
											.map(animation => animation.finished),
									),
								),
								new Promise<never>((_, reject) =>
									setTimeout(
										() => reject(new Error('Native disclosure owner transitions exceeded 3000ms')),
										3000,
									),
								),
							])
							let lastScroll = performance.now(),
								previousScroll = root.scrollTop,
								previousTop = element.getBoundingClientRect().top,
								stable = 0
							const started = performance.now()
							const scrolled = () => {
								lastScroll = performance.now()
							}

							root.addEventListener('scroll', scrolled)

							try {
								while (performance.now() - started < 8000) {
									await Promise.race([
										new Promise<void>(resolve => requestAnimationFrame(() => resolve())),
										new Promise<never>((_, reject) =>
											setTimeout(
												() => reject(new Error('Native settlement frame exceeded 3000ms')),
												3000,
											),
										),
									])
									const top = element.getBoundingClientRect().top

									stable =
										Math.abs(root.scrollTop - previousScroll) < 0.5 &&
										Math.abs(top - previousTop) < 0.5
											? stable + 1
											: 0
									previousScroll = root.scrollTop
									previousTop = top

									if (stable >= 6 && performance.now() - lastScroll >= 100) {
										return
									}
								}
								throw new Error(
									'Native disclosure motion and root scrolling did not settle within 8 seconds',
								)
							} finally {
								root.removeEventListener('scroll', scrolled)
							}
						}),
					{ timeout: 15_000 },
				)
			const read = () =>
				details.evaluate(element => {
					const rect = ({ x, y, width, height, top, right, bottom, left }: DOMRectReadOnly) => ({
						x,
						y,
						width,
						height,
						top,
						right,
						bottom,
						left,
					})
					const root = document.querySelector<HTMLElement>('#layout')!,
						summary = element.querySelector<HTMLElement>(':scope > summary')!
					const box = element.closest('[data-card]')!.getBoundingClientRect(),
						disclosureBox = element.getBoundingClientRect(),
						summaryBox = summary.getBoundingClientRect(),
						heading = summary.querySelector('h2,h3,h4')!,
						headingBox = heading.getBoundingClientRect()
					let headingOpacity = 1,
						headingVisible = true

					for (
						let ancestor: Element | null = heading.querySelector('a') ?? heading;
						ancestor;
						ancestor = ancestor.parentElement
					) {
						const style = getComputedStyle(ancestor)

						headingOpacity *= Number(style.opacity)
						headingVisible &&= style.display !== 'none' && style.visibility === 'visible'
					}
					const pie = document.querySelector('.pie-navigation')!,
						pieGeometry = pie.querySelector('.pie-navigation-geometry')!
					const inlineStickyAncestors = []

					for (
						let owner = summary.parentElement;
						owner && owner.tagName !== 'ARTICLE';
						owner = owner.parentElement
					) {
						if (
							owner.matches('[data-scroll-item~="inline-detached"]') &&
							getComputedStyle(owner).position === 'sticky'
						) {
							inlineStickyAncestors.push({
								tag: owner.tagName,
								id: owner.id,
								scrollItem: owner.getAttribute('data-scroll-item'),
							})
						}
					}
					const closedLayer = {
						enhanced:
							CSS.supports('animation-timeline: scroll()') &&
							CSS.supports('animation-range: 0% 100%') &&
							CSS.supports('width: anchor-size(--breadcrumb-source inline)') &&
							CSS.supports('timeline-scope: --breadcrumb-size') &&
							CSS.supports('color: if(style(---breadcrumb-wrap: 1): red)'),
						summary: Number(getComputedStyle(summary).zIndex),
						backdrop: Number(getComputedStyle(pie, '::before').zIndex),
						geometry: Number(getComputedStyle(pieGeometry).zIndex),
						afterBackdropOwner: Boolean(
							pie.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING,
						),
						inlineStickyAncestors,
					}
					const header = document.querySelector('#nav > header')!.getBoundingClientRect()
					const x = Math.max(0, Math.min(innerWidth - 1, headingBox.left + headingBox.width / 2)),
						y = headingBox.top + headingBox.height / 2
					const hit = y >= 0 && y < innerHeight ? document.elementFromPoint(x, y) : null
					const describeHit = (owner: Element) => ({
						tag: owner.tagName,
						id: owner.id,
						class: owner.getAttribute('class'),
						breadcrumb: owner.getAttribute('data-sticky-breadcrumb'),
						sticky: owner.getAttribute('data-sticky'),
						insideSummary: summary.contains(owner),
					})

					return {
						scroll: root.scrollTop,
						maximum: root.scrollHeight - root.clientHeight,
						open:
							element instanceof HTMLDetailsElement
								? element.open
								: (() => {
										throw new Error('The disclosure owner must be native details')
									})(),
						card: rect(box),
						disclosure: rect(disclosureBox),
						headingOpacity,
						closedLayer,
						headingVisible,
						summary: rect(summaryBox),
						heading: rect(headingBox),
						header: rect(header),
						viewport: innerHeight,
						focused: document.activeElement === summary,
						topHit: hit && describeHit(hit),
						hitPoint: { x, y },
						hitStack:
							y >= 0 && y < innerHeight
								? document.elementsFromPoint(x, y).slice(0, 3).map(describeHit)
								: [],
						topOwned: Boolean(hit && summary.contains(hit)),
					}
				})

			const journeys: { region: 'top' | 'body' | 'end' | 'deep'; nativeSnap: boolean }[] = (
				['top', 'body', 'end', 'deep'] as const
			).map(region => ({ region, nativeSnap: true }))

			for (const { region, nativeSnap } of journeys) {
				const previousSnap = await page
					.locator('#layout')
					.evaluate(root => root.style.scrollSnapType)

				if (!nativeSnap) {
					await page.locator('#layout').evaluate(root => {
						root.style.scrollSnapType = 'none'
					})
				}

				try {
					const observation =
						await test.step(`${selector}: ${nativeSnap ? 'native-snap' : 'explicit unsnapped end'} close from ${region}`, async () => {
							await details.evaluate(element => {
								for (
									let ancestor = element.parentElement;
									ancestor;
									ancestor = ancestor.parentElement
								) {
									if (ancestor instanceof HTMLDetailsElement) {
										ancestor.open = true
									}
								}

								if (!(element instanceof HTMLDetailsElement)) {
									throw new Error('The disclosure owner must be native details')
								}

								element.open = true
							})
							await settle(`${region}: opened disclosure settlement`)
							const request = await details.evaluate((element, region) => {
								const root = document.querySelector<HTMLElement>('#layout')!,
									box = element.getBoundingClientRect()
								const top = root.scrollTop + box.top,
									bottom = root.scrollTop + box.bottom
								const target =
									region === 'top'
										? top - 180
										: region === 'body'
											? top + box.height / 2
											: region === 'end'
												? bottom - root.clientHeight / 4
												: bottom + root.clientHeight

								root.scrollTo({ top: target, behavior: 'instant' })

								return {
									requested: target,
									clamped: Math.max(0, Math.min(root.scrollHeight - root.clientHeight, target)),
								}
							}, region)

							await settle(`${region}: requested scroll settlement`)
							const before = await read()
							const endSetup =
								region === 'end'
									? await details.evaluate(element => {
											const root = document.querySelector<HTMLElement>('#layout')!,
												card = element.closest('[data-card]')!,
												cardBox = card.getBoundingClientRect()
											const padding = parseFloat(getComputedStyle(root).scrollPaddingTop)

											return {
												scrollSnapType: getComputedStyle(root).scrollSnapType,
												scrollPaddingTop: getComputedStyle(root).scrollPaddingTop,
												actualCardBottom: cardBox.bottom,
												eligibleNativeSnapTargets: [...element.querySelectorAll('*')].flatMap(
													(target, index) => {
														const style = getComputedStyle(target),
															box = target.getBoundingClientRect(),
															margin = parseFloat(style.scrollMarginTop)

														if (
															!style.scrollSnapAlign.split(' ').includes('start') ||
															!(box.width > 0 && box.height > 0) ||
															!Number.isFinite(margin) ||
															!Number.isFinite(padding)
														) {
															return []
														}

														const projectedCardBottom =
															cardBox.bottom - (box.top - padding - margin)

														return projectedCardBottom > 0 &&
															projectedCardBottom <= root.clientHeight / 2
															? [
																	{
																		index,
																		tag: target.tagName,
																		id: target.id,
																		text: target.textContent?.trim().slice(0, 80),
																		top: box.top,
																		margin,
																		projectedCardBottom,
																	},
																]
															: []
													},
												),
											}
										})
									: null

							await summary.evaluate(element => element.focus({ preventScroll: true }))
							const focused = await read()

							await page.keyboard.press('Space')
							const action = await read()

							await settle(`${region}: native closure settlement`)
							const settled = await read()
							const preceding = await page.evaluate(observeStickyChain, precedingChain)
							const participation = await page.evaluate(
								chain =>
									chain.map(owner => {
										const heading = document.querySelector(owner.heading)!
										const position = heading.closest('[data-sticky-breadcrumb~="position"]')

										if (
											position &&
											getComputedStyle(position).getPropertyValue('---breadcrumb-entry').trim() ===
												'1'
										) {
											return true
										}

										for (
											let row: Element | null = heading;
											row && row !== document.querySelector(owner.scope)?.parentElement;
											row = row.parentElement
										) {
											const style = getComputedStyle(row),
												box = row.getBoundingClientRect(),
												inset = parseFloat(style.top)

											if (
												style.position === 'sticky' &&
												Number.isFinite(inset) &&
												Math.abs(box.top - inset) <= 1
											) {
												return true
											}
										}

										return false
									}),
								precedingChain,
							)
							let occupiedBottom = preceding.siteBottom

							for (const [index, row] of preceding.rows.entries()) {
								if (!participation[index] || row.opacity <= 0 || row.visibility !== 'visible') {
									continue
								}

								for (const box of [...row.surfaces, ...row.lines]) {
									if (![box.top, box.bottom, box.height].every(Number.isFinite)) {
										throw new Error('Participating sticky paint bounds must resolve')
									}

									if (box.height > 0 && box.bottom > 0 && box.top < preceding.viewport.height) {
										occupiedBottom = Math.max(occupiedBottom, box.bottom)
									}
								}
							}

							return {
								selector,
								selectedIndex,
								region,
								nativeSnap,
								deliveredRegion: deliveredRegion(before),
								request,
								endSetup,
								before,
								focused,
								action,
								settled,
								preceding,
								participation,
								occupiedBottom,
							}
						})

					observations.push(observation)

					if (
						nativeSnap &&
						region === 'end' &&
						observation.deliveredRegion !== 'end' &&
						observation.endSetup?.eligibleNativeSnapTargets.length === 0
					) {
						journeys.push({ region: 'end', nativeSnap: false })
					}

					if (!nativeSnap) {
						expect(
							observation.deliveredRegion,
							'Explicit unsnapped setup delivers a genuine end region',
						).toBe('end')
					}
				} finally {
					if (!nativeSnap) {
						await page.locator('#layout').evaluate((root, value) => {
							root.style.scrollSnapType = value
						}, previousSnap)
					}
				}
			}
		} finally {
			await info.attach('native-close-top-visibility', {
				body: JSON.stringify(
					{
						observations,
						limits:
							'390px; real attribute, structural Stage, News parent and nested News cards. Opening is fixture setup; closure is native focused-summary Space. Four original journeys retain native scroll snapping. If no native end is delivered and no eligible end snap target exists, one separately labeled unsnapped-end journey covers closure; anchoring and all endpoint/hit assertions remain unchanged.',
					},
					null,
					2,
				),
				contentType: 'application/json',
			})
		}

		const nativeObservations = observations.filter(observation => observation.nativeSnap)
		const delivered = new Set(nativeObservations.map(observation => observation.deliveredRegion))
		const nativeEndAbsent =
			!delivered.has('end') &&
			nativeObservations.some(
				observation =>
					observation.region === 'end' &&
					observation.endSetup?.eligibleNativeSnapTargets.length === 0,
			)

		if (nativeEndAbsent) {
			expect(
				observations.some(
					observation => !observation.nativeSnap && observation.deliveredRegion === 'end',
				),
				'A separately labeled unsnapped end closure is required when native end is unavailable',
			).toBe(true)
		} else {
			expect(delivered.has('end'), 'Native setup witnesses end').toBe(true)
		}

		for (const region of ['top', 'deep']) {
			expect(delivered.has(region), `${selector}: native setup witnesses ${region}`).toBe(true)
		}

		if (selector === '.attribute-group section.attribute > details') {
			expect(delivered.has('body'), 'The long attribute witnesses a genuine body close').toBe(true)
		}

		await info.attach(`${selector}-delivered-regions`, {
			body: JSON.stringify({
				selectedIndex: observations[0].selectedIndex,
				nativeRequested: nativeObservations.map(state => state.region),
				nativeDelivered: nativeObservations.map(state => state.deliveredRegion),
				nativeEndAbsent,
				unsnappedEnd: observations
					.filter(state => !state.nativeSnap)
					.map(state => ({ requested: state.region, delivered: state.deliveredRegion })),
				duplicateNativeRegions: nativeObservations.length - delivered.size,
				bodyWitnessed: delivered.has('body'),
			}),
			contentType: 'application/json',
		})

		for (const observation of observations) {
			const label = `${observation.selector}: ${observation.nativeSnap ? 'native-snap' : 'explicit unsnapped end'} ${observation.region} request delivered ${observation.deliveredRegion}`

			expect(observation.focused.focused, `${label}: actual summary owns keyboard activation`).toBe(
				true,
			)
			expect(
				Math.abs(observation.focused.scroll - observation.before.scroll),
				`${label}: focusing preserves the starting scroll position`,
			).toBeLessThan(0.5)
			expect(observation.settled.open, `${label}: native closure completed`).toBe(false)
			const layer = observation.settled.closedLayer

			if (layer.enhanced) {
				expect(
					[layer.summary, layer.backdrop, layer.geometry].every(Number.isFinite),
					`${label}: actual foreground layers resolve`,
				).toBe(true)
				expect(
					layer.summary,
					`${label}: closed title is above the pie backing`,
				).toBeGreaterThanOrEqual(layer.backdrop)
				expect(
					layer.afterBackdropOwner,
					`${label}: equal-level closed title follows the backing in paint order`,
				).toBe(true)
				expect(layer.summary, `${label}: closed title remains below the pie control`).toBeLessThan(
					layer.geometry,
				)
				expect(
					layer.inlineStickyAncestors,
					`${label}: no inline sticky ancestor traps the closed foreground`,
				).toEqual([])
			}

			expect(
				observation.settled.card.top,
				`${label}: closed card top clears actual participating preceding sticky paint`,
			).toBeGreaterThanOrEqual(observation.occupiedBottom - 1)
			expect(
				observation.settled.card.top,
				`${label}: closed card top stays inside the viewport`,
			).toBeLessThan(observation.settled.viewport - 1)
			expect(
				observation.settled.headingVisible,
				`${label}: the closed heading remains visible`,
			).toBe(true)
			expect(
				observation.settled.headingOpacity,
				`${label}: the closed heading retains visible paint`,
			).toBeGreaterThan(0.01)
			expect(
				observation.settled.topOwned,
				`${label}: visible heading has an unobstructed native hit`,
			).toBe(true)
		}
	})
}

for (const width of [390, 1440]) {
	test(`natural H4 summary padding preserves native card and body ownership at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await page.locator('astro-island[ssr]:has(#top)').waitFor({ state: 'detached', timeout: 60000 })
		await page.evaluate(() => document.fonts.ready)
		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('color: if(style(---breadcrumb-wrap: 1): red)') &&
					CSS.supports('animation-timeline: scroll()'),
			)),
			'Enhanced H4 padding uses native breadcrumb geometry',
		)
		const records: { selector: string; textBoxes: { width: number }[] }[] = []

		for (const selector of [
			'.attribute-group .attribute-accordions > details[data-card]:has(> summary h4)',
			'#stages section[data-sticky-breadcrumb~="scope"] details[data-card]:has(> summary h4)',
		]) {
			const details = page.locator(selector).first()

			await expect(details).toHaveCount(1)
			await details.evaluate(element => {
				for (let owner: Element | null = element; owner; owner = owner.parentElement) {
					if (owner instanceof HTMLDetailsElement) {
						owner.open = true
					}
				}
			})
			const summary = details.locator(':scope > summary')

			for (const open of [true, false, true]) {
				if (((await details.getAttribute('open')) !== null) !== open) {
					await summary.focus()
					await summary.press('Space')
				}

				await expect
					.poll(() =>
						details.evaluate(element => element instanceof HTMLDetailsElement && element.open),
					)
					.toBe(open)
				await expect
					.poll(() =>
						details.evaluate(
							element =>
								element
									.getAnimations({ subtree: true })
									.filter(
										animation =>
											animation instanceof CSSTransition && animation.playState === 'running',
									).length,
						),
					)
					.toBe(0)
				const record = await details.evaluate(element => {
					const summary = element.querySelector<HTMLElement>(':scope > summary')!
					const heading = summary.querySelector('h4')!
					const bodyChildren = [...element.children].filter(child => child !== summary)
					const body = bodyChildren.length === 1 ? bodyChildren[0] : element
					const read = () => {
						const style = getComputedStyle(summary)
						const bodyStyle = getComputedStyle(body, body === element ? '::details-content' : null)
						const hs = getComputedStyle(heading)

						return {
							block: [parseFloat(style.paddingBlockStart), parseFloat(style.paddingBlockEnd)],
							inline: [parseFloat(style.paddingInlineStart), parseFloat(style.paddingInlineEnd)],
							bodyPadding: [
								bodyStyle.paddingTop,
								bodyStyle.paddingRight,
								bodyStyle.paddingBottom,
								bodyStyle.paddingLeft,
							],
							fontSize: parseFloat(hs.fontSize),
							rootFontSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
						}
					}
					const actual = read()
					const summaryBox = summary.getBoundingClientRect()
					const range = document.createRange()

					range.selectNodeContents(heading)
					const textBoxes = [...range.getClientRects()]
						.filter(box => box.width > 0 && box.height > 0)
						.map(box => ({
							left: box.left - summaryBox.left,
							right: box.right - summaryBox.left,
							width: box.width,
						}))
					const old = summary.style.getPropertyValue('--collapsible-summaryPaddingBlock')
					const priority = summary.style.getPropertyPriority('--collapsible-summaryPaddingBlock')

					summary.style.setProperty('--collapsible-summaryPaddingBlock', 'var(--card-padding)')
					const control = read()

					if (old) {
						summary.style.setProperty('--collapsible-summaryPaddingBlock', old, priority)
					} else {
						summary.style.removeProperty('--collapsible-summaryPaddingBlock')
					}

					return {
						id: element.id,
						open: element instanceof HTMLDetailsElement && element.open,
						bodyOwner: body === element ? '::details-content' : body.tagName,
						summaryWidth: summaryBox.width,
						textBoxes,
						actual,
						control,
					}
				})
				const first = records.find(previous => previous.selector === selector)

				if (first) {
					expect(
						record.textBoxes.length,
						'Native disclosure state preserves heading wrapping',
					).toBe(first.textBoxes.length)

					for (const [index, box] of record.textBoxes.entries()) {
						expect(box.width).toBeCloseTo(first.textBoxes[index].width, 1)
					}
				}

				expect(record.textBoxes.length).toBeGreaterThan(0)

				for (const box of record.textBoxes) {
					expect(box.left + 1).toBeGreaterThanOrEqual(record.actual.inline[0])
					expect(box.right - 1).toBeLessThanOrEqual(record.summaryWidth - record.actual.inline[1])
				}
				records.push({ selector, ...record })
				expect(record.actual.block[0]).toBeGreaterThan(0)
				expect(record.actual.block[0]).toBeCloseTo(record.actual.block[1], 2)

				expect(
					record.actual.block,
					'Natural summary padding retains the native card default',
				).toEqual(record.control.block)
				expect(record.actual.inline).toEqual(record.control.inline)
				expect(record.actual.bodyPadding).toEqual(record.control.bodyPadding)
				expect(record.actual.fontSize / record.actual.rootFontSize).toBeCloseTo(0.875, 2)
			}
		}
		await info.attach('native-h4-padding-owners', {
			body: JSON.stringify({ width, records }),
			contentType: 'application/json',
		})
	})
}

const disclosureDimensionSubjects = [
	{
		name: 'stage',
		selector: '#stages section[data-sticky-breadcrumb~="scope"] > details[name="wallet-stages"]',
	},
	{
		name: 'incident',
		selector: '#security-news .news-items [data-sticky-breadcrumb~="scope"] > details',
	},
]

for (const width of [390, 580]) {
	for (const subject of disclosureDimensionSubjects) {
		test(`visible disclosure end dimensions survive native closure at ${width}px: ${subject.name}`, async ({
			page,
		}, info) => {
			await page.setViewportSize({ width, height: 900 })
			await page.goto('/metamask/')
			await page
				.locator('astro-island[ssr]:has(#top)')
				.waitFor({ state: 'detached', timeout: 60000 })
			await page.evaluate(() => document.fonts.ready)
			test.skip(
				!(await page.evaluate(
					() =>
						CSS.supports('animation-timeline: scroll()') &&
						CSS.supports('animation-range: 0% 100%') &&
						CSS.supports('width: anchor-size(--breadcrumb-source inline)') &&
						CSS.supports('timeline-scope: --breadcrumb-size') &&
						CSS.supports('color: if(style(--a: 1): red)'),
				)),
				'Native breadcrumb dimension clocks unavailable',
			)
			const observations: unknown[] = []

			try {
				const details = page.locator(subject.selector).first()

				await expect(details, subject.name).toHaveCount(1)
				await details.evaluate(element => {
					for (let parent = element.parentElement; parent; parent = parent.parentElement) {
						if (parent instanceof HTMLDetailsElement) {
							parent.open = true
						}
					}
					const root = document.querySelector<HTMLElement>('#layout')!

					root.style.scrollSnapType = 'none'
					root.style.overflowAnchor = 'none'
				})
				const summary = details.locator(':scope > summary')

				for (const open of [true, false, true]) {
					if ((await details.evaluate(element => element.hasAttribute('open'))) !== open) {
						await summary.evaluate(element => {
							if (!(element instanceof HTMLElement)) {
								throw new Error('A native summary is required')
							}

							element.focus({ preventScroll: true })
						})
						await page.keyboard.press('Space')
					}

					await expect
						.poll(() => details.evaluate(element => element.hasAttribute('open')))
						.toBe(open)
					await details.evaluate(element => {
						const root = document.querySelector<HTMLElement>('#layout')!
						const scope = element.closest('[data-sticky-breadcrumb~="scope"]')!

						root.scrollTo({
							top: root.scrollTop + scope.getBoundingClientRect().top - 350,
							behavior: 'instant',
						})
					})

					await expect
						.poll(
							async () => {
								const { first, sample } = await details.evaluate(async element => {
									const read = () => {
										const summary = element.querySelector(':scope > summary')!
										const scope = element.closest('[data-sticky-breadcrumb~="scope"]')!
										const end = summary.querySelector<HTMLElement>(
											'[data-sticky-breadcrumb~="end"]',
										)

										if (!end) {
											throw new Error('Real own-summary END wrapper required')
										}

										const box = end.getBoundingClientRect(),
											summaryBox = summary.getBoundingClientRect()
										const style = getComputedStyle(scope)
										const widthText = style.getPropertyValue('---breadcrumb-endWidth').trim()
										const heightText = style.getPropertyValue('---breadcrumb-endHeight').trim()
										const pixels = (value: string) =>
											/^-?(?:\d+(?:\.\d*)?|\.\d+)px$/.test(value) ? Number.parseFloat(value) : null
										const effects = scope
											.getAnimations()
											.filter(
												animation =>
													animation.effect instanceof KeyframeEffect &&
													animation.effect.target === scope &&
													!animation.effect.pseudoElement,
											)
										const ownEffects = effects.map(animation => ({
											name: animation instanceof CSSAnimation ? animation.animationName : null,
											timeline: animation.timeline?.constructor.name ?? null,
											currentTime:
												animation.currentTime === null ? null : String(animation.currentTime),
										}))
										const sticky = [summary, ...summary.querySelectorAll('[data-sticky]')]
											.filter(owner => getComputedStyle(owner).position === 'sticky')
											.map(owner => ({
												tag: owner.tagName,
												sticky: owner.getAttribute('data-sticky'),
											}))

										return {
											measuredAt: performance.now(),
											open: element.hasAttribute('open'),
											widthText,
											heightText,
											measuredWidth: pixels(widthText),
											measuredHeight: pixels(heightText),
											box: { x: box.x, y: box.y, width: box.width, height: box.height },
											summary: {
												x: summaryBox.x,
												y: summaryBox.y,
												width: summaryBox.width,
												height: summaryBox.height,
											},
											ownEffects,
											sticky,
										}
									}
									const first = read()

									await new Promise<void>(resolve =>
										requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
									)

									return { first, sample: read() }
								})
								const coordinates = (frame: typeof sample) => [
									frame.box.width,
									frame.box.height,
									frame.summary.width,
									frame.summary.height,
								]
								const before = coordinates(first)
								const stable = coordinates(sample).every(
									(value, index) => Math.abs(value - before[index]) < 0.25,
								)

								observations.push(
									...[first, sample].map(frame => ({
										subject: subject.name,
										expectedOpen: open,
										...frame,
									})),
								)
								const dimensions = [first, sample].every(
									frame =>
										frame.box.width > 0 &&
										frame.box.height > 0 &&
										frame.measuredWidth !== null &&
										frame.measuredHeight !== null &&
										Math.abs(frame.measuredWidth - frame.box.width) < 0.25 &&
										Math.abs(frame.measuredHeight - frame.box.height) < 0.25,
								)
								const closed = open || [first, sample].every(frame => frame.sticky.length === 0)

								return (
									[first, sample].every(frame => frame.open === open) &&
									dimensions &&
									closed &&
									stable &&
									sample.measuredAt > first.measuredAt
								)
							},
							{
								message: `${subject.name}: own END dimensions match its settled wrapper with ${open ? 'open' : 'closed'} native details`,
								timeout: 5000,
							},
						)
						.toBe(true)
				}
			} finally {
				await info.attach('closed-end-dimension-lifecycle', {
					body: JSON.stringify({
						width,
						observations,
						limits:
							'Own natural END wrapper dimensions only; transformed child paint, collision clearance and closed-body descendants have separate coverage.',
					}),
					contentType: 'application/json',
				})
			}
		})
	}
}

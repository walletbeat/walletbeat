import { expect, test } from '../../../tests/browser/verified-test'

const families = [
	{
		name: 'attributes',
		scopes: 'section.attribute-group, section.attribute',
		target: 'section.attribute',
		parent: 'section.attribute-group',
	},
	{
		name: 'stages',
		scopes: '#stages, #stages section:has(> details[name="wallet-stages"])',
		target: '#stages section:has(> details[name="wallet-stages"])',
		parent: '#stages',
	},
]

for (const family of families) {
	for (const path of ['/metamask/?variant=BROWSER', '/__wallet-page/software/']) {
		test(`measurement producers preserve ancestor ownership through disclosure changes: ${family.name} ${path}`, async ({
			page,
		}, info) => {
			await page.goto(path)
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			const capable = await page.evaluate(() =>
				CSS.supports(
					'(animation-timeline: scroll()) and (width: anchor-size(--breadcrumb-source inline)) and (color: if(style(---breadcrumb-wrap: 1): red))',
				),
			)

			test.skip(!capable, 'The native measured breadcrumb enhancement is unavailable')

			for (const width of [390, 933, 1400]) {
				await page.setViewportSize({ width, height: 1203 })

				for (const direction of ['ltr', 'rtl']) {
					await page.evaluate(direction => {
						document.documentElement.dir = direction
					}, direction)
					const states = []

					for (const open of [true, false, true]) {
						await page.evaluate(
							async ({ open, target, parent }) => {
								const scope = document.querySelector(target)
								const details = scope?.querySelector<HTMLDetailsElement>(':scope > details')
								const settlement = scope?.parentElement?.closest(parent)

								if (!details || !settlement) {
									throw new Error('The nested heading disclosure is missing')
								}

								details.open = open
								const deadline = performance.now() + 2000

								for (;;) {
									await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
									const effects = settlement
										.getAnimations({ subtree: true })
										.filter(
											animation =>
												animation.timeline instanceof DocumentTimeline &&
												animation.playState === 'running' &&
												Number.isFinite(animation.effect?.getComputedTiming().endTime),
										)

									if (!effects.length) {
										break
									}

									if (performance.now() > deadline) {
										throw new Error('Disclosure transitions failed to settle')
									}

									await Promise.race([
										Promise.allSettled(effects.map(animation => animation.finished)),
										new Promise((_, reject) =>
											setTimeout(() => reject(new Error('Disclosure transition deadline')), 2000),
										),
									])
								}

								for (let frame = 0; frame < 4; frame++) {
									await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
								}
							},
							{ open, target: family.target, parent: family.parent },
						)
						states.push(
							await page.evaluate(family => {
								const target = document.querySelector(family.target)
								const parent = target?.parentElement?.closest(family.parent)
								const root = document.querySelector('#layout')

								if (!parent || !root) {
									throw new Error('The nested measurement topology is missing')
								}

								const measured = getComputedStyle(parent)
								const scopes = Array.from(document.querySelectorAll(family.scopes)).filter(scope =>
									scope.checkVisibility(),
								)

								if (!scopes.length) {
									throw new Error('The measured heading family is missing')
								}

								for (const scope of scopes) {
									if (
										!scope.matches(
											'[data-sticky-breadcrumb~="scope"][data-sticky-breadcrumb~="size"]',
										)
									) {
										throw new Error(`Missing measurement enhancement: ${scope.id}`)
									}

									const closed = scope.matches(':has(> details:not([open]))')
									const position = scope.querySelector(
										':scope > [data-sticky-breadcrumb~="position"], :scope > details > [data-sticky-breadcrumb~="position"]',
									)

									if (!position) {
										throw new Error(`Missing position owner: ${scope.id}`)
									}

									const clocks = scope
										.getAnimations()
										.filter(
											(animation): animation is CSSAnimation =>
												animation instanceof CSSAnimation &&
												animation.animationName.startsWith('breadcrumb-size-'),
										)
									const source = position.querySelector('[data-sticky-breadcrumb~="source"]')
									const end = position.querySelector('[data-sticky-breadcrumb~="end"]')
									const approach = scope.querySelector(
										':scope > [data-sticky-breadcrumb~="approach"]',
									)

									if (family.name === 'attributes' && (!approach || !source)) {
										throw new Error(`Missing approach source: ${scope.id}`)
									}

									if (approach && source) {
										const style = getComputedStyle(source)
										const scopeStyle = getComputedStyle(scope)
										const height =
											Number.parseFloat(style.height) +
											(style.boxSizing === 'border-box'
												? 0
												: Number.parseFloat(style.paddingTop) +
													Number.parseFloat(style.paddingBottom) +
													Number.parseFloat(style.borderTopWidth) +
													Number.parseFloat(style.borderBottomWidth))
										const expected = Math.max(
											height *
												Number.parseFloat(scopeStyle.getPropertyValue('--stickyBreadcrumb-scale')),
											Number.parseFloat(
												scopeStyle.getPropertyValue('--stickyBreadcrumb-minBlockSize'),
											),
										)
										const actual = Number.parseFloat(getComputedStyle(approach).blockSize)

										if (
											!Number.isFinite(expected) ||
											!Number.isFinite(actual) ||
											Math.abs(actual - expected) > 0.125
										) {
											throw new Error(
												`Approach clock lost its intrinsic source height: ${scope.id}, ${actual} != ${expected}`,
											)
										}
									}

									const hasEnd = !!end

									const rowOwner = source?.parentElement
									const rowHelper = position.querySelector('[data-sticky-breadcrumb~="size-row"]')

									if (!rowOwner || !rowHelper) {
										throw new Error(`Missing own row measurement: ${scope.id}`)
									}

									const rowStyle = getComputedStyle(rowOwner)

									for (const axis of ['width', 'height'] as const) {
										const edges =
											axis === 'width'
												? [
														'padding-left',
														'padding-right',
														'border-left-width',
														'border-right-width',
													]
												: [
														'padding-top',
														'padding-bottom',
														'border-top-width',
														'border-bottom-width',
													]
										const actual =
											Number.parseFloat(rowStyle[axis]) +
											(rowStyle.boxSizing === 'border-box'
												? 0
												: edges.reduce(
														(sum, edge) => sum + Number.parseFloat(rowStyle.getPropertyValue(edge)),
														0,
													))
										const property =
											axis === 'width'
												? '---breadcrumb-sourceRowWidth'
												: '---breadcrumb-sourceRowHeight'
										const measured = Number.parseFloat(
											getComputedStyle(scope).getPropertyValue(property),
										)

										if (
											!Number.isFinite(actual) ||
											actual <= 0 ||
											!Number.isFinite(measured) ||
											Math.abs(actual - measured) > 0.125
										) {
											throw new Error(
												`Own row ${axis} mismatch: ${scope.id}, ${measured} != ${actual}`,
											)
										}
									}
									const rowClocks = clocks.filter(clock =>
										clock.animationName.startsWith('breadcrumb-size-row-'),
									)

									if (rowClocks.length !== 4) {
										throw new Error(`Missing four own row clocks: ${scope.id}`)
									}

									for (const clock of rowClocks) {
										const timeline = clock.timeline

										if (!(timeline instanceof ViewTimeline)) {
											throw new Error(`Row clock is not a ViewTimeline: ${scope.id}`)
										}

										const subject = timeline.subject
										const origin = subject?.tagName.startsWith('::')
											? subject.parentElement
											: subject
										const pseudo = clock.animationName.includes('-inline-') ? '::before' : '::after'

										if (
											origin !== rowHelper ||
											timeline.axis !== 'inline' ||
											getComputedStyle(rowHelper, pseudo).viewTimelineName === 'none'
										) {
											throw new Error(
												`Row clock lost its own exporter: ${scope.id}/${clock.animationName}`,
											)
										}
									}

									if (end?.matches('[data-sticky-breadcrumb~="contents"]')) {
										const paintsMeasurement = end.getAnimations().some(animation => {
											const effect = animation.effect

											return (
												effect instanceof KeyframeEffect &&
												effect.target === end &&
												!effect.pseudoElement &&
												effect
													.getKeyframes()
													.some(frame =>
														['transform', 'translate', 'scale', 'rotate'].some(
															property => property in frame,
														),
													)
											)
										})

										if (paintsMeasurement) {
											throw new Error(
												`Transparent metadata measurement owns paint motion: ${scope.id}`,
											)
										}
									}

									for (const [role, owner] of [
										['source', source],
										['row', source?.parentElement],
										['end', end],
									] as const) {
										const helpers = position.querySelectorAll(
											`[data-sticky-breadcrumb~="size-${role}"]`,
										)

										if (helpers.length !== (owner ? 1 : 0)) {
											throw new Error(`Missing size exporter: ${scope.id}/${role}`)
										}

										for (const helper of helpers) {
											if (
												!(helper instanceof HTMLElement) ||
												helper.parentElement !== owner ||
												helper.offsetParent !== owner
											) {
												throw new Error(`Wrong measurement containing block: ${scope.id}/${role}`)
											}
										}
									}
									const expected = 4 + (closed ? 0 : 4) + (hasEnd ? 4 : 0)

									if (clocks.length !== expected) {
										throw new Error(`Wrong clock membership: ${scope.id}`)
									}

									for (const clock of clocks) {
										if (
											!(clock.timeline instanceof ScrollTimeline) ||
											clock.timeline.source !== root ||
											typeof clock.effect?.getComputedTiming().progress !== 'number'
										) {
											throw new Error(
												`Unresolved measurement clock: ${scope.id}/${clock.animationName}`,
											)
										}
									}

									if (closed) {
										for (const helper of position.querySelectorAll(
											'[data-sticky-breadcrumb~="size-source"]',
										)) {
											for (const pseudo of ['::before', '::after']) {
												if (getComputedStyle(helper, pseudo).viewTimelineName !== 'none') {
													throw new Error(`Closed source publishes an ancestor clock: ${scope.id}`)
												}
											}
										}
									}
								}

								return [
									'---breadcrumb-itemWidth',
									'---breadcrumb-itemHeight',
									'---breadcrumb-sourceRowWidth',
									'---breadcrumb-sourceRowHeight',
								].map(property => Number.parseFloat(measured.getPropertyValue(property)))
							}, family),
						)
					}

					await info.attach(`ancestor-measurements-${width}-${direction}`, {
						body: JSON.stringify(states),
						contentType: 'application/json',
					})

					for (const state of states) {
						for (let index = 0; index < state.length; index++) {
							expect(Number.isFinite(state[index])).toBe(true)
							expect(state[index]).toBeGreaterThan(0)
							expect(Math.abs(state[index] - states[0][index])).toBeLessThanOrEqual(0.125)
						}
					}
				}
			}
		})
	}
}

test('generic column clocks measure their own row through resize and native disclosure changes', async ({
	page,
}, info) => {
	await page.goto('/metamask/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	await page.locator('#security-news').evaluate(news => {
		for (const details of news.querySelectorAll<HTMLDetailsElement>('details')) {
			if (details.querySelector(':scope > summary h2')) {
				details.open = true
			}
		}
	})
	const capable = await page.evaluate(() =>
		CSS.supports(
			'(animation-timeline: scroll()) and (width: anchor-size(--column-firstRow inline)) and (timeline-scope: --column-size)',
		),
	)

	test.skip(!capable, 'The native generic column measurement enhancement is unavailable')
	const incident = page
		.locator('#security-news [data-sticky-breadcrumb~="scope"] > details')
		.first()

	await expect(incident).toHaveCount(1)
	const incidentScopeId = await incident.evaluate(
		element => element.closest('[data-sticky-breadcrumb~="scope"]')?.id,
	)

	if (!incidentScopeId) {
		throw new Error('Native incident disclosure needs its actual scope identity')
	}

	const samples = []

	for (const width of [390, 933, 390]) {
		await page.setViewportSize({ width, height: 1203 })

		{
			const news = incident
			const summary = news.locator(':scope > summary')

			for (const open of [true, false, true]) {
				if ((await news.evaluate(element => element.hasAttribute('open'))) !== open) {
					await summary.focus()
					await summary.press('Space')
				}

				await expect(news).toHaveJSProperty('open', open)
				const read = () =>
					page.evaluate(() => {
						const rows = []
						const hidden = []
						const borrowed = []
						const legacy = []

						for (const owner of document.querySelectorAll<HTMLElement>(
							'[data-column~="span-start"]:not([data-sticky-breadcrumb~="position"])',
						)) {
							if (!owner.checkVisibility()) {
								const names = [null, '::before', '::after']
									.flatMap(pseudo => getComputedStyle(owner, pseudo).viewTimelineName.split(','))
									.map(name => name.trim())
									.filter(name => name && name !== 'none')

								if (
									names.length ||
									getComputedStyle(owner)
										.animationName.split(',')
										.some(name => ['column-inline-size', 'column-block-size'].includes(name.trim()))
								) {
									throw new Error(
										`Hidden generic column retains measurement producers: ${owner.closest('[data-sticky-breadcrumb~="scope"]')?.id}`,
									)
								}

								hidden.push(owner.closest('[data-sticky-breadcrumb~="scope"]')?.id ?? owner.tagName)
								continue
							}

							const clocks = owner
								.getAnimations()
								.filter(
									(animation): animation is CSSAnimation =>
										animation instanceof CSSAnimation &&
										['column-inline-size', 'column-block-size'].includes(animation.animationName) &&
										animation.effect instanceof KeyframeEffect &&
										animation.effect.target === owner,
								)
							const row = owner.querySelector<HTMLElement>(
								':scope > [data-row], :scope > :is(header, [data-sticky]) > [data-row]',
							)

							if (
								owner.parentElement?.matches(
									'summary[data-sticky-breadcrumb~="position"]:not(:has(> [data-sticky-breadcrumb~="support"]))',
								)
							) {
								if (
									!row ||
									clocks.length !== 0 ||
									['::before', '::after'].some(
										pseudo => !['none', 'normal'].includes(getComputedStyle(owner, pseudo).content),
									)
								) {
									throw new Error('Borrowed summary child retained independent generic clocks')
								}

								borrowed.push({
									section: owner.closest('[data-sticky-breadcrumb~="scope"]')?.id ?? '',
									title: row.querySelector('h3')?.textContent?.trim() ?? '',
								})
								continue
							}

							if (!row || clocks.length !== 2) {
								throw new Error(
									'Visible generic column is missing its row or two native measurement consumers',
								)
							}

							const rowStyle = getComputedStyle(row)
							const dimension = (axis: 'width' | 'height') =>
								Number.parseFloat(rowStyle[axis]) +
								(rowStyle.boxSizing === 'border-box'
									? 0
									: (axis === 'width'
											? ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
											: ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
										).reduce(
											(sum, key) =>
												sum +
												Number.parseFloat(
													rowStyle.getPropertyValue(
														key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()),
													),
												),
											0,
										))
							const bindings = clocks.map(animation => {
								const timeline = animation.timeline

								if (!(timeline instanceof ViewTimeline)) {
									throw new Error('Generic column consumer has no native ViewTimeline')
								}

								const subject = timeline.subject
								const origin = subject?.tagName.startsWith('::') ? subject.parentElement : subject
								const pseudo =
									animation.animationName === 'column-inline-size' ? '::before' : '::after'
								const producer = getComputedStyle(owner, pseudo)
								const index = getComputedStyle(owner)
									.animationName.split(',')
									.map(name => name.trim())
									.indexOf(animation.animationName)
								const names = getComputedStyle(owner)
									.animationTimeline.split(',')
									.map(name => name.trim())
								const expected =
									animation.animationName === 'column-inline-size'
										? dimension('width')
										: dimension('height')
								const measured = Number.parseFloat(producer.width)

								return {
									name: animation.animationName,
									ownSubject: origin === owner,
									axis: timeline.axis,
									source: timeline.source?.tagName,
									phase: animation.effect?.getComputedTiming().progress,
									producerName: producer.viewTimelineName,
									consumerName: names[index % names.length],
									generated: producer.content !== 'none' && producer.content !== 'normal',
									expected,
									measured,
								}
							})

							rows.push({
								section: owner.closest('[data-sticky-breadcrumb~="scope"]')?.id ?? '',
								title: row.querySelector('h3')?.textContent?.trim() ?? '',
								bindings,
							})
						}

						for (const scope of document.querySelectorAll(
							'#security-news [data-sticky-breadcrumb~="scope"]',
						)) {
							if (!scope.checkVisibility()) {
								const flow = scope.querySelector(
									':scope > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
								)
								const measure = flow?.querySelector(':scope > [data-sticky-breadcrumb~="measure"]')
								const probes: [Element | null | undefined, string | null][] = [
									[scope, '::before'],
									[scope, '::after'],
									[flow, '::before'],
									[measure, null],
									[measure, '::before'],
									[measure, '::after'],
								]

								if (
									probes.some(
										([owner, pseudo]) =>
											owner && getComputedStyle(owner, pseudo).viewTimelineName !== 'none',
									)
								) {
									throw new Error(`Hidden legacy scope retains measurement producers: ${scope.id}`)
								}

								continue
							}

							const position = scope.querySelector(
								':scope > details > summary[data-sticky-breadcrumb~="position"]',
							)
							const source = position?.querySelector('[data-sticky-breadcrumb~="source"]')
							const row = source?.parentElement

							if (!position || !row) {
								throw new Error('Missing visible legacy row')
							}

							const style = getComputedStyle(row),
								published = getComputedStyle(scope)
							const dimensions = []

							for (const axis of ['width', 'height'] as const) {
								const edges =
									axis === 'width'
										? ['padding-left', 'padding-right', 'border-left-width', 'border-right-width']
										: ['padding-top', 'padding-bottom', 'border-top-width', 'border-bottom-width']
								const actual =
									Number.parseFloat(style[axis]) +
									(style.boxSizing === 'border-box'
										? 0
										: edges.reduce(
												(sum, edge) => sum + Number.parseFloat(style.getPropertyValue(edge)),
												0,
											))
								const measured = Number.parseFloat(
									published.getPropertyValue(
										axis === 'width'
											? '---breadcrumb-sourceRowWidth'
											: '---breadcrumb-sourceRowHeight',
									),
								)

								dimensions.push({ axis, actual, measured })
							}
							const clocks = scope
								.getAnimations()
								.filter(
									(animation): animation is CSSAnimation =>
										animation instanceof CSSAnimation &&
										['column-inline-size', 'column-block-size'].includes(animation.animationName),
								)

							if (clocks.length !== 2) {
								throw new Error(`Legacy row lost its two clocks: ${scope.id}`)
							}

							for (const clock of clocks) {
								const timeline = clock.timeline

								if (
									!(timeline instanceof ViewTimeline) ||
									timeline.source !== document.scrollingElement ||
									timeline.axis !== 'inline' ||
									typeof clock.effect?.getComputedTiming().progress !== 'number'
								) {
									throw new Error(`Unresolved legacy row clock: ${scope.id}`)
								}

								const subject = timeline.subject,
									origin = subject?.tagName.startsWith('::') ? subject.parentElement : subject
								const expected =
									clock.animationName === 'column-inline-size'
										? scope.querySelector(
												':scope > [data-sticky-breadcrumb~="flow"] > [data-sticky-breadcrumb~="measure"]',
											)
										: scope.querySelector(
												':scope > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
											)

								if (!expected || origin !== expected) {
									throw new Error(
										`Legacy row bound another scope: ${scope.id}/${clock.animationName}`,
									)
								}
							}
							legacy.push({
								id: scope.id,
								closed: scope.matches(':has(> details:not([open]))'),
								dimensions,
							})
						}
						const scope = document.querySelector('#security-news')
						const finite = scope
							?.getAnimations({ subtree: true })
							.some(
								animation =>
									animation.timeline instanceof DocumentTimeline &&
									Number.isFinite(animation.effect?.getComputedTiming().endTime) &&
									(animation.pending || animation.playState === 'running'),
							)

						return { rows, borrowed, legacy, hidden, finite }
					})
				let previous = ''
				let sampled: Awaited<ReturnType<typeof read>> | undefined

				await expect
					.poll(
						async () => {
							sampled = await read()
							const serial = JSON.stringify(sampled)
							const stable = !sampled.finite && serial === previous

							previous = serial

							return stable
						},
						{ timeout: 10000 },
					)
					.toBe(true)

				if (!sampled) {
					throw new Error('No generic measurement inventory')
				}

				for (const row of sampled.rows) {
					expect(row.bindings.map(binding => binding.name).sort()).toEqual([
						'column-block-size',
						'column-inline-size',
					])

					for (const binding of row.bindings) {
						expect(binding.ownSubject, JSON.stringify(row)).toBe(true)
						expect(binding.axis).toBe('inline')
						expect(binding.source).toBeTruthy()
						expect(binding.phase).not.toBeNull()
						expect(binding.generated).toBe(true)
						expect(binding.producerName).toBe(binding.consumerName)
						expect(Number.isFinite(binding.expected) && binding.expected > 0).toBe(true)
						expect(Number.isFinite(binding.measured)).toBe(true)
						expect(Math.abs(binding.measured - binding.expected)).toBeLessThanOrEqual(0.125)
					}
				}

				for (const row of sampled.legacy) {
					for (const dimension of row.dimensions) {
						expect(
							Number.isFinite(dimension.actual) && dimension.actual > 0,
							JSON.stringify(row),
						).toBe(true)
						expect(Number.isFinite(dimension.measured), JSON.stringify(row)).toBe(true)
						expect(
							Math.abs(dimension.actual - dimension.measured),
							JSON.stringify(row),
						).toBeLessThanOrEqual(0.125)
					}
				}

				expect(
					sampled.borrowed.filter(row => row.section.startsWith('security-news-')).length,
				).toBeGreaterThanOrEqual(2)
				expect(
					sampled.legacy.some(row => row.id === incidentScopeId && row.closed === !open),
					'The actual incident reaches its requested row lifetime',
				).toBe(true)

				samples.push({ width, open, ...sampled })
			}
		}
	}
	await info.attach('generic-column-native-bindings', {
		body: JSON.stringify(samples),
		contentType: 'application/json',
	})
	const stylesheets = await page
		.locator('link[rel="stylesheet"]')
		.evaluateAll(elements =>
			elements
				.map(element => element.getAttribute('href'))
				.filter((href): href is string => !!href),
		)

	if (!stylesheets.length) {
		throw new Error('Independent column fixture requires delivered production styles')
	}

	const fixtureHead = stylesheets
		.map(href => `<link rel="stylesheet" href="${new URL(href, page.url()).href}">`)
		.join('')
	const fixtureURL = new URL('/__wallet-page/independent-column/', page.url()).href

	await page.route(fixtureURL, route =>
		route.fulfill({
			contentType: 'text/html',
			body: `<head>${fixtureHead}</head><body><section data-column="span-start"><div data-row><h3>Independent generic column</h3></div><p>Ordinary support remains outside any breadcrumb summary relationship.</p></section></body>`,
		}),
	)
	await page.goto(fixtureURL)
	await page.evaluate(() => document.fonts.ready)

	for (const width of [390, 933, 390]) {
		await page.setViewportSize({ width, height: 1203 })
		await expect
			.poll(() =>
				page.locator('section[data-column~="span-start"]').evaluate(owner => {
					const clocks = owner
						.getAnimations()
						.filter(
							(animation): animation is CSSAnimation =>
								animation instanceof CSSAnimation &&
								['column-inline-size', 'column-block-size'].includes(animation.animationName),
						)

					if (clocks.length !== 2) {
						return false
					}

					const row = owner.querySelector('[data-row]')

					if (!row) {
						throw new Error('Independent row missing')
					}

					const style = getComputedStyle(row)

					return clocks.every(clock => {
						const timeline = clock.timeline

						if (!(timeline instanceof ViewTimeline)) {
							return false
						}

						const subject = timeline.subject,
							origin = subject?.tagName.startsWith('::') ? subject.parentElement : subject
						const pseudo = clock.animationName === 'column-inline-size' ? '::before' : '::after'
						const producer = getComputedStyle(owner, pseudo)
						const axis = pseudo === '::before' ? 'width' : 'height'
						const edges =
							axis === 'width'
								? ['padding-left', 'padding-right', 'border-left-width', 'border-right-width']
								: ['padding-top', 'padding-bottom', 'border-top-width', 'border-bottom-width']
						const actual =
							Number.parseFloat(style[axis]) +
							(style.boxSizing === 'border-box'
								? 0
								: edges.reduce(
										(sum, edge) => sum + Number.parseFloat(style.getPropertyValue(edge)),
										0,
									))

						return (
							origin === owner &&
							timeline.axis === 'inline' &&
							typeof clock.effect?.getComputedTiming().progress === 'number' &&
							Number.isFinite(actual) &&
							actual > 0 &&
							Math.abs(Number.parseFloat(producer.width) - actual) <= 0.125
						)
					})
				}),
			)
			.toBe(true)
	}
})

for (const path of ['/metamask/?variant=BROWSER', '/ambire/']) {
	for (const profile of [
		{ width: 390, direction: 'ltr' },
		{ width: 690, direction: 'rtl' },
	]) {
		for (const mode of ['inventory', 'disclosure']) {
			test(`native marker measurement clocks retain their originating owners: ${path} ${profile.width} ${profile.direction} ${mode}`, async ({
				page,
			}, info) => {
				const samples = []
				const encountered = new Set<string>()

				await page.setViewportSize({ width: profile.width, height: 1203 })
				await page.addInitScript(direction => {
					document.addEventListener(
						'DOMContentLoaded',
						() => {
							document.documentElement.dir = direction
						},
						{ once: true },
					)
				}, profile.direction)
				await page.goto(path)
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				await page.evaluate(() => document.fonts.ready)
				const capable = await page.evaluate(() =>
					CSS.supports(
						'(animation-timeline: scroll()) and (width: anchor-size(--breadcrumb-source inline)) and (color: if(style(---breadcrumb-wrap: 1): red)) and (view-timeline-name: ident("--marker" "-inline"))',
					),
				)

				test.skip(!capable, 'Unique native marker measurement timelines are unavailable')
				const disclosureId = await page.evaluate(() => {
					const details = Array.from(
						document.querySelectorAll<HTMLDetailsElement>('details[id]'),
					).find(
						element =>
							element.getClientRects().length && element.querySelector(':scope > summary h4'),
					)

					if (!details) {
						throw new Error('No rendered identified H4 disclosure')
					}

					return details.id
				})
				const disclosure = page.locator(`[id=${JSON.stringify(disclosureId)}]`)

				await expect(disclosure).toHaveCount(1)
				const summary = disclosure.locator(':scope > summary')

				await page.evaluate(direction => {
					document.documentElement.dir = direction
				}, profile.direction)

				const read = () =>
					page.evaluate(disclosureId => {
						const rows = []
						const excluded = []

						for (const animation of document.getAnimations()) {
							if (
								!(animation instanceof CSSAnimation) ||
								animation.animationName !== 'clearance-inline-measure' ||
								!(animation.effect instanceof KeyframeEffect)
							) {
								continue
							}

							const effect = animation.effect
							const owner = effect.target

							if (!(owner instanceof Element) || effect.pseudoElement) {
								continue
							}

							const style = getComputedStyle(owner)
							const names = style.animationName.split(',').map(name => name.trim())
							const index = names.indexOf(animation.animationName)
							const timelines = style.animationTimeline.split(',').map(name => name.trim())
							const producer = getComputedStyle(owner, '::after')
							const markerOwner =
								!owner.matches('[data-sticky-breadcrumb~="end"]') &&
								(owner.matches('summary') ||
									(owner.matches('[data-row-item~="wrap-end"]') && !!owner.closest('summary')))
							const ownProducer =
								producer.content !== 'none' &&
								producer.content !== 'normal' &&
								producer.viewTimelineAxis === 'inline' &&
								producer.viewTimelineName !== 'none'

							if (index < 0 || !owner.getClientRects().length || !markerOwner) {
								excluded.push({
									tag: owner.tagName,
									id: owner.id,
									applied: index >= 0,
									markerOwner,
									ownProducer,
								})
								continue
							}

							if (
								!ownProducer ||
								producer.viewTimelineName !== timelines[index % timelines.length]
							) {
								throw new Error(
									'Applied marker measurement must consume its own generated inline producer: ' +
										JSON.stringify({
											tag: owner.tagName,
											id: owner.id,
											producer: producer.viewTimelineName,
											consumer: timelines[index % timelines.length],
											ownProducer,
										}),
								)
							}

							const timeline = animation.timeline

							if (!(timeline instanceof ViewTimeline)) {
								throw new Error('Applied own marker producer has no native ViewTimeline')
							}

							const subject = timeline.subject
							const origin = subject?.tagName.startsWith('::') ? subject.parentElement : subject

							rows.push({
								tag: owner.tagName,
								id: owner.id,
								section: owner.closest('[data-sticky-breadcrumb~="scope"]')?.id ?? '',
								ownSubject: origin === owner,
								subjectTag: subject?.tagName,
								subjectId: origin?.id,
								axis: timeline.axis,
								source: timeline.source?.tagName,
								phase: effect.getComputedTiming().progress,
								producerName: producer.viewTimelineName,
								h4: owner.matches('summary') && !!owner.querySelector('h4'),
								stage: !!owner.closest('#stages'),
								audit: owner.matches('time'),
							})
						}
						const finite = document
							.getElementById(disclosureId)
							?.getAnimations({ subtree: true })
							.some(
								animation =>
									animation.timeline instanceof DocumentTimeline &&
									Number.isFinite(animation.effect?.getComputedTiming().endTime) &&
									(animation.pending || animation.playState === 'running'),
							)

						return { rows, excluded, finite }
					}, disclosureId)

				await info.attach('marker-initial-native-bindings', {
					body: JSON.stringify(await read()),
					contentType: 'application/json',
				})
				const states =
					mode === 'inventory'
						? [await disclosure.evaluate(element => element.hasAttribute('open'))]
						: [true, false, true]

				for (const open of states) {
					if ((await disclosure.evaluate(element => element.hasAttribute('open'))) !== open) {
						await summary.focus()
						await summary.press('Space')
					}

					await expect(disclosure).toHaveJSProperty('open', open)
					let previous = ''
					let sampled: Awaited<ReturnType<typeof read>> | undefined

					await expect
						.poll(
							async () => {
								sampled = await read()
								const current = JSON.stringify(sampled)
								const stable = !sampled.finite && current === previous

								previous = current

								return stable
							},
							{ timeout: 10000 },
						)
						.toBe(true)

					if (!sampled) {
						throw new Error('No marker binding sample')
					}

					await info.attach(
						`marker-native-owner-bindings-${open ? 'open' : 'closed'}-${samples.length}`,
						{
							body: JSON.stringify({
								path,
								...profile,
								open,
								disclosureId,
								...sampled,
							}),
							contentType: 'application/json',
						},
					)
					expect(sampled.rows.length).toBeGreaterThan(0)

					for (const row of sampled.rows) {
						expect(row.ownSubject, JSON.stringify(row)).toBe(true)
						expect(row.axis).toBe('inline')
						expect(row.source).toBeTruthy()
						expect(row.phase).not.toBeNull()

						if (row.h4) {
							encountered.add('h4')
						}

						if (row.stage) {
							encountered.add('stage')
						}

						if (row.audit) {
							encountered.add('audit')
						}
					}
					samples.push({ path, ...profile, open, ...sampled })
				}
				await info.attach('marker-native-owner-bindings', {
					body: JSON.stringify(samples),
					contentType: 'application/json',
				})
				expect([...encountered].sort()).toEqual(['audit', 'h4', 'stage'])
			})
		}
	}
}

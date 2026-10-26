import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 690, 1440]) {
	for (const kind of ['marker', 'closed-end'] as const) {
		test(`ordinary-flow ${kind} releases native paint before and after encounter at ${width}px`, async ({
			page,
		}, info) => {
			await page.setViewportSize({ width, height: 900 })
			await page.goto('/metamask/?variant=BROWSER')
			await page
				.locator('astro-island[ssr]:has(#top)')
				.waitFor({ state: 'detached', timeout: 60000 })
			await page.evaluate(() => document.fonts.ready)
			const supported = await page.evaluate(
				() =>
					typeof ViewTimeline !== 'undefined' &&
					CSS.supports('color: if(style(--a: 1): red)') &&
					!matchMedia('(prefers-reduced-motion: reduce)').matches &&
					getComputedStyle(document.querySelector('#scam-prevention summary')!)
						.getPropertyValue('---collapsible-markerSupported')
						.trim() === '1',
			)

			test.skip(
				!supported,
				'Enhanced native clearance assertions require supported motion; fallback and reduced motion have separate coverage',
			)
			const control = await page.evaluateHandle(kind => {
				const root = document.querySelector<HTMLElement>('#layout')!
				const scope = document.querySelector('#scam-prevention')!
				const details =
					scope instanceof HTMLDetailsElement ? scope : scope.querySelector('details')!

				if (!(details instanceof HTMLDetailsElement)) {
					throw Error('Native attribute disclosure required')
				}

				const summary = details.querySelector(':scope > summary')!
				const marker = document.querySelector('#scam-prevention-why > summary')!

				if (!marker) {
					throw Error('Implicit marker summary required')
				}

				const original = {
					open: details.open,
					snap: root.style.scrollSnapType,
					anchor: root.style.overflowAnchor,
					top: root.scrollTop,
				}
				const ids = new WeakMap<object, number>()
				let next = 0
				const id = (object: object) => {
					if (!ids.has(object)) {
						ids.set(object, ++next)
					}

					return ids.get(object)!
				}
				const frames = () =>
					new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)

				return {
					async prepare() {
						root.style.scrollSnapType = 'none'
						root.style.overflowAnchor = 'none'
						details.open = kind === 'marker'
						await frames()
						await Promise.all(
							details
								.getAnimations({ subtree: true })
								.filter(animation => {
									const timing = animation.effect?.getComputedTiming()

									return (
										animation.timeline instanceof DocumentTimeline &&
										timing &&
										typeof timing.endTime === 'number' &&
										Number.isFinite(timing.endTime)
									)
								})
								.map(animation => animation.finished.catch(() => undefined)),
						)
						const encounterOwner = kind === 'marker' ? marker : summary
						const origin =
							encounterOwner.getBoundingClientRect().top +
							root.scrollTop -
							root.getBoundingClientRect().top

						return [1000, 700, 500, 350, 200, 50, -150, -900].map(top => Math.max(0, origin - top))
					},
					async sample(top: number) {
						root.scrollTo({ top, behavior: 'instant' })
						await frames()
						const rows = document.getAnimations().flatMap(animation => {
							if (
								!(animation instanceof CSSAnimation) ||
								animation.animationName !== 'breadcrumb-clearance-inline' ||
								!(animation.effect instanceof KeyframeEffect)
							) {
								return []
							}

							const effect = animation.effect
							const target: unknown = effect.target
							const element =
								target instanceof Element
									? target
									: target &&
										  typeof target === 'object' &&
										  'element' in target &&
										  target.element instanceof Element
										? target.element
										: null
							const pseudo =
								effect.pseudoElement ??
								(target &&
								typeof target === 'object' &&
								'type' in target &&
								typeof target.type === 'string'
									? target.type
									: null)

							if (!element) {
								throw Error('Unknown native animation target')
							}

							const end = element.closest('[data-sticky-breadcrumb~="end"]')
							const selected =
								kind === 'marker'
									? element === marker && pseudo === '::after'
									: element.closest('summary') === summary && end !== null

							if (!selected) {
								return []
							}

							const style = getComputedStyle(element, pseudo)
							const timeline = animation.timeline
							const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform)

							return [
								{
									id: id(animation),
									owner: id(element),
									pseudo,
									timeline: timeline ? id(timeline) : null,
									native:
										timeline instanceof ViewTimeline &&
										timeline.source === root &&
										timeline.axis === 'block' &&
										timeline.currentTime !== null,
									subject:
										timeline instanceof ViewTimeline && timeline.subject
											? id(timeline.subject)
											: null,
									expectedSubject:
										timeline instanceof ViewTimeline &&
										(kind === 'marker'
											? timeline.subject === marker ||
												(timeline.subject?.tagName === '::after' &&
													timeline.subject.parentElement === marker)
											: timeline.subject === end),
									kind: end?.matches('[data-sticky-breadcrumb~="contents"]') ? 'contents' : 'self',
									fill: effect.getTiming().fill,
									progress: effect.getComputedTiming().progress,
									transform: style.transform,
									identity: matrix.isIdentity,
									finite: [...matrix.toFloat64Array()].every(Number.isFinite),
									connected: element.isConnected && element.checkVisibility(),
								},
							]
						})

						return {
							top: root.scrollTop,
							open: details.open,
							configured:
								getComputedStyle(summary).getPropertyValue('--collapsible-markerMotion').trim() ===
								'clearance',
							rows,
						}
					},
					restore() {
						details.open = original.open
						root.style.scrollSnapType = original.snap
						root.style.overflowAnchor = original.anchor
						root.scrollTo({ top: original.top, behavior: 'instant' })
					},
				}
			}, kind)
			const observations: unknown[] = []

			try {
				const positions = await page.evaluate(control => control.prepare(), control)
				const path = [...positions, ...positions.slice(0, -1).reverse()]
				const samples = [
					await page.evaluate(({ control, top }) => control.sample(top), { control, top: path[0] }),
				]

				observations.push(samples[0])

				for (const top of path.slice(1)) {
					const sample = await page.evaluate(({ control, top }) => control.sample(top), {
						control,
						top,
					})

					observations.push(sample)
					samples.push(sample)
				}
				const identity = (row: (typeof samples)[number]['rows'][number]) => ({
					id: row.id,
					owner: row.owner,
					pseudo: row.pseudo,
					subject: row.subject,
					kind: row.kind,
				})

				expect(
					samples[0].configured,
					'Mobile clearance stays enabled; desktop stays in ordinary flow',
				).toBe(width <= 1024)

				if (!samples[0].configured) {
					for (const sample of samples) {
						expect(sample.rows).toHaveLength(0)
					}

					return
				}

				expect(samples[0].rows.length, 'Selected native flow receivers must exist').toBeGreaterThan(
					0,
				)
				const owners = samples[0].rows.map(identity)

				for (const sample of samples) {
					expect(sample.open).toBe(kind === 'marker')
					expect(sample.rows.map(identity)).toEqual(owners)

					for (const row of sample.rows) {
						expect(row.native && row.expectedSubject && row.connected && row.finite).toBe(true)
						expect(row.fill).toBe('none')
						expect(row.transform, 'Released paint retains its transform containing block').not.toBe(
							'none',
						)

						if (row.progress === null) {
							expect(row.identity).toBe(true)
						}
					}
				}

				for (const row of samples[0].rows) {
					const trajectory = samples.map(sample => sample.rows.find(actor => actor.id === row.id)!)

					for (const index of [0, positions.length - 1, path.length - 1]) {
						expect(trajectory[index].progress).toBeNull()
					}

					for (const leg of [
						trajectory.slice(1, positions.length - 1),
						trajectory.slice(positions.length, -1),
					]) {
						expect(
							leg.some(actor => actor.progress !== null && !actor.identity),
							'Selected receiver must actually bend through the encounter in both directions',
						).toBe(true)
					}
				}
			} finally {
				try {
					await info.attach('native-flow-release', {
						body: JSON.stringify({
							width,
							kind,
							observations,
							limits:
								'Selected implicit marker and closed END receivers; synchronous native poses, not compositor or latency evidence',
						}),
						contentType: 'application/json',
					})
				} finally {
					try {
						await page.evaluate(control => control.restore(), control)
					} finally {
						await control.dispose()
					}
				}
			}
		})
	}
}

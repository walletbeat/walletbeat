import { expect, test } from '../../../tests/browser/verified-test'

for (const path of ['/metamask/?variant=BROWSER', '/ambire/']) {
	for (const width of [390, 690]) {
		test(`marker measurements retain their own native publisher: ${path} ${width}`, async ({
			page,
		}, info) => {
			await page.setViewportSize({ width, height: 900 })
			await page.goto(path)
			await page.locator('astro-island[ssr]:has(#top)').waitFor({ state: 'detached' })
			test.skip(
				!(await page.evaluate(() => {
					const summary = document.querySelector('summary')

					return (
						typeof ViewTimeline !== 'undefined' &&
						summary !== null &&
						getComputedStyle(summary).getPropertyValue('---collapsible-markerSupported').trim() ===
							'1'
					)
				})),
				'Requires the native marker clearance enhancement',
			)

			const observations = await page.evaluate(async () => {
				await document.fonts.ready
				const root = document.querySelector<HTMLElement>('#layout')!

				root.style.scrollSnapType = 'none'
				root.scrollTo({ top: 0, behavior: 'instant' })
				const disclosure = [...document.querySelectorAll<HTMLDetailsElement>('details[id]')].find(
					details => {
						const summary = details.querySelector(':scope > summary')
						let ancestor = details.parentElement?.closest('details')

						while (ancestor) {
							if (!ancestor.open) {
								return false
							}

							ancestor = ancestor.parentElement?.closest('details') ?? null
						}

						return (
							summary !== null &&
							getComputedStyle(summary).getPropertyValue('---collapsible-markerMeasure').trim() ===
								'clearance-inline-measure'
						)
					},
				)

				if (!disclosure) {
					throw Error('No reachable measured disclosure control')
				}

				const selectedSummary = disclosure.querySelector(':scope > summary')!
				const observations = []

				for (const open of [true, false]) {
					disclosure.open = open

					for (let frame = 0; frame < 3; frame++) {
						await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
					}
					const rows = []

					for (const animation of document.getAnimations()) {
						if (
							!(animation instanceof CSSAnimation) ||
							animation.animationName !== 'clearance-inline-measure' ||
							!(animation.effect instanceof KeyframeEffect)
						) {
							continue
						}

						const owner = animation.effect.target

						if (!(owner instanceof HTMLElement)) {
							throw Error('Unknown native measurement owner')
						}

						const style = getComputedStyle(owner)

						if (
							style.getPropertyValue('---collapsible-markerMeasure').trim() !==
							'clearance-inline-measure'
						) {
							continue
						}

						const timeline = animation.timeline

						if (!(timeline instanceof ViewTimeline)) {
							throw Error('Marker measurement lost its view timeline')
						}

						const subject = timeline.subject
						const ownPublisher =
							subject === owner ||
							(subject?.parentElement === owner && subject.tagName === '::after') ||
							(subject !== null &&
								'element' in subject &&
								subject.element === owner &&
								'type' in subject &&
								subject.type === '::after')
						const measured = parseFloat(style.getPropertyValue('---collapsible-markerInlineEnd'))

						rows.push({
							selected: owner === selectedSummary,
							ownerId: owner.closest('details[id]')?.id,
							source: timeline.source === root,
							axis: timeline.axis,
							ownPublisher,
							measured,
							geometryError:
								subject?.parentElement === owner
									? Math.abs(measured - subject.getBoundingClientRect().right)
									: null,
						})
					}
					observations.push({ disclosureId: disclosure.id, open, rows })
				}

				return observations
			})

			await info.attach('marker-clock-ownership', {
				body: JSON.stringify(observations, null, 2),
				contentType: 'application/json',
			})

			for (const { rows } of observations) {
				expect(
					rows.some(row => row.selected),
					'Selected summary participates in both states',
				).toBe(true)
				expect(rows.length, 'Live repeated marker controls').toBeGreaterThan(1)

				for (const row of rows) {
					expect(row.source).toBe(true)
					expect(row.axis).toBe('inline')
					expect(row.ownPublisher).toBe(true)
					expect(Number.isFinite(row.measured) && row.measured > 0).toBe(true)

					if (row.geometryError !== null) {
						expect(row.geometryError).toBeLessThan(0.0625)
					}
				}
			}
		})
	}
}

import { expect, test } from '../../../tests/browser/verified-test'

for (const path of ['/__wallet-page/software/', '/metamask/?variant=BROWSER']) {
	test(`inactive marker clocks cannot invalidate sticky animation lists: ${path}`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width: 390, height: 844 })
		await page.goto(path)
		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('animation-timeline: view()') &&
					CSS.supports('color: if(style(--native: 1): red)'),
			)),
			'Requires native scroll timelines and style conditionals',
		)
		await page.locator('astro-island[ssr]:has(#top)').waitFor({ state: 'detached' })
		await page.evaluate(async () => {
			await document.fonts.ready
			document.querySelector<HTMLElement>('#layout')!.style.scrollSnapType = 'none'
		})

		for (const scrollTop of [0, 800]) {
			const result = await page.evaluate(async scrollTop => {
				const frame = () =>
					new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
				const root = document.querySelector<HTMLElement>('#layout')!

				root.scrollTo({ top: scrollTop, behavior: 'instant' })
				await frame()
				const all = () =>
					document
						.getAnimations()
						.filter((effect): effect is CSSAnimation => effect instanceof CSSAnimation)
				const target = (animation: Animation) =>
					animation.effect instanceof KeyframeEffect ? animation.effect.target : null
				const active = all().filter(effect => effect.animationName === 'clearance-inline-measure')
				const owners = [
					...document.querySelectorAll<HTMLElement>(
						'[data-sticky-breadcrumb~="position"], [data-sticky-breadcrumb~="source"]',
					),
				].filter(
					owner =>
						getComputedStyle(owner).getPropertyValue('---collapsible-markerMeasure').trim() ===
							'none' &&
						!active.some(effect => {
							const element = target(effect)

							return element instanceof Element && owner.contains(element)
						}),
				)

				if (!owners.length) {
					throw Error('No inactive sticky marker owners')
				}

				if (!active.length) {
					throw Error('No live marker measurement controls')
				}

				const paint = (owner: Element) => {
					const style = getComputedStyle(owner),
						box = owner.getBoundingClientRect()

					return {
						transform: style.transform,
						translate: style.translate,
						scale: style.scale,
						opacity: style.opacity,
						filter: style.filter,
						x: box.x,
						y: box.y,
						width: box.width,
						height: box.height,
					}
				}
				const effects = all().filter(
					effect =>
						target(effect) instanceof HTMLElement && owners.some(owner => owner === target(effect)),
				)

				if (
					!effects.some(effect => effect.animationName === 'breadcrumb-entry') ||
					!effects.some(effect => effect.animationName === 'breadcrumb-position-exit')
				) {
					throw Error('Missing independent entry/exit effects')
				}

				for (const effect of effects) {
					if (
						['breadcrumb-entry', 'breadcrumb-position-exit'].includes(effect.animationName) &&
						!(effect.timeline instanceof ViewTimeline)
					) {
						throw Error(`Sticky effect lost native timeline: ${effect.animationName}`)
					}
				}
				const ranges = (effect: Animation) => {
					if (!('rangeStart' in effect) || !('rangeEnd' in effect)) {
						throw Error('Native animation range observation unavailable')
					}

					return {
						rangeStart: JSON.stringify(effect.rangeStart),
						rangeEnd: JSON.stringify(effect.rangeEnd),
					}
				}
				const controls = [...effects, ...active].map(effect => ({
					effect,
					timeline: effect.timeline,
					subject: effect.timeline instanceof ViewTimeline ? effect.timeline.subject : null,
					source: effect.timeline instanceof ScrollTimeline ? effect.timeline.source : null,
					...ranges(effect),
					progress: effect.effect!.getComputedTiming().progress,
				}))
				const before = owners.map(paint)
				const previous = owners.map(owner => ({
					value: owner.style.getPropertyValue('--collapsible-markerInlineTimeline'),
					priority: owner.style.getPropertyPriority('--collapsible-markerInlineTimeline'),
				}))

				try {
					for (const owner of owners) {
						owner.style.setProperty('--collapsible-markerInlineTimeline', 'unresolved(marker)')
					}
					await frame()
					const after = all()

					for (const control of controls) {
						const effect = control.effect
						const currentRanges = ranges(effect)

						if (
							!after.includes(effect) ||
							effect.timeline !== control.timeline ||
							(effect.timeline instanceof ViewTimeline &&
								effect.timeline.subject !== control.subject) ||
							(effect.timeline instanceof ScrollTimeline &&
								effect.timeline.source !== control.source) ||
							currentRanges.rangeStart !== control.rangeStart ||
							currentRanges.rangeEnd !== control.rangeEnd ||
							effect.effect!.getComputedTiming().progress !== control.progress
						) {
							throw Error(`Native binding or phase changed: ${effect.animationName}`)
						}
					}
					const ownAfter = after.filter(
						effect =>
							target(effect) instanceof HTMLElement &&
							owners.some(owner => owner === target(effect)),
					)

					if (
						ownAfter.length !== effects.length ||
						ownAfter.some(effect => !effects.includes(effect) || effect.animationName === 'both')
					) {
						throw Error('Inactive marker introduced or replaced an effect')
					}

					const observed = owners.map(paint)

					for (let i = 0; i < before.length; i++) {
						if (JSON.stringify(before[i]) !== JSON.stringify(observed[i])) {
							throw Error(`Inactive clock changed paint: owner ${i}`)
						}
					}

					return {
						scrollTop: root.scrollTop,
						inactiveOwners: owners.length,
						retainedEffects: effects.length,
						activeMarkerControls: active.length,
					}
				} finally {
					owners.forEach((owner, i) =>
						previous[i].value
							? owner.style.setProperty(
									'--collapsible-markerInlineTimeline',
									previous[i].value,
									previous[i].priority,
								)
							: owner.style.removeProperty('--collapsible-markerInlineTimeline'),
					)
				}
			}, scrollTop)

			expect(result.inactiveOwners).toBeGreaterThan(0)
			await info.attach(`inactive-marker-${scrollTop}`, {
				body: JSON.stringify(result),
				contentType: 'application/json',
			})
		}
	})
}

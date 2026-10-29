import { expect, test } from '../../../tests/browser/verified-test'

for (const direction of ['ltr', 'rtl']) {
	test(`breadcrumb marker paint changes preserve layout and effects: ${direction}`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
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
			'Native breadcrumb animation is unavailable; fallback behavior has separate coverage',
		)
		const observations = await page.evaluate(async direction => {
			document.documentElement.dir = direction
			const root = document.querySelector<HTMLElement>('#layout')!

			root.style.scrollSnapType = 'none'
			const settle = () =>
				new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
			const results = []

			for (const id of ['top', 'transparency', 'open-source']) {
				const section = document.getElementById(id)!
				const marker = section.querySelector(
					'a[data-sticky-breadcrumb~="item"], [data-sticky-breadcrumb~="item"] > a, [data-sticky-breadcrumb~="item"] > h1 > a',
				)!

				if (!marker) {
					throw new Error(`Missing real marker: ${id}`)
				}

				root.scrollTo({
					top: id === 'top' ? 0 : root.scrollTop + section.getBoundingClientRect().top - 350,
					behavior: 'instant',
				})
				await settle()
				const effects = ['::before', '::after'].map(pseudo => ({
					pseudo,
					animations: marker.getAnimations({ subtree: true }).filter(animation => {
						const effect = animation.effect

						if (!(effect instanceof KeyframeEffect)) {
							return false
						}

						const target = effect.target
						const ownsPseudo =
							(effect.pseudoElement === pseudo && target === marker) ||
							(target &&
								'element' in target &&
								target.element === marker &&
								'type' in target &&
								target.type === pseudo)

						return ownsPseudo && effect.getKeyframes().some(frame => 'transform' in frame)
					}),
				}))
				const reservation = () =>
					['::before', '::after'].map(pseudo => {
						const style = getComputedStyle(marker, pseudo)

						return {
							content: style.content,
							width: style.width,
							height: style.height,
							padding: style.padding,
							fontSize: style.fontSize,
							fontFamily: style.fontFamily,
						}
					})
				const before = reservation()
				const natural = getComputedStyle(marker, '::before').transform

				root.scrollTo({ top: root.scrollTop + 500, behavior: 'instant' })
				await settle()
				const current = marker.getAnimations({ subtree: true })

				results.push({
					id,
					effects: effects.map(({ pseudo, animations }) => ({
						pseudo,
						count: animations.length,
						retained: animations.every(animation => current.includes(animation)),
					})),
					before,
					after: reservation(),
					natural,
				})
			}

			return results
		}, direction)

		for (const observation of observations) {
			for (const effect of observation.effects) {
				expect(effect.count, `${observation.id} ${effect.pseudo}`).toBe(1)
				expect(effect.retained, `${observation.id} ${effect.pseudo}`).toBe(true)
			}
			expect(observation.after, `${observation.id} marker reservation`).toEqual(observation.before)
			expect(observation.before[0].content, observation.id).toContain('#')
			expect(observation.before[1].content, observation.id).toContain('›')
			expect(observation.natural, observation.id).toBe('matrix(1, 0, 0, 1, 0, 0)')
		}

		for (const { fixture, width, wrapped } of [
			{ fixture: 'software', width: 690, wrapped: 0 },
			{ fixture: 'longName', width: 390, wrapped: 1 },
		]) {
			await page.setViewportSize({ width, height: 900 })
			await page.goto(`/__wallet-page/${fixture}/`)
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(async direction => {
				document.documentElement.dir = direction
				await document.fonts.ready
				const root = document.querySelector<HTMLElement>('#layout')!

				root.style.scrollSnapType = 'none'
				root.scrollTo({ top: 0, behavior: 'instant' })
			}, direction)
			const marker = page.locator('.wallet-name')
			const opacity = (pseudo: string) =>
				marker.evaluate(
					(element, pseudo) => Number(getComputedStyle(element, pseudo).opacity),
					pseudo,
				)

			await page.mouse.move(0, 899)
			await expect.poll(() => opacity('::before')).toBe(0)
			await expect.poll(() => opacity('::after')).toBe(0)
			await marker.hover()
			await expect.poll(() => opacity('::before')).toBe(1)
			await page.mouse.move(0, 899)
			await page.keyboard.press('Tab')
			await marker.focus()
			await expect(marker).toBeFocused()
			await expect.poll(() => opacity('::before')).toBe(1)
			await marker.evaluate(element => {
				if (!(element instanceof HTMLElement)) {
					throw new Error('Expected a native heading link')
				}

				element.blur()
			})
			await page
				.locator('#layout')
				.evaluate(element => element.scrollTo({ top: 500, behavior: 'instant' }))
			await expect
				.poll(() =>
					marker.evaluate(element =>
						Number(getComputedStyle(element).getPropertyValue('---breadcrumb-entry')),
					),
				)
				.toBe(1)
			await expect
				.poll(() =>
					marker.evaluate(element =>
						Number(getComputedStyle(element).getPropertyValue('---breadcrumb-markerWrap')),
					),
				)
				.toBe(wrapped)
			await expect.poll(() => opacity('::before')).toBe(0)
			await expect.poll(() => opacity('::after')).toBe(1 - wrapped)
			await marker.hover()
			await expect.poll(() => opacity('::before')).toBe(wrapped)
			await expect.poll(() => opacity('::after')).toBe(1 - wrapped)
		}
	})
}

test('explicit disclosure markers replace automatic pseudo motion', async ({ page }, info) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/metamask/?variant=BROWSER')
	test.skip(
		!(await page.evaluate(() => CSS.supports('animation-timeline: view()'))),
		'Requires native scroll animation effects',
	)
	await page.locator('astro-island[ssr]:has(#top)').waitFor({ state: 'detached' })

	for (const open of [true, false]) {
		const state = await page.evaluate(async open => {
			const details = document.querySelector('#transaction-legibility > details')

			if (!(details instanceof HTMLDetailsElement)) {
				throw Error('Missing native disclosure')
			}

			const marker = details.querySelector('[data-collapsible-marker]')

			if (!(marker instanceof Element)) {
				throw Error('Missing disclosure marker')
			}

			details.open = open
			await document.fonts.ready
			await new Promise<void>(resolve =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			)
			const owners = [
				...document.querySelectorAll(
					'[data-sticky-breadcrumb~="end"][data-sticky-breadcrumb~="contents"]:has(> [data-collapsible-marker])',
				),
			]
			const effects = document
				.getAnimations()
				.filter(
					animation =>
						animation instanceof CSSAnimation && animation.effect instanceof KeyframeEffect,
				)
			const duplicate = effects.filter(animation => {
				const effect = animation.effect

				if (!(effect instanceof KeyframeEffect)) {
					return false
				}

				const target = effect.target

				return owners.some(owner => {
					const ownsPseudo =
						(effect.pseudoElement === '::after' && target === owner) ||
						(target &&
							'element' in target &&
							target.element === owner &&
							'type' in target &&
							target.type === '::after')

					return ownsPseudo && getComputedStyle(owner, '::after').content === 'none'
				})
			})
			const visibleMarkerEffects = effects.filter(animation => {
				const effect = animation.effect

				return (
					effect instanceof KeyframeEffect &&
					effect.target instanceof Element &&
					effect.target === marker &&
					effect.target.getBoundingClientRect().height > 0
				)
			})

			return {
				open,
				owners: owners.length,
				duplicate: duplicate.length,
				visibleMarkerEffects: visibleMarkerEffects.length,
			}
		}, open)

		expect(state.owners).toBeGreaterThan(0)
		expect(state.visibleMarkerEffects).toBeGreaterThan(0)
		expect(state.duplicate).toBe(0)
		await info.attach(`explicit-marker-${open}`, {
			body: JSON.stringify(state),
			contentType: 'application/json',
		})
	}
})

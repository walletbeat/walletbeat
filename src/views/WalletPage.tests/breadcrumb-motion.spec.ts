import { expect, test } from '../../../tests/browser/verified-test'

for (const direction of ['ltr', 'rtl'] as const) {
	test(`disclosure end motion respects reduced motion and native closed state: ${direction}`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width: 690, height: 900 })
		await page.emulateMedia({ reducedMotion: 'reduce' })
		await page.goto('/metamask/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.locator('html').evaluate((element, value) => {
			element.setAttribute('dir', value)
		}, direction)
		await page.evaluate(() => document.fonts.ready)
		const disclosure = page.locator('details[name="wallet-stages"]').first()
		const summary = disclosure.locator(':scope > summary')
		const end = summary.locator('[data-sticky-breadcrumb~="end"]')

		await expect(end).toHaveCount(1)
		const journeys = []

		for (const open of [true, false]) {
			if ((await disclosure.evaluate(element => element.hasAttribute('open'))) !== open) {
				await summary.evaluate(element => element.focus({ preventScroll: true }))
				await summary.press('Space')
			}

			await expect
				.poll(() => disclosure.evaluate(element => element.hasAttribute('open')))
				.toBe(open)
			const samples = await end.evaluate(async element => {
				const root = document.querySelector<HTMLElement>('#layout')!,
					scope = element.closest('[data-sticky-breadcrumb~="scope"]')!,
					details = element.closest('details')!

				root.style.scrollSnapType = 'none'
				const owners = [element, ...element.querySelectorAll('*')]
				const labels = new Map(owners.map((owner, index) => [owner, index]))
				const samples = []

				for (const target of [350, 175, 100, 50, 0, -50, 100, 350]) {
					for (let attempt = 0; attempt < 4; attempt++) {
						root.scrollTo({
							top: root.scrollTop + scope.getBoundingClientRect().top - target,
							behavior: 'instant',
						})
						await new Promise<void>(resolve =>
							requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
						)

						if (Math.abs(scope.getBoundingClientRect().top - target) < 1) {
							break
						}
					}
					const effects = element.getAnimations({ subtree: true }).flatMap(animation => {
						if (
							!(animation.effect instanceof KeyframeEffect) ||
							!(animation.effect.target instanceof Element) ||
							!labels.has(animation.effect.target)
						) {
							return []
						}

						const frames = animation.effect.getKeyframes()

						if (!frames.some(frame => 'translate' in frame)) {
							return []
						}

						const owner = animation.effect.target,
							pseudo = animation.effect.pseudoElement
						const style = getComputedStyle(owner, pseudo)

						return [
							{
								owner: labels.get(owner),
								tag: owner.tagName,
								pseudo,
								name: animation instanceof CSSAnimation ? animation.animationName : null,
								timeline: animation.timeline?.constructor.name ?? null,
								currentTime: animation.currentTime === null ? null : String(animation.currentTime),
								progress: animation.effect.getComputedTiming().progress,
								effectEasing: animation.effect.getTiming().easing,
								keyframeEasing: frames.map(frame => frame.easing),
								translate: style.translate,
								paint:
									owner.getBoundingClientRect().width > 0 &&
									owner.getBoundingClientRect().height > 0,
								frames,
							},
						]
					})
					const text = [...element.querySelectorAll('span,data')].flatMap(owner => {
						const range = document.createRange()

						range.selectNodeContents(owner)

						return [...range.getClientRects()]
							.filter(box => box.width > 0 && box.height > 0)
							.map(box => ({ top: box.top, bottom: box.bottom }))
					})

					samples.push({
						target,
						entry: getComputedStyle(details.querySelector('summary')!)
							.getPropertyValue('---breadcrumb-entry')
							.trim(),
						actualTop: scope.getBoundingClientRect().top,
						scroll: root.scrollTop,
						open: details.hasAttribute('open'),
						effects,
						text,
						summary: details.querySelector('summary')!.getBoundingClientRect().top,
					})
				}

				return samples
			})

			journeys.push({ open, samples })

			for (const sample of samples) {
				expect(
					Math.abs(sample.actualTop - sample.target),
					'Actual section pose is delivered',
				).toBeLessThan(1)
				expect(sample.open).toBe(open)
				expect(sample.text.length, 'Real end count text is rendered').toBeGreaterThan(0)

				if (!open) {
					expect(
						sample.effects,
						'Closed end descendants have no decorative arrival motion',
					).toEqual([])
				}

				for (const effect of sample.effects) {
					expect(effect.timeline, 'Actual end paint has a native view timeline').toBe(
						'ViewTimeline',
					)
					expect(effect.currentTime).not.toBeNull()
				}
			}

			if (open) {
				expect(samples[0].entry, 'Natural endpoint is before entry').toBe('0')
				expect(
					samples.find(sample => sample.target === -50)!.entry,
					'Compact endpoint completed entry',
				).toBe('1')
				const effects = samples.flatMap(sample => sample.effects)

				expect(
					effects.some(effect => effect.paint && effect.owner !== 0),
					'Real child paint, not only the END reservation wrapper, owns motion',
				).toBe(true)
				const owners = [...new Set(effects.map(effect => `${effect.owner}:${effect.pseudo}`))]
				let movingOwners = 0

				for (const owner of owners) {
					const own = effects.filter(effect => `${effect.owner}:${effect.pseudo}` === owner)
					const values = new Set(own.map(effect => effect.translate))
					const endpoints = [samples[0], samples.find(sample => sample.target === -50)!].flatMap(
						sample =>
							sample.effects
								.filter(effect => `${effect.owner}:${effect.pseudo}` === owner)
								.map(effect => effect.translate),
					)

					expect(
						own.every(effect => endpoints.includes(effect.translate)),
						'Intermediate paint uses only actually delivered natural/compact endpoint translations',
					).toBe(true)
					expect(
						values.size,
						'Each paint owner uses only stable arrival endpoint translations',
					).toBeLessThanOrEqual(2)

					if (values.size === 2) {
						movingOwners++
					}
				}
				expect(
					movingOwners,
					'The admitted journey actually reaches both distinct used arrival endpoints',
				).toBeGreaterThan(0)
			}

			await expect(summary).toBeVisible()
		}
		await info.attach('reduced-motion-end-paint', {
			body: JSON.stringify({
				direction,
				journeys,
				limits:
					'Decorative translate arrival endpoints only; continuous horizontal obstacle avoidance remains independently necessary. Absolute native scroll/sticky travel is not treated as decorative interpolation.',
			}),
			contentType: 'application/json',
		})
	})
}

test('heading transforms remain attached across their natural-to-sticky boundary', async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 900 })
	await page.goto('/metamask/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	const observations = await page.evaluate(async () => {
		const root = document.querySelector('#layout')

		if (!(root instanceof HTMLElement)) {
			throw new Error('Missing scroll owner')
		}

		root.style.scrollSnapType = 'none'
		const result = []

		for (const id of ['transparency', 'open-source']) {
			const section = document.getElementById(id)
			const icon = section?.querySelector('[data-sticky-breadcrumb~="item"] [data-icon]')
			const title = icon?.nextElementSibling

			if (!section || !title) {
				throw new Error(`Missing heading composition: ${id}`)
			}

			const settle = () =>
				new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)

			root.scrollTo({
				top: root.scrollTop + section.getBoundingClientRect().top - 350,
				behavior: 'instant',
			})
			await settle()
			const effects = title
				.getAnimations()
				.filter(
					animation =>
						animation.effect instanceof KeyframeEffect &&
						animation.effect.getKeyframes().some(frame => 'transform' in frame),
				)
			const natural = getComputedStyle(title).transform

			root.scrollTo({ top: root.scrollTop + 500, behavior: 'instant' })
			await settle()
			const current = title.getAnimations()

			result.push({
				id,
				count: effects.length,
				retained: effects.every(effect => current.includes(effect)),
				natural,
			})
		}

		return result
	})

	for (const observation of observations) {
		expect(observation.count, observation.id).toBeGreaterThan(0)
		expect(observation.retained, observation.id).toBe(true)
		expect(observation.natural, observation.id).toBe('matrix(1, 0, 0, 1, 0, 0)')
	}
})

test('passive breadcrumb surfaces preserve arrival, departure and reverse paint without hit areas', async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 900 })
	await page.goto('/metamask/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	const observations = await page.evaluate(async () => {
		const root = document.querySelector('#layout')

		if (!(root instanceof HTMLElement)) {
			throw new Error('Missing scroll owner')
		}

		root.style.scrollSnapType = 'none'
		const out = []

		for (const id of ['stages', 'transparency']) {
			const section = document.getElementById(id)
			const header = section?.querySelector(':scope > header')

			if (!section || !header) {
				throw new Error(`Missing passive heading: ${id}`)
			}

			const samples = []

			for (const phase of ['natural', 'compact', 'departed', 'compact', 'natural']) {
				const target = phase === 'natural' ? 350 : phase === 'compact' ? -150 : 0
				const position = () =>
					section.getBoundingClientRect()[phase === 'departed' ? 'bottom' : 'top']

				for (let attempt = 0; attempt < 4; attempt++) {
					root.scrollTo({ top: root.scrollTop + position() - target, behavior: 'instant' })
					await new Promise(resolve => setTimeout(resolve, 200))

					if (Math.abs(position() - target) < 1) {
						break
					}
				}

				if (Math.abs(position() - target) >= 1) {
					throw new Error(`Unsettled ${id} ${phase}: ${position()}`)
				}

				const style = getComputedStyle(header, '::after')
				const filterOpacity = /opacity\(([^)]+)\)/.exec(style.filter)

				samples.push({
					alpha: Number(style.opacity) * (filterOpacity ? Number(filterOpacity[1]) : 1),
					pointer: style.pointerEvents,
				})
			}
			out.push({ id, samples })
		}

		return out
	})

	for (const { id, samples } of observations) {
		expect(
			samples.map(sample => sample.pointer),
			id,
		).toEqual(Array(5).fill('none'))

		for (const index of [0, 2, 4]) {
			expect(samples[index].alpha, `${id} phase ${index}`).toBeLessThan(0.01)
		}

		for (const index of [1, 3]) {
			expect(samples[index].alpha, `${id} phase ${index}`).toBeGreaterThan(0.99)
		}
	}
})

for (const direction of ['ltr', 'rtl'] as const) {
	test(`closed disclosure controls retain clearance without sticky participation: ${direction}`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 900 })
		await page.goto('/metamask/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(async direction => {
			document.documentElement.dir = direction
			await document.fonts.ready
			const root = document.querySelector('#layout')

			if (!(root instanceof HTMLElement)) {
				throw new Error('Missing scroll owner')
			}

			root.style.scrollSnapType = 'none'
			root.style.overflowAnchor = 'none'
		}, direction)
		const controls = page.locator('#open-source summary:has(> h4)')

		expect(await controls.count()).toBeGreaterThan(0)

		for (const summary of await controls.all()) {
			await summary.evaluate(element => {
				for (let parent = element.parentElement; parent; parent = parent.parentElement) {
					if (parent instanceof HTMLDetailsElement) {
						parent.open = true
					}
				}
			})

			for (const open of [true, false]) {
				if (
					(await summary.evaluate(element => element.parentElement?.hasAttribute('open'))) !== open
				) {
					await summary.focus()
					await summary.press('Space')
				}

				const observation = await summary.evaluate(async element => {
					const root = document.querySelector('#layout'),
						details = element.parentElement

					if (!(root instanceof HTMLElement) || !(details instanceof HTMLDetailsElement)) {
						throw new Error('Missing native disclosure')
					}

					for (let attempt = 0; attempt < 8; attempt++) {
						root.scrollTo({
							top: root.scrollTop + details.getBoundingClientRect().top - 80,
							behavior: 'instant',
						})
						await new Promise(resolve => setTimeout(resolve, 150))

						if (Math.abs(details.getBoundingClientRect().top - 80) < 1) {
							break
						}
					}

					if (Math.abs(details.getBoundingClientRect().top - 80) >= 1) {
						throw new Error('Control contact not admitted')
					}

					const control = getComputedStyle(element, '::after')

					return {
						open: details.open,
						position: getComputedStyle(element).position,
						content: control.content,
						shift: new DOMMatrix(control.transform).m41,
					}
				})

				expect(observation.open).toBe(open)
				expect(observation.content).not.toBe('none')
				expect(observation.shift * (direction === 'ltr' ? 1 : -1)).toBeLessThan(-1)

				if (!open) {
					expect(observation.position).not.toBe('sticky')
				}
			}
		}
	})
}

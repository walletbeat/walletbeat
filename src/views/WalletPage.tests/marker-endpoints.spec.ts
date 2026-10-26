import { expect, test } from '../../../tests/browser/verified-test'

for (const direction of ['ltr', 'rtl']) {
	test(`breadcrumb chevron fades across native scroll endpoints: ${direction}`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 933, height: 1203 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.mouse.move(0, 1202)
		const { samples, definition, expectedEasing } = await page.evaluate(async direction => {
			document.documentElement.dir = direction
			await document.fonts.ready
			const root = document.querySelector<HTMLElement>('#layout')!
			const section = document.getElementById('account-portability')!
			const marker = section.querySelector('h3 > a')!

			root.style.scrollSnapType = 'none'
			const rows = []
			let definition = null
			const expectedEasing = getComputedStyle(marker)
				.getPropertyValue('--transition-easeInOutExpo')
				.replace(/\s/g, '')

			for (let top = 200; top >= -20; top--) {
				root.scrollTo({
					top: root.scrollTop + section.getBoundingClientRect().top - top,
					behavior: 'instant',
				})

				for (let frame = 0; frame < 3; frame++) {
					await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
				}
				const opacityEffects = marker.getAnimations({ subtree: true }).filter(animation => {
					if (
						!(animation.effect instanceof KeyframeEffect) ||
						!animation.effect.getKeyframes().some(frame => 'opacity' in frame)
					) {
						return false
					}

					const target = animation.effect.target

					return (
						(animation.effect.pseudoElement === '::after' && target === marker) ||
						(target &&
							'element' in target &&
							target.element === marker &&
							'type' in target &&
							target.type === '::after')
					)
				})

				const animation = opacityEffects[0]

				if (
					opacityEffects.length !== 1 ||
					!(animation instanceof CSSAnimation) ||
					animation.animationName !== 'breadcrumb-surface' ||
					!(animation.timeline instanceof ViewTimeline) ||
					animation.timeline.source !== root ||
					!(animation.effect instanceof KeyframeEffect)
				) {
					throw new Error('Missing native chevron opacity effect')
				}

				definition ??= {
					easing: animation.effect.getTiming().easing,
					direction: animation.effect.getTiming().direction,
					iterations: animation.effect.getTiming().iterations,
					frames: animation.effect.getKeyframes().map(frame => ({
						offset: frame.computedOffset,
						opacity: Number(frame.opacity),
						easing: frame.easing.replace(/\s/g, ''),
					})),
				}
				rows.push({
					top: section.getBoundingClientRect().top,
					progress: animation.effect.getComputedTiming().progress,
					opacity: Number(getComputedStyle(marker, '::after').opacity),
					wrap: getComputedStyle(marker).getPropertyValue('---breadcrumb-markerWrap').trim(),
				})
			}

			return { samples: rows, definition, expectedEasing }
		}, direction)

		expect(definition).not.toBeNull()
		expect(definition!.easing).toBe('linear')
		expect(definition!.direction).toBe('normal')
		expect(definition!.iterations).toBe(1)
		expect(definition!.frames).toHaveLength(2)
		expect(definition!.frames[0]).toMatchObject({ offset: 0, opacity: 0, easing: expectedEasing })
		expect(definition!.frames[1]).toMatchObject({ offset: 1, opacity: 1 })
		const entered = samples.filter(
			sample => typeof sample.progress === 'number' && sample.progress > 0 && sample.progress < 1,
		)

		expect(entered.length).toBeGreaterThan(10)
		expect(samples.every(sample => sample.wrap === '0')).toBe(true)
		expect(
			samples.filter(sample => sample.progress === 0).every(sample => sample.opacity === 0),
		).toBe(true)
		expect(
			samples.filter(sample => sample.progress === 1).every(sample => sample.opacity === 1),
		).toBe(true)
		expect(samples.some(sample => sample.progress === 0)).toBe(true)
		expect(samples.some(sample => sample.progress === 1)).toBe(true)
		expect(entered.every(sample => sample.opacity > 0 && sample.opacity < 1)).toBe(true)
		const early = entered.filter(sample => sample.progress! < 0.1)

		expect(early.length).toBeGreaterThan(0)
		expect(early.every(sample => sample.opacity < 0.02)).toBe(true)

		for (let index = 1; index < samples.length; index++) {
			expect(samples[index].opacity).toBeGreaterThanOrEqual(samples[index - 1].opacity - 0.001)
		}
		const middle = entered.reduce((best, sample) =>
			Math.abs(sample.progress! - 0.5) < Math.abs(best.progress! - 0.5) ? sample : best,
		)

		await page.evaluate(top => {
			const root = document.querySelector<HTMLElement>('#layout')!
			const section = document.getElementById('account-portability')!

			root.scrollTo({
				top: root.scrollTop + section.getBoundingClientRect().top - top,
				behavior: 'instant',
			})
		}, middle.top)
		const marker = page.locator('#account-portability h3 > a').first()

		await marker.hover()
		await expect
			.poll(() =>
				marker.evaluate(element => {
					const before = Number(getComputedStyle(element, '::before').opacity)
					const after = Number(getComputedStyle(element, '::after').opacity)

					return (
						element.matches(':hover') &&
						before > 0 &&
						after > 0 &&
						Math.abs(before + after - 1) < 0.01
					)
				}),
			)
			.toBe(true)
		await page.mouse.move(0, 1202)
		await page.evaluate(() => {
			const root = document.querySelector<HTMLElement>('#layout')!
			const section = document.getElementById('account-portability')!

			root.scrollTo({
				top: root.scrollTop + section.getBoundingClientRect().top - 200,
				behavior: 'instant',
			})
		})
		await expect
			.poll(() => marker.evaluate(element => Number(getComputedStyle(element, '::after').opacity)))
			.toBe(0)
		await test.info().attach('native-chevron-endpoints', {
			body: JSON.stringify({ definition, expectedEasing, samples }),
			contentType: 'application/json',
		})
	})
}

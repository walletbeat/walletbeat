import { expect, test } from '../../../tests/browser/verified-test'

for (const id of ['transparency', 'open-source']) {
	test(`breadcrumb glyph detail follows its rendered size: ${id}`, async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 900 })
		await page.emulateMedia({ reducedMotion: 'no-preference' })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const referenceImage = page.locator('#permissions-management .references img').first()

		if (await referenceImage.count()) {
			await referenceImage.evaluate(element =>
				element.scrollIntoView({ block: 'center', behavior: 'instant' }),
			)
			await expect
				.poll(() =>
					referenceImage.evaluate(
						element =>
							element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
					),
				)
				.toBe(true)
			await referenceImage.evaluate(async element => {
				if (!(element instanceof HTMLImageElement)) {
					throw new Error('Native reference image required')
				}

				await element.decode()
			})
		}

		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('animation-timeline: scroll()') &&
					CSS.supports('animation-range: 0% 100%') &&
					CSS.supports('width: anchor-size(--breadcrumb-source inline)') &&
					CSS.supports('timeline-scope: --breadcrumb-size') &&
					CSS.supports('color: if(style(--a: 1): red)'),
			)),
			'Native breadcrumb enhancement unavailable',
		)
		const observation = await page.evaluate(async id => {
			const root = document.querySelector<HTMLElement>('#layout')!
			const section = document.getElementById(id)!
			const heading = section.querySelector('h2, h3')!
			const item = heading.closest<HTMLElement>('[data-sticky-breadcrumb~="item"]')!
			const icon = item.querySelector<HTMLElement>('[data-icon]')!

			if (!icon || icon.matches('[data-icon~="circle"], [data-icon~="emoji"]')) {
				throw new Error(`A plain native font glyph is required: ${id}`)
			}

			root.style.scrollSnapType = 'none'
			root.style.overflowAnchor = 'none'
			const settle = () =>
				new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
			const verticalScale = (style: CSSStyleDeclaration) => {
				const matrix = new DOMMatrixReadOnly(
					style.transform === 'none' ? undefined : style.transform,
				)

				if (
					!matrix.is2D ||
					Math.abs(matrix.b) > 0.00001 ||
					Math.abs(matrix.c) > 0.00001 ||
					style.rotate !== 'none'
				) {
					throw new Error('Glyph size requires an axis-aligned native transform')
				}

				const scale = style.scale === 'none' ? [1] : style.scale.split(/\s+/).map(Number)
				const y = Math.abs(matrix.d * (scale[1] ?? scale[0]))

				if (!Number.isFinite(y) || y <= 0) {
					throw new Error('Finite positive native scale required')
				}

				return y
			}
			const sample = () => {
				let ancestors = 1

				for (let node: HTMLElement | null = icon; node; node = node.parentElement) {
					ancestors *= verticalScale(getComputedStyle(node))
				}
				const glyph = (pseudo: string) => {
					const style = getComputedStyle(icon, pseudo)
					const fontSize = Number.parseFloat(style.fontSize)
					const inkHeight = Number(style.getPropertyValue('---icon-ink-height'))
					const height = fontSize * inkHeight * verticalScale(style) * ancestors

					if (!Number.isFinite(height) || height <= 0 || style.content === 'none') {
						throw new Error('Positive native glyph metrics and content required')
					}

					return {
						height,
						opacity: Number(style.opacity),
						fontSize,
						inkHeight,
						transform: style.transform,
						fontFamily: style.fontFamily,
					}
				}
				const effects = item
					.getAnimations()
					.filter(
						animation =>
							animation instanceof CSSAnimation &&
							animation.animationName === 'breadcrumb-item-motion',
					)
				const effect = effects[0]

				if (effects.length !== 1 || !effect.timeline || effect.currentTime === null) {
					throw new Error('One resolved native item arrival clock required')
				}

				return {
					scroll: root.scrollTop,
					sectionTop: section.getBoundingClientRect().top,
					complex: glyph('::before'),
					simple: glyph('::after'),
					progress: effect.effect?.getComputedTiming().progress,
				}
			}

			root.scrollTo({
				top: root.scrollTop + section.getBoundingClientRect().top - 350,
				behavior: 'instant',
			})
			await settle()
			const natural = sample()

			root.scrollTo({ top: natural.scroll + 500, behavior: 'instant' })
			await settle()
			const compact = sample()

			if (
				window.devicePixelRatio !== 1 ||
				natural.complex.height <= 32 ||
				compact.complex.height > 32
			) {
				throw new Error(
					'Glyph boundary probing requires DPR 1 and native endpoints straddling 32px',
				)
			}

			let low = natural
			let high = compact

			for (let attempt = 0; high.scroll - low.scroll > 1 && attempt < 20; attempt++) {
				root.scrollTo({ top: (low.scroll + high.scroll) / 2, behavior: 'instant' })
				await settle()
				const current = sample()

				if (
					current.scroll <= low.scroll ||
					current.scroll >= high.scroll ||
					current.complex.height > low.complex.height + 0.1 ||
					current.complex.height < high.complex.height - 0.1
				) {
					throw new Error('Native glyph boundary delivery stalled or lost its monotonic bracket')
				}

				if (current.complex.height > 32) {
					low = current
				} else {
					high = current
				}
			}
			const near = []

			for (const point of [low, high]) {
				root.scrollTo({ top: point.scroll, behavior: 'instant' })
				await settle()
				const replay = sample()

				if (
					replay.scroll !== point.scroll ||
					Math.abs(replay.complex.height - point.complex.height) > 0.1
				) {
					throw new Error('Native glyph boundary pose did not replay')
				}

				near.push(replay)
			}

			return { id, natural, compact, near }
		}, id)

		await test.info().attach('native-glyph-size', {
			body: JSON.stringify(observation, null, 2),
			contentType: 'application/json',
		})
		expect(observation.natural.progress).toBe(0)
		expect(observation.compact.progress).toBe(1)
		expect(observation.natural.complex.height).toBeGreaterThan(33)
		expect(observation.compact.complex.height).toBeLessThan(31)

		for (const point of [observation.natural, observation.compact, ...observation.near]) {
			expect(Math.abs(point.complex.height - point.simple.height)).toBeLessThan(0.1)
			const detailed = point.complex.height > 32

			expect(point.complex.opacity).toBe(detailed ? 1 : 0)
			expect(point.simple.opacity).toBe(detailed ? 0 : 1)
		}

		expect(observation.near[0].complex.height).toBeGreaterThan(32)
		expect(observation.near[1].complex.height).toBeLessThanOrEqual(32)
		expect(observation.near[1].scroll - observation.near[0].scroll).toBeGreaterThan(0)
		expect(observation.near[1].scroll - observation.near[0].scroll).toBeLessThanOrEqual(1)

		for (const point of observation.near) {
			expect(point.progress).toBeGreaterThan(0)
			expect(point.progress).toBeLessThan(1)
		}
	})
}

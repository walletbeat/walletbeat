import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 1440]) {
	test(`wallet picker visible presentation and native hit area at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/', { waitUntil: 'domcontentloaded' })
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const picker = page.getByRole('combobox', { name: 'Wallet version', exact: true })

		await expect(picker).toBeEnabled()
		const capability = await page.evaluate(() => ({
			baseSelect: CSS.supports('appearance: base-select'),
			timeline: CSS.supports('animation-timeline: --picker'),
		}))

		await info.attach('picker-capability', {
			body: JSON.stringify(capability),
			contentType: 'application/json',
		})
		test.skip(
			!capability.baseSelect || !capability.timeline,
			'Custom picker presentation requires native base-select and scroll timelines; fallback presentation remains unobserved here',
		)
		const arrival = await page
			.locator('#top > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])')
			.evaluate(flow => {
				const root = document.querySelector<HTMLElement>('#layout')

				if (!root) {
					throw new Error('WalletPage scroll owner is missing')
				}

				root.style.scrollSnapType = 'none'

				return flow.getBoundingClientRect().height
			})
		const sample = () =>
			picker.evaluate(select => {
				const box = ({ x, y, width, height }: DOMRectReadOnly) => ({ x, y, width, height })
				const rect = select.getBoundingClientRect(),
					style = getComputedStyle(select)
				const button = select.querySelector('button')

				if (!button) {
					throw new Error('Native base-select button is missing')
				}

				const icon = select.querySelector('selectedcontent .select-icon')
				const label = select.querySelector('selectedcontent .select-label')
				const cap = getComputedStyle(button, '::after'),
					pseudo = getComputedStyle(button, '::before')
				const circle = { x: rect.left, y: rect.top, width: rect.height, height: rect.height }
				const point = { x: rect.right - 2, y: rect.top + rect.height / 2 }
				const hit = document.elementFromPoint(point.x, point.y)
				const effects = select.getAnimations({ subtree: true }).map(animation => ({
					name: animation instanceof CSSAnimation ? animation.animationName : null,
					timeline: animation.timeline?.constructor.name,
					progress: animation.effect?.getComputedTiming().progress,
					keyframes:
						animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : null,
				}))

				return {
					scroll: document.querySelector('#layout')?.scrollTop,
					flow: document
						.querySelector(
							'#top > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
						)
						?.getBoundingClientRect().height,
					rect: box(rect),
					circle,
					point,
					hitTag: hit?.tagName,
					hitSelect: hit?.closest('select') === select,
					padding: getComputedStyle(button).padding,
					radius: style.borderRadius,
					cap: { width: cap.width, height: cap.height },
					icon: icon?.children.length ? box(icon.getBoundingClientRect()) : null,
					labelOpacity: label ? getComputedStyle(label).opacity : null,
					picker: {
						opacity: pseudo.opacity,
						translate: pseudo.translate,
						scale: pseudo.scale,
						maskPosition: pseudo.maskPosition,
					},
					popupTransition: getComputedStyle(select, '::picker(select)').transitionProperty,
					effects,
				}
			})
		const labelClock = () =>
			picker
				.locator('selectedcontent .select-label')
				.evaluate(label =>
					label
						.getAnimations()
						.some(
							animation =>
								animation instanceof CSSAnimation &&
								animation.animationName === 'select-compact-label' &&
								animation.effect?.getComputedTiming().progress === 1,
						),
				)
		const inputClock = () =>
			picker.evaluate(select => {
				if (!(select instanceof HTMLSelectElement)) {
					throw new Error('Native wallet version select is missing')
				}

				const label = select.querySelector('selectedcontent .select-label')

				return {
					value: select.value,
					query: location.search,
					scroll: document.querySelector('#layout')?.scrollTop,
					opacity: label ? getComputedStyle(label).opacity : null,
					effects: label?.getAnimations().map(animation => ({
						name: animation instanceof CSSAnimation ? animation.animationName : null,
						timeline: animation.timeline?.constructor.name,
						progress: animation.effect?.getComputedTiming().progress,
					})),
				}
			})
		const states = []

		for (const [pose, top] of [
			['natural', 0],
			['arrival-mid', arrival / 2],
			['compact', arrival + 2],
		] as const) {
			await page.locator('#layout').evaluate(async (root, top) => {
				root.scrollTo({ top, behavior: 'instant' })
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
			}, top)
			const state = await sample()

			states.push({ pose, top, state })
			await info.attach(`picker-${pose}`, {
				body: JSON.stringify(state),
				contentType: 'application/json',
			})

			if (pose !== 'arrival-mid') {
				await info.attach(`picker-${pose}-frame`, {
					body: await page.screenshot(),
					contentType: 'image/png',
				})
			}

			if (pose === 'natural') {
				expect(state.rect.width).toBeGreaterThan(state.rect.height)
				expect(Number.parseFloat(state.radius)).toBeGreaterThanOrEqual(state.rect.height / 2)
				expect(Number.parseFloat(state.padding)).toBeGreaterThan(0)
				await picker.click()
				await expect.poll(() => picker.evaluate(select => select.matches(':open'))).toBe(true)
				await page.keyboard.press('Escape')
				await expect.poll(() => picker.evaluate(select => select.matches(':open'))).toBe(false)
			}

			for (const effect of state.effects.filter(effect =>
				effect.name?.startsWith('select-compact-'),
			)) {
				expect(effect.timeline).toBe('ViewTimeline')

				for (const frame of effect.keyframes ?? []) {
					const properties = Object.keys(frame).filter(
						key => !['offset', 'computedOffset', 'easing', 'composite'].includes(key),
					)

					expect(
						properties.every(property =>
							['transform', 'translate', 'scale', 'opacity'].includes(property),
						),
						JSON.stringify(effect),
					).toBe(true)
				}
			}

			if (pose === 'compact') {
				expect(
					state.effects.some(
						effect => effect.name === 'select-compact-label' && effect.progress === 1,
					),
					'Admit fully compact native-clock pose before geometry assertions',
				).toBe(true)
				expect(Number(state.labelOpacity)).toBe(0)

				if (state.point.x > state.circle.x + state.circle.width + 2) {
					expect(
						state.hitSelect,
						'Invisible former label region must not remain a native select hit target beyond the visible compact circle',
					).toBe(false)
				}

				if (state.icon) {
					expect(
						Math.abs(
							state.icon.x + state.icon.width / 2 - (state.circle.x + state.circle.width / 2),
						),
					).toBeLessThanOrEqual(2)
					expect(
						Math.abs(
							state.icon.y + state.icon.height / 2 - (state.circle.y + state.circle.height / 2),
						),
					).toBeLessThanOrEqual(2)
				} else {
					expect(
						Number(state.picker.opacity),
						'The fallback chevron remains painted when no selected icon exists',
					).toBeGreaterThan(0)
				}
			}
		}
		const compactPose = states.at(-1)

		if (!compactPose) {
			throw new Error('Compact presentation observation is missing')
		}

		const compact = compactPose.state

		expect(compact.popupTransition.split(',').map(value => value.trim())).not.toContain('font-size')
		const center = {
			x: compact.circle.x + compact.circle.width / 2,
			y: compact.circle.y + compact.circle.height / 2,
		}

		expect(
			await page.evaluate(
				point =>
					document
						.elementFromPoint(point.x, point.y)
						?.closest('select')
						?.getAttribute('aria-label'),
				center,
			),
		).toBe('Wallet version')
		await page.mouse.click(center.x, center.y)
		await expect.poll(() => picker.evaluate(select => select.matches(':open'))).toBe(true)
		await info.attach('picker-native-popup-frame', {
			body: await page.screenshot(),
			contentType: 'image/png',
		})
		await page.keyboard.press('Escape')
		await expect.poll(() => picker.evaluate(select => select.matches(':open'))).toBe(false)
		await page.mouse.click(center.x, center.y)
		await expect.poll(() => picker.evaluate(select => select.matches(':open'))).toBe(true)
		await info.attach('picker-before-mobile-input-clock', {
			body: JSON.stringify(await inputClock()),
			contentType: 'application/json',
		})
		await page.keyboard.press('m')
		await page.keyboard.press('Enter')
		await info.attach('picker-after-mobile-input-clock', {
			body: JSON.stringify(await inputClock()),
			contentType: 'application/json',
		})
		await expect(picker).toHaveValue('MOBILE')
		await expect.poll(() => new URL(page.url()).searchParams.get('variant')).toBe('MOBILE')
		await expect(picker.locator('selectedcontent .select-label')).toHaveCSS('opacity', '0')
		await expect.poll(labelClock).toBe(true)
		const mobile = await test.step('Read admitted Mobile geometry once', sample)

		if (mobile.scroll === undefined) {
			throw new Error('Observed compact scroll position is missing')
		}

		await info.attach('picker-mobile-compact', {
			body: JSON.stringify(mobile),
			contentType: 'application/json',
		})
		await info.attach('picker-mobile-compact-frame', {
			body: await page.screenshot(),
			contentType: 'image/png',
		})

		if (!mobile.icon) {
			throw new Error('Selected Mobile option must paint its actual icon')
		}

		expect(
			Math.abs(mobile.icon.x + mobile.icon.width / 2 - (mobile.circle.x + mobile.circle.width / 2)),
		).toBeLessThanOrEqual(2)
		expect(
			Math.abs(
				mobile.icon.y + mobile.icon.height / 2 - (mobile.circle.y + mobile.circle.height / 2),
			),
		).toBeLessThanOrEqual(2)
		await picker.evaluate(select => select.blur())
		const idlePaint = await picker.evaluate(select => {
			const button = select.querySelector('button')

			if (!button) {
				throw new Error('Native base-select button is missing')
			}

			return {
				capBackground: getComputedStyle(select, '::before').backgroundImage,
				bridgeWidth: Number.parseFloat(getComputedStyle(select, '::picker-icon').borderTopWidth),
			}
		})

		await page.keyboard.press('Tab')
		await info.attach('picker-after-tab-clock', {
			body: JSON.stringify(await sample()),
			contentType: 'application/json',
		})
		await page.locator('#layout').evaluate(async (root, compactScroll) => {
			root.scrollTo({ top: compactScroll, behavior: 'instant' })
			await new Promise<void>(resolve =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			)
		}, mobile.scroll)
		await picker.evaluate(select => select.focus({ preventScroll: true }))
		await expect.poll(() => picker.evaluate(select => select.matches(':focus-visible'))).toBe(true)
		await expect
			.poll(labelClock, {
				message: 'Restored observed compact position reaches its native clock endpoint',
			})
			.toBe(true)
		const focusPose = await sample()

		await info.attach('picker-before-focus-admission', {
			body: JSON.stringify(focusPose),
			contentType: 'application/json',
		})

		expect(
			focusPose.effects.some(
				effect => effect.name === 'select-compact-label' && effect.progress === 1,
			),
			'Keyboard focus frame retains admitted compact clock pose',
		).toBe(true)
		const focusPaint = await picker.evaluate(select => {
			const style = getComputedStyle(select)
			const cap = getComputedStyle(select, '::before')
			const button = select.querySelector('button')

			if (!button) {
				throw new Error('Native base-select button is missing')
			}

			const bridge = getComputedStyle(select, '::picker-icon')
			const { x, y, width, height } = select.getBoundingClientRect()

			return {
				rect: { x, y, width, height },
				shadow: style.boxShadow,
				capBackground: cap.backgroundImage,
				bridgeWidth: Number.parseFloat(bridge.borderTopWidth),
				bridgeColor: bridge.borderTopColor,
			}
		})

		await info.attach('picker-keyboard-focus-paint', {
			body: JSON.stringify({ ...focusPaint, idlePaint, focusPose }),
			contentType: 'application/json',
		})
		await info.attach('picker-keyboard-focus-frame', {
			body: await page.screenshot(),
			contentType: 'image/png',
		})
		expect(focusPaint.bridgeWidth).toBeGreaterThan(idlePaint.bridgeWidth)
		expect(focusPaint.bridgeColor).not.toBe('rgba(0, 0, 0, 0)')
		expect(focusPaint.capBackground).toContain('radial-gradient')
		expect(focusPaint.capBackground).not.toBe(idlePaint.capBackground)

		if (focusPaint.rect.width > focusPaint.rect.height + 2) {
			expect(
				focusPaint.shadow,
				'Compact focus paint must not outline the invisible natural-width rectangle',
			).toBe('none')
		}
	})
}

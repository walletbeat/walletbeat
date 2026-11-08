import { expect, test } from '../../../tests/browser/verified-test'

for (const [direction, width] of [
	['ltr', 1006],
	['rtl', 690],
] as const) {
	test(`heading glyphs clear ordinary support throughout arrival (${direction})`, async ({
		page,
		browserName,
	}) => {
		test.skip(browserName !== 'chromium', 'Native pseudo-element geometry requires CDP')
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		test.skip(
			!(await page.evaluate(() => 'CSSFunctionRule' in window)),
			'Native CSS functions unavailable',
		)
		await page.evaluate(async direction => {
			document.documentElement.dir = direction
			const root = document.querySelector<HTMLElement>('#layout')!

			root.style.scrollSnapType = 'none'
			root.style.scrollBehavior = 'auto'
			await document.fonts.ready
			await new Promise<void>(resolve =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			)
		}, direction)
		const cdp = await page.context().newCDPSession(page)
		const { root } = await cdp.send('DOM.getDocument')

		for (const id of ['security-audits-and-bounties', 'scam-prevention']) {
			const selector = `#${id} h3[data-sticky-breadcrumb~="item"] > a > [data-icon]`

			await expect(page.locator(selector)).toHaveCount(1)
			const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })
			const { node } = await cdp.send('DOM.describeNode', { nodeId })

			expect(node.pseudoElements).toHaveLength(2)
			const interval = await page.locator(selector).evaluate(icon => {
				const item = icon.closest('[data-sticky-breadcrumb~="item"]')!
				const animation = item
					.getAnimations()
					.find(a => a instanceof CSSAnimation && a.animationName === 'breadcrumb-arrival')

				if (!(animation?.timeline instanceof ViewTimeline)) {
					throw Error('Native arrival timeline required')
				}

				const timeline = animation.timeline
				const subject = timeline.subject
				const start = timeline.startOffset.to('px').value
				const height = subject.getBoundingClientRect().height
				const view = timeline.endOffset.to('px').value - start - height

				return { start: start + Math.min(height, view), length: Math.abs(height - view) }
			})

			expect(interval.length).toBeGreaterThan(0)

			const delivered = new Set<number>()

			for (let offset = 0; offset <= Math.ceil(interval.length); offset++) {
				const observation = await page.locator(selector).evaluate(async (icon, scroll) => {
					const root = document.querySelector('#layout')!

					root.scrollTop = scroll
					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
					const support = icon
						.closest('[data-sticky-breadcrumb~="scope"]')!
						.querySelector('[data-sticky-breadcrumb~="support"]')!
					const range = document.createRange()

					range.selectNodeContents(support)

					return {
						scroll: root.scrollTop,
						text: [...range.getClientRects()]
							.filter(r => r.width > 0 && r.height > 0)
							.map(r => ({
								left: r.left,
								right: r.right,
								top: r.top,
								bottom: r.bottom,
							})),
						glyphs: ['before', 'after'].map(pseudo => {
							const s = getComputedStyle(icon, `::${pseudo}`)

							return {
								pseudo,
								active: s.animationName.includes('breadcrumb-icon-support-motion'),
								opacity: Number(s.opacity),
								font: parseFloat(s.fontSize),
								width: parseFloat(s.width),
								height: parseFloat(s.height),
								minX: Number(s.getPropertyValue('---icon-ink-minX')),
								maxX: Number(s.getPropertyValue('---icon-ink-maxX')),
								top: Number(s.getPropertyValue('---icon-ink-top')),
								inkHeight: Number(s.getPropertyValue('---icon-ink-height')),
							}
						}),
					}
				}, interval.start + offset)

				expect(Math.abs(observation.scroll - (interval.start + offset))).toBeLessThanOrEqual(0.51)
				delivered.add(observation.scroll)
				expect(observation.text.length, 'Visible support geometry required').toBeGreaterThan(0)
				expect(
					observation.glyphs.some(glyph => glyph.opacity > 0),
					'Visible glyph required',
				).toBe(true)

				for (const glyph of observation.glyphs) {
					expect(glyph.active, 'Compiled correction must participate').toBe(true)
					expect(
						[
							glyph.opacity,
							glyph.font,
							glyph.width,
							glyph.height,
							glyph.minX,
							glyph.maxX,
							glyph.top,
							glyph.inkHeight,
						].every(Number.isFinite),
						'Finite native metrics required',
					).toBe(true)
					expect(
						[glyph.font, glyph.width, glyph.height, glyph.inkHeight].every(value => value > 0),
						'Positive native dimensions required',
					).toBe(true)
					expect(glyph.maxX).toBeGreaterThan(glyph.minX)

					if (glyph.opacity === 0) {
						continue
					}

					const pseudo = node.pseudoElements!.find(p => p.pseudoType === glyph.pseudo)!
					const { model } = await cdp.send('DOM.getBoxModel', {
						backendNodeId: pseudo.backendNodeId,
					})
					const q = model.content

					expect(q.every(Number.isFinite)).toBe(true)
					expect(q[2]).toBeGreaterThan(q[0])
					expect(q[7]).toBeGreaterThan(q[1])
					// Used dimensions retain fractions that CDP's integer width/height omit.
					const sx = (q[2] - q[0]) / glyph.width,
						sy = (q[7] - q[1]) / glyph.height
					const left = q[0] + glyph.font * glyph.minX * sx,
						right = q[0] + glyph.font * glyph.maxX * sx
					const top = q[1] + glyph.font * glyph.top * sy,
						bottom = top + glyph.font * glyph.inkHeight * sy

					for (const text of observation.text) {
						const overlap =
							Math.min(right, text.right) > Math.max(left, text.left) &&
							Math.min(bottom, text.bottom) > Math.max(top, text.top)

						expect(overlap, `${id} ${glyph.pseudo}, scroll offset ${offset}`).toBe(false)
					}
				}
			}
			expect(delivered.size, 'Each requested pixel must produce a distinct position').toBe(
				Math.ceil(interval.length) + 1,
			)
		}
		await cdp.detach()
	})
}

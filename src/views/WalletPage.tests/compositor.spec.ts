import { expect, test } from '../../../tests/browser/verified-test'

test('Chromium exposes accelerated glyph layers at native heading arrival phases', async ({
	page,
	browserName,
}, info) => {
	test.skip(browserName !== 'chromium', 'Compositor layer attribution requires Chromium CDP')
	await page.goto('/metamask/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	await page.addStyleTag({
		content:
			'#layout { scroll-snap-type: none !important; scroll-behavior: auto !important; overflow-anchor: none !important; }',
	})
	const session = await page.context().newCDPSession(page)
	let layers: { layerId: string; backendNodeId?: number }[] = []

	session.on('LayerTree.layerTreeDidChange', event => {
		layers = event.layers ?? []
	})
	await session.send('Page.enable')
	await session.send('DOM.enable')
	await session.send('LayerTree.enable')
	const captures = []

	for (const width of [390, 933, 1400]) {
		await page.setViewportSize({ width, height: 1203 })

		for (const direction of ['ltr', 'rtl']) {
			await page.evaluate(direction => {
				document.documentElement.dir = direction
			}, direction)

			for (const id of ['security', 'private-transfers']) {
				const selector = `:is(#${id} > [data-sticky-breadcrumb~="position"], #${id} > details > [data-sticky-breadcrumb~="position"]) [data-sticky-breadcrumb~="source"] [data-icon]`

				await expect(page.locator(selector)).toHaveCount(1)
				const tree = await session.send('DOM.getDocument', { depth: 0 })
				const found = await session.send('DOM.querySelector', {
					nodeId: tree.root.nodeId,
					selector,
				})

				expect(found.nodeId, `${id}: source glyph must exist`).not.toBe(0)
				const { node } = await session.send('DOM.describeNode', { nodeId: found.nodeId, depth: 1 })
				const glyphs = (node.pseudoElements ?? []).filter(pseudo =>
					['before', 'after'].includes(pseudo.pseudoType ?? ''),
				)

				expect(glyphs.map(glyph => glyph.pseudoType).sort()).toEqual(['after', 'before'])
				const poses = []

				for (const fraction of [0.2, 0.5, 0.8]) {
					const pose = await page.evaluate(
						async ({ id, fraction }) => {
							const scope = document.getElementById(id)
							const root = document.getElementById('layout')
							const position = scope?.querySelector<HTMLElement>(
								':scope > [data-sticky-breadcrumb~="position"], :scope > details > [data-sticky-breadcrumb~="position"]',
							)
							const icon = position?.querySelector('[data-sticky-breadcrumb~="source"] [data-icon]')

							if (!scope || !root || !position || !icon) {
								throw new Error('Heading ownership is missing')
							}

							const motion = icon
								.getAnimations({ subtree: true })
								.find(
									(animation): animation is CSSAnimation =>
										animation instanceof CSSAnimation &&
										animation.animationName === 'breadcrumb-icon-motion',
								)
							const timeline = motion?.timeline

							if (
								!(timeline instanceof ViewTimeline) ||
								timeline.source !== root ||
								!timeline.subject ||
								!timeline.startOffset ||
								!timeline.endOffset
							) {
								throw new Error('The heading must own a resolved native view timeline')
							}

							const style = getComputedStyle(icon, '::before')

							if (
								!style
									.getPropertyValue('animation-range-start')
									.split(',')
									.every(value => /^exit-crossing(?: 0%)?$/.test(value.trim())) ||
								!style
									.getPropertyValue('animation-range-end')
									.split(',')
									.every(value => /^contain(?: 100%)?$/.test(value.trim()))
							) {
								throw new Error(
									'The native range requires a different phase derivation: ' +
										style.getPropertyValue('animation-range-start') +
										' / ' +
										style.getPropertyValue('animation-range-end'),
								)
							}

							const coverStart = timeline.startOffset.to('px').value
							const coverEnd = timeline.endOffset.to('px').value
							const subjectStyle = getComputedStyle(timeline.subject)

							if (timeline.axis !== 'block' || !subjectStyle.writingMode.startsWith('horizontal')) {
								throw new Error(
									'The phase derivation requires a horizontal writing mode and block timeline',
								)
							}

							const edges = [
								'padding-top',
								'padding-bottom',
								'border-top-width',
								'border-bottom-width',
							].reduce(
								(sum, property) => sum + parseFloat(subjectStyle.getPropertyValue(property)),
								0,
							)
							const subjectSize =
								parseFloat(subjectStyle.height) +
								(subjectStyle.boxSizing === 'border-box' ? 0 : edges)

							if (!Number.isFinite(subjectSize)) {
								throw new Error('The timeline subject layout size is unresolved')
							}

							const arrivalStart = coverEnd - subjectSize
							const arrivalEnd = coverStart + subjectSize

							if (!(arrivalEnd > arrivalStart)) {
								throw new Error('Compaction must have a positive native range')
							}

							const requested = arrivalStart + (arrivalEnd - arrivalStart) * fraction

							root.scrollTo({
								top: requested,
								behavior: 'instant',
							})

							for (let frame = 0; frame < 4; frame++) {
								await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
							}

							return {
								requested,
								scroll: root.scrollTop,
								deliveredFraction: (root.scrollTop - arrivalStart) / (arrivalEnd - arrivalStart),
								animations: icon
									.getAnimations({ subtree: true })
									.filter(
										animation =>
											animation instanceof CSSAnimation &&
											animation.animationName === 'breadcrumb-icon-motion',
									)
									.map(animation => ({
										pseudo:
											animation.effect instanceof KeyframeEffect
												? animation.effect.pseudoElement
												: null,
										progress: animation.effect?.getComputedTiming().progress,
									})),
							}
						},
						{ id, fraction },
					)

					expect(
						pose.animations.every(
							animation =>
								typeof animation.progress === 'number' &&
								animation.progress > 0 &&
								animation.progress < 1,
						),
						`${id}: every requested phase must be active`,
					).toBe(true)
					expect(pose.animations.map(animation => animation.pseudo).sort()).toEqual([
						'::after',
						'::before',
					])

					expect(
						Math.abs(pose.scroll - pose.requested),
						`${id}: requested pose attained`,
					).toBeLessThanOrEqual(1)

					for (const animation of pose.animations) {
						expect(Math.abs((animation.progress ?? 0) - pose.deliveredFraction)).toBeLessThan(0.02)
					}
					// A paint flush delivers the layer inventory; this is eligibility evidence, not a frame-rate measurement.
					await page.screenshot()
					const afterPaint = await page.locator(selector).evaluate(icon => ({
						scroll: document.getElementById('layout')?.scrollTop,
						progress: icon
							.getAnimations({ subtree: true })
							.filter(
								animation =>
									animation instanceof CSSAnimation &&
									animation.animationName === 'breadcrumb-icon-motion',
							)
							.map(animation => animation.effect?.getComputedTiming().progress),
					}))

					expect(afterPaint.scroll).toBe(pose.scroll)
					expect(afterPaint.progress).toHaveLength(2)

					for (const progress of afterPaint.progress) {
						expect(Math.abs((progress ?? 0) - pose.deliveredFraction)).toBeLessThan(0.02)
					}
					expect(
						layers.length,
						'Layer instrumentation must produce a positive inventory',
					).toBeGreaterThan(0)
					const reasons = []

					for (const glyph of glyphs) {
						const layer = layers.find(layer => layer.backendNodeId === glyph.backendNodeId)

						expect(
							layer,
							`${id}::${glyph.pseudoType}: no dedicated glyph layer proof; inspect possible ancestor coalescing before classifying a product failure`,
						).toBeDefined()

						if (!layer) {
							throw new Error('The active glyph layer is missing')
						}

						const reason = await session.send('LayerTree.compositingReasons', {
							layerId: layer.layerId,
						})

						expect(reason.compositingReasonIds).toContain('ActiveTransformAnimation')
						expect(reason.compositingReasonIds).toContain('ActiveOpacityAnimation')
						reasons.push({
							pseudo: glyph.pseudoType,
							layerId: layer.layerId,
							reasons: reason.compositingReasonIds,
						})
					}
					poses.push({ fraction, ...pose, afterPaint, reasons })
				}
				expect(poses.length, `${id}: all three intermediate phases must be captured`).toBe(3)
				captures.push({ width, direction, id, poses })
			}
		}
	}
	await info.attach('compositor-layers', {
		body: JSON.stringify(captures, null, 2),
		contentType: 'application/json',
	})
	await session.detach()
})

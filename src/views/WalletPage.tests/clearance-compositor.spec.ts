import { gzipSync } from 'node:zlib'

import {
	finishChromeTrace,
	summarizeChromeTrace,
} from '../../../tests/browser/performance-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'
import { isRecord } from '../../utils/json'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test(`clearance paint reports no competing transform failure at arrival: ${reducedMotion}`, async ({
		page,
		browserName,
	}, info) => {
		test.skip(
			browserName !== 'chromium',
			'Native compositor failure attribution requires Chromium CDP',
		)
		test.setTimeout(180000)
		await page.emulateMedia({ reducedMotion })
		await page.setViewportSize({ width: 390, height: 900 })
		const cdp = await page.context().newCDPSession(page)
		const complete = new Promise<{ stream?: string }>(resolve =>
			cdp.once('Tracing.tracingComplete', resolve),
		)

		await cdp.send('Tracing.start', {
			transferMode: 'ReturnAsStream',
			categories: 'blink.animations,devtools.timeline,disabled-by-default-devtools.timeline',
			options: 'record-as-much-as-possible',
		})
		let tracing = true
		const poses = []
		const errors: unknown[] = []

		try {
			await page.goto('/metamask/?variant=BROWSER')
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(() => document.fonts.ready)
			const selector = '#transaction-legibility [data-collapsible-marker]'

			await expect(page.locator(selector)).toHaveCount(1)
			await cdp.send('DOM.enable')
			const documentNode = await cdp.send('DOM.getDocument', { depth: 0 })
			const selected = await cdp.send('DOM.querySelector', {
				nodeId: documentNode.root.nodeId,
				selector,
			})
			const described = await cdp.send('DOM.describeNode', { nodeId: selected.nodeId })
			const backendNodeId = described.node.backendNodeId
			const range = await page.evaluate(selector => {
				const root = document.getElementById('layout')!

				root.style.scrollSnapType = 'none'
				root.style.scrollBehavior = 'auto'
				const marker = document.querySelector(selector)!
				const motion = marker
					.getAnimations()
					.find(a => a instanceof CSSAnimation && a.animationName === 'breadcrumb-clearance-block')
				const rangeText = (value: unknown) => {
					if (typeof value === 'string') {
						return value
					}

					if (
						!value ||
						typeof value !== 'object' ||
						!('rangeName' in value) ||
						typeof value.rangeName !== 'string' ||
						!('offset' in value) ||
						!(value.offset instanceof CSSUnitValue) ||
						value.offset.unit !== 'percent'
					) {
						throw Error('Native range must have a named percentage offset')
					}

					return `${value.rangeName} ${value.offset.value}%`
				}

				if (
					!motion ||
					!('rangeStart' in motion) ||
					!('rangeEnd' in motion) ||
					rangeText(motion.rangeStart) !== 'exit-crossing 0%' ||
					rangeText(motion.rangeEnd) !== 'contain 100%'
				) {
					throw Error('Native block range requires a different arrival derivation')
				}

				const timeline = motion?.timeline

				if (
					!(timeline instanceof ViewTimeline) ||
					timeline.source !== root ||
					!timeline.subject ||
					!timeline.startOffset ||
					!timeline.endOffset
				) {
					throw Error('Actual marker requires its resolved native block clock')
				}

				const style = getComputedStyle(timeline.subject)
				const edges = (
					['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'] as const
				).reduce((sum, key) => sum + parseFloat(style[key]), 0)
				const height = parseFloat(style.height) + (style.boxSizing === 'border-box' ? 0 : edges)
				const start = timeline.endOffset.to('px').value - height
				const end = timeline.startOffset.to('px').value + height

				if (
					timeline.axis !== 'block' ||
					!style.writingMode.startsWith('horizontal') ||
					!Number.isFinite(start) ||
					!(end > start)
				) {
					throw Error('Unsupported native arrival domain')
				}

				return { start, end }
			}, selector)

			for (const fraction of [0.2, 0.5, 0.8, 0.5, 0.2]) {
				poses.push(
					await page.evaluate(
						async ({ selector, fraction, range }) => {
							const root = document.getElementById('layout')!

							root.scrollTo({
								top: range.start + fraction * (range.end - range.start),
								behavior: 'instant',
							})
							await new Promise<void>(resolve =>
								requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
							)
							const marker = document.querySelector(selector)!
							const box = marker.getBoundingClientRect()
							const effects = marker
								.getAnimations()
								.filter(
									(a): a is CSSAnimation =>
										a instanceof CSSAnimation &&
										a.animationName.startsWith('breadcrumb-clearance-'),
								)
								.map(a => ({
									name: a.animationName,
									progress: a.effect?.getComputedTiming().progress,
								}))

							return {
								fraction,
								scroll: root.scrollTop,
								box: { top: box.top, bottom: box.bottom, width: box.width, height: box.height },
								effects,
								visible: marker.checkVisibility() && box.bottom > 0 && box.top < innerHeight,
							}
						},
						{ selector, fraction, range },
					),
				)
			}
			expect(poses.every(p => p.visible && p.box.width > 0 && p.box.height > 0)).toBe(true)

			for (const name of ['breadcrumb-clearance-inline', 'breadcrumb-clearance-block']) {
				expect(
					poses.every(p =>
						p.effects.some(
							a =>
								a.name === name &&
								typeof a.progress === 'number' &&
								Number.isFinite(a.progress) &&
								a.progress > 0 &&
								a.progress < 1,
						),
					),
					`${name} must participate at each sampled arrival pose`,
				).toBe(true)
			}
			expect(poses[2].scroll).toBeGreaterThan(poses[0].scroll)
			expect(poses[4].scroll).toBeLessThan(poses[2].scroll)
			tracing = false
			const trace = await finishChromeTrace(cdp, complete)
			const summary = summarizeChromeTrace(JSON.parse(trace.toString()))

			await info.attach('clearance-compositor-trace', {
				body: gzipSync(trace),
				contentType: 'application/gzip',
			})
			await info.attach('clearance-compositor-observation', {
				body: JSON.stringify({
					reducedMotion,
					backendNodeId,
					poses,
					summary,
					limitation:
						'Chromium emits failure reports, not success reports. Absence of failure is not proof of compositor execution; native stalled-scroll paint is a separate witness.',
				}),
				contentType: 'application/json',
			})
			const actors = summary.animationCompositing.actors.filter(actor =>
				actor.starts.some(start => {
					const data = start.data

					return (
						isRecord(data) &&
						typeof data['displayName'] === 'string' &&
						data['displayName'].startsWith('breadcrumb-clearance-') &&
						!data['displayName'].includes('measure')
					)
				}),
			)
			const selectedActors = actors.filter(actor =>
				actor.starts.some(
					start =>
						isRecord(start.data) &&
						start.data['nodeId'] === backendNodeId &&
						start.data['displayName'] === 'breadcrumb-clearance-inline',
				),
			)

			expect(
				selectedActors.length,
				'Selected visible marker must join a native clearance paint trace actor',
			).toBeGreaterThan(0)
			expect(
				actors.length,
				'Trace must contain actual native clearance paint actors',
			).toBeGreaterThan(0)
			expect(
				actors.flatMap(actor => actor.reports).length,
				'Native compositor reports must be available',
			).toBeGreaterThan(0)
			expect(
				actors
					.flatMap(actor => actor.reports)
					.filter(report => typeof report.flags === 'number' && (report.flags & 64) !== 0),
				'No observed competing-transform failure',
			).toEqual([])
		} catch (error) {
			errors.push(error)
		} finally {
			if (tracing) {
				try {
					const trace = await finishChromeTrace(cdp, complete)

					await info.attach('clearance-compositor-failed-trace', {
						body: gzipSync(trace),
						contentType: 'application/gzip',
					})
				} catch (error) {
					errors.push(error)
				}
			}

			try {
				await cdp.detach()
			} catch (error) {
				errors.push(error)
			}
		}

		if (errors.length) {
			throw new AggregateError(errors, 'Clearance trace or cleanup failed')
		}
	})
}

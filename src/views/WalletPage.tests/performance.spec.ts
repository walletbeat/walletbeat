import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { gzipSync } from 'node:zlib'

import {
	finishChromeTrace,
	finishPerformanceObservation,
	installPerformanceObservation,
	markPerformanceProfile,
	summarizeChromeTrace,
} from '../../../tests/browser/performance-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

test.describe('constrained mobile performance observations after structural acceptance', () => {
	test.skip(
		!process.env.WALLET_PAGE_FIRST_PASS,
		'Performance work requires an explicitly supplied, current-source structural first-pass report',
	)
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'The constrained Android-browser profile uses native Chromium CDP',
	)
	test.use({
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		isMobile: true,
		deviceScaleFactor: 1,
	})

	test('native touch scrolling and responsiveness under 6x CPU constraint', async ({
		page,
		context,
		browser,
		source,
	}, info) => {
		const firstPass: unknown = JSON.parse(
			await readFile(process.env.WALLET_PAGE_FIRST_PASS!, 'utf8'),
		)

		if (
			!firstPass ||
			typeof firstPass !== 'object' ||
			!('source' in firstPass) ||
			!('firstPassComplete' in firstPass) ||
			!('contractHash' in firstPass)
		) {
			throw new Error('Structural acceptance must contain source, completion and contract identity')
		}

		expect(firstPass.source, 'Structural acceptance must belong to this exact source').toEqual(
			source,
		)
		expect(
			firstPass.firstPassComplete,
			'All structural obligations must precede performance profiling',
		).toBe(true)
		const contract = await readFile(
			new URL('../../../tests/browser/wallet-page-requirements.md', import.meta.url),
			'utf8',
		)

		expect(firstPass.contractHash).toBe(createHash('sha256').update(contract).digest('hex'))
		const browserSession = await browser.newBrowserCDPSession()
		const captureMetadata: Record<string, unknown> = {
			requestedRealChromeHeaded: info.project.name === 'performance-chrome-headed',
			project: info.project.name,
			channel: info.project.use.channel ?? 'playwright-default',
			headless: info.project.use.headless ?? true,
			platform: process.platform,
			architecture: process.arch,
			cpuSlowdown: 6,
			emulatedMobile: true,
		}

		try {
			for (const method of [
				'Browser.getVersion',
				'Browser.getBrowserCommandLine',
				'SystemInfo.getInfo',
			] as const) {
				try {
					captureMetadata[method] = await browserSession.send(method)
				} catch (error) {
					captureMetadata[method] = { unavailable: String(error) }
				}
			}
		} finally {
			await browserSession.detach()
		}

		await info.attach('native-browser-gpu-metadata', {
			body: JSON.stringify({
				...captureMetadata,
				interpretation:
					'GPU feature status, renderer and actual launch arguments determine the rendering path. A Chrome channel or requested headed mode alone does not establish hardware compositing. CPU throttling does not emulate a low-end GPU. Missing metadata remains unknown; performance acceptance requires trace and visual assessment.',
			}),
			contentType: 'application/json',
		})
		await page.addInitScript(installPerformanceObservation)
		const cdp = await context.newCDPSession(page)

		await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
		await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
		const tracePath = info.outputPath('chrome-performance-trace.json')
		const tracingComplete = new Promise<{ stream?: string }>(resolve =>
			cdp.once('Tracing.tracingComplete', resolve),
		)

		await cdp.send('Tracing.start', {
			transferMode: 'ReturnAsStream',
			categories:
				'blink.animations,devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,blink.user_timing,cc,benchmark,gpu,viz',
			options: 'record-as-much-as-possible',
		})
		const gestures: unknown[] = []
		let touchActive = false
		const swipe = async (up: boolean) => {
			const before = await page
				.locator('#layout')
				.evaluate(element => ({ top: element.scrollTop, clock: performance.now() }))
			const x = 150
			const start = up ? 660 : 220
			const end = up ? 220 : 660

			await cdp.send('Input.dispatchTouchEvent', {
				type: 'touchStart',
				touchPoints: [{ x, y: start, radiusX: 4, radiusY: 4, force: 1, id: 0 }],
			})
			touchActive = true

			for (let step = 1; step <= 12; step++) {
				await delay(16)
				await cdp.send('Input.dispatchTouchEvent', {
					type: 'touchMove',
					touchPoints: [
						{ x, y: start + ((end - start) * step) / 12, radiusX: 4, radiusY: 4, force: 1, id: 0 },
					],
				})
			}
			await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
			touchActive = false
			await expect
				.poll(() => page.locator('#layout').evaluate(element => element.scrollTop), {
					message: 'Native touch input must produce real root scrolling',
				})
				.not.toBe(before.top)
			const after = await page
				.locator('#layout')
				.evaluate(element => ({ top: element.scrollTop, clock: performance.now() }))

			gestures.push({
				direction: up ? 'forward' : 'reverse',
				before,
				after,
				commandedDurationMs: 192,
				nativeInput: 'CDP Input.dispatchTouchEvent',
				programmaticScroll: false,
			})
		}

		try {
			await page.goto('/__wallet-page/software/')
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(() => document.fonts.ready)
			// Warmup uses the same native input path and remains identifiable in the trace.
			await swipe(true)
			await swipe(false)
			await page.evaluate(markPerformanceProfile)

			for (const direction of [true, true, true, false, false, true]) {
				await swipe(direction)
			}
			const toc = page.getByRole('button', { name: 'Table of contents', exact: true })
			const controlStart = await page.evaluate(() => performance.now())

			await toc.tap()
			await expect(
				page.getByRole('navigation', { name: 'Table of contents', exact: true }),
			).toBeVisible()
			const controlEnd = await page.evaluate(() => performance.now())

			await page.keyboard.press('Escape')
			await expect(
				page.getByRole('navigation', { name: 'Table of contents', exact: true }),
			).toHaveCount(0)
			const observations = await page.evaluate(finishPerformanceObservation)

			await info.attach('native-mobile-observations', {
				body: JSON.stringify({
					status: 'unverified',
					profile: {
						engine: 'chromium',
						browserVersion: browser.version(),
						viewport: { width: 390, height: 844 },
						touch: true,
						cpuSlowdown: 6,
						emulated: true,
						hostContentionControlled: false,
					},
					gestures,
					controlResponse: {
						start: controlStart,
						end: controlEnd,
						observedMs: controlEnd - controlStart,
					},
					observations,
					acceptance:
						'Native root scrolling and TOC responsiveness are asserted. Frame pacing, smoothness and low-end-browser performance remain unverified pending trace/visual assessment under a controlled comparison; no universal FPS threshold is inferred.',
				}),
				contentType: 'application/json',
			})
			await info.attach('contract-evidence', {
				body: JSON.stringify({
					contractHash: createHash('sha256').update(contract).digest('hex'),
					engine: 'chromium',
					results: ['⚡ Smoothness', '⚡ FramePacing', '⚡ Android'].map(id => ({
						id,
						status: 'unverified',
						complete: false,
						mobileProfile: { touch: true, cpuSlowdown: 6, emulated: true },
						evidence:
							'Native constrained Chromium touch journey and Chrome rendering trace collected; measurements alone do not certify performance acceptance.',
					})),
				}),
				contentType: 'application/json',
			})
		} finally {
			try {
				try {
					if (touchActive) {
						await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
					}
				} finally {
					const trace = await finishChromeTrace(cdp, tracingComplete)

					await writeFile(tracePath, trace)
					await info.attach('native-chrome-performance-trace', {
						path: tracePath,
						contentType: 'application/json',
					})
					await info.attach('native-chrome-rendering-reasons', {
						body: JSON.stringify({
							...summarizeChromeTrace(JSON.parse(trace.toString())),
							captureScope:
								'Load, warmup and measured interactions; wallet-page-performance-profile marks the measured interaction boundary.',
						}),
						contentType: 'application/json',
					})
				}
			} finally {
				try {
					await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
				} finally {
					await cdp.detach()
				}
			}
		}
	})
})

test.describe('native window resize diagnostics', () => {
	test.skip(
		!process.env.WALLET_PAGE_NATIVE_RESIZE,
		'Opt in to native resize capture independently of full performance acceptance',
	)
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'Native window bounds and rendering traces use Chromium CDP',
	)
	test.skip(({ headless }) => headless, 'Native browser-window capture requires --headed')
	test.use({ viewport: null })

	// A unique terminal width prevents an earlier frame from satisfying final capture admission.
	const journeys = [
		{
			name: 'within desktop',
			start: 1100,
			widths: [1150, 1100, 1130, 1160, 1110, 1140, 1120, 1100, 1170],
		},
		{
			name: 'across responsive breakpoints',
			start: 1100,
			widths: [690, 1100, 960, 800, 690, 540, 800, 1000, 1150],
		},
		{ name: 'within mobile', start: 690, widths: [720, 690, 700, 720, 710, 690, 720, 700, 715] },
	]

	for (const journey of journeys) {
		for (const manualScroll of [false, true]) {
			test(`${journey.name}, ${manualScroll ? 'user-scrolled' : 'retained fragment'}`, async ({
				page,
				context,
				browser,
			}, info) => {
				const cdp = await context.newCDPSession(page)
				const host = await browser.newBrowserCDPSession()
				let restoreWindow: (() => Promise<void>) | undefined

				try {
					expect(
						[journey.start, ...journey.widths.slice(0, -1)],
						'Terminal frame identity must be distinct from earlier requested widths',
					).not.toContain(journey.widths.at(-1))
					const { targetInfo } = await cdp.send('Target.getTargetInfo')
					const { windowId } = await host.send('Browser.getWindowForTarget', {
						targetId: targetInfo.targetId,
					})
					const { bounds } = await host.send('Browser.getWindowBounds', { windowId })

					expect(bounds.windowState, 'Native resize requires a normal browser window').toBe(
						'normal',
					)

					restoreWindow = async () => {
						await host.send('Browser.setWindowBounds', {
							windowId,
							bounds: {
								left: bounds.left,
								top: bounds.top,
								width: bounds.width,
								height: bounds.height,
							},
						})
					}
					const commands: { width: number; start: number; acknowledged: number }[] = []
					const frames: {
						received: number
						metadata: { deviceWidth: number; deviceHeight: number; timestamp?: number }
						data: string
					}[] = []
					const resize = async (width: number) => {
						const start = Date.now()

						await host.send('Browser.setWindowBounds', {
							windowId,
							bounds: { width, height: 1000 },
						})
						commands.push({ width, start, acknowledged: Date.now() })
					}

					await resize(journey.start)
					await page.goto('/metamask/?variant=BROWSER#security')
					await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
					await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')
					await page.bringToFront()
					await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('visible')

					let manualAdmission: { x: number; y: number; before: number; after: number } | undefined

					if (manualScroll) {
						const point = await page
							.locator('#security h2')
							.first()
							.evaluate(heading => {
								const root = document.querySelector('#layout')

								if (!root || !root.contains(heading)) {
									throw new Error('Heading lacks the real scroll owner')
								}

								const box = heading.getBoundingClientRect()
								const x = box.left + box.width / 2
								const y = box.top + box.height / 2
								const hit = document.elementFromPoint(x, y)

								if (!hit || !heading.contains(hit)) {
									throw new Error('Root wheel target is occluded')
								}

								for (
									let node: Element | null = hit;
									node && node !== root;
									node = node.parentElement
								) {
									if (
										/auto|scroll/.test(getComputedStyle(node).overflowY) &&
										node.scrollHeight > node.clientHeight + 1
									) {
										throw new Error('Wheel target belongs to a nested scroller')
									}
								}

								return { x, y, before: root.scrollTop }
							})

						await page.mouse.move(point.x, point.y)
						await page.mouse.wheel(0, 160)
						await expect
							.poll(() => page.locator('#layout').evaluate(root => root.scrollTop), {
								message: 'Manual mode requires actual native root movement',
							})
							.not.toBe(point.before)
						manualAdmission = {
							...point,
							after: await page.locator('#layout').evaluate(root => root.scrollTop),
						}
					}

					let previous = ''
					let stable = 0

					await expect
						.poll(
							async () => {
								const current = await page.evaluate(() =>
									JSON.stringify({
										width: innerWidth,
										height: innerHeight,
										scroll: document.querySelector('#layout')?.scrollTop,
									}),
								)

								stable = current === previous ? stable + 1 : 0
								previous = current

								return stable
							},
							{
								intervals: [100],
								message: 'Native initial viewport and root scrolling settle before capture',
							},
						)
						.toBeGreaterThanOrEqual(3)
					const initial = await page.evaluate(() => ({
						width: innerWidth,
						height: innerHeight,
						dpr: devicePixelRatio,
						visibility: document.visibilityState,
						focused: document.hasFocus(),
						scroll: document.querySelector('#layout')?.scrollTop,
					}))

					expect(initial.width).toBe(journey.start)
					commands.length = 0
					cdp.on('Page.screencastFrame', frame => {
						frames.push({ received: Date.now(), metadata: frame.metadata, data: frame.data })
						void cdp
							.send('Page.screencastFrameAck', { sessionId: frame.sessionId })
							.catch(() => undefined)
					})
					const completed = new Promise<{ stream?: string }>(resolve =>
						host.once('Tracing.tracingComplete', resolve),
					)

					await host.send('Tracing.start', {
						transferMode: 'ReturnAsStream',
						categories: 'devtools.timeline,blink.user_timing',
						options: 'record-as-much-as-possible',
					})

					try {
						await cdp.send('Page.startScreencast', {
							format: 'jpeg',
							quality: 45,
							everyNthFrame: 1,
						})
						await host.send('Tracing.recordClockSyncMarker', { syncId: 'resize-idle-start' })
						await delay(600)

						for (const [index, width] of journey.widths.entries()) {
							await host.send('Tracing.recordClockSyncMarker', {
								syncId: `resize-width-${index}-${width}`,
							})
							await resize(width)
							await delay(index === 0 ? 1200 : 80)
						}
						await host.send('Tracing.recordClockSyncMarker', { syncId: 'resize-settle-start' })
						await delay(1800)
						await host.send('Tracing.recordClockSyncMarker', { syncId: 'resize-end' })
					} finally {
						try {
							const trace = await finishChromeTrace(host, completed)

							await info.attach('native-resize-trace', {
								body: gzipSync(trace),
								contentType: 'application/gzip',
							})
							await info.attach('native-resize-observations', {
								body: JSON.stringify({
									status: 'unverified',
									journey: journey.name,
									manualScroll,
									browser: browser.version(),
									initial,
									...summarizeChromeTrace(JSON.parse(trace.toString())),
									interpretation:
										'Native bounds changes and passive browser frames are collected without geometry reads during the timed journey. Frame arrivals do not establish physical display deadlines. Trace and visual review, source-equivalent comparisons and independent final layout/navigation checks remain required for performance acceptance. No presentation-altering control is a passing causal comparison.',
								}),
								contentType: 'application/json',
							})
						} finally {
							try {
								await cdp.send('Page.stopScreencast')
							} finally {
								await info.attach('native-resize-frames', {
									body: gzipSync(JSON.stringify(frames)),
									contentType: 'application/gzip',
								})
								await info.attach('native-resize-inputs', {
									body: JSON.stringify({
										initial,
										manualAdmission,
										windowBounds: bounds,
										commands,
										frameMetadata: frames.map(({ received, metadata }) => ({ received, metadata })),
									}),
									contentType: 'application/json',
								})
							}
						}
					}

					expect(commands.map(command => command.width)).toEqual(journey.widths)
					expect(
						frames.length,
						'Native resize capture must contain browser frames',
					).toBeGreaterThan(1)
					expect(
						frames.some(frame => frame.metadata.deviceWidth === journey.widths.at(-1)),
						'Capture must include a frame at the final resized width',
					).toBe(true)
					await expect.poll(() => page.evaluate(() => innerWidth)).toBe(journey.widths.at(-1))
					await info.attach('native-resize-final-paint', {
						body: await page.screenshot(),
						contentType: 'image/png',
					})
				} finally {
					try {
						await restoreWindow?.()
					} finally {
						await Promise.all([host.detach(), cdp.detach()])
					}
				}
			})
		}
	}
})

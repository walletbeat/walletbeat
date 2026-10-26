import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

import {
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
		let missingTraceStream: boolean
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
			if (touchActive) {
				await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
			}

			await cdp.send('Tracing.end')
			const { stream } = await tracingComplete

			missingTraceStream = !stream

			if (stream) {
				const chunks: Buffer[] = []

				try {
					for (;;) {
						const chunk = await cdp.send('IO.read', { handle: stream })

						chunks.push(Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'))

						if (chunk.eof) {
							break
						}
					}
				} finally {
					await cdp.send('IO.close', { handle: stream })
				}

				const trace = Buffer.concat(chunks)

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

			await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
			await cdp.detach()
		}

		if (missingTraceStream) {
			throw new Error('Native Chrome tracing did not return its artifact stream')
		}
	})
})

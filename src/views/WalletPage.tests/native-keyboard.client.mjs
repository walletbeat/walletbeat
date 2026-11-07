/**
 * @typedef {object} NativeWebKitHost
 * @property {{waitUntilDone(): void, notifyDone(): void}} testRunner
 * @property {{rawKeyDown(key: string): void, rawKeyUp(key: string): void}} eventSender
 * @property {{startTrackingLayoutUpdates(): void, startTrackingStyleRecalcs(): void, layoutUpdateCount(): number, styleRecalcCount(): number}} internals
 */
/** @typedef {{source: Awaited<ReturnType<typeof import('../../../tests/browser/fixtures/source-snapshot.mjs').sourceSnapshot>>['build'], width: number, height: number}} NativeKeyboardConfig */
/** @typedef {{layout: number, style: number}} NativeCounts */
/** @typedef {{type: string, key: string, trusted: boolean, target: boolean, prevented: boolean, time: number}} NativeKeyObservation */
/** @typedef {{start: number, end: number, positions: number[], events: NativeKeyObservation[], counters: NativeCounts, frames: number}} NativeKeyboardBatch */

/**
 * @param {NativeKeyboardConfig} config
 * @param {typeof import('../../../tests/browser/sticky-observation.mjs').qualifyNativeBreadcrumbClock} qualifyNativeBreadcrumbClock
 */
export async function runNativeKeyboard(config, qualifyNativeBreadcrumbClock) {
	const { testRunner, eventSender, internals } =
		/** @type {typeof globalThis & NativeWebKitHost} */ (globalThis)

	testRunner.waitUntilDone()
	let done = false
	/** @type {string[]} */
	const journal = []
	/** @type {(condition: unknown, message: string) => asserts condition} */
	const assert = (condition, message) => {
		if (!condition) {
			throw new Error(message)
		}
	}
	const live = () => assert(!done, 'Capture deadline elapsed')
	const finish = () => {
		if (!done) {
			done = true
			clearTimeout(timeout)
			document.body.style.whiteSpace = 'pre-wrap'
			document.body.textContent = journal.join('\n')
			testRunner.notifyDone()
		}
	}
	const timeout = setTimeout(() => {
		if (!done) {
			journal.push('WALLET_ERROR deadline')
			finish()
		}
	}, 120000)
	/** @param {number} milliseconds @returns {Promise<void>} */
	const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
	const frame = async () => {
		await new Promise(requestAnimationFrame)
		live()
	}

	try {
		while (document.querySelector('astro-island[ssr]:has(#top)')) {
			await wait(100)
			live()
		}
		await document.fonts.ready
		live()
		const response = await fetch('/__wallet-page/source.json')

		assert(response.ok, 'Source endpoint failed')
		/** @type {unknown} */
		const source = await response.json()

		assert(JSON.stringify(source) === JSON.stringify(config.source), 'Served source changed')
		const root = document.querySelector('#layout')
		const content = document.querySelector('#content')
		const marker = document.querySelector(
			'#top > [data-sticky-breadcrumb~="flow"] > [data-scroll-item~="snap-block-start"]',
		)

		assert(
			root instanceof HTMLElement &&
				content instanceof HTMLElement &&
				marker instanceof HTMLElement,
			'Missing native scroll/focus/H1 owners',
		)
		assert(
			innerWidth === config.width && innerHeight === config.height,
			'Native viewport differs from requested viewport',
		)
		assert(
			typeof eventSender.rawKeyDown === 'function' && typeof eventSender.rawKeyUp === 'function',
			'Native held-key API absent',
		)
		assert(
			typeof internals.layoutUpdateCount === 'function' &&
				typeof internals.styleRecalcCount === 'function',
			'Native counters absent',
		)
		internals.startTrackingLayoutUpdates()
		internals.startTrackingStyleRecalcs()
		const counters = () => ({
			layout: internals.layoutUpdateCount(),
			style: internals.styleRecalcCount(),
		})
		const control = document.createElement('div')

		control.style.cssText =
			'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none'
		document.body.append(control)
		/** @type {NativeCounts} */
		let positiveBefore, positiveAfter

		try {
			control.getBoundingClientRect()
			positiveBefore = counters()
			control.style.width = '2px'
			control.getBoundingClientRect()
			positiveAfter = counters()
			assert(
				positiveAfter.layout > positiveBefore.layout && positiveAfter.style > positiveBefore.style,
				'Native counter positive control failed',
			)
		} finally {
			control.remove()
		}

		let frames = 0
		const tick = () => {
			if (!done) {
				frames++
				requestAnimationFrame(tick)
			}
		}

		requestAnimationFrame(tick)
		const settle = async () => {
			let last = NaN,
				stable = 0
			/** @type {number[]} */
			const positions = []

			for (let index = 0; index < 240 && stable < 20; index++) {
				await frame()
				const value = root.scrollTop

				positions.push(value)
				stable = Math.abs(value - last) < 0.01 ? stable + 1 : 0
				last = value
			}
			assert(stable >= 20, 'Native scroll did not settle')

			return positions
		}
		/** @type {NativeKeyObservation[]} */
		const events = []
		/** @param {KeyboardEvent} event */
		const observe = event => {
			const item = {
				type: event.type,
				key: event.key,
				trusted: event.isTrusted,
				target: event.target === content,
				prevented: false,
				time: performance.now(),
			}

			events.push(item)
			queueMicrotask(() => {
				item.prevented = event.defaultPrevented
			})
		}

		document.addEventListener('keydown', observe, true)
		document.addEventListener('keyup', observe, true)

		try {
			const inset =
				Number.parseFloat(getComputedStyle(marker).scrollMarginBlockStart) +
				Number.parseFloat(getComputedStyle(root).scrollPaddingBlockStart)

			assert(Number.isFinite(inset), 'Non-finite cumulative H1 inset')
			const endpoint = root.scrollTop + marker.getBoundingClientRect().top - inset

			assert(Number.isFinite(endpoint) && endpoint >= 0, 'Invalid initial H1 endpoint')
			root.scrollTo({ top: endpoint, behavior: 'instant' })
			await settle()
			content.focus({ preventScroll: true })
			const clock = qualifyNativeBreadcrumbClock()

			assert(
				clock.applicable && clock.resolved,
				'Native H1 clock is unavailable or unresolved: ' + JSON.stringify(clock),
			)
			const before = {
				clock,
				scroll: root.scrollTop,
				extent: root.scrollHeight,
				clientHeight: root.clientHeight,
				marker: marker.getBoundingClientRect(),
				inset,
				endpoint,
				frames,
				counters: counters(),
			}

			assert(
				document.activeElement === content && document.visibilityState === 'visible',
				'Initial focus/visibility admission failed',
			)
			assert(getComputedStyle(root).scrollSnapType !== 'none', 'Native snapping is disabled')
			assert(
				Math.abs(before.marker.top - inset) <= 1 && Math.abs(before.scroll - endpoint) <= 1,
				'Initial H1 landing calibration failed',
			)
			assert(
				before.extent - before.clientHeight - before.scroll > 1000,
				'Insufficient remaining page for continued keyboard journey',
			)
			journal.push(
				'WALLET_PROGRESS ' +
					JSON.stringify({ phase: 'admitted', source, positiveBefore, positiveAfter, before }),
			)
			/** @type {NativeKeyboardBatch[]} */
			const batches = []

			for (let batch = 0; batch < 4; batch++) {
				const start = root.scrollTop,
					firstEvent = events.length,
					firstFrame = frames

				assert(
					document.activeElement === content && document.visibilityState === 'visible',
					'Focus/visibility changed before batch',
				)

				for (let index = 0; index < 5; index++) {
					eventSender.rawKeyDown('downArrow')

					try {
						await wait(100)
						live()
					} finally {
						eventSender.rawKeyUp('downArrow')
					}
				}
				const positions = await settle()
				const delivered = events.slice(firstEvent)

				journal.push(
					'WALLET_PROGRESS ' +
						JSON.stringify({
							phase: 'batch',
							batch,
							start,
							end: root.scrollTop,
							positions,
							events: delivered,
							frames,
							counters: counters(),
						}),
				)
				assert(
					delivered.length === 10,
					'Missing or extra native key events: ' + JSON.stringify(delivered),
				)
				assert(
					delivered.every(
						(event, index) =>
							event.type === (index % 2 ? 'keyup' : 'keydown') &&
							event.key === 'ArrowDown' &&
							event.trusted &&
							event.target &&
							!event.prevented,
					),
					'Native held-key delivery failed: ' + JSON.stringify(delivered),
				)
				assert(
					frames > firstFrame &&
						document.visibilityState === 'visible' &&
						document.activeElement === content,
					'Frame/focus/visibility admission failed',
				)
				assert(
					root.scrollTop > start + 1,
					'Keyboard failed to continue: ' + JSON.stringify({ batch, start, end: root.scrollTop }),
				)
				batches.push({
					start,
					end: root.scrollTop,
					positions,
					events: delivered,
					counters: counters(),
					frames,
				})
			}
			const incident = root.querySelector('#security-news article:has(> details:not([open]))')

			assert(
				incident instanceof HTMLElement,
				'Fixture must expose a closed Security News disclosure',
			)
			const details = incident.querySelector(':scope > details')
			const flow = incident.querySelector(':scope > [data-sticky-breadcrumb="flow"]')
			const heading = details?.querySelector(':scope > summary')

			assert(
				details instanceof HTMLDetailsElement &&
					flow instanceof HTMLElement &&
					heading instanceof HTMLElement,
				'Missing closed disclosure boundary owners',
			)
			const readBoundary = () => ({
				bottom: flow.getBoundingClientRect().bottom,
				headerBottom: heading.getBoundingClientRect().bottom,
				articleBottom: incident.getBoundingClientRect().bottom,
			})
			const closed = readBoundary()

			assert(
				Math.abs(closed.bottom - closed.headerBottom) < 1,
				'Closed boundary mismatch: ' + JSON.stringify(closed),
			)
			/** @type {ReturnType<typeof readBoundary>} */
			let expanded

			try {
				details.open = true
				await wait(800)
				live()
				await settle()
				expanded = readBoundary()
				assert(
					expanded.articleBottom - expanded.bottom > 30,
					'Open entry flow spans the disclosure body: ' + JSON.stringify(expanded),
				)
			} finally {
				details.open = false
			}

			await wait(800)
			live()
			await settle()
			const closedAgain = readBoundary()

			assert(
				Math.abs(closedAgain.bottom - closedAgain.headerBottom) < 1,
				'Closed-again boundary mismatch: ' + JSON.stringify(closedAgain),
			)
			const disclosure = { id: incident.id, closed, expanded, closedAgain }
			const afterResponse = await fetch('/__wallet-page/source.json')

			assert(
				afterResponse.ok &&
					JSON.stringify(await afterResponse.json()) === JSON.stringify(config.source),
				'Served source changed during capture',
			)
			journal.push(
				'WALLET_RESULT ' +
					JSON.stringify({
						source,
						viewport: { width: innerWidth, height: innerHeight },
						positiveBefore,
						positiveAfter,
						before,
						batches,
						disclosure,
						scope:
							'Native held-key H1 escape and continued travel only; no frame-pacing or compositor acceptance',
					}),
			)
		} finally {
			document.removeEventListener('keydown', observe, true)
			document.removeEventListener('keyup', observe, true)
		}
	} catch (error) {
		if (!done) {
			journal.push('WALLET_ERROR ' + String(error))
		}
	} finally {
		finish()
	}
}

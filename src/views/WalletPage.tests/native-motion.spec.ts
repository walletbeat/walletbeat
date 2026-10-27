import { writeFile } from 'node:fs/promises'

import sharp from 'sharp'

import { expect, test } from '../../../tests/browser/verified-test'

/** CDP installs this binding in the page execution context. */
declare function nativeMotionBlock(payload: string): void

type Box = { x: number; y: number; width: number; height: number }
type Region = { left: number; top: number; right: number; bottom: number }
type Paint = { blue: number | null; box: Box | null; mask: number[] }
type Frame = { data: string; metadata: { timestamp?: number } }
const axes = ['x', 'y', 'width', 'height'] as const

const regionFor = (box: Box): Region => ({
	left: Math.max(0, Math.floor(box.x) - 2),
	top: Math.max(0, Math.floor(box.y) - 2),
	right: Math.min(689, Math.ceil(box.x + box.width) + 2),
	bottom: Math.min(899, Math.ceil(box.y + box.height) + 2),
})

/** Decode each frame once; retain independent region comparisons against its actual pixels. */
async function readPaint(buffer: Buffer) {
	const { data, info } = await sharp(buffer)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })

	expect([info.width, info.height], 'Screenshot pixels use the admitted CSS pixel scale').toEqual([
		690, 900,
	])
	const orange: number[] = []
	let blue = Infinity

	for (let y = 0; y < info.height; y++) {
		for (let x = 0; x < info.width; x++) {
			const index = (y * info.width + x) * 4
			const [r, g, b] = [data[index], data[index + 1], data[index + 2]]

			if (y >= 845 && y <= 870 && r < 10 && g < 10 && b > 245) {
				blue = Math.min(blue, x)
			}

			if (r > 100 && r > g * 1.15 && g > b * 1.2 && r - b > 60) {
				orange.push(y * info.width + x)
			}
		}
	}

	return (region: Region | null): Paint => {
		let left = Infinity,
			top = Infinity,
			right = -Infinity,
			bottom = -Infinity
		const mask = region
			? orange.filter(pixel => {
					const x = pixel % info.width,
						y = Math.floor(pixel / info.width)

					if (x < region.left || x > region.right || y < region.top || y > region.bottom) {
						return false
					}

					left = Math.min(left, x)
					right = Math.max(right, x)
					top = Math.min(top, y)
					bottom = Math.max(bottom, y)

					return true
				})
			: []

		return {
			blue: Number.isFinite(blue) ? blue : null,
			box: mask.length
				? { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
				: null,
			mask,
		}
	}
}

function comparePaint(actual: Paint, reference: Paint) {
	if (!actual.box || !reference.box) {
		return { missingPaint: true, boxError: Infinity, unmatchedFraction: 1 }
	}

	const unmatched = (mask: number[], other: number[]) => {
		const set = new Set(other)

		return (
			mask.filter(pixel => {
				const x = pixel % 690,
					y = Math.floor(pixel / 690)

				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						if (set.has((y + dy) * 690 + x + dx)) {
							return false
						}
					}
				}

				return true
			}).length / mask.length
		)
	}

	return {
		missingPaint: false,
		boxError: Math.max(...axes.map(axis => Math.abs(actual.box![axis] - reference.box![axis]))),
		unmatchedFraction: Math.max(
			unmatched(actual.mask, reference.mask),
			unmatched(reference.mask, actual.mask),
		),
	}
}

test.describe('native paint during main-thread stalls', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'The blocked-presentation witness requires Chromium native CDP screencast and input',
	)
	test.use({
		viewport: { width: 690, height: 900 },
		deviceScaleFactor: 1,
		colorScheme: 'light',
		isMobile: false,
		hasTouch: false,
		reducedMotion: 'no-preference',
	})

	test('the real H1 wallet image follows native scroll while its main thread is blocked', async ({
		page,
		context,
	}, info) => {
		const evidence: Record<string, unknown> = {
			limitation:
				'One real MetaMask H1/image journey at one viewport; diagnostic snapping disabled. This is native execution evidence, not an FPS or whole-page acceptance claim.',
		}

		try {
			await page.goto('/metamask/?variant=BROWSER')
			await expect(page.getByRole('combobox', { name: 'Wallet version' })).toHaveValue('BROWSER')
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(async () => {
				await document.fonts.ready
				const image = document.querySelector('img.wallet-icon')

				if (!(image instanceof HTMLImageElement)) {
					throw new Error('Missing real wallet image')
				}

				await image.decode()
			})
			await page.mouse.move(1, 899)
			const cdp = await context.newCDPSession(page)

			await cdp.send('Page.enable')
			await cdp.send('Runtime.addBinding', { name: 'nativeMotionBlock' })
			const probe = await page.evaluateHandle(() => {
				const root = document.querySelector('#layout'),
					row = document.querySelector('.wallet-title-row'),
					image = document.querySelector('img.wallet-icon')

				if (
					!(root instanceof HTMLElement) ||
					!(row instanceof HTMLElement) ||
					!(image instanceof HTMLImageElement) ||
					document.querySelectorAll('img.wallet-icon').length !== 1
				) {
					throw new Error('Unique real H1 targets required')
				}

				if (!image.currentSrc.endsWith('/metamask.svg')) {
					throw new Error('This silhouette witness requires the real MetaMask fixture image')
				}

				const namedEffect = (element: Element, name: string) =>
					element
						.getAnimations()
						.find(
							(animation): animation is CSSAnimation =>
								animation instanceof CSSAnimation &&
								animation.animationName === name &&
								animation.effect instanceof KeyframeEffect &&
								animation.effect.target === element,
						)
				const imageMotion = namedEffect(image, 'breadcrumb-icon-motion'),
					rowMotion = namedEffect(row, 'breadcrumb-item-motion')

				if (
					!imageMotion ||
					!rowMotion ||
					!(imageMotion.timeline instanceof ViewTimeline) ||
					!imageMotion.timeline.subject ||
					imageMotion.timeline.source !== root ||
					!(rowMotion.timeline instanceof ViewTimeline) ||
					rowMotion.timeline.source !== root
				) {
					throw new Error('Actual native H1 effects must resolve to the page root')
				}

				const style = document.createElement('style')

				style.textContent =
					'#layout{scroll-snap-type:none!important;scroll-behavior:auto!important;overflow-anchor:none!important}#native-motion-ruler{position:fixed;top:850px;left:10px;width:12px;height:12px;background:rgb(0,0,255);z-index:2147483647;animation:native-motion-ruler auto linear both;pointer-events:none}@keyframes native-motion-ruler{from{transform:translateX(0)}to{transform:translateX(200px)}}'
				document.head.append(style)
				const ruler = document.createElement('span')

				ruler.id = 'native-motion-ruler'
				document.querySelector('#top')!.append(ruler)
				const computed = getComputedStyle(image)
				const index = computed.animationName
					.split(',')
					.map(value => value.trim())
					.indexOf('breadcrumb-icon-motion')
				const slot = (property: string) => {
					const list = computed
						.getPropertyValue(property)
						.split(',')
						.map(value => value.trim())

					return list[index % list.length]
				}

				ruler.style.animationTimeline = slot('animation-timeline')
				ruler.style.animationRangeStart = slot('animation-range-start')
				ruler.style.animationRangeEnd = slot('animation-range-end')

				return {
					root,
					row,
					image,
					ruler,
					imageMotion,
					rowMotion,
					style,
					freeze: null as HTMLStyleElement | null,
					blockWindow: null as { start: number; end: number } | null,
				}
			})

			const attachImage = async (name: string, buffer: Buffer) => {
				const path = info.outputPath(name + '.png')

				await writeFile(path, buffer)
				await info.attach(name, { path, contentType: 'image/png' })
			}

			evidence.targets = await probe.evaluate(({ image, imageMotion, rowMotion, ruler }) => ({
				src: image.currentSrc,
				intrinsic: [image.naturalWidth, image.naturalHeight],
				range: [ruler.style.animationRangeStart, ruler.style.animationRangeEnd],
				effects: [imageMotion, rowMotion].map(animation => {
					const effect = animation.effect

					if (!(effect instanceof KeyframeEffect)) {
						throw new Error('Missing native keyframe effect')
					}

					return {
						name: animation.animationName,
						timing: effect.getTiming(),
						keyframes: effect.getKeyframes(),
						timeline:
							animation.timeline instanceof ViewTimeline
								? {
										subject: animation.timeline.subject?.outerHTML ?? null,
										source: animation.timeline.source?.id ?? null,
									}
								: null,
					}
				}),
			}))
			const seek = async (top: number) =>
				probe.evaluate(async ({ root }, top) => {
					root.scrollTo({ top, behavior: 'instant' })

					for (let index = 0; index < 4; index++) {
						await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
					}

					return root.scrollTop
				}, top)
			const progressAt = async (top: number) => {
				await seek(top)

				return probe.evaluate(({ imageMotion }) => imageMotion.effect!.getComputedTiming().progress)
			}
			let high = 1

			while ((await progressAt(high)) !== 1 && high < 2048) {
				high *= 2
			}
			expect(await progressAt(high), 'Actual native H1 completion is bracketed').toBe(1)
			let low = 0

			while (high - low > 0.125) {
				const middle = (high + low) / 2

				if ((await progressAt(middle)) === 1) {
					high = middle
				} else {
					low = middle
				}
			}
			const end = high

			high = end
			low = 0
			while (high - low > 0.125) {
				const middle = (high + low) / 2,
					progress = await progressAt(middle)

				if (progress !== null && progress !== undefined && progress > 0) {
					high = middle
				} else {
					low = middle
				}
			}
			const start = low,
				range = end - start

			expect(range, 'Native H1 motion has observable interior scroll positions').toBeGreaterThan(2)
			evidence.interval = { start, end, range }
			const calibration = []

			for (const fraction of [0.1, 0.5, 0.9]) {
				const actual = await seek(start + range * fraction)
				const native = await probe.evaluate(({ image, imageMotion }) => {
					const computed = getComputedStyle(image)
					const effect = imageMotion.effect

					if (!(effect instanceof KeyframeEffect)) {
						throw new Error('Missing native image effect')
					}

					return {
						progress: imageMotion.effect!.getComputedTiming().progress,
						transform: [...new DOMMatrix(computed.transform).toFloat64Array()],
						translate: computed.translate,
						keyframes: effect.getKeyframes().map(frame => ({
							offset: frame.offset,
							transform: [...new DOMMatrix(String(frame.transform)).toFloat64Array()],
						})),
					}
				})
				const imageBox = await page.locator('img.wallet-icon').boundingBox()

				if (!imageBox) {
					throw new Error('Missing image preflight box')
				}

				const region = regionFor(imageBox),
					visibleBuffer = await page.screenshot()
				const visible = (await readPaint(visibleBuffer))(region)

				await probe.evaluate(({ image }) => {
					image.style.visibility = 'hidden'
				})
				const hiddenBuffer = await page.screenshot(),
					hidden = (await readPaint(hiddenBuffer))(region)

				await probe.evaluate(({ image }) => {
					image.style.removeProperty('visibility')
				})
				calibration.push({
					fraction,
					actual,
					imageBox,
					region,
					native,
					visiblePixels: visible.mask.length,
					hiddenPixels: hidden.mask.length,
				})
				evidence.calibration = calibration
				await attachImage(`preflight-${fraction}-visible`, visibleBuffer)
				await attachImage(`preflight-${fraction}-hidden`, hiddenBuffer)
				expect(visible.mask.length, 'The reader sees the actual image').toBeGreaterThanOrEqual(20)
				expect(hidden.mask.length, 'The image region contains no unrelated orange paint').toBe(0)
				expect(native.progress).toBeGreaterThan(0)
				expect(native.progress).toBeLessThan(1)
			}
			const states = calibration.map(row => row.native)
			const matrixEqual = (a: number[], b: number[]) =>
				a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) < 1e-9)
			const localImageVaries = !states.every(
				state =>
					matrixEqual(state.transform, states[0].transform) &&
					state.translate === states[0].translate &&
					state.keyframes.every(frame => matrixEqual(frame.transform, states[0].transform)),
			)

			evidence.localImageNegative = {
				applicable: localImageVaries,
				reason:
					'A constant local image transform cannot discriminate freezing; the combined row negative is always required.',
			}
			const references: (Paint & {
				requested: number
				actual: number
				imageBox: Box
				region: Region
			})[] = []

			for (let top = start; top <= end + 1; top += 1) {
				const actual = await seek(Math.min(top, end)),
					imageBox = await page.locator('img.wallet-icon').boundingBox()

				if (!imageBox) {
					throw new Error('Image must remain rendered throughout the native journey')
				}

				const region = regionFor(imageBox),
					buffer = await page.screenshot(),
					paint = (await readPaint(buffer))(region)

				if (paint.blue === null || !paint.box) {
					await attachImage('reference-reader-failure', buffer)
				}

				expect(paint.blue, 'Each ordinary reference has a native ruler position').not.toBeNull()
				expect(paint.box, 'Each ordinary reference has image paint').not.toBeNull()
				references.push({ requested: top, actual, imageBox, region, ...paint })
			}
			evidence.references = references
			let frames: Frame[] = []

			cdp.on('Page.screencastFrame', event => {
				frames.push(event)
				void cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId })
			})
			const runs = []

			for (const mode of ['blocked', ...(localImageVaries ? ['frozen-image'] : []), 'frozen-row']) {
				await probe.evaluate(state => {
					state.freeze?.remove()
					state.freeze = null
				})
				await seek(start + range * 0.1)

				if (mode !== 'blocked') {
					await probe.evaluate((state, mode) => {
						const target = mode === 'frozen-image' ? state.image : state.row,
							computed = getComputedStyle(target)
						const selector = mode === 'frozen-image' ? 'img.wallet-icon' : '.wallet-title-row'

						state.freeze = document.createElement('style')
						// Important paint values preserve measurement and state animation tracks.
						state.freeze.textContent = `${selector}{transform:${computed.transform}!important;translate:${computed.translate}!important}`
						document.head.append(state.freeze)
					}, mode)
				}

				const before = await probe.evaluate(({ root, row, image }) => {
					const rect = image.getBoundingClientRect()

					return {
						origin: performance.timeOrigin,
						scroll: root.scrollTop,
						image: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
						press: [row, image.closest('a')!].map(element => ({
							state: element.getAttribute('data-pressable-state'),
							hover: element.matches(':hover'),
							active: element.matches(':active'),
							scale: getComputedStyle(element).scale,
						})),
					}
				})

				if (runs.length) {
					expect(Math.abs(before.scroll - runs[0].before.scroll)).toBeLessThanOrEqual(0.25)

					for (const axis of axes) {
						expect(Math.abs(before.image[axis] - runs[0].before.image[axis])).toBeLessThanOrEqual(
							0.25,
						)
					}
				}

				expect(
					before.press.some(state => state.hover || state.active),
					'H1 press state remains neutral',
				).toBe(false)

				await probe.evaluate(state => {
					const initial = state.root.scrollTop

					state.blockWindow = null
					const block = () => {
						if (state.root.scrollTop <= initial) {
							return
						}

						state.root.removeEventListener('scroll', block)
						const start = performance.now()

						nativeMotionBlock(JSON.stringify({ start, initial, scroll: state.root.scrollTop }))
						while (performance.now() < start + 3000) {
							/* The deliberate stall is the actuator under test. */
						}
						state.blockWindow = { start, end: performance.now() }
					}

					state.root.addEventListener('scroll', block)
				})
				frames = []
				await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
				let cancelBinding: (() => void) | undefined
				const started = new Promise<{ name: string; payload: string }>((resolve, reject) => {
					const listener = (event: { name: string; payload: string }) => {
						if (event.name !== 'nativeMotionBlock') {
							return
						}

						cancelBinding?.()
						resolve(event)
					}
					const timer = setTimeout(() => {
						cancelBinding?.()
						reject(new Error('Main-thread block was not delivered'))
					}, 8000)

					cancelBinding = () => {
						clearTimeout(timer)
						cdp.off('Runtime.bindingCalled', listener)
					}
					cdp.on('Runtime.bindingCalled', listener)
				})

				let admission: { name: string; payload: string }

				try {
					;[admission] = await Promise.all([
						started,
						cdp.send('Input.synthesizeScrollGesture', {
							x: 620,
							y: 700,
							yDistance: -range * 0.8,
							speed: Math.max(1, Math.round(range * 0.3)),
							gestureSourceType: 'mouse',
						}),
					])
				} finally {
					cancelBinding?.()
				}

				const after = await probe.evaluate(({ root, blockWindow }) => ({
					scroll: root.scrollTop,
					block: blockWindow,
				}))

				await cdp.send('Page.stopScreencast')

				if (!after.block) {
					throw new Error('Main-thread block did not complete')
				}

				const matches = []

				for (const [frameIndex, frame] of frames.entries()) {
					if (frame.metadata.timestamp === undefined) {
						throw new Error('Native screenshot timestamp required')
					}

					const time = frame.metadata.timestamp * 1000 - before.origin

					if (time <= after.block.start + 50 || time >= after.block.end - 50) {
						continue
					}

					const buffer = Buffer.from(frame.data, 'base64'),
						paintAt = await readPaint(buffer),
						{ blue } = paintAt(null)
					const near = references.filter(
						reference =>
							blue !== null && reference.blue !== null && Math.abs(reference.blue - blue) <= 1,
					)
					const comparisons = []

					for (const reference of near) {
						const paint = paintAt(reference.region)

						comparisons.push({
							referenceBlue: reference.blue,
							region: reference.region,
							paintedBox: paint.box,
							...comparePaint(paint, reference),
						})
					}
					comparisons.sort(
						(a, b) => a.boxError - b.boxError || a.unmatchedFraction - b.unmatchedFraction,
					)
					matches.push({
						frameIndex,
						nativeTimestamp: frame.metadata.timestamp,
						time,
						blue,
						box: comparisons[0]?.paintedBox ?? null,
						comparison: comparisons[0] ?? null,
					})
				}
				const matched = matches.flatMap(frame =>
					frame.comparison ? [{ ...frame, comparison: frame.comparison }] : [],
				)
				const painted = matched.flatMap(frame => (frame.box ? [frame.box] : []))
				const blueValues = matched.flatMap(frame => (frame.blue === null ? [] : [frame.blue]))
				const run = {
					mode,
					before,
					after,
					admission: admission.payload,
					frames: matches,
					matched: matched.length,
					blueTravel: Math.max(...blueValues) - Math.min(...blueValues),
					boxTravel: Math.max(
						...axes.map(
							axis =>
								Math.max(...painted.map(box => box[axis])) -
								Math.min(...painted.map(box => box[axis])),
						),
					),
					missingPaintFrames: matched.filter(frame => frame.comparison.missingPaint).length,
					maximumBoxError: Math.max(...matched.map(frame => frame.comparison.boxError)),
					maximumUnmatchedFraction: Math.max(
						...matched.map(frame => frame.comparison.unmatchedFraction),
					),
				}

				runs.push(run)
				evidence.runs = runs

				for (const index of new Set([0, Math.floor(matched.length / 2), matched.length - 1])) {
					const sample = matched[index]

					if (sample) {
						await attachImage(
							`${mode}-admitted-${sample.frameIndex}`,
							Buffer.from(frames[sample.frameIndex].data, 'base64'),
						)
					}
				}

				expect(
					run.matched,
					'The blocked window has enough position-matched native screenshots',
				).toBeGreaterThanOrEqual(5)
				expect(run.matched).toBe(matches.length)
				expect(
					run.blueTravel,
					'The native ruler must move significantly during the stall',
				).toBeGreaterThan(30)

				if (mode === 'blocked') {
					expect(run.boxTravel, 'Actual wallet image paint moves during the stall').toBeGreaterThan(
						3,
					)
					expect(run.maximumBoxError).toBeLessThanOrEqual(1)
					expect(run.maximumUnmatchedFraction).toBeLessThanOrEqual(0.02)
				} else {
					expect(
						run.maximumBoxError > 3 || run.maximumUnmatchedFraction > 0.1,
						'Freezing the responsible paint owner must distinguish the oracle',
					).toBe(true)
				}
			}
		} catch (error) {
			evidence.failure = error instanceof Error ? (error.stack ?? error.message) : String(error)
			throw error
		} finally {
			const path = info.outputPath('native-motion.json')

			await writeFile(
				path,
				JSON.stringify(
					evidence,
					(_key, value: unknown) =>
						typeof value === 'number' && !Number.isFinite(value) ? String(value) : value,
					2,
				),
			)
			await info.attach('native-motion', { path, contentType: 'application/json' })
		}
	})
})

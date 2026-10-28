import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

import type { Browser, BrowserType, LaunchOptions } from '@playwright/test'

import type { sourceSnapshot } from '../../../../tests/browser/fixtures/source-snapshot.mjs'
import { verifyServerSource } from '../../../../tests/browser/fixtures/source-snapshot.mjs'
import type { Comparison, Paint, Region } from './icon-paint-reader'
import { createPaintReader, observeActor, observeGeometry } from './icon-paint-reader'

type NativeFrame = { data: string; metadata: { timestamp?: number }; sessionId: number }
export type IconPaintMode = 'baseline' | 'frozen-parent' | 'frozen-pseudo'
type Observation = ReturnType<typeof observeActor>
type Geometry = ReturnType<typeof observeGeometry>
type Reference = {
	actual: number
	blue: number
	cyanMask: number[][]
	region: Region
	paint: Paint
	observation: Observation
	image: string
	hiddenImage: string
	hiddenPixels: number
}
type ClassifiedFrame = {
	index: number
	timestamp: number
	phase: string
	natural: boolean
	blue: number | null
	cyan: number | null
	cyanMask: number[][]
	decodedPose: number | null
	referencePose: number | null
	cyanReferencePose: number | null
	classification: string
	comparison: Comparison | null
	unidentifiedNearTarget: boolean
}
type InputWindow = {
	mode: string
	start: number
	end: number
	first: number
	last: number
	before: Observation
	after: Observation
	frozen?: Observation
	frozenPose?: number
}
export type IconPaintReport = {
	mode: IconPaintMode
	status: string
	output: string
	browserClosed: boolean
	browserVersion?: string
	admitted?: number
	staleFrames?: number
	errors: string[]
	[key: string]: unknown
}
type DetailedReport = IconPaintReport & {
	phase: string
	pageErrors: string[]
	frames: ClassifiedFrame[]
	initialGeometry?: Geometry
	initialObservation?: Observation
	discovery?: { interval: { start: number; end: number } }
	resourceAdmission?: {
		fonts: FontFaceSetLoadStatus
		checks: { loaded: boolean }[]
		scrollExtent: number
	}
	before?: Observation
	after?: Observation
	criticalStart?: number
	criticalEnd?: number
	naturalEnd?: number
	inputFinished?: number
	sameContextCalibration?: {
		slopes: number[]
		slope: number
		residual: number
		uncertainty: number
	}
	sameContextOpacityPhase?: { before: number; after: number; actualProgress: number | null }
	lastNaturalFrame?: ClassifiedFrame | null
	controlsQualified?: boolean | null
	poseComparisons?: {
		pose: number
		frames: number
		wrong: number
		firstWrong: number | null
		laterCorrect: number | null
		convergenceMs: number | null
	}[]
	signedTravel?: number
	actualDistance?: number
	failure?: { phase: string; kind: string; message: string }
}
type Options = {
	browserType: BrowserType
	launchOptions: LaunchOptions
	baseURL: string
	viewport: { width: number; height: number }
	outputDir: string
	selector: string
	source: Awaited<ReturnType<typeof sourceSnapshot>>
	mode: IconPaintMode
	arrivalProgress: 0.35 | 0.75
}

/** Runs one observation in a dedicated browser process; closure owns all injected state. */
export async function observeIconPaint({
	browserType,
	launchOptions,
	baseURL,
	viewport,
	outputDir,
	selector,
	source,
	mode,
	arrivalProgress,
}: Options): Promise<IconPaintReport> {
	assert.ok(['baseline', 'frozen-parent', 'frozen-pseudo'].includes(mode))
	const { width: W, height: H } = viewport
	const { pixels, compare, correct } = createPaintReader(viewport)
	const out = pathToFileURL(join(outputDir, mode) + '/')
	let D: number
	const poseTolerance = 0.04
	const result: DetailedReport = {
		status: 'instrument-rejected',
		browserClosed: false,
		probeRevision: 6,
		mode,
		phase: 'reference-admission',
		pageErrors: [],
		scope:
			'Same-position icon paint under native fast scrolling versus later slow references; optional diagnostic color is recorded; no physical-display FPS claim',
		selector,
		viewport,
		source,
		arrivalProgress,
		output: fileURLToPath(out),
		errors: [],
		frames: [],
		complete: false,
	}
	const json = (value: unknown) =>
		JSON.stringify(
			value,
			(_key: string, v: unknown) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v),
			2,
		)

	await mkdir(out, { recursive: true })
	let browser: Browser | null = null
	const capturedFrames: NativeFrame[] = []

	try {
		await verifyServerSource(baseURL, source)
		result.phase = 'geometry-discovery'
		browser = await browserType.launch(launchOptions)
		const discoveryContext = await browser.newContext({
			viewport,
			deviceScaleFactor: 1,
			colorScheme: 'dark',
			reducedMotion: 'no-preference',
		})
		const discoveryPage = await discoveryContext.newPage()

		await discoveryPage.goto(new URL('/metamask/?variant=BROWSER', baseURL).href)
		await discoveryPage.locator('astro-island[ssr]:has(#top)').waitFor({ state: 'detached' })
		await discoveryPage.evaluate(() => document.fonts.ready)
		const discoveryState = await discoveryPage.evaluateHandle(selector => {
			const actor = document.querySelector(selector),
				root = document.querySelector('#layout')

			if (!(actor instanceof HTMLElement) || !(root instanceof HTMLElement)) {
				throw Error('Unique actor/root required')
			}

			const row = actor.closest('[data-sticky-breadcrumb~="item"]'),
				header = actor.closest('[data-sticky-breadcrumb~="position"]')

			if (!(row instanceof HTMLElement) || !(header instanceof HTMLElement)) {
				throw Error('Native row/header required')
			}

			return { actor, root, row, header }
		}, selector)

		assert.equal(await discoveryPage.locator(selector).count(), 1)
		const initialGeometry = await discoveryState.evaluate(observeGeometry)
		const initialObservation = await discoveryState.evaluate(observeActor)
		const discoveredBrowser = browser.version()

		await discoveryState.evaluate(({ root }) => {
			root.style.scrollSnapType = 'none'
			root.style.scrollBehavior = 'auto'
			root.style.overflowAnchor = 'none'
		})
		const progressAt = async (top: number) => {
			await discoveryState.evaluate(({ root }, value) => {
				root.scrollTop = value
			}, top)
			await delay(40)

			return (await discoveryState.evaluate(observeActor)).progress
		}
		const maximum = initialObservation.maximum

		assert.equal(await progressAt(maximum), 1)
		let low = 0,
			high = maximum

		while (high - low > 0.125) {
			const middle = (low + high) / 2

			if ((await progressAt(middle)) === 1) {
				high = middle
			} else {
				low = middle
			}
		}
		const end = high

		low = 0
		high = end
		while (high - low > 0.125) {
			const middle = (low + high) / 2,
				progress = await progressAt(middle)

			if (progress !== null && progress > 0) {
				high = middle
			} else {
				low = middle
			}
		}
		const start = low

		assert.ok(end - start > 4, 'Native interval needs three distinct integer reference poses')
		assert.ok(arrivalProgress === 0.35 || arrivalProgress === 0.75)
		D = Math.round(start + (end - start) * arrivalProgress)
		assert.ok(D - 1 > start && D + 1 < end)
		await progressAt(D)
		const phaseObservation = await discoveryState.evaluate(observeActor)
		const opacityPhase = {
			before: Number(phaseObservation.before.opacity),
			after: Number(phaseObservation.after.opacity),
			actualProgress: phaseObservation.progress,
		}

		assert.ok(
			arrivalProgress < 0.5
				? opacityPhase.before > opacityPhase.after
				: opacityPhase.after > opacityPhase.before,
			'Sampled native opacity must admit the intended complex/simple glyph phase',
		)
		const discovery = {
			opacityPhase,
			selector,
			browserVersion: discoveredBrowser,
			initialGeometry,
			initialObservation,
			interval: { start, end },
			D,
		}

		result.discovery = discovery
		result.D = D
		await writeFile(new URL('discovery.json', out), json(discovery))
		await browser.close()
		browser = null
		const reference = { selector, browserVersion: discoveredBrowser, initialGeometry }
		let refs: Reference[] = []

		result.phase = 'source-admission'
		await verifyServerSource(baseURL, source)
		result.phase = 'context-admission'
		browser = await browserType.launch(launchOptions)
		result.browserVersion = browser.version()
		assert.equal(result.browserVersion, reference.browserVersion)
		const context = await browser.newContext({
			viewport,
			deviceScaleFactor: 1,
			colorScheme: 'dark',
			reducedMotion: 'no-preference',
		})
		const page = await context.newPage()

		page.on('pageerror', error => {
			const message = String(error.stack ?? error)

			result.pageErrors.push(message)
			result.errors.push(message)
		})
		page.on('console', message => {
			if (message.type() === 'error') {
				result.pageErrors.push(message.text())
				result.errors.push(message.text())
			}
		})
		await page.goto(new URL('/metamask/?variant=BROWSER', baseURL).href)
		await page.locator('astro-island[ssr]:has(#top)').waitFor({ state: 'detached' })
		await page.evaluate(() => document.fonts.ready)
		assert.equal(
			await page.getByRole('combobox', { name: 'Wallet version' }).inputValue(),
			'BROWSER',
		)
		assert.equal(await page.locator(selector).count(), 1)
		const state = await page.evaluateHandle(selector => {
			const actor = document.querySelector(selector),
				root = document.querySelector('#layout')

			if (!(actor instanceof HTMLElement) || !(root instanceof HTMLElement)) {
				throw Error('Actual actor and root are required')
			}

			const row = actor.closest('[data-sticky-breadcrumb~="item"]'),
				header = actor.closest('[data-sticky-breadcrumb~="position"]')

			if (!(row instanceof HTMLElement) || !(header instanceof HTMLElement)) {
				throw Error('Actual parent item/header required')
			}

			return { actor, root, row, header }
		}, selector)

		result.initialGeometry = await state.evaluate(observeGeometry)
		result.initialObservation = await state.evaluate(observeActor)
		result.resourceAdmission = await state.evaluate(({ actor, root }) => {
			const checks = ['::before', '::after'].map(pseudo => {
				const style = getComputedStyle(actor, pseudo)
				let text = style.content

				try {
					const parsed: unknown = JSON.parse(text)

					if (typeof parsed === 'string') {
						text = parsed
					}
				} catch {
					text = style.content
				}

				const primaryFamilyToken = style.fontFamily.split(',')[0].trim()
				const unquote = (family: string) => family.replace(/^(["'])(.*)\1$/, '$2')
				const primaryFamily = unquote(primaryFamilyToken)
				const matchingFaces = [...document.fonts]
					.filter(face => unquote(face.family) === primaryFamily)
					.map(face => ({ family: face.family, status: face.status }))
				const primaryGlyphReady = document.fonts.check(
					`${style.fontSize} ${primaryFamilyToken}`,
					text,
				)

				return {
					pseudo,
					fontSize: style.fontSize,
					fontFamily: style.fontFamily,
					content: style.content,
					primaryFamilyToken,
					primaryFamily,
					matchingFaces,
					primaryGlyphReady,
					loaded: primaryGlyphReady && matchingFaces.some(face => face.status === 'loaded'),
				}
			})

			return {
				fonts: document.fonts.status,
				checks,
				fontFaces: [...document.fonts]
					.filter(face => face.family.includes('wbicons'))
					.map(face => ({ family: face.family, status: face.status })),
				scrollExtent: root.scrollHeight - root.clientHeight,
				rootScroll: root.scrollTop,
				stylesheets: [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map(
					link => link.href,
				),
				resources: performance
					.getEntriesByType('resource')
					.filter(entry => /woff|\.css/.test(entry.name))
					.map(entry => ({ name: entry.name, duration: entry.duration })),
			}
		})
		// These reads admit the initial document. They never seek the target or paint/hide the icon.
		await writeFile(new URL('result.json', out), json(result))
		const initial = reference.initialGeometry

		assert.ok(
			Math.abs(result.initialGeometry.scroll - initial.scroll) <= 0.25,
			'Natural initial scroll must match the reference document before any diagnostic mutation',
		)

		for (const owner of ['root', 'actor', 'header', 'row', 'scope', 'flow'] as const) {
			for (const axis of ['x', 'y', 'width', 'height'] as const) {
				const actualBox = result.initialGeometry[owner],
					referenceBox = initial[owner]

				assert.ok(actualBox && referenceBox)
				assert.ok(
					Math.abs(actualBox[axis] - referenceBox[axis]) <= 0.0625,
					`Initial ${owner}.${axis} must match the reference geometry`,
				)
			}
		}
		assert.equal(result.initialGeometry.timeline.source, initial.timeline.source)
		assert.equal(result.initialGeometry.timeline.axis, initial.timeline.axis)

		for (const endpoint of ['startOffset', 'endOffset'] as const) {
			const actual = result.initialGeometry.timeline[endpoint]?.px,
				expected = initial.timeline[endpoint]?.px

			assert.ok(
				typeof actual === 'number' &&
					typeof expected === 'number' &&
					Number.isFinite(actual) &&
					Number.isFinite(expected) &&
					Math.abs(actual - expected) <= 0.0625,
				`Initial native ${endpoint} must match the reference timeline`,
			)
		}
		assert.ok(result.initialGeometry.properties.header && initial.properties.header)

		for (const property of [
			'--stickyBreadcrumb-entryRange',
			'---breadcrumb-parentBlockEnd',
			'---breadcrumb-blockEnd',
			'--stickyBreadcrumb-sourcePaddingBlock',
		]) {
			assert.equal(
				result.initialGeometry.properties.header[property],
				initial.properties.header[property],
				`Initial heading ${property} must match`,
			)
		}
		assert.equal(result.resourceAdmission.scrollExtent, initialObservation.maximum)
		assert.equal(result.resourceAdmission.fonts, 'loaded')
		assert.ok(
			result.resourceAdmission.checks.every(check => check.loaded),
			'Actual icon font faces must already be loaded, rather than concealed by a fallback',
		)

		for (const pseudo of ['before', 'after'] as const) {
			for (const property of ['fontSize', 'fontFamily', 'content'] as const) {
				assert.equal(
					result.initialObservation[pseudo][property],
					initialObservation[pseudo][property],
					`Cross-context ${pseudo}.${property} must match`,
				)
			}
		}
		result.colorAdmission = await state.evaluate(({ actor }) => {
			const colors = ['::before', '::after'].map(pseudo => ({
				pseudo,
				color: getComputedStyle(actor, pseudo).color,
			}))
			const ownsPinkMask = colors.every(({ color }) => {
				const rgb = color.match(/[\d.]+/g)?.map(Number)

				return (
					rgb && rgb[0] > 120 && rgb[2] > 100 && rgb[0] > rgb[1] * 1.35 && rgb[2] > rgb[1] * 1.2
				)
			})

			if (!ownsPinkMask) {
				actor.setAttribute('data-raster-color-diagnostic', '')
				const style = document.createElement('style')

				style.textContent =
					'[data-raster-color-diagnostic]::before,[data-raster-color-diagnostic]::after{color:rgb(255,0,255)!important}'
				document.head.append(style)
			}

			return {
				actualColors: colors,
				diagnosticColorOverride: !ownsPinkMask,
				scope: ownsPinkMask
					? 'Unmodified actual colors own the mask'
					: 'Diagnostic magenta pseudo color only; color presentation is not under test',
			}
		})
		await state.evaluate(({ root }) => {
			root.style.scrollSnapType = 'none'
			root.style.scrollBehavior = 'auto'
			root.style.overflowAnchor = 'none'
		})
		await state.evaluate(
			({ root }, { D, height }) => {
				const ruler = document.createElement('span')

				ruler.style.cssText = `position:fixed;top:${height - 50}px;left:10px;width:6px;height:6px;background:rgb(0,0,255);z-index:2147483647;pointer-events:none`
				document.body.append(ruler)
				ruler.animate([{ transform: 'translateX(0px)' }, { transform: 'translateX(200px)' }], {
					timeline: new ScrollTimeline({ source: root, axis: 'block' }),
					duration: 'auto',
					fill: 'both',
					easing: 'linear',
					rangeStart: `${D - 2}px`,
					rangeEnd: `${D + 2}px`,
				})
				const marker = document.createElement('span')
				const top = document.querySelector('#top')

				if (!top) {
					throw Error('Clock marker needs the actual top owner')
				}

				const origin =
					top.getBoundingClientRect().top + root.scrollTop - root.getBoundingClientRect().top

				marker.style.cssText = `position:absolute;left:2px;top:${D + height - 50 - origin}px;width:6px;height:3px;background:rgb(0,255,255);z-index:2147483647;pointer-events:none`
				top.append(marker)
			},
			{ D, height: H },
		)
		const point = await page.evaluate(() => {
			for (const x of [1, innerWidth - 1]) {
				const y = innerHeight - 200,
					hit = document.elementFromPoint(x, y)

				if (!hit) {
					continue
				}

				if (
					hit?.closest('a[href],button,input,select,textarea,summary,[role="button"],:read-write')
				) {
					continue
				}

				for (let owner: Element | null = hit; owner; owner = owner.parentElement) {
					if (
						/(auto|scroll)/.test(getComputedStyle(owner).overflowY) &&
						owner.scrollHeight > owner.clientHeight + 1
					) {
						if (owner.id === 'layout') {
							return {
								x,
								y,
								scrollOwner: owner.id,
								hit: { tag: hit.tagName, id: hit.id },
								interactiveAncestor: null,
							}
						}

						break
					}
				}
			}
			throw Error('Static background margins do not reach the page scroll owner')
		})

		result.point = point
		await page.mouse.move(point.x, point.y)
		result.before = await state.evaluate(observeActor)
		assert.equal(
			result.before.maximum,
			initialObservation.maximum,
			'Clock markers must not alter source extent',
		)
		assert.ok(
			Math.abs(result.before.scroll - initial.scroll) <= 0.25,
			'No reference sweep or target seek is permitted',
		)
		assert.ok(result.before.scroll < D - 0.5)
		assert.ok(
			!result.before.interaction.row.hover &&
				!result.before.interaction.row.active &&
				!result.before.interaction.actor.hover &&
				!result.before.interaction.actor.active,
		)
		result.actualDistance = D - result.before.scroll
		result.boundaryLimited = result.actualDistance < H
		result.phase = 'capture'
		const cdp = await context.newCDPSession(page)

		await cdp.send('Page.enable')
		const frames = capturedFrames,
			acknowledgements: Promise<unknown>[] = []
		let firstFrameResolve: () => void = () => {},
			firstFrameTimer: ReturnType<typeof setTimeout>
		const firstFrame = new Promise<void>((resolve, reject) => {
			firstFrameResolve = resolve
			firstFrameTimer = setTimeout(() => reject(Error('No pre-input native frame')), 3000)
		})

		cdp.on('Page.screencastFrame', (frame: NativeFrame) => {
			frames.push(frame)
			clearTimeout(firstFrameTimer)
			firstFrameResolve()
			acknowledgements.push(
				cdp
					.send('Page.screencastFrameAck', { sessionId: frame.sessionId })
					.catch(error => result.errors.push(String(error))),
			)
		})
		const startScreencast = () =>
			cdp.send('Page.startScreencast', {
				format: 'png',
				everyNthFrame: 1,
				maxWidth: viewport.width,
				maxHeight: viewport.height,
			})

		await startScreencast()
		await firstFrame
		result.criticalStart = Date.now()
		await Promise.all([
			cdp
				.send('Input.synthesizeScrollGesture', {
					x: point.x,
					y: point.y,
					yDistance: result.before.scroll - D,
					speed: 12000,
					gestureSourceType: 'mouse',
				})
				.then(() => {
					result.inputFinished = Date.now()
				}),
			delay(3000),
		])
		result.criticalEnd = Date.now()
		// Native-only tail precedes all post-window DOM observations and perturbations.
		await delay(250)
		result.naturalEnd = Date.now()
		result.after = await state.evaluate(observeActor)
		result.afterGeometry = await state.evaluate(observeGeometry)
		await cdp.send('Page.stopScreencast')
		await Promise.all(acknowledgements.splice(0))
		result.baselineNativeMetadata = frames.map(({ metadata }, index) => ({ index, metadata }))
		await writeFile(new URL('result.json', out), json(result))
		const windows: InputWindow[] = [
			{
				mode: 'first-entry-baseline',
				start: result.criticalStart,
				end: result.naturalEnd,
				first: 0,
				last: frames.length - 1,
				before: result.before,
				after: result.after,
			},
		]

		result.windows = windows
		// Target visits, screenshots, hides, and frozen controls begin only after untouched fast capture.
		result.phase = 'same-context-reference'
		result.acceptanceOracle =
			'Same-context slow reference raster collected after untouched fast capture'
		const seek = async (target: number) => {
			const from = await state.evaluate(({ root }) => root.scrollTop)

			await cdp.send('Input.synthesizeScrollGesture', {
				x: point.x,
				y: point.y,
				yDistance: from - target,
				speed: 50,
				gestureSourceType: 'mouse',
			})
			await delay(400)
			const actual = await state.evaluate(({ root }) => root.scrollTop)

			assert.ok(
				Math.abs(actual - target) <= poseTolerance,
				'Post-capture reference seek must attain its declared pose',
			)

			return actual
		}

		refs = []

		for (const offset of [-1, 0, 1]) {
			const actual = await seek(D + offset),
				observation = await state.evaluate(observeActor)
			const visibleBytes = await page.screenshot(),
				visible = await pixels(visibleBytes)
			const saved = await state.evaluate(({ actor }) => {
				const old = {
					value: actor.style.getPropertyValue('visibility'),
					priority: actor.style.getPropertyPriority('visibility'),
				}

				actor.style.setProperty('visibility', 'hidden', 'important')

				return old
			})
			let hiddenBytes

			try {
				hiddenBytes = await page.screenshot()
			} finally {
				await state.evaluate(({ actor }, old) => {
					if (old.value) {
						actor.style.setProperty('visibility', old.value, old.priority)
					} else {
						actor.style.removeProperty('visibility')
					}
				}, saved)
			}

			const paint = visible.at(observation.region),
				hidden = (await pixels(hiddenBytes)).at(observation.region)
			const stem = `same-reference-${offset + 1}`

			await writeFile(new URL(`${stem}.png`, out), visibleBytes)
			await writeFile(new URL(`${stem}-hidden.png`, out), hiddenBytes)
			assert.ok(visible.blue !== null, 'Reference ruler must have actual raster pixels')
			refs.push({
				actual,
				blue: visible.blue,
				cyanMask: visible.cyanMask,
				region: observation.region,
				paint,
				observation,
				image: `${stem}.png`,
				hiddenImage: `${stem}-hidden.png`,
				hiddenPixels: hidden.mask.length,
			})
			result.sameContextReferences = refs
			await writeFile(new URL('result.json', out), json(result))
			assert.ok(paint.mask.length >= 20)
			assert.equal(
				hidden.mask.length,
				0,
				'Actual-actor hide must remove every attributed pink pixel',
			)
			assert.equal(
				paint.mask.some(
					pixel =>
						pixel % W <= observation.region.left + 1 || pixel % W >= observation.region.right - 1,
				),
				false,
				'Reader must not crop glyph ink',
			)
		}
		result.sameContextOpacityPhase = {
			before: Number(refs[1].observation.before.opacity),
			after: Number(refs[1].observation.after.opacity),
			actualProgress: refs[1].observation.progress,
		}
		const targetPhase = result.sameContextOpacityPhase

		assert.ok(
			arrivalProgress < 0.5
				? targetPhase.before > targetPhase.after
				: targetPhase.after > targetPhase.before,
			'Same-context target reference must admit the intended glyph phase',
		)
		const slopes = [0, 1].map(
			i => (refs[i + 1].blue - refs[i].blue) / (refs[i + 1].actual - refs[i].actual),
		)
		const slope = (refs[2].blue - refs[0].blue) / (refs[2].actual - refs[0].actual)
		const residual = Math.abs(
			refs[1].blue - (refs[0].blue + slope * (refs[1].actual - refs[0].actual)),
		)

		result.sameContextCalibration = {
			slopes,
			slope,
			residual,
			uncertainty: (1 + residual) / Math.min(...slopes),
		}
		assert.ok(slopes.every(value => Number.isFinite(value) && value > 0))
		assert.ok(result.sameContextCalibration.uncertainty <= poseTolerance)
		const cyanByPattern = new Map(refs.map(ref => [JSON.stringify(ref.cyanMask), ref]))

		assert.equal(cyanByPattern.size, 3)
		const decodePose = (blue: number | null) => {
			if (blue === null) {
				return null
			}

			const i = blue <= refs[1].blue ? 0 : 1

			return refs[i].actual + (blue - refs[i].blue) / slopes[i]
		}

		result.phase = 'negative-controls'

		if (result.mode !== 'baseline') {
			const freezeStyle = await page.evaluateHandle(() => {
				const style = document.createElement('style')

				document.head.append(style)

				return style
			})

			await state.evaluate(({ actor, row }) => {
				actor.setAttribute('data-native-repaint-actor', '')
				row.setAttribute('data-native-repaint-row', '')
			})

			for (const mode of [result.mode]) {
				const endpoints = [
					Math.ceil(result.discovery.interval.start + 1),
					Math.floor(result.discovery.interval.end - 1),
				]
				const frozenPose = endpoints.sort((a, b) => Math.abs(b - D) - Math.abs(a - D))[0]

				await seek(frozenPose)
				const frozen = await state.evaluate(observeActor),
					target = refs[1].observation
				const values = (o: Observation) =>
					mode === 'frozen-parent'
						? o.row
						: [
								o.before.transform,
								o.before.translate,
								o.before.opacity,
								o.after.transform,
								o.after.translate,
								o.after.opacity,
							]

				assert.notEqual(
					JSON.stringify(values(frozen)),
					JSON.stringify(values(target)),
					'Negative control must change responsible target properties',
				)
				await freezeStyle.evaluate(
					(style, { mode, frozen }) => {
						const declarations = (value: {
							transform: string
							translate: string
							opacity?: string
						}) =>
							`transform:${value.transform}!important;translate:${value.translate}!important;opacity:${value.opacity ?? '1'}!important`

						style.textContent =
							mode === 'frozen-parent'
								? `[data-native-repaint-row]{${declarations(frozen.row)}}`
								: `[data-native-repaint-actor]::before{${declarations(frozen.before)}}[data-native-repaint-actor]::after{${declarations(frozen.after)}}`
					},
					{ mode, frozen },
				)
				// Native reverse input supplies the origin; no direct seek precedes these fast controls.
				const origin = Math.min(result.before.maximum, D + H)
				const current = await state.evaluate(({ root }) => root.scrollTop)

				await cdp.send('Input.synthesizeScrollGesture', {
					x: point.x,
					y: point.y,
					yDistance: current - origin,
					speed: 12000,
					gestureSourceType: 'mouse',
				})
				await delay(400)
				const before = await state.evaluate(observeActor)

				assert.ok(before.scroll > D + 0.5)
				const first = frames.length

				await startScreencast()
				await delay(100)
				const start = Date.now()

				await Promise.all([
					cdp.send('Input.synthesizeScrollGesture', {
						x: point.x,
						y: point.y,
						yDistance: before.scroll - D,
						speed: 12000,
						gestureSourceType: 'mouse',
					}),
					delay(800),
				])
				const end = Date.now()

				await cdp.send('Page.stopScreencast')
				await Promise.all(acknowledgements.splice(0))
				const after = await state.evaluate(observeActor)

				windows.push({
					mode,
					start,
					end,
					first,
					last: frames.length - 1,
					before,
					after,
					frozen,
					frozenPose,
				})
				await writeFile(new URL('result.json', out), json(result))
			}
		}

		// Dedicated process disposal owns cleanup; baseline never creates control styles.
		result.duration = result.criticalEnd - result.criticalStart
		assert.ok(typeof result.inputFinished === 'number')
		result.nativeInputDuration = result.inputFinished - result.criticalStart
		result.signedTravel = result.after.scroll - result.before.scroll
		result.phase = 'classification'
		await mkdir(new URL('frames/', out), { recursive: true })

		for (const [index, frame] of frames.entries()) {
			const bytes = Buffer.from(frame.data, 'base64')

			assert.ok(typeof frame.metadata.timestamp === 'number')
			const raster = await pixels(bytes),
				timestamp = frame.metadata.timestamp,
				epoch = timestamp * 1000
			const decodedPose = decodePose(raster.blue)
			const ref =
				decodedPose === null
					? undefined
					: refs.find(value => Math.abs(value.actual - decodedPose) <= poseTolerance)
			const cyanReference = cyanByPattern.get(JSON.stringify(raster.cyanMask))
			const window = windows.find(
				value =>
					index >= value.first && index <= value.last && epoch >= value.start && epoch <= value.end,
			)
			const phase = window?.mode ?? 'outside-input-window'
			const natural = phase === 'first-entry-baseline'
			let classification = 'instrument-rejected'
			let comparison: Comparison | null = null

			if (window && ref && cyanReference && ref.actual === cyanReference.actual) {
				comparison = compare(raster.at(ref.region), ref.paint)
				classification = comparison.missing ? 'missing' : correct(comparison) ? 'correct' : 'wrong'
			}

			result.frames.push({
				index,
				timestamp,
				phase,
				natural,
				blue: raster.blue,
				cyan: raster.cyan,
				cyanMask: raster.cyanMask,
				decodedPose,
				referencePose: ref?.actual ?? null,
				cyanReferencePose: cyanReference?.actual ?? null,
				classification,
				comparison,
				unidentifiedNearTarget:
					natural && cyanReference !== undefined && (!ref || ref.actual !== cyanReference.actual),
			})
		}
		const admitted = result.frames.filter(
			frame => frame.natural && frame.classification !== 'instrument-rejected',
		)

		result.lastNaturalFrame = result.frames.findLast(frame => frame.natural) ?? null
		result.lastNaturalFrameAgeMs = result.lastNaturalFrame
			? result.naturalEnd - result.lastNaturalFrame.timestamp * 1000
			: null
		result.phaseComparisons = windows.map(window => ({
			mode: window.mode,
			frames: result.frames.filter(
				frame => frame.phase === window.mode && frame.classification !== 'instrument-rejected',
			),
		}))
		result.controlsQualified =
			result.mode === 'baseline'
				? null
				: [result.mode].every(mode => {
						const admitted = result.frames.filter(
							frame => frame.phase === mode && frame.classification !== 'instrument-rejected',
						)

						return (
							!result.frames.some(
								frame =>
									frame.phase === mode &&
									frame.cyanReferencePose !== null &&
									frame.referencePose !== frame.cyanReferencePose,
							) &&
							admitted.length >= 3 &&
							admitted.filter(frame => frame.classification !== 'correct').length >= 3
						)
					})
		result.poseComparisons = refs.map(ref => {
			const observed = admitted.filter(frame => frame.referencePose === ref.actual)
			const firstWrong = observed.find(frame => frame.classification !== 'correct')
			const laterCorrect =
				firstWrong &&
				observed.find(
					frame => frame.timestamp > firstWrong.timestamp && frame.classification === 'correct',
				)

			return {
				pose: ref.actual,
				frames: observed.length,
				wrong: observed.filter(frame => frame.classification !== 'correct').length,
				firstWrong: firstWrong?.index ?? null,
				laterCorrect: laterCorrect?.index ?? null,
				convergenceMs: laterCorrect ? (laterCorrect.timestamp - firstWrong.timestamp) * 1000 : null,
			}
		})
		result.admitted = admitted.length
		result.firstAdmitted = admitted[0] ?? null
		result.staleFrames = admitted.filter(frame => frame.classification !== 'correct').length
		result.staleEpisodes = result.poseComparisons
			.filter(value => value.firstWrong !== null)
			.map(value => ({
				pose: value.pose,
				firstFrame: value.firstWrong,
				recoveredFrame: value.laterCorrect,
				catchupMs: value.convergenceMs,
			}))
		const naturalFrames = result.frames.filter(frame => frame.natural)
		const inputStart = result.criticalStart
		const inputAck = result.inputFinished
		const targetFrames = naturalFrames.filter(
			frame =>
				frame.referencePose !== null &&
				Math.abs(frame.referencePose - D) <= poseTolerance &&
				frame.referencePose === frame.cyanReferencePose,
		)
		const arrival = (frame: ClassifiedFrame | undefined) =>
			frame
				? {
						index: frame.index,
						timestampMs: frame.timestamp * 1000,
						sinceInputStartMs: frame.timestamp * 1000 - inputStart,
						sinceInputAckMs: frame.timestamp * 1000 - inputAck,
					}
				: null
		const firstTarget = targetFrames[0]
		const predecessor = firstTarget
			? result.frames.findLast(frame => frame.index < firstTarget.index)
			: undefined

		result.targetArrival = {
			targetScroll: D,
			inputAckDurationMs: result.nativeInputDuration,
			firstTargetFrame: arrival(firstTarget),
			firstCorrectTargetFrame: arrival(
				targetFrames.find(frame => frame.classification === 'correct'),
			),
			firstTargetCaptureBracket: firstTarget
				? {
						predecessorIndex: predecessor?.index ?? null,
						predecessorTimestampMs: predecessor ? predecessor.timestamp * 1000 : null,
						firstTargetTimestampMs: firstTarget.timestamp * 1000,
						captureGapMs: predecessor
							? (firstTarget.timestamp - predecessor.timestamp) * 1000
							: null,
					}
				: null,
			staleTargetFrameIndices: targetFrames
				.filter(frame => frame.classification === 'wrong' || frame.classification === 'missing')
				.map(frame => frame.index),
			interpretation:
				'Captured target arrival is distinct from raster correctness. Input acknowledgement is not a presentation deadline; capture gaps may include dropped frames. Null means unobserved. These timestamps do not establish physical display latency.',
		}
		result.cleanup =
			'Dedicated browser process is disposed in finally; no control stylesheet restoration is used as baseline acceptance'
		result.interpretation =
			'First-entry fast frames are compared only with same-context post-capture settled rasters at independently identified matching scroll positions. External warm rasters are diagnostic only. Controls run afterward and cannot alter retained baseline frames; no physical-display FPS or uncaptured convergence is established.'
		result.maximumCapturedFrameGapMs =
			result.frames.length > 1
				? Math.max(
						...result.frames
							.slice(1)
							.map((frame, index) => (frame.timestamp - result.frames[index].timestamp) * 1000),
					)
				: null
		result.status =
			(result.mode !== 'baseline' && !result.controlsQualified) ||
			admitted.length < 3 ||
			result.signedTravel <= 0.5 ||
			result.frames.some(frame => frame.unidentifiedNearTarget)
				? 'instrument-rejected'
				: result.staleFrames
					? 'observed-same-context-fast-slow-mismatch'
					: 'observed-correct-at-admitted-poses'

		if (result.pageErrors.length && result.status === 'observed-correct-at-admitted-poses') {
			result.status = 'observed-page-error'
		}

		result.phase = 'source-recheck'
		await verifyServerSource(baseURL, source)
		result.phase = 'complete'
		result.complete = true

		if (result.mode !== 'baseline' && result.controlsQualified) {
			result.status = 'negative-control-qualified'
		}

		if (
			!['observed-correct-at-admitted-poses', 'negative-control-qualified'].includes(
				result.status,
			) ||
			result.errors.length
		) {
			result.failed = true
		}
	} catch (error) {
		result.status =
			error instanceof assert.AssertionError ? 'instrument-rejected' : 'execution-error'
		result.failure = {
			phase: result.phase,
			kind: error instanceof assert.AssertionError ? 'oracle-gate' : 'execution',
			message: error instanceof Error ? (error.stack ?? error.message) : String(error),
		}
		result.errors.push(result.failure.message)
		result.failed = true
	} finally {
		try {
			await browser?.close()
		} finally {
			result.browserClosed = !browser?.isConnected()
			result.capturedNativeFrames = capturedFrames.map(({ metadata }, index) => ({
				index,
				metadata,
			}))
			await mkdir(new URL('frames/', out), { recursive: true })

			for (const [index, frame] of capturedFrames.entries()) {
				await writeFile(
					new URL(`frames/${String(index).padStart(4, '0')}.png`, out),
					Buffer.from(frame.data, 'base64'),
				)
			}
			await writeFile(new URL('result.json', out), json(result))
		}
	}

	return result
}

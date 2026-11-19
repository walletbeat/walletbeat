import { setTimeout as delay } from 'node:timers/promises'

import type { CDPSession } from '@playwright/test'
import sharp from 'sharp'

import {
	observeStickyChain,
	qualifyNativeBreadcrumbClock,
} from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'
import { createNativeScreencast, type NativeFrame } from './fixtures/native-screencast'

test('native arrow paint interpolates with a blocked-main positive and CSS-auto negative', async ({
	browser,
	browserName,
	baseURL,
	source,
}, info) => {
	test.skip(
		browserName !== 'chromium',
		'This native paint observer uses Chromium CDP; other engines have native-path checks',
	)
	expect(baseURL).toBeTruthy()
	await info.attach('capture-source', {
		body: JSON.stringify(source),
		contentType: 'application/json',
	})
	await info.attach('capture-browser', {
		body: JSON.stringify({
			name: browserName,
			version: browser.version(),
			channel: info.project.use.channel ?? null,
			requestedExecutable: info.project.use.launchOptions?.executablePath ?? null,
		}),
		contentType: 'application/json',
	})
	const records: Record<string, unknown>[] = []

	for (const condition of ['blocked-positive', 'native-arrow', 'auto-control'] as const) {
		const viewport = { width: 690, height: 900 }
		const context = await browser.newContext({ viewport: null, reducedMotion: 'no-preference' })
		const frames: NativeFrame[] = [],
			errors: string[] = []
		let cdp: CDPSession | undefined
		let capture: ReturnType<typeof createNativeScreencast> | undefined
		let restoreCompletion: (() => Promise<unknown>) | undefined
		let active = false
		let primaryFailure: unknown
		const observation: Record<string, unknown> = { condition }

		records.push(observation)

		try {
			const page = await context.newPage()

			page.on('pageerror', error => errors.push(String(error)))
			const session = await context.newCDPSession(page)

			cdp = session
			const windowBefore = await page.evaluate(() => ({
				innerWidth,
				innerHeight,
				outerWidth,
				outerHeight,
				devicePixelRatio,
			}))
			const { windowId } = await session.send('Browser.getWindowForTarget')

			await session.send('Browser.setWindowBounds', {
				windowId,
				bounds: {
					width: viewport.width + windowBefore.outerWidth - windowBefore.innerWidth,
					height: viewport.height + windowBefore.outerHeight - windowBefore.innerHeight,
				},
			})
			const sized = await page.waitForFunction(
				size => innerWidth === size.width && innerHeight === size.height,
				viewport,
			)

			await sized.dispose()
			observation.window = {
				before: windowBefore,
				after: await page.evaluate(() => ({
					innerWidth,
					innerHeight,
					outerWidth,
					outerHeight,
					devicePixelRatio,
				})),
			}
			let point: { x: number; y: number } | null = null
			let href = ''
			let expectedEnd = 2217.5

			if (condition === 'blocked-positive') {
				await page.setContent(
					'<style>html,body{margin:0;overflow:hidden}#layout{height:900px;overflow:auto;scroll-behavior:smooth;scrollbar-width:none}#top{position:relative;height:7000px}</style><div id="layout"><div id="top"></div></div>',
				)
			} else {
				await page.goto(`${baseURL}/__wallet-page/software/?variant=MOBILE`)
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')
				await expect
					.poll(() => page.evaluate(qualifyNativeBreadcrumbClock))
					.toMatchObject({ resolved: true })
				await expect(page.getByRole('combobox', { name: 'Wallet version' })).toHaveValue('MOBILE')
				const initial = await page.locator('#top').evaluate(element => {
					const root = document.querySelector('#layout')!
					const link = element.querySelector<HTMLAnchorElement>('.pie-navigation a[href^="#"]')!
					const target = document.getElementById(decodeURIComponent(link.hash.slice(1)))!
					const style = getComputedStyle(target)
					const landing =
						target.getBoundingClientRect().top - Number.parseFloat(style.scrollMarginBlockStart)
					const currentRaw = getComputedStyle(element.querySelector('.page-navigation')!)
						.getPropertyValue('---pie-currentIndex')
						.trim()

					return {
						href: link.hash,
						scroll: root.scrollTop,
						currentRaw,
						current: Number(currentRaw),
						rootStart: root.getBoundingClientRect().top + root.clientTop,
						landing,
						targetHeight: target.getBoundingClientRect().height,
						query: location.search,
						hash: location.hash,
					}
				})

				observation.initial = initial
				expect(initial.currentRaw, 'The native current-state input is present').toMatch(/\S/)
				expect(Number.isFinite(initial.current)).toBe(true)
				expect(
					initial.current,
					'Before the first destination Next selects the first canonical link',
				).toBe(0)
				expect(initial.hash).toBe('')
				expect(initial.targetHeight).toBeGreaterThan(0)
				expect(initial.landing - initial.rootStart).toBeGreaterThan(50)
				await page
					.getByRole('button', { name: 'Previous rating section or attribute', exact: true })
					.click()
				await page.evaluate(
					() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
				)
				expect(new URL(page.url()).hash).toBe('')
				expect(new URL(page.url()).search).toBe(initial.query)
				expect(
					Math.abs(
						(await page.locator('#layout').evaluate(element => element.scrollTop)) - initial.scroll,
					),
				).toBeLessThan(0.5)
				const next = page.getByRole('button', {
					name: 'Next rating section or attribute',
					exact: true,
				})

				await next.hover()
				const box = await next.boundingBox()

				if (!box) {
					throw Error('Original Next button must have native pointer bounds')
				}

				point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
				href = initial.href
				expectedEnd = initial.scroll + initial.landing - initial.rootStart

				if (condition === 'auto-control') {
					await page.addStyleTag({ content: '#layout{scroll-behavior:auto!important}' })
				}
			}

			const setup = await page.evaluate(
				({ expectedEnd, viewport }) => {
					const root = document.getElementById('layout')!,
						top = document.getElementById('top')!
					const before = {
						extent: root.scrollHeight,
						width: root.scrollWidth,
						scroll: root.scrollTop,
					}
					const bar = document.createElement('i')
					const height = Math.ceil(
						Math.max(expectedEnd, before.scroll) +
							viewport.height +
							Math.abs(top.getBoundingClientRect().top + before.scroll) +
							1,
					)

					bar.setAttribute('aria-hidden', 'true')
					bar.style.cssText = `all:initial;display:block;position:absolute;left:0;top:0;width:8px;height:${height}px;z-index:2147483647;pointer-events:none;background:linear-gradient(in srgb,rgb(0 255 0),rgb(0 0 255))`
					top.append(bar)
					const box = bar.getBoundingClientRect()

					return {
						before,
						after: { extent: root.scrollHeight, width: root.scrollWidth, scroll: root.scrollTop },
						height,
						x: Math.floor(box.x + 4),
						y: Math.floor(viewport.height / 2),
						worldTop: box.top + root.scrollTop,
						behavior: getComputedStyle(root).scrollBehavior,
					}
				},
				{ expectedEnd, viewport },
			)

			observation.setup = setup
			expect(setup.after).toEqual(setup.before)
			expect(setup.behavior).toBe(condition === 'auto-control' ? 'auto' : 'smooth')
			const completion = await page.evaluateHandle(
				({ condition, href }) => {
					const root = document.getElementById('layout')!
					const target =
						condition === 'blocked-positive'
							? null
							: document.getElementById(decodeURIComponent(href.slice(1)))
					const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')

					const original: unknown = descriptor?.value

					if (!descriptor || typeof original !== 'function') {
						throw new Error('Native scrollIntoView must be an own prototype method')
					}

					let invokedAt: number | null = null
					let endedAt: number | null = null
					let resolve: () => void = () => {}
					const finished = new Promise<void>(done => {
						resolve = done
					})
					const listener = (event: Event) => {
						if (invokedAt === null || event.timeStamp < invokedAt) {
							return
						}

						endedAt = performance.now()
						root.removeEventListener('scrollend', listener)
						resolve()
					}
					const observe = function (this: Element, ...args: Parameters<Element['scrollIntoView']>) {
						if (this === target) {
							invokedAt = performance.now()
						}

						Reflect.apply(original, this, args)
					}

					if (target) {
						Element.prototype.scrollIntoView = observe
					}

					root.addEventListener('scrollend', listener, { passive: true })

					return {
						finished,
						positive(end: number) {
							root.scrollTo({ top: end, behavior: 'smooth' })
							invokedAt = performance.now()
							setTimeout(() => {
								const begin = performance.now()

								while (performance.now() - begin < 600) {
									/* Bounded blocked-main reader control. */
								}
								performance.measure('native-scroll-reader-block', {
									start: begin,
									end: performance.now(),
								})
							}, 100)
						},
						events() {
							return { invokedAt, endedAt }
						},
						restore() {
							if (target) {
								Object.defineProperty(Element.prototype, 'scrollIntoView', descriptor)
							}

							root.removeEventListener('scrollend', listener)
						},
					}
				},
				{ condition, href },
			)

			restoreCompletion = () => completion.evaluate(value => value.restore())
			const pixel = async (bytes: Buffer, metadata: NativeFrame['metadata']) => {
				expect({
					width: metadata.deviceWidth,
					height: metadata.deviceHeight,
					scale: metadata.pageScaleFactor,
					offset: metadata.offsetTop,
				}).toEqual({ width: viewport.width, height: viewport.height, scale: 1, offset: 0 })
				const png = await sharp(bytes).metadata()

				expect({ width: png.width, height: png.height }).toEqual(viewport)
				const [r, g, b, a] = await sharp(bytes)
					.ensureAlpha()
					.extract({ left: setup.x, top: setup.y, width: 1, height: 1 })
					.raw()
					.toBuffer()
				const valid = r <= 3 && Math.abs(g + b - 255) <= 3 && a === 255

				return { valid, blue: b, scroll: (b / 255) * setup.height - setup.y - 0.5 + setup.worldTop }
			}

			await session.send('Page.enable')
			capture = createNativeScreencast(session, viewport, frames, errors)
			await capture.start()
			active = true
			await capture.firstFrame
			const tolerance = setup.height / 255 + 1
			const first = await pixel(Buffer.from(frames[0].data, 'base64'), frames[0].metadata)

			expect(first.valid).toBe(true)
			expect(Math.abs(first.scroll - setup.before.scroll)).toBeLessThanOrEqual(tolerance)
			const startEpoch = Date.now()

			if (condition === 'blocked-positive') {
				await completion.evaluate((value, end) => value.positive(end), expectedEnd)
			} else {
				if (!point) {
					throw Error('Native control point missing')
				}

				await page.mouse.click(point.x, point.y)
			}

			let timer: ReturnType<typeof setTimeout> | undefined

			try {
				await Promise.race([
					completion.evaluate(async value => {
						await value.finished
					}),
					new Promise((_, reject) => {
						timer = setTimeout(() => reject(Error('Native scrollend missing')), 15000)
					}),
				])
			} finally {
				clearTimeout(timer)
			}

			await delay(250)
			observation.completion = await completion.evaluate(value => value.events())
			const endEpoch = Date.now()

			await session.send('Page.stopScreencast')
			active = false
			await Promise.all(capture.acknowledgements.splice(0))
			const referenceBytes = await page.screenshot({ scale: 'css' })
			const final = await page.evaluate(
				({ condition, href }) => {
					const root = document.getElementById('layout')!
					const target =
						condition === 'blocked-positive'
							? null
							: document.getElementById(decodeURIComponent(href.slice(1)))
					const style = getComputedStyle(root)
					const rawPadding = style.scrollPaddingBlockStart
					const padding = rawPadding === 'auto' ? 0 : Number.parseFloat(rawPadding)
					const rootTop = root.getBoundingClientRect().top + root.clientTop
					const margin = target
						? Number.parseFloat(getComputedStyle(target).scrollMarginBlockStart)
						: 0
					const targetTop = target?.getBoundingClientRect().top ?? 0
					const wanted = target ? root.scrollTop + targetTop - rootTop - padding - margin : 0
					const block = performance.getEntriesByName('native-scroll-reader-block').at(-1)

					return {
						scroll: root.scrollTop,
						extent: root.scrollHeight,
						hash: location.hash,
						query: location.search,
						landing: target
							? {
									targetTop,
									rootTop,
									padding,
									margin,
									clamped: Math.max(0, Math.min(root.scrollHeight - root.clientHeight, wanted)),
								}
							: null,
						block: block
							? {
									start: performance.timeOrigin + block.startTime,
									end: performance.timeOrigin + block.startTime + block.duration,
								}
							: null,
					}
				},
				{ condition, href },
			)

			observation.final = final
			expect(final.extent).toBe(setup.before.extent)
			expect(Math.abs(final.scroll - setup.before.scroll)).toBeGreaterThan(50)

			if (condition !== 'blocked-positive') {
				expect(final.hash).toBe(href)
				expect(new URLSearchParams(final.query).get('variant')).toBe('MOBILE')
				expect(final.landing).not.toBeNull()

				if (final.landing) {
					expect(Object.values(final.landing).every(Number.isFinite)).toBe(true)
					expect(
						Math.abs(final.scroll - final.landing.clamped),
						'The native target settles at its current landing inset',
					).toBeLessThanOrEqual(1)
				}

				const selector =
					'#' + (await page.evaluate(href => CSS.escape(decodeURIComponent(href.slice(1))), href))
				const chain = await page.evaluate(observeStickyChain, [
					{ level: 1, scope: '#top', heading: '#top h1' },
					{ level: 2, scope: selector, heading: `${selector} h2` },
				])

				observation.landingChain = chain
				const parent = chain.rows[0]
				const occupied = Math.max(chain.siteBottom, parent.occupiedRow.bottom)

				expect(
					Math.abs(chain.rows[1].scopeBox.top - occupied),
					'First canonical section clears the actual cumulative parent sticky row',
				).toBeLessThanOrEqual(3)
			} else {
				expect(Math.abs(final.scroll - expectedEnd)).toBeLessThanOrEqual(1)
			}

			const settled = await pixel(referenceBytes, frames.at(-1)!.metadata)

			expect(settled.valid).toBe(true)
			expect(Math.abs(settled.scroll - final.scroll)).toBeLessThanOrEqual(tolerance)
			const poses = []

			for (const frame of frames) {
				const measured = await pixel(Buffer.from(frame.data, 'base64'), frame.metadata)
				const epoch = (frame.metadata.timestamp ?? NaN) * 1000

				expect(Number.isFinite(epoch), 'Native frame timestamp must be present').toBe(true)

				if (epoch >= startEpoch && epoch <= endEpoch) {
					expect(measured.valid).toBe(true)
					poses.push({ ...measured, epoch })
				}
			}
			observation.poses = poses
			expect(poses.length, 'Actual input capture retains native paint samples').toBeGreaterThan(0)
			expect(
				Math.abs(poses.at(-1)!.scroll - final.scroll),
				'Last native capture frame reaches the independently settled root pose',
			).toBeLessThanOrEqual(tolerance)
			const low = Math.min(setup.before.scroll, final.scroll),
				high = Math.max(setup.before.scroll, final.scroll)
			const interior = poses.filter(
				pose => pose.scroll > low + 2 * tolerance && pose.scroll < high - 2 * tolerance,
			)
			const distinct = new Set(interior.map(pose => pose.blue)).size

			Object.assign(observation, { tolerance, distinct, poses })

			if (condition === 'blocked-positive') {
				expect(final.block, 'Blocked-main positive must actually execute').not.toBeNull()
				const blocked = interior.filter(
					pose => final.block && pose.epoch >= final.block.start && pose.epoch <= final.block.end,
				)

				expect(
					new Set(blocked.map(pose => pose.blue)).size,
					'Native reader must deliver intermediate paints while its known-positive main thread is blocked',
				).toBeGreaterThan(1)
			} else if (condition === 'auto-control') {
				expect(
					distinct,
					'Reader must reject CSS-auto teleport as interpolation',
				).toBeLessThanOrEqual(1)
			}

			expect(errors).toEqual([])
		} catch (error) {
			primaryFailure = error
			observation.failure = String(error)
			throw error
		} finally {
			const cleanupErrors: string[] = []

			try {
				if (active && cdp) {
					await cdp.send('Page.stopScreencast').catch(error => cleanupErrors.push(String(error)))
				}

				await Promise.all(capture?.acknowledgements.splice(0) ?? [])
				capture?.dispose()

				if (restoreCompletion) {
					await restoreCompletion().catch(error => cleanupErrors.push(String(error)))
				}
			} finally {
				try {
					await context.close()
				} catch (error) {
					cleanupErrors.push(String(error))
				} finally {
					for (const [index, frame] of frames.entries()) {
						await info
							.attach(`${condition}-${index}.png`, {
								body: Buffer.from(frame.data, 'base64'),
								contentType: 'image/png',
							})
							.catch(error => cleanupErrors.push(String(error)))
					}
					await info.attach(`${condition}-native-frames`, {
						body: JSON.stringify({
							observation,
							metadata: frames.map(frame => frame.metadata),
							errors,
							cleanupErrors,
						}),
						contentType: 'application/json',
					})
				}
			}

			if (!primaryFailure) {
				expect(cleanupErrors, 'Native capture and context disposal complete').toEqual([])
			}
		}
	}
	await info.attach('native-arrow-painted-interpolation', {
		body: JSON.stringify({
			records,
			limits:
				'Qualified native Chromium screen-capture observations only, not physical FPS or Firefox/Safari presentation. The blocked-JS positive does not prove liveness under every style/layout stall. Other performance requirements remain independently unverified.',
		}),
		contentType: 'application/json',
	})
	expect(
		records.find(record => record.condition === 'native-arrow')?.distinct,
		'No admitted painted interpolation: smoothness remains unverified; sparse native capture alone does not prove a physical jump',
	).toBeGreaterThan(1)
})

import { qualifyNativeBreadcrumbClock } from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

declare global {
	interface HTMLElement {
		arrowTrajectory?: { samples: number[]; ended: boolean }
	}
}

for (const width of [390, 1440]) {
	test(`real header composition and native input at ${width}px`, async ({ page }, info) => {
		await page.setViewportSize({ width, height: 900 })

		for (const fixture of ['software', 'longName', 'multipleTypes']) {
			await test.step(fixture, async () => {
				await page.goto(`/__wallet-page/${fixture}/`)
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				await page.evaluate(() => document.fonts.ready)
				await expect
					.poll(() => page.evaluate(qualifyNativeBreadcrumbClock))
					.toMatchObject({ resolved: true })
				await page
					.locator('#layout')
					.evaluate(element => element.scrollTo({ top: 0, behavior: 'instant' }))
				await expect
					.poll(() => page.locator('#layout').evaluate(element => element.scrollTop))
					.toBeLessThanOrEqual(2)
				const identity = await page.locator('#top h1').elementHandle()

				if (!identity) {
					throw new Error('Missing real wallet H1')
				}

				const observe = () =>
					page.locator('#top').evaluate(root => {
						const rectData = ({
							x,
							y,
							width,
							height,
							top,
							right,
							bottom,
							left,
						}: DOMRectReadOnly) => ({ x, y, width, height, top, right, bottom, left })

						const title = root.querySelector('h1 > a')!
						const label = title.querySelector('span')!
						const range = document.createRange()

						range.selectNodeContents(label)
						const main = document.querySelector('main')!.getBoundingClientRect()
						const aside = root.querySelector(':scope > aside')!.getBoundingClientRect()
						let left = main.left,
							right = main.right

						if (innerWidth > 1024) {
							if (aside.x + aside.width / 2 > main.x + main.width / 2) {
								right = aside.left
							} else {
								left = aside.right
							}
						}

						const labels = [...range.getClientRects()]
							.filter(box => box.width > 0 && box.height > 0)
							.map(box => {
								const x = box.x + box.width / 2,
									y = box.y + box.height / 2

								return {
									...rectData(box),
									hit: document.elementFromPoint(x, y)?.closest('a') === title,
									obstruction: document.elementFromPoint(x, y)?.outerHTML.slice(0, 300),
								}
							})
						const badges = [
							...root.querySelectorAll(
								':scope > header [data-badge], :scope > .wallet-header-flow [data-badge]',
							),
						].map(badge => {
							const box = badge.getBoundingClientRect()
							const walker = document.createTreeWalker(badge, NodeFilter.SHOW_TEXT)
							const text: ReturnType<typeof rectData>[] = []

							for (let node = walker.nextNode(); node; node = walker.nextNode()) {
								if (!node.textContent?.trim()) {
									continue
								}

								const range = document.createRange()

								range.selectNodeContents(node)
								text.push(...[...range.getClientRects()].map(rect => rectData(rect)))
							}

							return {
								text: badge.textContent?.trim(),
								box: rectData(box),
								linesOverlap:
									text.length > 0 &&
									Math.max(...text.map(rect => rect.top)) <
										Math.min(...text.map(rect => rect.bottom)),
							}
						})
						const titleRow = title.closest('.wallet-title-row')!
						const identityBox = title.getBoundingClientRect()
						const compositionBox = title.closest('h1')!.getBoundingClientRect()
						const iconBox = title.querySelector('img')!.getBoundingClientRect()
						const visibleIdentity = {
							left: Math.min(iconBox.left, ...labels.map(line => line.left)),
							right: Math.max(iconBox.right, ...labels.map(line => line.right)),
							top: Math.min(iconBox.top, ...labels.map(line => line.top)),
							bottom: Math.max(iconBox.bottom, ...labels.map(line => line.bottom)),
						}
						const controls = [...titleRow.querySelectorAll<HTMLSelectElement>('select')].map(
							select => {
								const box = select.getBoundingClientRect()
								const hits: { x: number; y: number }[] = []

								for (const fraction of [0.25, 0.5, 0.75]) {
									const y = box.top + box.height * fraction

									if (y < 0 || y >= innerHeight) {
										continue
									}

									for (
										let x = Math.max(0, box.left);
										x <= Math.min(innerWidth - 1, box.right);
										x += 2
									) {
										const hit = document.elementFromPoint(x, y)

										if (hit === select || hit?.closest('select') === select) {
											hits.push({ x, y })
										}
									}
								}

								return {
									name: select.getAttribute('aria-label'),
									box: rectData(box),
									hits,
									clip: getComputedStyle(select).clipPath,
									sameRow: select.closest('.wallet-title-row') === titleRow,
								}
							},
						)
						const layout = document.getElementById('layout')!
						const offenders = [...document.querySelectorAll<HTMLElement>('main *')]
							.filter(element => {
								if (
									!element.checkVisibility({ checkVisibilityCSS: true }) ||
									element.closest('[aria-hidden="true"], .pie-navigation')
								) {
									return false
								}

								const box = element.getBoundingClientRect()

								return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1)
							})
							.slice(0, 20)
							.map(element => ({
								tag: element.tagName,
								id: element.id,
								class: element.className,
								text: element.textContent?.trim().slice(0, 80),
								box: rectData(element.getBoundingClientRect()),
							}))

						return {
							labels,
							visibleIdentity,
							title: rectData(identityBox),
							compositionBox: rectData(compositionBox),
							bounds: { left, right },
							badges,
							controls,
							rowGap: Number.parseFloat(getComputedStyle(titleRow).columnGap) || 0,
							direction: getComputedStyle(titleRow).direction,
							overflow: {
								document:
									document.documentElement.scrollWidth - document.documentElement.clientWidth,
								root: layout.scrollWidth - layout.clientWidth,
								offenders,
							},
							h1Count: document.querySelectorAll('h1').length,
						}
					})
				const checkTitle = (state: Awaited<ReturnType<typeof observe>>) => {
					expect(state.h1Count).toBe(1)
					expect(state.overflow.document, JSON.stringify(state.overflow)).toBeLessThanOrEqual(1)
					expect(state.overflow.root, JSON.stringify(state.overflow)).toBeLessThanOrEqual(1)

					for (const control of state.controls) {
						expect(control.sameRow, control.name ?? 'native selector').toBe(true)
						expect(
							control.hits.length,
							`${control.name}: actual native select hit region must remain visible; ${JSON.stringify(control)}`,
						).toBeGreaterThan(0)
						expect(
							Math.min(control.box.bottom, state.visibleIdentity.bottom) -
								Math.max(control.box.top, state.visibleIdentity.top),
							'H1 and device selector remain on the same visible row',
						).toBeGreaterThan(0)
					}
					const adjacent = state.controls[0]

					if (adjacent) {
						const visibleEdge =
							state.direction === 'rtl'
								? Math.max(...adjacent.hits.map(point => point.x))
								: Math.min(...adjacent.hits.map(point => point.x))
						const titleEdge =
							state.direction === 'rtl' ? state.compositionBox.left : state.compositionBox.right
						const gap = (visibleEdge - titleEdge) * (state.direction === 'rtl' ? -1 : 1)

						expect(
							gap,
							JSON.stringify({
								compositionBox: state.compositionBox,
								paintedIdentity: state.visibleIdentity,
								adjacent,
								gap,
							}),
						).toBeGreaterThanOrEqual(-3)
						expect(
							gap,
							'Device selector stays adjacent to H1 instead of moving to an unrelated page edge',
						).toBeLessThanOrEqual(Math.max(16, state.rowGap + 3))
					}

					expect(state.labels.length).toBeGreaterThan(0)

					for (const label of state.labels) {
						expect(label.left).toBeGreaterThanOrEqual(state.bounds.left - 1)
						expect(label.right).toBeLessThanOrEqual(state.bounds.right + 1)
						expect(
							label.hit,
							'Every real title line remains an unobstructed native link target',
						).toBe(true)
					}
				}
				const flow = await observe()

				await info.attach(`${fixture}-initial-geometry`, {
					body: JSON.stringify(flow),
					contentType: 'application/json',
				})
				checkTitle(flow)

				for (const badge of flow.badges) {
					expect(badge.linesOverlap, badge.text).toBe(true)
				}
				const root = page.locator('#layout')
				const wheel = async (delta: number, state: typeof flow) => {
					const point = state.labels.find(label => label.top >= 0 && label.bottom <= 900)

					if (!point) {
						throw new Error('The real header has no visible wheel-input point')
					}

					await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2)
					const before = await root.evaluate(element => {
						element.setAttribute('data-test-scrollend', 'pending')
						element.addEventListener(
							'scrollend',
							() => element.setAttribute('data-test-scrollend', 'complete'),
							{ once: true },
						)

						return element.scrollTop
					})

					await page.mouse.wheel(0, delta)

					if (delta > 0) {
						await expect
							.poll(() => root.evaluate(element => element.scrollTop))
							.toBeGreaterThan(before)
					} else {
						await expect
							.poll(() => root.evaluate(element => element.scrollTop))
							.toBeLessThan(before)
					}

					await expect(root).toHaveAttribute('data-test-scrollend', 'complete')
				}

				await wheel(600, flow)
				const compact = await observe()

				checkTitle(compact)
				await wheel(-600, compact)
				const reversed = await observe()

				await info.attach(`header-reversed-${fixture}-${width}`, {
					body: JSON.stringify(reversed),
					contentType: 'application/json',
				})
				checkTitle(reversed)
				const picker = page.locator('#top > header select').first()

				if (await picker.count()) {
					const desired = await picker
						.locator('option')
						.nth(1)
						.evaluate((option: HTMLOptionElement) => ({
							key: option.label.trim()[0]?.toLowerCase(),
							value: option.value,
						}))

					if (!desired.key) {
						throw new Error('The native option has no type-ahead label')
					}

					await picker.focus()
					await page.keyboard.press(desired.key)
					await page.keyboard.press('Enter')
					await expect.poll(() => picker.inputValue()).toBe(desired.value)
					await expect
						.poll(() => new URL(page.url()).searchParams.get('variant'))
						.toBe(await picker.inputValue())
				}

				expect(
					await identity.evaluate(
						element => element.isConnected && element.closest('#top > header') !== null,
					),
				).toBe(true)
				await info.attach(`${fixture}-header-geometry`, {
					body: JSON.stringify({ flow, compact, reversed }),
					contentType: 'application/json',
				})
			})
		}
	})
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test(`native section arrow trajectory with ${reducedMotion} motion`, async ({ page }, info) => {
		await page.setViewportSize({ width: 390, height: 900 })
		await page.emulateMedia({ reducedMotion })
		await page.goto('/__wallet-page/software/?variant=MOBILE')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		await expect
			.poll(() => page.evaluate(qualifyNativeBreadcrumbClock))
			.toMatchObject({ resolved: true })
		await expect(page.getByRole('combobox', { name: 'Wallet version' })).toHaveValue('MOBILE')
		const original = await page.locator('#top').elementHandle()
		const search = new URL(page.url()).search
		const initial = await page.locator('#top').evaluate(element => {
			const root = document.querySelector<HTMLElement>('#layout')!,
				owner = element.querySelector('.page-navigation')!,
				first = element.querySelector<HTMLAnchorElement>('.pie-navigation a[href^="#"]')!
			const target = document.getElementById(decodeURIComponent(first.hash.slice(1)))

			if (!target) {
				throw new Error('The first canonical destination must exist')
			}

			const style = getComputedStyle(target),
				box = target.getBoundingClientRect()

			return {
				href: first.getAttribute('href')!,
				scroll: root.scrollTop,
				current: Number(getComputedStyle(owner).getPropertyValue('---pie-currentIndex')),
				firstLanding: box.top - parseFloat(style.scrollMarginBlockStart),
				rootStart: root.getBoundingClientRect().top + root.clientTop,
				targetHeight: box.height,
			}
		})

		expect(initial.current, 'The initial pose has no current semantic destination').toBe(0)
		expect(initial.targetHeight).toBeGreaterThan(0)
		expect(
			initial.firstLanding - initial.rootStart,
			'The first destination has not been reached',
		).toBeGreaterThan(50)
		expect(new URL(page.url()).hash).toBe('')
		await page
			.getByRole('button', { name: 'Previous rating section or attribute', exact: true })
			.click()
		await page.evaluate(
			() =>
				new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				),
		)
		expect(new URL(page.url()).hash, 'Previous before the first destination is a no-op').toBe('')
		expect(new URL(page.url()).search).toBe(search)
		expect(
			Math.abs(
				(await page.locator('#layout').evaluate(element => element.scrollTop)) - initial.scroll,
			),
		).toBeLessThan(0.5)

		const next = page.getByRole('button', { name: 'Next rating section or attribute', exact: true })

		await expect(next).toBeVisible()
		await next.hover()
		const root = page.locator('#layout')

		await root.evaluate(element => {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Scroll owner must be an HTML element')
			}

			const owner = element
			const trajectory = { samples: [owner.scrollTop], ended: false }

			owner.arrowTrajectory = trajectory
			owner.addEventListener(
				'scrollend',
				() => {
					trajectory.ended = true
				},
				{ once: true },
			)
			const sample = () => {
				trajectory.samples.push(owner.scrollTop)

				if (!trajectory.ended) {
					requestAnimationFrame(sample)
				}
			}

			requestAnimationFrame(sample)
		})
		await next.click()
		await expect.poll(() => new URL(page.url()).hash).toBe(initial.href)
		expect(new URL(page.url()).search).toBe(search)
		expect(
			await page.locator('#top').evaluate((element, original) => element === original, original),
		).toBe(true)
		await expect
			.poll(() =>
				root.evaluate(element => {
					if (!(element instanceof HTMLElement) || !element.arrowTrajectory) {
						throw new Error('Missing native arrow trajectory')
					}

					return element.arrowTrajectory.ended
				}),
			)
			.toBe(true)
		const trajectory = await root.evaluate(element => {
			if (!(element instanceof HTMLElement) || !element.arrowTrajectory) {
				throw new Error('Missing native arrow trajectory')
			}

			return element.arrowTrajectory
		})

		await info.attach('native-arrow-trajectory', {
			body: JSON.stringify({ reducedMotion, hash: new URL(page.url()).hash, ...trajectory }),
			contentType: 'application/json',
		})
		const start = trajectory.samples[0],
			end = await root.evaluate(element => element.scrollTop)

		expect(
			Math.abs(end - start),
			'Arrow must navigate to another actual destination',
		).toBeGreaterThan(50)

		if (reducedMotion === 'no-preference') {
			const low = Math.min(start, end),
				high = Math.max(start, end)
			const intermediate = trajectory.samples.filter(
				position => position > low + 2 && position < high - 2,
			)

			expect(
				new Set(intermediate.map(position => Math.round(position))).size,
				'Native arrow navigation must traverse intermediate positions rather than jump',
			).toBeGreaterThan(1)
		}
	})
}

for (const width of [390, 690]) {
	test(`sticky wallet identity shares the painted navigation baseline at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 1199 })
		await page.goto('/__wallet-page/software/?variant=MOBILE')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		await expect
			.poll(() => page.evaluate(qualifyNativeBreadcrumbClock))
			.toMatchObject({ resolved: true })
		test.skip(
			!(await page.evaluate(() =>
				CSS.supports('color', 'if(style(--native: 1): red; else: blue)'),
			)),
			'Native compact identity requires style-query values',
		)
		await page.mouse.move(20, 700)
		await page.mouse.wheel(0, 6000)
		await expect
			.poll(() => page.locator('#layout').evaluate(element => element.scrollTop))
			.toBeGreaterThan(1000)
		const observe = () =>
			page.evaluate(() => {
				const rectData = ({ x, y, width, height, top, right, bottom, left }: DOMRectReadOnly) => ({
					x,
					y,
					width,
					height,
					top,
					right,
					bottom,
					left,
				})
				const title = document.querySelector('#top h1')!.getBoundingClientRect()
				const navigation = document.querySelector('#nav > header')!.getBoundingClientRect()
				const label = document.querySelector('#top h1 span')!
				const range = document.createRange()

				range.selectNodeContents(label)
				const glyphs = range.getBoundingClientRect()
				const titleCenter = title.top + title.height / 2

				return {
					title: rectData(title),
					navigation: rectData(navigation),
					glyphs: rectData(glyphs),
					delta: titleCenter - navigation.top - navigation.height / 2,
					hit: Boolean(
						document
							.elementFromPoint(glyphs.left + glyphs.width / 2, glyphs.top + glyphs.height / 2)
							?.closest('h1'),
					),
				}
			})

		try {
			await expect
				.poll(
					async () => Math.abs((await observe()).delta),
					'The painted identity must share the actual site-header baseline',
				)
				.toBeLessThan(1)
		} finally {
			await info.attach('painted-navigation-baseline', {
				body: JSON.stringify(await observe()),
				contentType: 'application/json',
			})
			await info.attach('painted-navigation-baseline-frame', {
				body: await page.screenshot(),
				contentType: 'image/png',
			})
		}

		expect((await observe()).glyphs.width).toBeGreaterThan(0)
		expect((await observe()).glyphs.height).toBeGreaterThan(0)
		expect(
			(await observe()).hit,
			'The visible wallet label must remain painted and hit-testable',
		).toBe(true)
	})
}

for (const width of [390, 600, 690]) {
	test(`native identity compaction retains its normal-flow reservation at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		await expect
			.poll(() => page.evaluate(qualifyNativeBreadcrumbClock))
			.toMatchObject({ resolved: true })
		const root = page.locator('#layout')

		await root.evaluate(element => {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Scroll owner must be an HTML element')
			}

			element.style.scrollSnapType = 'none'
		})
		const seek = async (top: number) =>
			root.evaluate(async (element, top) => {
				element.scrollTo({ top, behavior: 'instant' })
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
			}, top)
		const observe = () =>
			page.evaluate(() => {
				const rect = ({ x, y, width, height, top, right, bottom, left }: DOMRectReadOnly) => ({
					x,
					y,
					width,
					height,
					top,
					right,
					bottom,
					left,
				})
				const root = document.querySelector('#layout')!
				const header = document.querySelector('#top > header')!
				const title = document.querySelector<HTMLElement>('#top h1')!
				const source = document.querySelector<HTMLElement>('.wallet-title-source')!
				const flow = document.querySelector(
					'#top > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
				)!
				const controls = [
					...document.querySelectorAll<HTMLSelectElement>('.wallet-device-controls select'),
				].map(select => ({
					name: select.getAttribute('aria-label'),
					box: rect(select.getBoundingClientRect()),
					progress: select
						.getAnimations()
						.filter(
							animation =>
								animation instanceof CSSAnimation &&
								animation.animationName === 'select-compact-box',
						)
						.map(animation => animation.effect?.getComputedTiming().progress),
				}))

				return {
					scroll: root.scrollTop,
					range: root.scrollHeight - root.clientHeight,
					supportWorld: [
						...document.querySelectorAll(
							'#top > header [data-sticky-breadcrumb~="support"], #top > .wallet-header-flow [data-sticky-breadcrumb~="support"]',
						),
					].map(element => element.getBoundingClientRect().top + root.scrollTop),
					stageWorld:
						document.querySelector('#stages')!.getBoundingClientRect().top + root.scrollTop,
					sourceHeight: source.offsetHeight,
					titleHeight: title.offsetHeight,
					contact: Math.max(
						0,
						root.scrollTop +
							header.getBoundingClientRect().top -
							document.querySelector('#nav > header')!.getBoundingClientRect().bottom,
					),
					compactBound: Math.min(
						root.scrollHeight - root.clientHeight,
						Math.ceil(root.scrollTop + flow.getBoundingClientRect().bottom + root.clientHeight),
					),
					controls,
				}
			})

		await seek(0)
		const natural = await observe()

		expect(natural.controls.length).toBeGreaterThan(0)
		expect(natural.supportWorld.length).toBeGreaterThan(0)
		const observations = [{ phase: 'natural', requested: 0, ...natural }]

		for (const [phase, requested] of [
			['contact', natural.contact],
			['compact', natural.compactBound],
			['reverse', 0],
		] as const) {
			await seek(requested)
			const actual = await observe()

			observations.push({ phase, requested, ...actual })
		}
		await info.attach('identity-normal-flow-reservation', {
			body: JSON.stringify(observations, null, 2),
			contentType: 'application/json',
		})

		for (const state of observations) {
			for (const [index, world] of state.supportWorld.entries()) {
				expect(
					Math.abs(world - natural.supportWorld[index]),
					`${state.phase}: supporting content retains ordinary document travel`,
				).toBeLessThanOrEqual(1)
			}
			expect(
				Math.abs(state.scroll - state.requested),
				`${state.phase}: the native root delivers the requested bounded position`,
			).toBeLessThanOrEqual(1)
			expect(
				Math.abs(state.stageWorld - natural.stageWorld),
				`${state.phase}: downstream Stage retains its world position`,
			).toBeLessThanOrEqual(1)
			expect(state.sourceHeight, `${state.phase}: source allocation remains natural`).toBe(
				natural.sourceHeight,
			)
			expect(state.titleHeight, `${state.phase}: H1 natural layout remains allocated`).toBe(
				natural.titleHeight,
			)

			if (state.phase === 'compact') {
				for (const control of state.controls) {
					if (control.progress.length) {
						expect(
							control.progress,
							`${control.name}: actual native producer reaches its compact endpoint`,
						).toEqual([1])
						expect(
							Math.abs(control.box.width - control.box.height),
							`${control.name}: actual compact native box is square`,
						).toBeLessThanOrEqual(1)
					} else {
						expect(
							control.box.width,
							'Native fallback controls retain real geometry',
						).toBeGreaterThan(0)
						expect(control.box.height).toBeGreaterThan(0)
					}
				}
			}
		}
	})
}

test('wallet height measurement resolves at the shared layout owner across breakpoints', async ({
	page,
}) => {
	await page.goto('/metamask/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	test.skip(
		await page.evaluate(
			() =>
				!CSS.supports(
					'(animation-timeline: scroll()) and (animation-range: 0% 100%) and ' +
						'(width: anchor-size(--breadcrumb-source inline)) and (timeline-scope: --breadcrumb-size) and ' +
						'(color: if(style(---breadcrumb-wrap: 1): red; else: blue))',
				) ||
				(CSS.supports('timeline-scope: all') && CSS.supports("view-timeline-name: ident('a' 'b')")),
		),
		'This check covers explicit named-timeline fallback ownership',
	)

	for (const width of [390, 933, 1024, 1025, 1440, 390]) {
		await page.setViewportSize({ width, height: 1203 })
		await expect
			.poll(() =>
				page.evaluate(() => {
					const layout = document.getElementById('layout')!
					const clocks = layout
						.getAnimations()
						.filter(
							animation =>
								animation instanceof CSSAnimation &&
								animation.animationName === 'breadcrumb-item-block',
						)

					if (innerWidth > 1024) {
						return clocks.length === 0
					}

					if (clocks.length !== 1) {
						return false
					}

					const clock = clocks[0]
					const timeline = clock.timeline
					const subject = timeline instanceof ViewTimeline ? timeline.subject : null
					const producer = subject?.tagName === '::after' ? subject.parentElement : subject

					return (
						timeline instanceof ViewTimeline &&
						timeline.source === document.scrollingElement &&
						timeline.axis === 'inline' &&
						producer === document.getElementById('top') &&
						getComputedStyle(producer!, '::after').viewTimelineName === '--wallet-item-block' &&
						clock.effect?.getComputedTiming().progress !== null &&
						getComputedStyle(layout)
							.getPropertyValue('timeline-scope')
							.split(',')
							.map(value => value.trim())
							.includes('--wallet-item-block') &&
						!getComputedStyle(document.body)
							.getPropertyValue('timeline-scope')
							.split(',')
							.map(value => value.trim())
							.includes('--wallet-item-block')
					)
				}),
			)
			.toBe(true)
	}
})

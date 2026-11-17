import type { Page, TestInfo } from '@playwright/test'

import {
	observeStickyChain,
	qualifyNativeBreadcrumbClock,
} from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 934, 1440]) {
	test(`page-start snapping preserves the natural header at ${width}px`, async ({ page }, info) => {
		await page.setViewportSize({ width, height: 900 })

		for (const wallet of ['rainbow', 'metamask']) {
			await page.goto(`/${wallet}/#top`, { waitUntil: 'domcontentloaded' })
			const root = page.locator('#layout')
			const start = page.locator('#top')
			const quiet = await root.evaluateHandle(element => {
				let changed = performance.now()
				let deadline = changed + 15000
				const record = () => {
					changed = performance.now()
				}

				element.addEventListener('scroll', record, { passive: true })
				element.addEventListener('scrollend', record)

				const reset = () => {
					changed = performance.now()
					deadline = changed + 15000
				}

				return {
					reset,
					request: () => {
						reset()
						element.scrollTo({ top: 1, behavior: 'instant' })
						changed = performance.now()
					},
					wait: async () => {
						while (performance.now() - changed < 320) {
							if (performance.now() >= deadline) {
								throw new Error('Page-start scrolling did not settle')
							}

							await new Promise(resolve => setTimeout(resolve, 80))
						}

						const position = element.scrollTop

						if (performance.now() >= deadline) {
							throw new Error('Page-start observation exceeded its deadline')
						}

						return position
					},
					dispose: () => {
						element.removeEventListener('scroll', record)
						element.removeEventListener('scrollend', record)
					},
				}
			})

			try {
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				await page.evaluate(() => document.fonts.ready)
				expect(
					await root.evaluate(element => element.scrollHeight - element.clientHeight),
				).toBeGreaterThan(1)
				const settle = async () => {
					expect(Math.abs(await quiet.evaluate(state => state.wait()))).toBeLessThan(0.5)
				}

				await quiet.evaluate(state => state.reset())
				await settle()
				await quiet.evaluate(state => state.request())
				await settle()
				const observation = await start.evaluate(element => {
					const header = element.querySelector(':scope > header')!
					const h1 = header.querySelector('h1')!
					const port = document.querySelector('#layout')!
					const portStart =
						port.getBoundingClientRect().top +
						parseFloat(getComputedStyle(port).scrollPaddingBlockStart)

					return {
						top: element.getBoundingClientRect().top,
						header: header.getBoundingClientRect().top,
						h1: h1.getBoundingClientRect().top,
						margin: parseFloat(getComputedStyle(element).scrollMarginBlockStart),
						hydrated: !element.closest('astro-island')?.hasAttribute('ssr'),
						portHeight: port.clientHeight,
						startAreas: [element, ...element.children]
							.filter(target => {
								const style = getComputedStyle(target)

								return (
									style.scrollSnapAlign.split(/\s+/)[0] === 'start' &&
									target.getBoundingClientRect().height > 0 &&
									target.getBoundingClientRect().top -
										portStart -
										parseFloat(style.scrollMarginBlockStart) <=
										1
								)
							})
							.map(target => target.getBoundingClientRect().height),
					}
				})

				expect(observation.top).toBeGreaterThanOrEqual(observation.margin - 1)
				expect(observation.header).toBeGreaterThanOrEqual(observation.top - 1)
				expect(observation.h1).toBeGreaterThanOrEqual(observation.header - 1)

				if ((await page.evaluate(qualifyNativeBreadcrumbClock)).applicable) {
					expect(observation.startAreas, 'One bounded area owns the page-start stop').toHaveLength(
						1,
					)
					expect(observation.startAreas[0]).toBeLessThan(observation.portHeight)
				}

				await info.attach(`${wallet}-page-start`, {
					body: JSON.stringify(observation),
					contentType: 'application/json',
				})
			} finally {
				try {
					await quiet.evaluate(state => state.dispose())
				} finally {
					await quiet.dispose()
				}
			}
		}
	})
}

function observePaintedPieBackdrop(enhanced: boolean) {
	if (
		!enhanced ||
		!CSS.supports('clip-path', 'shape(from 0 0, line to 1px 1px, close)') ||
		!matchMedia('(width <= 84rem)').matches
	) {
		return { applicable: false, reason: 'Persistent mobile pie is not applicable' } as const
	}

	const pie = document.querySelector('.pie-navigation')
	const compact = pie?.querySelector(':scope > .pie-navigation-geometry')
	const geometry = compact?.querySelector(':scope > .navigation-items')

	if (!pie || !compact || !geometry) {
		throw new Error('The pie backdrop and its geometry owner are required')
	}

	const paint = getComputedStyle(compact, '::before')
	const owner = getComputedStyle(geometry)
	const properties = [
		'position',
		'top',
		'height',
		'width',
		'transform',
		'transform-origin',
		'translate',
		'scale',
		'rotate',
		'box-sizing',
	]
	const inputs = Object.fromEntries(
		properties.map(property => [
			property,
			{
				paint: paint.getPropertyValue(property),
				owner: owner.getPropertyValue(property),
			},
		]),
	)
	const rect = geometry.getBoundingClientRect()
	const clip = /^circle\((\d+(?:\.\d+)?)px(?: at 50% 50%)?\)$/.exec(paint.clipPath)
	const matrix = new DOMMatrixReadOnly(owner.transform === 'none' ? undefined : owner.transform)
	const visiblePaint =
		paint.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
		(paint.backdropFilter !== '' && paint.backdropFilter !== 'none')
	const diagnostics = {
		inputs,
		clip: paint.clipPath,
		content: paint.content,
		display: paint.display,
		visibility: paint.visibility,
		opacity: paint.opacity,
		background: paint.backgroundColor,
		backdropFilter: paint.backdropFilter,
		rect: {
			top: rect.top,
			bottom: rect.bottom,
			left: rect.left,
			right: rect.right,
			width: rect.width,
			height: rect.height,
		},
	}

	if (
		pie.matches('[data-wallet-toc-state="open"], [data-wallet-toc-state="closing"]') ||
		Object.values(inputs).some(input => input.paint !== input.owner) ||
		getComputedStyle(compact).position !== 'fixed' ||
		!compact.hasAttribute('data-sticky') ||
		owner.position !== 'absolute' ||
		owner.boxSizing !== 'border-box' ||
		owner.rotate !== 'none' ||
		owner.scale !== 'none' ||
		!matrix.is2D ||
		matrix.b !== 0 ||
		matrix.c !== 0 ||
		matrix.a <= 0 ||
		matrix.a !== matrix.d ||
		!clip ||
		Math.abs(Number(clip[1]) * 2 - Number.parseFloat(paint.height)) > 0.01 ||
		!pie.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) ||
		!geometry.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) ||
		!paint.content ||
		paint.content === 'none' ||
		paint.content === 'normal' ||
		paint.display === 'none' ||
		paint.visibility !== 'visible' ||
		Number(paint.opacity) <= 0 ||
		!visiblePaint ||
		![rect.top, rect.bottom, rect.height].every(Number.isFinite) ||
		rect.height <= 0 ||
		rect.bottom <= 0 ||
		rect.top >= innerHeight
	) {
		throw new Error('Unqualified persistent painted pie backdrop: ' + JSON.stringify(diagnostics))
	}

	return { applicable: true, bottom: rect.bottom, diagnostics } as const
}

function observeScroll(page: Page) {
	return page.locator('#layout').evaluateHandle(root => {
		let scroll: number | null = null
		let position: number | null = null
		const events: { type: string; position: number; time: number }[] = []
		const record = (type: string) => {
			events.push({ type, position: root.scrollTop, time: performance.now() })

			if (events.length > 32) {
				events.shift()
			}
		}
		const onScroll = () => {
			scroll = null
			position = root.scrollTop
			record('scroll')
		}
		const onEnd = () => {
			scroll = root.scrollTop
			record('scrollend')
		}

		root.addEventListener('scroll', onScroll)
		root.addEventListener('scrollend', onEnd)

		return {
			snapshot: () => ({
				actual: root.scrollTop,
				delivered: position,
				ended: scroll,
				events: [...events],
			}),
			reset: () => {
				position = null
				scroll = null
				events.length = 0
			},
			dispose: () => {
				root.removeEventListener('scroll', onScroll)
				root.removeEventListener('scrollend', onEnd)
			},
		}
	})
}

async function finishScroll(
	observation: Awaited<ReturnType<typeof observeScroll>>,
	info: TestInfo,
	name: string,
	evidence: unknown,
	errors: unknown[],
) {
	for (const operation of [
		() => info.attach(name, { body: JSON.stringify(evidence), contentType: 'application/json' }),
		() => observation.evaluate(state => state.dispose()),
		() => observation.dispose(),
	]) {
		try {
			await operation()
		} catch (error) {
			errors.push(error)
		}
	}

	if (errors.length) {
		throw new AggregateError(errors, 'Scroll journey or observation cleanup failed')
	}
}

async function expectKeyboardTravel(page: Page, info: TestInfo) {
	const ended = await observeScroll(page)
	const landings: {
		from: number
		observation: { actual: number; delivered: number | null; ended: number | null } | null
	}[] = []
	const errors: unknown[] = []
	let attemptedKeys = 0
	let completedKeys = 0
	let lastObservation: { actual: number; delivered: number | null; ended: number | null } | null =
		null

	try {
		const root = page.locator('#layout')
		const content = page.locator('#content')

		await content.evaluate(element => element.focus({ preventScroll: true }))
		await expect(content).toBeFocused()
		let previousLanding = await root.evaluate(element => element.scrollTop)

		for (let batch = 0; batch < 2; batch++) {
			await ended.evaluate(state => state.reset())

			for (let key = 0; key < 5; key++) {
				attemptedKeys++
				await page.keyboard.press('ArrowDown', { delay: 100 })
				completedKeys++
			}
			let stableSamples = 0
			let previous = Number.NaN

			await expect
				.poll(
					async () => {
						lastObservation = await ended.evaluate(state => state.snapshot())
						const { actual: position, delivered } = lastObservation

						stableSamples =
							position > previousLanding + 1 && delivered === position && previous === position
								? stableSamples + 1
								: 0
						previous = position

						return stableSamples
					},
					{
						message: 'Repeated Arrow Down continues after four quiet position samples',
						intervals: [80],
					},
				)
				.toBeGreaterThanOrEqual(4)
			landings.push({ from: previousLanding, observation: lastObservation })
			previousLanding = await root.evaluate(element => element.scrollTop)
		}
	} catch (error) {
		errors.push(error)
	} finally {
		await finishScroll(
			ended,
			info,
			'keyboard-landings',
			{
				landings,
				attemptedKeys,
				completedKeys,
				lastObservation,
			},
			errors,
		)
	}
}

for (const width of [390, 690, 1440]) {
	test(`native summary measurements belong to every rendered sticky owner at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/credits/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const nativeH4Sizes = await page
			.locator(
				'#top [data-sticky-container]:not([data-sticky-breadcrumb]):has(> summary[data-sticky~="block-start"] h4)',
			)
			.evaluateAll(elements =>
				elements.flatMap(element => {
					const summary = element.querySelector(':scope > summary')

					if (!element.matches('details[open]') || !summary?.checkVisibility()) {
						return []
					}

					const box = summary.getBoundingClientRect()

					if (!(box.width > 0 && box.height > 0)) {
						return []
					}

					return [
						{
							id: element.id,
							sticky: getComputedStyle(summary).position === 'sticky',
							enhanced:
								getComputedStyle(element.closest('[data-sticky-breadcrumb~="scope"]') ?? element)
									.getPropertyValue('--sticky-position')
									.trim() === 'sticky',
							actualHeight: box.height,
							measuredHeight: getComputedStyle(element)
								.getPropertyValue('---breadcrumb-itemHeight')
								.trim(),
						},
					]
				}),
			)

		await info.attach('native-h4-size-ownership', {
			body: JSON.stringify(nativeH4Sizes),
			contentType: 'application/json',
		})

		expect(
			nativeH4Sizes.length,
			'The fixture exposes rendered open native summaries',
		).toBeGreaterThan(0)

		for (const owner of nativeH4Sizes) {
			if (!owner.enhanced) {
				continue
			}

			expect(owner.sticky, `${owner.id} participates in its enabled sticky scope`).toBe(true)
			expect(
				/^-?(?:\d+(?:\.\d*)?|\.\d+)px$/.test(owner.measuredHeight),
				`${owner.id} native header measurement resolves`,
			).toBe(true)
			expect(
				Math.abs(parseFloat(owner.measuredHeight) - owner.actualHeight),
				`${owner.id} native header measurement matches its own rendered Summary`,
			).toBeLessThanOrEqual(0.125)
		}
	})

	test(`scrollIntoView targets clear occupied sticky rows at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/credits/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		expect(
			await page.locator('#content').evaluate(element => getComputedStyle(element).scrollSnapAlign),
			'The content wrapper does not compete with owned scope snap points',
		).toBe('none')
		const evidence = []
		const cards = await page.locator('#top [data-card]').evaluateAll(elements =>
			elements
				.filter(element => {
					const box = element.getBoundingClientRect()

					return element.checkVisibility() && box.width > 0 && box.height > 0
				})
				.map(element => {
					const style = getComputedStyle(element)

					return {
						id: element.id,
						tag: element.tagName,
						card: element.getAttribute('data-card'),
						scope: element.closest('[data-sticky-breadcrumb~="scope"]')?.id ?? null,
						snap: style.scrollSnapAlign,
						margin: style.scrollMarginBlockStart,
					}
				}),
		)

		await info.attach('rendered-card-snap-owners', {
			body: JSON.stringify(cards),
			contentType: 'application/json',
		})
		expect(cards.length, 'The fixture exposes rendered card snap owners').toBeGreaterThan(0)

		for (const card of cards) {
			expect(card.snap, `${card.tag}#${card.id} card snap alignment`).toBe('start')
			expect(
				/^-?(?:\d+(?:\.\d*)?|\.\d+)px$/.test(card.margin) &&
					Number.isFinite(parseFloat(card.margin)),
				`${card.tag}#${card.id} card snap margin resolves: ${card.margin}`,
			).toBe(true)
		}
		const targets = [
			'#security-news',
			'#stage\\:software-0-5',
			'#stage\\:software-0-5-security',
		].map(selector => ({ label: selector, target: page.locator(selector) }))

		for (const [label, selector] of [
			['paragraph', '#top [data-scroll-item~="snap-prose"] p'],
			[
				'native-h4-paragraph',
				'#top .attribute-accordions > details[open] [data-scroll-item~="snap-prose"] p',
			],
			['nested-list-item', '#top [data-scroll-item~="snap-prose"] li li'],
			['data-credit-list', '.data-credits > ul'],
			['data-credit-list-item', '.data-credits li[id^="data-credit-"]'],
			[
				'direct-prose-block',
				'#top [data-scroll-item~="snap-prose"] > :is(ul, ol, pre, blockquote, table, figure)',
			],
		]) {
			const candidates = page.locator(selector)
			const index = await candidates.evaluateAll(elements =>
				elements.findIndex(
					element =>
						element.checkVisibility() &&
						element.getBoundingClientRect().height > 0 &&
						element.getBoundingClientRect().height < 400,
				),
			)

			expect(index, `${label} has a real visible rendered witness`).toBeGreaterThanOrEqual(0)
			targets.push({ label, target: candidates.nth(index) })
		}
		const proseSnapOwners = await page
			.locator('#top [data-scroll-item~="snap-prose"]')
			.evaluateAll(owners =>
				[...new Set(owners.flatMap(owner => [...owner.querySelectorAll(':scope > *, p, li')]))]
					.filter(element => element.checkVisibility())
					.map(element => ({
						tag: element.tagName,
						snap: getComputedStyle(element).scrollSnapAlign,
					})),
			)

		expect(proseSnapOwners.length).toBeGreaterThan(0)
		expect(proseSnapOwners.filter(owner => owner.snap !== 'start')).toEqual([])

		const pieCapability = await page.evaluate(qualifyNativeBreadcrumbClock)

		for (const { label: selector, target } of targets) {
			const chain = await target.evaluate(element => {
				const owners = []

				for (
					let scope = element.matches('[data-sticky-container]') ? element.parentElement : element;
					scope;
					scope = scope.parentElement
				) {
					if (!scope.matches('[data-sticky-container]')) {
						continue
					}

					const position = scope.querySelector(
						':scope > [data-sticky-breadcrumb~="position"], :scope > details > [data-sticky-breadcrumb~="position"], :scope > [data-sticky], :scope > details > [data-sticky]',
					)
					const heading = position?.querySelector('h1,h2,h3,h4')

					if (heading) {
						owners.unshift({
							level: owners.length + 1,
							scope: '#' + CSS.escape(scope.id),
							heading: '#' + CSS.escape(scope.id) + ' ' + heading.tagName.toLowerCase(),
						})
					}
				}

				return owners
			})

			const breadcrumbScope = await target.evaluate(element =>
				element.matches('[data-sticky-breadcrumb~="scope"]'),
			)
			const disclosure = target.locator(':scope > details')
			const states = breadcrumbScope && (await disclosure.count()) ? [false, true] : [null]

			for (const open of states) {
				if (open !== null) {
					if (
						(await disclosure.evaluate(element => {
							if (!(element instanceof HTMLDetailsElement)) {
								throw new Error('A scope disclosure must be native details')
							}

							return element.open
						})) !== open
					) {
						await disclosure.locator(':scope > summary').focus()
						await page.keyboard.press('Space')
					}

					await expect
						.poll(() => disclosure.evaluate(element => element.hasAttribute('open')))
						.toBe(open)
				}

				if (breadcrumbScope) {
					expect(
						await target.evaluate(element => getComputedStyle(element).scrollSnapAlign),
						`${selector}: the scope owns snapping with disclosure open=${open}`,
					).toBe('start')
				}

				const landingState = (element: Element) => {
					const root = document.querySelector<HTMLElement>('#layout')!
					const rootTop = root.getBoundingClientRect().top + root.clientTop
					const rawPadding = getComputedStyle(root).scrollPaddingBlockStart
					const padding = rawPadding === 'auto' ? 0 : parseFloat(rawPadding)
					const style = getComputedStyle(element)
					const margin = parseFloat(style.scrollMarginBlockStart)
					const proseBreathingRoom = element.matches(
						'[data-scroll-item~="snap-prose"] > :not([data-sticky-container]), [data-scroll-item~="snap-prose"] :is(p, li):not([data-sticky-container])',
					)
						? parseFloat(style.getPropertyValue('---column-gap')) / 2
						: 0
					const top = element.getBoundingClientRect().top
					const requested = root.scrollTop + top - rootTop - padding - margin
					const maximum = root.scrollHeight - root.clientHeight
					const clamped = Math.max(0, Math.min(maximum, requested))

					return {
						scroll: root.scrollTop,
						rootTop,
						padding,
						margin,
						proseBreathingRoom,
						top,
						requested,
						maximum,
						clamped,
					}
				}

				for (const direction of [1, -1]) {
					await target.evaluate(async (element, direction) => {
						const root = document.querySelector('#layout')!

						root.scrollTo({
							top: root.scrollTop + element.getBoundingClientRect().top - direction * 300,
							behavior: 'instant',
						})
						await new Promise(resolve =>
							requestAnimationFrame(() => requestAnimationFrame(resolve)),
						)
					}, direction)
					const beforeLanding = await target.evaluate(landingState)

					await target.evaluate(element =>
						element.scrollIntoView({ block: 'start', behavior: 'instant' }),
					)
					await page.evaluate(
						() =>
							new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
					)

					try {
						await expect
							.poll(async () => {
								const landing = await target.evaluate(landingState)

								expect(
									Object.values(landing).every(Number.isFinite),
									'Landing geometry resolves',
								).toBe(true)

								return Math.abs(landing.scroll - landing.clamped)
							})
							.toBeLessThan(1)
					} catch (error) {
						const landing = await target.evaluate(element => {
							const root = document.querySelector<HTMLElement>('#layout')!
							const bounds = ({
								x,
								y,
								width,
								height,
								top,
								right,
								bottom,
								left,
							}: DOMRectReadOnly) => ({ x, y, width, height, top, right, bottom, left })
							const rootStyle = getComputedStyle(root),
								targetStyle = getComputedStyle(element)

							return {
								id: element.id,
								tag: element.tagName,
								target: bounds(element.getBoundingClientRect()),
								root: bounds(root.getBoundingClientRect()),
								scroll: root.scrollTop,
								maximum: root.scrollHeight - root.clientHeight,
								scrollHeight: root.scrollHeight,
								clientHeight: root.clientHeight,
								clientTop: root.clientTop,
								documentScroll: scrollY,
								paddingStart: rootStyle.scrollPaddingBlockStart,
								paddingEnd: rootStyle.scrollPaddingBlockEnd,
								marginStart: targetStyle.scrollMarginBlockStart,
								marginEnd: targetStyle.scrollMarginBlockEnd,
								snapType: rootStyle.scrollSnapType,
								snapAlign: targetStyle.scrollSnapAlign,
							}
						})
						const observation = await page
							.evaluate(observeStickyChain, chain)
							.catch((error: unknown) => ({ error: String(error) }))

						await info.attach(`failed-landing-${selector}-${direction}`, {
							body: JSON.stringify({ selector, direction, chain, landing, observation }),
							contentType: 'application/json',
						})
						throw error
					}

					const observation = await page.evaluate(observeStickyChain, chain)

					let occupiedBottom = observation.siteBottom

					for (const row of observation.rows) {
						for (const box of [...row.surfaces, ...row.lines]) {
							expect(
								[box.top, box.bottom, box.height].every(Number.isFinite),
								'Sticky paint bounds must resolve',
							).toBe(true)

							if (
								row.opacity > 0 &&
								row.visibility !== 'hidden' &&
								row.visibility !== 'collapse' &&
								box.bottom > 0 &&
								box.top < observation.viewport.height &&
								box.height > 0
							) {
								occupiedBottom = Math.max(occupiedBottom, box.bottom)
							}
						}
					}
					const pieBackdrop = await page.evaluate(
						observePaintedPieBackdrop,
						pieCapability.applicable,
					)

					if (pieBackdrop.applicable) {
						occupiedBottom = Math.max(occupiedBottom, pieBackdrop.bottom)
					}

					const top = await target.evaluate(element => element.getBoundingClientRect().top)
					const landing = await target.evaluate(landingState)
					const travel = landing.scroll - beforeLanding.scroll
					const directionAdmission = travel * direction > 1

					if (open !== null) {
						expect(await disclosure.evaluate(element => element.hasAttribute('open'))).toBe(open)
					}

					if (breadcrumbScope) {
						expect(
							Math.abs(top - occupiedBottom),
							`${selector}: open=${open} target lands at its cumulative painted parent inset`,
						).toBeLessThanOrEqual(3)
					}

					if (selector.startsWith('data-credit-')) {
						expect(
							Math.abs(
								landing.rootTop +
									landing.padding +
									landing.margin -
									occupiedBottom -
									landing.proseBreathingRoom,
							),
							`${selector}: authored margin agrees with actual cumulative painted inset even when range-clamped: ${JSON.stringify({ landing, occupiedBottom, pieBackdrop })}`,
						).toBeLessThanOrEqual(3)
					}

					const entry = {
						selector,
						open,
						direction,
						top,
						occupiedBottom,
						pieBackdrop,
						observation,
						landing,
						beforeLanding,
						travel,
						directionAdmission,
					}

					evidence.push(entry)
					await info.attach(`snap-${selector}-${open}-${direction}`, {
						body: JSON.stringify(entry),
						contentType: 'application/json',
					})
					expect(
						top,
						`${selector} clears actual ancestor paint and text after scrollIntoView landing`,
					).toBeGreaterThanOrEqual(occupiedBottom - 1)
				}
			}
		}

		await info.attach('scroll-landing-and-endpoint-geometry', {
			body: JSON.stringify(evidence),
			contentType: 'application/json',
		})
	})
	test(`native keyboard travel from the H1 landing at ${width}px`, async ({ page }, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/credits/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const endpoint = page.locator('#top .wallet-overview > [data-scroll-item~="snap-block-start"]')

		if (!(await page.evaluate(qualifyNativeBreadcrumbClock)).applicable) {
			await expectKeyboardTravel(page, info)

			return
		}

		await expect(endpoint).toHaveCSS('display', 'block')
		const control = await page.addStyleTag({
			content: '#layout { scroll-snap-type: none !important; }',
		})
		const boundary = await endpoint.evaluate(async element => {
			const root = document.querySelector('#layout')!
			const row = document.querySelector('.wallet-title-row')!
			const move = async (top: number) => {
				root.scrollTo({ top, behavior: 'instant' })
				await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
			}

			await move(0)
			const animation = row
				.getAnimations()
				.find(
					animation =>
						animation instanceof CSSAnimation &&
						animation.animationName === 'breadcrumb-item-motion',
				)!
			const seeks: { requested: number; actual: number; progress: number | null | undefined }[] = []
			let low = 0
			let high = Math.ceil(
				document.querySelector('#top > header')!.getBoundingClientRect().height + 200,
			)

			await move(high)

			if (animation.effect!.getComputedTiming().progress !== 1) {
				throw new Error('Actual H1 endpoint must be bracketed')
			}

			while (low < high) {
				const middle = Math.floor((low + high) / 2)

				await move(middle)
				seeks.push({
					requested: middle,
					actual: root.scrollTop,
					progress: animation.effect?.getComputedTiming().progress,
				})

				if (animation.effect!.getComputedTiming().progress! >= 1) {
					high = middle
				} else {
					low = middle + 1
				}
			}
			await move(low)

			return {
				firstComplete: low,
				actual: root.scrollTop,
				seeks,
				markerTop: element.getBoundingClientRect().top,
				markerMargin: getComputedStyle(element).scrollMarginBlockStart,
				marker:
					element.getBoundingClientRect().top +
					root.scrollTop -
					root.getBoundingClientRect().top -
					parseFloat(getComputedStyle(element).scrollMarginBlockStart),
			}
		})

		await info.attach('h1-snap-boundary', {
			body: JSON.stringify(boundary),
			contentType: 'application/json',
		})
		expect(Math.abs(boundary.firstComplete - boundary.marker)).toBeLessThanOrEqual(1)
		await control.evaluate(element => {
			element.parentNode?.removeChild(element)
		})
		await page.locator('#layout').evaluate(root => root.scrollTo({ top: 0, behavior: 'instant' }))
		let startSamples = 0
		let previousStart = Number.NaN

		await expect
			.poll(
				async () => {
					const scroll = await page.locator('#layout').evaluate(root => root.scrollTop)

					startSamples =
						scroll <= 1 && Math.abs(scroll - previousStart) < 0.25 ? startSamples + 1 : 0
					previousStart = scroll

					return startSamples
				},
				{
					message: 'Native snapping settles at the page start before wheel input',
					intervals: [80],
				},
			)
			.toBeGreaterThanOrEqual(4)
		const wheelTarget = await page.locator('.wallet-title-row h1').boundingBox()

		if (!wheelTarget) {
			throw new Error('The natural H1 must provide a page wheel target')
		}

		const point = {
			x: wheelTarget.x + wheelTarget.width / 2,
			y: wheelTarget.y + wheelTarget.height / 2,
		}

		expect(
			await page.evaluate(({ x, y }) => {
				for (
					let element = document.elementFromPoint(x, y);
					element;
					element = element.parentElement
				) {
					if (
						/(auto|scroll)/.test(getComputedStyle(element).overflowY) &&
						element.scrollHeight > element.clientHeight
					) {
						return element.id
					}
				}

				return null
			}, point),
			'The native wheel targets the page rather than the nested TOC',
		).toBe('layout')
		await page.mouse.move(point.x, point.y)
		const ended = await observeScroll(page)
		const errors: unknown[] = []
		let wheelState: { actual: number; delivered: number | null; ended: number | null } | null = null

		try {
			await page.mouse.wheel(0, boundary.marker - 8)
			await expect
				.poll(
					async () => {
						wheelState = await ended.evaluate(state => state.snapshot())

						return wheelState.ended === wheelState.actual &&
							wheelState.delivered === wheelState.actual
							? wheelState.ended
							: null
					},
					{
						message: 'Native wheel must dispatch scrollend after its listener is armed',
						timeout: 5000,
					},
				)
				.not.toBeNull()
			const settled = wheelState!.ended

			expect(Math.abs(settled! - boundary.marker)).toBeLessThanOrEqual(1)
		} catch (error) {
			errors.push(error)
		} finally {
			await finishScroll(ended, info, 'h1-wheel-state', { boundary, wheelState }, errors)
		}

		await expectKeyboardTravel(page, info)
	})
}

for (const width of [390, 1440]) {
	test(`Stage descriptions and criterion prose retain native snap targets at ${width}px`, async ({
		page,
	}, info) => {
		test.setTimeout(180000)
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 60000 })
		await page.evaluate(() => document.fonts.ready)

		const families = [
			[
				'description',
				'#stages section > details > summary [data-sticky-breadcrumb~="support"] > div',
			],
			['criterion', '#stages ul[data-list] > li'],
		]

		for (const [family, selector] of families) {
			const candidates = page.locator(selector)
			const index = await candidates.evaluateAll(elements =>
				elements.findIndex(element => element.checkVisibility()),
			)

			expect(index, `Real rendered Stage ${family} exists`).toBeGreaterThanOrEqual(0)
			const owner = candidates.nth(index)
			const target =
				family === 'description' &&
				(await owner.getAttribute('data-scroll-item'))?.split(' ').includes('snap-prose')
					? owner.locator(':scope > :not([aria-hidden="true"])').first()
					: owner

			await target.evaluate(element =>
				element.scrollIntoView({ block: 'start', behavior: 'instant' }),
			)
			await expect
				.poll(() => target.evaluate(element => getComputedStyle(element).scrollSnapAlign))
				.toBe('start')
			await expect
				.poll(() =>
					target.evaluate(element => {
						const root = document.querySelector<HTMLElement>('#layout')!
						const style = getComputedStyle(element)
						const padding = getComputedStyle(root).scrollPaddingBlockStart
						const inset =
							parseFloat(style.scrollMarginBlockStart) +
							(padding === 'auto' ? 0 : parseFloat(padding))

						return Math.abs(
							element.getBoundingClientRect().top -
								root.getBoundingClientRect().top -
								root.clientTop -
								inset,
						)
					}),
				)
				.toBeLessThan(1)
			await info.attach(`stage-${family}-${width}`, {
				body: JSON.stringify(
					await target.evaluate(element => ({
						text: element.textContent?.trim(),
						box: {
							top: element.getBoundingClientRect().top,
							bottom: element.getBoundingClientRect().bottom,
						},
						snap: getComputedStyle(element).scrollSnapAlign,
						margin: getComputedStyle(element).scrollMarginBlockStart,
					})),
				),
				contentType: 'application/json',
			})
		}
	})
}

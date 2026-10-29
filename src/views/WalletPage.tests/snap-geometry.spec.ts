import { observeStickyChain } from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 934, 1440]) {
	test(`page-start snapping preserves the natural header at ${width}px`, async ({ page }, info) => {
		await page.setViewportSize({ width, height: 900 })

		for (const wallet of ['rainbow', 'metamask']) {
			await page.goto(`/${wallet}/#top`)
			await page.evaluate(() => document.fonts.ready)
			const root = page.locator('#layout')
			const start = page.locator('#top')

			const settle = async () => {
				let previous = Number.NaN
				let stable = 0

				await expect
					.poll(
						async () => {
							const current = await root.evaluate(element => element.scrollTop)

							stable =
								Math.abs(current - previous) < 0.25 && Math.abs(current) <= 1 ? stable + 1 : 0
							previous = current

							return stable
						},
						{ intervals: [80] },
					)
					.toBeGreaterThanOrEqual(4)
			}

			await settle()
			await root.evaluate(element => element.scrollTo({ top: 1, behavior: 'instant' }))
			await settle()
			const observation = await start.evaluate(element => {
				const header = element.querySelector(':scope > header')!
				const h1 = header.querySelector('h1')!

				return {
					top: element.getBoundingClientRect().top,
					header: header.getBoundingClientRect().top,
					h1: h1.getBoundingClientRect().top,
					margin: parseFloat(getComputedStyle(element).scrollMarginBlockStart),
					hydrated: !element.closest('astro-island')?.hasAttribute('ssr'),
				}
			})

			expect(observation.top).toBeGreaterThanOrEqual(observation.margin - 1)
			expect(observation.header).toBeGreaterThanOrEqual(observation.top - 1)
			expect(observation.h1).toBeGreaterThanOrEqual(observation.header - 1)
			await info.attach(`${wallet}-page-start`, {
				body: JSON.stringify(observation),
				contentType: 'application/json',
			})
		}
	})
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

	test(`scrollIntoView targets clear occupied sticky rows and wheel snapping preserves the H1 endpoint at ${width}px`, async ({
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
					const margin = parseFloat(getComputedStyle(element).scrollMarginBlockStart)
					const top = element.getBoundingClientRect().top
					const requested = root.scrollTop + top - rootTop - padding - margin
					const maximum = root.scrollHeight - root.clientHeight
					const clamped = Math.max(0, Math.min(maximum, requested))

					return {
						scroll: root.scrollTop,
						rootTop,
						padding,
						margin,
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
							Math.abs(landing.rootTop + landing.padding + landing.margin - occupiedBottom),
							`${selector}: authored margin agrees with actual cumulative painted inset even when range-clamped`,
						).toBeLessThanOrEqual(3)
					}

					const entry = {
						selector,
						open,
						direction,
						top,
						occupiedBottom,
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
		const endpoint = page.locator(
			'#top > [data-sticky-breadcrumb~="flow"] > [data-scroll-item~="snap-block-start"]',
		)

		if (await endpoint.evaluate(element => getComputedStyle(element).display !== 'none')) {
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
				const seeks: { requested: number; actual: number; progress: number | null | undefined }[] =
					[]
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
			const ended = page.locator('#layout').evaluate(
				root =>
					new Promise<number>((resolve, reject) => {
						const timer = setTimeout(
							() => reject(new Error('Native wheel must dispatch scrollend')),
							5000,
						)

						root.addEventListener(
							'scrollend',
							() => {
								clearTimeout(timer)
								resolve(root.scrollTop)
							},
							{ once: true },
						)
					}),
			)

			await page.mouse.wheel(0, boundary.marker - 8)
			expect(Math.abs((await ended) - boundary.marker)).toBeLessThanOrEqual(1)
			evidence.push(boundary)
		}

		await info.attach('scroll-landing-and-endpoint-geometry', {
			body: JSON.stringify(evidence),
			contentType: 'application/json',
		})
	})
}

test('Stage descriptions and criterion prose retain native snap targets', async ({
	page,
}, info) => {
	test.setTimeout(180000)
	await page.goto('/metamask/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 60000 })
	await page.evaluate(() => document.fonts.ready)

	for (const width of [390, 1440]) {
		await page.setViewportSize({ width, height: 900 })
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
				family === 'description' && (await owner.locator(':scope > *').count())
					? owner.locator(':scope > *').first()
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
	}
})

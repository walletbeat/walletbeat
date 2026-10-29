import { observeStickyChain } from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

for (const { width, closed, reducedMotion } of [390, 1440].flatMap(width =>
	[false, true].flatMap(closed =>
		[false, true].map(reducedMotion => ({ width, closed, reducedMotion })),
	),
)) {
	test(`pie rotation completes on approach to visible canonical destinations at ${width}px with ${closed ? 'closed' : 'open'} details and ${reducedMotion ? 'reduced' : 'full'} motion`, async ({
		page,
	}, info) => {
		await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' })
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('color: if(style(--a: 1): red)') &&
					CSS.supports('animation-timeline: scroll()'),
			)),
			'Shared semantic current styling and native scroll animation have separate fallback coverage',
		)

		if (closed) {
			await page.locator('#security-audits-and-bounties > details').evaluate(element => {
				if (!(element instanceof HTMLDetailsElement)) {
					throw new Error('Expected native details')
				}

				element.open = false
			})
			await expect
				.poll(() =>
					page.evaluate(
						() =>
							document
								.getAnimations()
								.filter(
									animation =>
										animation.timeline instanceof DocumentTimeline &&
										animation.playState === 'running' &&
										Number.isFinite(animation.effect?.getComputedTiming().endTime),
								).length,
					),
				)
				.toBe(0)
			await expect(page.locator('#security-audits-and-bounties > details > summary')).toHaveCSS(
				'position',
				'static',
			)
		}

		const result = await page.evaluate(async () => {
			await document.fonts.ready
			const root = document.querySelector<HTMLElement>('#layout')!

			root.style.scrollSnapType = 'none'
			const pie = document.querySelector<HTMLElement>('.pie-navigation')!
			const geometry = pie.querySelector<HTMLElement>('.navigation-items')!
			const links = [...pie.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
			const destinations = links.flatMap(link => {
				const target = document.getElementById(decodeURIComponent(link.hash.slice(1)))

				return target?.matches('.attribute-group, .attribute') && target.checkVisibility()
					? [{ href: link.hash, target }]
					: []
			})
			const group = destinations.find(item => item.target.matches('.attribute-group'))!
			const attribute = destinations.find(
				item => item.target.matches('.attribute') && group.target.contains(item.target),
			)!

			if (!group || !attribute) {
				throw new Error('Visible canonical group and attribute are required')
			}

			const seek = async (top: number) => {
				root.scrollTo({ top, behavior: 'instant' })
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
			}
			const observe = () => {
				const style = getComputedStyle(geometry)

				return {
					scroll: root.scrollTop,
					current: [...pie.querySelectorAll<HTMLAnchorElement>('a[href]')]
						.filter(
							link =>
								getComputedStyle(link).getPropertyValue('---navigation-snapAlign').trim() ===
								'center',
						)
						.map(link => link.hash),
					angle: parseFloat(style.rotate),
					icons: [group, attribute].map(({ href }) => {
						const link = links.find(candidate => candidate.hash === href)
						const icon = link?.querySelector('.pie-navigation-icon')

						if (!link || !icon) {
							throw new Error('Canonical destination icon is required')
						}

						const slice = new DOMMatrix(getComputedStyle(link).transform)
						const iconRotate = getComputedStyle(icon).rotate
						const angle =
							parseFloat(style.rotate) +
							(Math.atan2(slice.b, slice.a) * 180) / Math.PI +
							(iconRotate === 'none' ? 0 : parseFloat(iconRotate))

						if (!Number.isFinite(angle)) {
							throw new Error('Icon rotation must resolve')
						}

						return {
							href,
							visible: icon.checkVisibility(),
							uprightError: Math.abs(((((angle + 180) % 360) + 360) % 360) - 180),
						}
					}),
				}
			}
			const cases = []

			for (const destination of [group, attribute]) {
				const link = links.find(link => link.hash === destination.href)!
				const midpoint = getComputedStyle(link).getPropertyValue('--slice-midAngle').trim()
				const midAngle = Number(midpoint)

				if (!midpoint || !Number.isFinite(midAngle)) {
					throw new Error('Destination slice requires its canonical midpoint angle')
				}

				await seek(0)
				const world =
					root.scrollTop +
					destination.target.getBoundingClientRect().top -
					root.getBoundingClientRect().top
				const boundary = parseFloat(
					getComputedStyle(destination.target).getPropertyValue('---breadcrumb-parentBlockEnd'),
				)

				if (!Number.isFinite(boundary)) {
					throw new Error('Canonical destination must publish its cumulative sticky boundary')
				}

				const samples = []

				for (const delta of [-100, -20, -1, 1, 20, 1, -1, -20, -100]) {
					const requested = world - boundary + delta

					await seek(requested)
					samples.push({
						delta,
						requested,
						top: destination.target.getBoundingClientRect().top,
						...observe(),
					})
				}
				cases.push({ href: destination.href, boundary, expected: -90 - midAngle, samples })
			}
			// Find the real shared-current handoff without forcing a destination state.
			const ordered = destinations
				.map(item => ({ ...item, world: root.scrollTop + item.target.getBoundingClientRect().top }))
				.sort((a, b) => a.world - b.world)
			const pairs = ordered
				.slice(1)
				.map((item, index) => ({
					before: ordered[index],
					after: item,
					distance: item.world - ordered[index].world,
				}))
				.filter(pair => pair.distance > 0)
			const pair = pairs.sort((a, b) => a.distance - b.distance)[0]

			if (!pair) {
				throw new Error('Adjacent visible destinations are required')
			}

			let low = Math.max(0, pair.before.world - root.clientHeight / 2)
			let high = Math.min(root.scrollHeight - root.clientHeight, pair.after.world)

			await seek(low)
			const initial = observe().current.join(',')

			await seek(high)

			if (observe().current.join(',') === initial) {
				throw new Error('Handoff interval did not change the selected destination')
			}

			while (high - low > 1) {
				const middle = Math.floor((low + high) / 2)

				await seek(middle)

				if (observe().current.join(',') === initial) {
					low = middle
				} else {
					high = middle
				}
			}
			await seek(low)
			const before = observe()

			await seek(high)
			const after = observe()

			await seek(low)
			const reverse = observe()

			return { cases, handoff: { distance: pair.distance, before, after, reverse } }
		})

		await info.attach('canonical-approach-rotation', {
			body: JSON.stringify(result),
			contentType: 'application/json',
		})

		for (const destination of result.cases) {
			for (const sample of destination.samples) {
				expect(Math.abs(sample.scroll - sample.requested)).toBeLessThanOrEqual(1)
				expect(sample.icons.filter(icon => icon.visible)).toHaveLength(width > 1024 ? 2 : 1)

				for (const icon of sample.icons.filter(icon => icon.visible)) {
					expect(icon.uprightError, icon.href).toBeLessThan(0.05)
				}

				if (sample.delta >= 1) {
					expect(sample.current).toContain(destination.href)
				}

				if (sample.delta === 1) {
					expect(Math.abs(sample.angle - destination.expected)).toBeLessThan(0.05)
				}
			}
		}
		expect(result.handoff.before.current).not.toEqual(result.handoff.after.current)

		if (!reducedMotion) {
			expect(Math.abs(result.handoff.before.angle - result.handoff.after.angle)).toBeLessThan(1)
		}

		expect(result.handoff.reverse.current).toEqual(result.handoff.before.current)
		expect(Math.abs(result.handoff.reverse.angle - result.handoff.before.angle)).toBeLessThan(0.05)
	})
}

const enhancedNavigation = () =>
	CSS.supports('animation-timeline: scroll()') &&
	CSS.supports('width: anchor-size(--source inline)') &&
	CSS.supports('color: if(style(--a: 1): red)')

const settleFrames = () =>
	new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

const selectedDestinations = (links: Element[]) =>
	links
		.filter(
			link =>
				getComputedStyle(link).getPropertyValue('---navigation-snapAlign').trim() === 'center',
		)
		.map(link => new URL(link.getAttribute('href')!, document.baseURI).hash)

test('local stage criterion clicks retain the wallet variant and native page identity', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 390, height: 900 })
	await page.goto('/metamask/?variant=MOBILE')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	const original = await page.locator('#top').elementHandle()
	const search = new URL(page.url()).search

	expect(new URL(page.url()).searchParams.get('variant')).toBe('MOBILE')
	const destination = await page
		.locator('#stages [data-stage-criterion-rating] > a[href]')
		.evaluateAll(links => {
			const link = links.find(element => {
				const href = element.getAttribute('href')

				return href?.startsWith('#') && document.getElementById(decodeURIComponent(href.slice(1)))
			})

			if (!(link instanceof HTMLAnchorElement)) {
				throw new Error('A rendered local criterion destination is required')
			}

			const target = document.getElementById(decodeURIComponent(link.hash.slice(1)))!
			const group = target.closest('.attribute-group')

			if (!group?.id || !target.querySelector('h3')) {
				throw new Error('The local criterion must target an actual attribute')
			}

			return { href: link.getAttribute('href')!, id: target.id, group: group.id }
		})
	const criterion = page
		.locator(`#stages [data-stage-criterion-rating] > a[href="${destination.href}"]`)
		.first()

	await criterion.evaluate(async element => {
		const opened = []

		for (let owner = element.parentElement; owner; owner = owner.parentElement) {
			if (owner instanceof HTMLDetailsElement && !owner.open) {
				owner.open = true
				opened.push(owner)
			}
		}
		await new Promise<void>(resolve =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
		)
		await Promise.race([
			Promise.allSettled(
				opened
					.flatMap(owner => owner.getAnimations({ subtree: true }))
					.filter(
						animation =>
							animation.timeline instanceof DocumentTimeline &&
							Number.isFinite(animation.effect?.getComputedTiming().endTime),
					)
					.map(animation => animation.finished),
			),
			new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error('Criterion ancestors did not settle within 3000ms')),
					3000,
				),
			),
		])
	})
	await criterion.click()
	await expect.poll(() => new URL(page.url()).hash).toBe(destination.href)
	expect(new URL(page.url()).search).toBe(search)
	expect(
		await page.locator('#top').evaluate((element, original) => element === original, original),
	).toBe(true)
	const chain = [
		{ level: 1, scope: '#top', heading: '#top h1' },
		{ level: 2, scope: `#${destination.group}`, heading: `#${destination.group} h2` },
		{ level: 3, scope: `#${destination.id}`, heading: `#${destination.id} h3` },
	]
	const landing = async () => {
		const observed = await page.evaluate(observeStickyChain, chain)
		const target = await page.locator(`[id="${destination.id}"]`).evaluate(element => {
			const box = element.getBoundingClientRect(),
				heading = element.querySelector('h3')!.getBoundingClientRect()

			return {
				top: box.top,
				height: box.height,
				headingTop: heading.top,
				headingBottom: heading.bottom,
				viewport: innerHeight,
			}
		})
		const preceding = observed.rows
			.slice(0, -1)
			.filter(
				row =>
					row.opacity > 0.01 && row.headingBox.bottom > 0 && row.headingBox.top < target.viewport,
			)
		const bottoms = [observed.siteBottom, ...preceding.map(row => row.occupiedRow.bottom)]

		if (!bottoms.every(Number.isFinite)) {
			throw new Error('Actual participating sticky paint must resolve')
		}

		return { target, occupiedBottom: Math.max(...bottoms), scroll: observed.scroll }
	}

	let previous: Awaited<ReturnType<typeof landing>> | undefined,
		stable = 0

	try {
		await expect
			.poll(
				async () => {
					const current = await landing()
					const { target, occupiedBottom } = current

					stable =
						previous &&
						Math.abs(previous.scroll - current.scroll) < 0.25 &&
						Math.abs(previous.target.top - target.top) < 0.25
							? stable + 1
							: 0
					previous = current

					return (
						stable >= 2 &&
						target.height > 0 &&
						target.top >= occupiedBottom - 1 &&
						target.headingTop >= occupiedBottom - 1 &&
						target.headingBottom < target.viewport
					)
				},
				{ timeout: 7000 },
			)
			.toBe(true)
	} finally {
		await info.attach('criterion-native-landing', {
			body: JSON.stringify({ previous, stable }),
			contentType: 'application/json',
		})
	}
})

test('mobile TOC shares one native panel with its readable in-flow rail', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 690, height: 900 })
	await page.goto('/metamask/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	test.skip(
		!(await page.evaluate(enhancedNavigation)),
		'Enhanced pie navigation has separate fallback coverage',
	)
	await page.evaluate(() => document.fonts.ready)
	const toc = page.locator('#wallet-toc')
	const fragments = (links: Element[]) => links.map(link => link.getAttribute('href')).sort()

	expect(await toc.locator('a[href^="#"]').evaluateAll(fragments)).toEqual(
		await page.locator('.pie-navigation a[href^="#"]').evaluateAll(fragments),
	)
	const original = await toc.elementHandle()
	const results = []

	await page.locator('#layout').evaluate(element => {
		if (!(element instanceof HTMLElement)) {
			throw new Error('Expected native HTML scroll root')
		}

		element.style.scrollSnapType = 'none'
	})

	for (const direction of ['ltr', 'rtl'] as const) {
		await page
			.locator('html')
			.evaluate((element, direction) => element.setAttribute('dir', direction), direction)

		for (const width of [390, 592, 655, 656, 690, 768, 900]) {
			await page.setViewportSize({ width, height: 900 })
			await page
				.locator('#layout')
				.evaluate(element => element.scrollTo({ top: 0, behavior: 'instant' }))
			await page.evaluate(settleFrames)
			await expect(toc).toHaveCount(1)
			expect(await toc.evaluate((element, original) => element === original, original)).toBe(true)
			const natural = await toc.evaluate(element => {
				const rect = (box: DOMRect) => ({
					x: box.x,
					y: box.y,
					width: box.width,
					height: box.height,
					top: box.top,
					right: box.right,
					bottom: box.bottom,
					left: box.left,
				})
				const pie = document.querySelector('.page-navigation > .pie-navigation')!
				const root = document.querySelector('#layout')!
				const style = getComputedStyle(element)
				const navigation = element.parentElement!
				const navigationStyle = getComputedStyle(navigation)
				const navigationBox = navigation.getBoundingClientRect()
				const paintedPie = pie.querySelector('.navigation-items')

				if (!paintedPie) {
					throw new Error('The real pie paint owner is required')
				}

				const available =
					navigation.clientWidth -
					parseFloat(navigationStyle.paddingInlineStart) -
					parseFloat(navigationStyle.paddingInlineEnd)
				const required =
					pie.getBoundingClientRect().width +
					element.getBoundingClientRect().width +
					parseFloat(navigationStyle.columnGap)
				const splitWords: string[] = []
				const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)

				while (walker.nextNode()) {
					const node = walker.currentNode

					for (const match of (node.textContent ?? '').matchAll(/[\p{L}\p{N}]+/gu)) {
						const range = document.createRange()

						range.setStart(node, match.index)
						range.setEnd(node, match.index + match[0].length)
						const tops = [...range.getClientRects()]
							.filter(rect => rect.width > 0)
							.map(rect => rect.top)

						if (tops.some(top => Math.abs(top - tops[0]) > 1)) {
							splitWords.push(match[0])
						}
					}
				}

				return {
					available,
					required,
					display: style.display,
					position: style.position,
					clip: style.clipPath,
					toc: rect(element.getBoundingClientRect()),
					pie: rect(pie.getBoundingClientRect()),
					paintedPie: rect(paintedPie.getBoundingClientRect()),
					contentEdges: {
						left:
							navigationBox.left + navigation.clientLeft + parseFloat(navigationStyle.paddingLeft),
						right:
							navigationBox.left +
							navigation.clientLeft +
							navigation.clientWidth -
							parseFloat(navigationStyle.paddingRight),
					},
					overflow: root.scrollWidth - root.clientWidth,
					splitWords,
				}
			})

			expect(natural.overflow).toBe(0)
			expect(natural.paintedPie.width).toBeGreaterThan(0)
			expect(Math.abs(natural.paintedPie.width - natural.pie.height)).toBeLessThan(1)
			expect(Math.abs(natural.paintedPie.height - natural.pie.height)).toBeLessThan(1)
			expect(Math.abs(natural.paintedPie.top - natural.pie.top)).toBeLessThan(1)
			expect(
				Math.abs(
					natural.paintedPie.left +
						natural.paintedPie.width / 2 -
						(natural.pie.left + natural.pie.width / 2),
				),
			).toBeLessThan(1)
			expect(natural.paintedPie.left).toBeGreaterThanOrEqual(natural.contentEdges.left - 1)
			expect(natural.paintedPie.right).toBeLessThanOrEqual(natural.contentEdges.right + 1)

			expect(natural.position).toBe('relative')
			expect(natural.toc.width).toBeGreaterThanOrEqual(natural.available / 2 - 1)
			expect(natural.toc.width).toBeLessThanOrEqual(natural.available + 1)
			expect(natural.splitWords).toEqual([])

			const fitsRail = natural.available + 1 >= natural.required

			if (!fitsRail) {
				expect(natural.toc.top).toBeGreaterThanOrEqual(natural.pie.bottom)
			} else {
				expect(natural.clip).toBe('none')
				expect(natural.toc.left).toBeGreaterThanOrEqual(natural.contentEdges.left - 1)
				expect(natural.toc.right).toBeLessThanOrEqual(natural.contentEdges.right + 1)
				expect(Math.abs(natural.toc.top - natural.pie.top)).toBeLessThan(1)
				expect(
					direction === 'ltr'
						? natural.toc.left - natural.pie.right
						: natural.pie.left - natural.toc.right,
				).toBeGreaterThan(0)
			}

			await page.locator('#layout').evaluate(async element => {
				const pie = document.querySelector('.page-navigation > .pie-navigation')!

				element.scrollTo({
					top: element.scrollTop + pie.parentElement!.getBoundingClientRect().bottom + 400,
					behavior: 'instant',
				})
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
			})
			expect(await toc.evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThan(0)
			const compact = await page.locator('.pie-navigation .navigation-items').evaluate(element => {
				const box = element.getBoundingClientRect()

				return {
					x: box.x,
					y: box.y,
					width: box.width,
					height: box.height,
					top: box.top,
					right: box.right,
					bottom: box.bottom,
					left: box.left,
				}
			})

			expect(
				Math.abs(direction === 'ltr' ? width - compact.right - 8 : compact.left - 8),
			).toBeLessThan(1)
			await page
				.locator('#layout')
				.evaluate(element => element.scrollTo({ top: 0, behavior: 'instant' }))
			await page.evaluate(settleFrames)
			await expect(toc).toBeVisible()
			const toggle = page.getByRole('button', { name: 'Table of contents', exact: true })

			await toggle.focus()
			await toggle.press('Enter')
			await expect(toc).toHaveJSProperty('popover', 'auto')
			await expect(toc).toHaveCSS('position', 'fixed')
			expect(await toc.evaluate(element => element.matches(':popover-open'))).toBe(true)
			await page.keyboard.press('Escape')
			await expect.poll(() => toc.evaluate(element => element.matches(':popover-open'))).toBe(false)
			await expect(toc).toHaveCSS('display', 'flex')
			expect(await toc.evaluate((element, original) => element === original, original)).toBe(true)
			results.push({ direction, width, natural })
		}
	}
	await info.attach('mobile-toc', {
		body: JSON.stringify(results, null, 2),
		contentType: 'application/json',
	})
})

test('native TOC overlay animates from flow and compact states and survives reopening', async ({
	page,
	browserName,
}, info) => {
	await page.setViewportSize({ width: 690, height: 900 })
	await page.goto('/metamask/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	test.skip(
		!(await page.evaluate(enhancedNavigation)),
		'Enhanced navigation has separate fallback coverage',
	)
	const reducedTransparency = await page.evaluate(
		() => matchMedia('(prefers-reduced-transparency: reduce)').matches,
	)
	const observations = []
	const toc = page.locator('#wallet-toc')

	for (const width of [390, 690]) {
		await page.setViewportSize({ width, height: 900 })

		for (const phase of ['natural', 'mid-compaction', 'compact']) {
			await page.evaluate(async phase => {
				const root = document.querySelector<HTMLElement>('#layout')!

				root.style.scrollSnapType = 'none'
				root.scrollTo({ top: 0, behavior: 'instant' })
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
				const pie = document.querySelector('.page-navigation > .pie-navigation')!

				if (phase !== 'natural') {
					const inset = document.querySelector('#nav > header')!.getBoundingClientRect().bottom

					root.scrollTo({
						top:
							root.scrollTop +
							pie.getBoundingClientRect().top -
							inset +
							(phase === 'compact' ? 400 : 110),
						behavior: 'instant',
					})
				}

				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
			}, phase)

			for (const action of ['open', 'close'] as const) {
				const { frames, interpolation } = await toc.evaluate(async (element, action) => {
					if (!(element instanceof HTMLElement)) {
						throw new Error('Expected native HTML TOC panel')
					}

					const panel = element
					const content = panel.querySelector('.navigation-items')!

					if (action === 'open') {
						panel.showPopover()
					} else {
						panel.hidePopover()
					}

					await Promise.resolve()
					void getComputedStyle(panel).opacity
					const animations = panel
						.getAnimations({ subtree: true })
						.filter(
							animation =>
								animation.timeline instanceof DocumentTimeline &&
								Number.isFinite(animation.effect?.getComputedTiming().endTime),
						)
					const interpolation = []

					for (const animation of animations) {
						animation.pause()
					}

					for (const progress of [0.25, 0.5, 0.75]) {
						for (const animation of animations) {
							const timing = animation.effect!.getComputedTiming()

							animation.currentTime =
								Number(timing.delay) + Number(timing.activeDuration) * progress
						}
						const style = getComputedStyle(panel)

						interpolation.push({
							progress,
							opacity: Number(style.opacity),
							filter: getComputedStyle(content, '::after').backdropFilter,
							translate: style.translate,
						})
					}

					for (const animation of animations) {
						animation.play()
					}
					const frames = []
					const deadline = performance.now() + 5000
					let settled = false

					while (performance.now() < deadline) {
						await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
						const style = getComputedStyle(panel)

						frames.push({
							opacity: Number(style.opacity),
							filter: getComputedStyle(content, '::after').backdropFilter,
							translate: style.translate,
							backdropFilter: getComputedStyle(panel, '::backdrop').backdropFilter,
							position: style.position,
							display: style.display,
							inert: panel.inert,
							open: panel.matches(':popover-open'),
						})
						const running = panel
							.getAnimations({ subtree: true })
							.some(
								animation =>
									animation.timeline instanceof DocumentTimeline &&
									animation.playState === 'running' &&
									Number.isFinite(animation.effect?.getComputedTiming().endTime),
							)

						if (
							frames.length >= 2 &&
							!running &&
							!panel.inert &&
							panel.matches(':popover-open') === (action === 'open')
						) {
							settled = true
							break
						}
					}

					if (!settled) {
						throw new Error(`Native TOC ${action} did not settle within the bounded observation`)
					}

					return { frames, interpolation }
				}, action)

				await info.attach(`toc-${width}-${phase}-${action}`, {
					body: JSON.stringify({ frames, interpolation }, null, 2),
					contentType: 'application/json',
				})
				expect(
					interpolation.some(frame => frame.opacity > 0 && frame.opacity < 1),
					`${width} ${phase} ${action} has an actual intermediate opacity`,
				).toBe(true)
				expect(
					interpolation.some(frame => /blur\((?!0px\))/.test(frame.filter)),
					`${width} ${phase} ${action} respects reduced transparency`,
				).toBe(!reducedTransparency)
				expect(
					interpolation.some(
						frame => !['none', '0px', '0px 0px', '0px 0px 0px'].includes(frame.translate),
					),
				).toBe(true)

				if (action === 'close') {
					expect(
						frames.every(
							frame => frame.display === 'none' || frame.opacity >= 0.999 || frame.inert,
						),
						'Closing paint remains inert until the visible in-flow or hidden endpoint',
					).toBe(true)
				}

				expect(frames.at(-1)?.inert).toBe(false)
				expect(frames.at(-1)?.open).toBe(action === 'open')

				if (action === 'open') {
					const identity = await page.evaluate(() => {
						const navigation = document.querySelector('#nav > header')!.getBoundingClientRect()
						const boxes = [
							...document.querySelectorAll('.wallet-title-row h1, .wallet-device-controls select'),
						].map(element => {
							const box = element.getBoundingClientRect()

							return {
								name: element.getAttribute('aria-label') ?? element.tagName,
								top: box.top,
								bottom: box.bottom,
								centerError: box.top + box.height / 2 - navigation.top - navigation.height / 2,
							}
						})

						return { navigation: { top: navigation.top, bottom: navigation.bottom }, boxes }
					})

					await info.attach(`toc-identity-${width}-${phase}`, {
						body: JSON.stringify(identity),
						contentType: 'application/json',
					})
					expect(identity.boxes.length).toBeGreaterThan(1)

					for (const box of identity.boxes) {
						expect(
							box.top,
							`${box.name}: open identity stays inside navigation`,
						).toBeGreaterThanOrEqual(identity.navigation.top - 1)
						expect(
							box.bottom,
							`${box.name}: open identity stays inside navigation`,
						).toBeLessThanOrEqual(identity.navigation.bottom + 1)
						expect(
							Math.abs(box.centerError),
							`${box.name}: open identity shares navigation center`,
						).toBeLessThanOrEqual(2)
					}
				}

				observations.push({ width, phase, action, frames, interpolation })
			}
		}
	}
	await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
	await expect
		.poll(() =>
			toc.evaluate(
				element =>
					element.matches(':popover-open') &&
					!element
						.getAnimations({ subtree: true })
						.some(
							animation =>
								animation.timeline instanceof DocumentTimeline &&
								animation.playState === 'running' &&
								Number.isFinite(animation.effect?.getComputedTiming().endTime),
						),
			),
		)
		.toBe(true)
	await toc.hover({ position: { x: 40, y: 200 } })
	const scrolled = await toc.evaluate(async element => {
		if (!(element instanceof HTMLElement)) {
			throw new Error('Expected native HTML TOC panel')
		}

		const requested = Math.min(250, element.scrollHeight - element.clientHeight)

		element.scrollTo({ top: requested, behavior: 'instant' })
		await new Promise<void>(resolve =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
		)

		return { requested, delivered: element.scrollTop }
	})

	expect(scrolled.requested).toBeGreaterThan(80)
	expect(scrolled.delivered).toBeCloseTo(scrolled.requested, 0)
	const content = toc.locator(':scope > .navigation-items')
	const idlePaint = () =>
		content.evaluate(element => {
			const pseudo = getComputedStyle(element, '::after')
			const port = element.parentElement!.getBoundingClientRect()
			const hit = [...element.querySelectorAll('a[href]')].some(link => {
				const box = link.getBoundingClientRect()
				const x = box.left + box.width / 2,
					y = box.top + box.height / 2

				return (
					box.width > 0 &&
					box.height > 0 &&
					y > port.top + 20 &&
					y < port.bottom - 20 &&
					x > port.left &&
					x < port.right &&
					document.elementFromPoint(x, y)?.closest('a') === link
				)
			})

			return { blur: pseudo.backdropFilter, opacity: pseudo.opacity, hit }
		})

	expect(await idlePaint()).toEqual({ blur: 'none', opacity: '0', hit: true })

	if (browserName === 'chromium') {
		const cdp = await page.context().newCDPSession(page)

		try {
			const { root } = await cdp.send('DOM.getDocument')
			const { nodeId } = await cdp.send('DOM.querySelector', {
				nodeId: root.nodeId,
				selector: '#wallet-toc > .navigation-items',
			})
			const { node } = await cdp.send('DOM.describeNode', { nodeId, depth: 1 })
			const pseudo = node.pseudoElements?.find(element => element.pseudoType === 'after')

			if (!pseudo) {
				throw new Error('Missing content blur pseudo')
			}

			const { model } = await cdp.send('DOM.getBoxModel', { backendNodeId: pseudo.backendNodeId })
			const quad = model.border
			const bounds = {
				left: Math.min(quad[0], quad[2], quad[4], quad[6]),
				right: Math.max(quad[0], quad[2], quad[4], quad[6]),
				top: Math.min(quad[1], quad[3], quad[5], quad[7]),
				bottom: Math.max(quad[1], quad[3], quad[5], quad[7]),
			}
			const visible = await content.evaluate(element => {
				const box = element.getBoundingClientRect(),
					port = element.parentElement!.getBoundingClientRect()

				return {
					left: Math.max(box.left, port.left),
					right: Math.min(box.right, port.right),
					top: Math.max(box.top, port.top),
					bottom: Math.min(box.bottom, port.bottom),
				}
			})

			expect(bounds.left).toBeLessThanOrEqual(visible.left + 1)
			expect(bounds.right).toBeGreaterThanOrEqual(visible.right - 1)
			expect(bounds.top).toBeLessThanOrEqual(visible.top + 1)
			expect(bounds.bottom).toBeGreaterThanOrEqual(visible.bottom - 1)
		} finally {
			await cdp.detach()
		}
	}

	await info.attach('toc-scrolled-geometry-coverage', {
		body: JSON.stringify({
			browserName,
			actualPseudoQuad: browserName === 'chromium',
			limit:
				'Actual pseudo border-quad coverage uses Chromium CDP. Other engines retain native reopening, scrolling, idle blur, and link hit assertions; pseudo geometry is not independently verified.',
		}),
		contentType: 'application/json',
	})

	const armed = await toc.evaluateHandle(element => {
		if (!(element instanceof HTMLElement)) {
			throw new Error('Expected native HTML TOC panel')
		}

		const panel = element
		const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
		const finiteEffects = () =>
			panel
				.getAnimations({ subtree: true })
				.filter(
					animation =>
						animation.timeline instanceof DocumentTimeline &&
						Number.isFinite(animation.effect?.getComputedTiming().endTime),
				)
		const finishedPromise = (async () => {
			const deadline = performance.now() + 10000

			while (performance.now() < deadline) {
				await frame()
				const opacity = Number(getComputedStyle(panel).opacity)
				const closing = finiteEffects().filter(animation => animation.playState === 'running')

				if (
					!panel.matches(':popover-open') &&
					panel.inert &&
					panel.hasAttribute('data-closing') &&
					opacity > 0 &&
					opacity < 0.999 &&
					closing.length
				) {
					const interrupted = { opacity, effects: closing.length }
					const finished = closing.map(animation => animation.finished)
					const button = document.querySelector('button[popovertarget="wallet-toc"]')

					if (!(button instanceof HTMLButtonElement)) {
						return null
					}

					button.click()
					await Promise.allSettled(finished)
					await frame()
					await Promise.allSettled(finiteEffects().map(animation => animation.finished))
					await frame()

					return {
						interrupted,
						open: panel.matches(':popover-open'),
						inert: panel.inert,
						closing: panel.hasAttribute('data-closing'),
					}
				}
			}

			return null
		})()

		return { finishedPromise }
	})
	let reopening

	try {
		await page.keyboard.press('Escape')
		reopening = await armed.evaluate(async state => state.finishedPromise)
	} finally {
		await armed.dispose()
	}

	if (reopening === null) {
		throw new Error('No native in-progress closing effect was observed before reopening')
	}

	expect(await idlePaint()).toEqual({ blur: 'none', opacity: '0', hit: true })

	expect(reopening.interrupted.effects).toBeGreaterThan(0)
	expect(reopening.open).toBe(true)
	expect(reopening.inert).toBe(false)
	expect(reopening.closing).toBe(false)
	await expect
		.poll(() =>
			toc.evaluate(
				element =>
					element instanceof HTMLElement && element.matches(':popover-open') && !element.inert,
			),
		)
		.toBe(true)
	await page.setViewportSize({ width: 390, height: 900 })
	await expect(toc).toHaveCSS('position', 'fixed')
	await page.setViewportSize({ width: 690, height: 900 })
	await expect
		.poll(() =>
			toc.evaluate(
				element =>
					element instanceof HTMLElement && element.matches(':popover-open') && !element.inert,
			),
		)
		.toBe(true)
	await toc.evaluate(element => {
		if (!(element instanceof HTMLElement)) {
			throw new Error('Expected native HTML TOC panel')
		}

		element.hidePopover()
	})
	await expect
		.poll(() => toc.evaluate(element => element instanceof HTMLElement && !element.inert))
		.toBe(true)
	const stateSnapshot = () =>
		page
			.locator('[data-wallet-toc-state]')
			.evaluateAll(owners => owners.map(owner => owner.getAttribute('data-wallet-toc-state')))
	const settledClosed = await stateSnapshot()

	expect(settledClosed).toHaveLength(3)
	expect(settledClosed.every(state => state === 'closed')).toBe(true)
	const canceled = await toc.evaluate(element => {
		if (!(element instanceof HTMLElement)) {
			throw new Error('Expected native HTML TOC')
		}

		const cancel = (event: Event) => {
			if (event instanceof ToggleEvent && event.newState === 'open') {
				event.preventDefault()
			}
		}

		element.addEventListener('beforetoggle', cancel, { once: true })
		element.showPopover()

		return !element.matches(':popover-open')
	})

	expect(canceled, 'Native beforetoggle cancellation prevents opening').toBe(true)
	await expect.poll(stateSnapshot).toEqual(settledClosed)
	await page.locator('button[popovertarget="wallet-toc"]').click()
	await expect.poll(() => toc.evaluate(element => element.matches(':popover-open'))).toBe(true)
	await expect(toc).toHaveJSProperty('inert', false)
	await page.keyboard.press('Escape')
	await expect.poll(() => toc.evaluate(element => element.matches(':popover-open'))).toBe(false)
	await expect.poll(stateSnapshot).toEqual(settledClosed)
	await info.attach('toc-native-overlay-phases', {
		body: JSON.stringify(
			{
				limits:
					'Computed phase samples verify native transitions, not compositor eligibility or frame pacing.',
				reopening,
				observations,
			},
			null,
			2,
		),
		contentType: 'application/json',
	})
})

test('native current-only TOC snapping yields to hover and resumes automatically', async ({
	page,
}, info) => {
	const observations = []

	for (const width of [390, 690, 1440]) {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('scroll-snap-type: block mandatory') &&
					CSS.supports('width: anchor-size(--source inline)') &&
					CSS.supports('color: if(style(--a: 1): red)'),
			)),
			'Enhanced current-only TOC snapping requires native snap, anchor sizing and style queries',
		)
		await page.evaluate(() => document.fonts.ready)
		await page.locator('#layout').evaluate(element => {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Expected native HTML scroll root')
			}

			element.style.scrollSnapType = 'none'
		})
		const toc = page.locator('#wallet-toc')
		const port = page.locator(width > 1024 ? '.page-navigation' : '#wallet-toc')

		if (width === 390) {
			await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
		}

		await page.mouse.move(0, 0)
		const seek = async (id: string) =>
			page.evaluate(async id => {
				const target = document.getElementById(id)!

				for (let parent: Element | null = target; parent; parent = parent.parentElement) {
					if (parent instanceof HTMLDetailsElement) {
						parent.open = true
					}
				}
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
				const root = document.querySelector('#layout')!

				root.scrollTo({
					top: root.scrollTop + target.getBoundingClientRect().top + 150,
					behavior: 'instant',
				})
			}, id)
		const currentVisible = async () =>
			port.evaluate(element => {
				const current = [
					...document.querySelectorAll<HTMLAnchorElement>('#wallet-toc a[href]'),
				].find(
					link =>
						getComputedStyle(link).getPropertyValue('---navigation-snapAlign').trim() === 'center',
				)

				if (!current) {
					return false
				}

				const target = current.getBoundingClientRect(),
					port = element.getBoundingClientRect()

				return (
					target.top >= Math.max(0, port.top) && target.bottom <= Math.min(innerHeight, port.bottom)
				)
			})

		await seek('private-transfers')

		if (width <= 1024 && !(await toc.evaluate(element => element.matches(':popover-open')))) {
			await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
		}

		await expect
			.poll(() => toc.locator('a[href]').evaluateAll(selectedDestinations))
			.toEqual(['#private-transfers'])
		await expect.poll(currentVisible).toBe(true)

		const box = await toc.boundingBox()

		expect(box).not.toBeNull()
		await page.mouse.move(box!.x + 20, Math.min(700, Math.max(80, box!.y + 50)))
		await expect(port).toHaveCSS('scroll-snap-type', 'none')
		const beforeWheel = await port.evaluate(element => ({
			top: element.scrollTop,
			range: element.scrollHeight - element.clientHeight,
		}))

		expect(beforeWheel.range, 'Hovered TOC has an actual scrollable range').toBeGreaterThan(0)
		const wheelDelta =
			beforeWheel.top > beforeWheel.range / 2
				? -Math.min(200, beforeWheel.top)
				: Math.min(200, beforeWheel.range - beforeWheel.top)
		const end = port.evaluate(
			element =>
				new Promise<void>((resolve, reject) => {
					const timeout = setTimeout(
						() => reject(new Error('Native TOC wheel scroll did not end')),
						3500,
					)

					element.addEventListener(
						'scrollend',
						() => {
							clearTimeout(timeout)
							resolve()
						},
						{ once: true },
					)
				}),
		)

		await page.mouse.wheel(0, wheelDelta)
		await end
		const hovering = await port.evaluate(element => element.scrollTop)

		expect(
			Math.abs(hovering - beforeWheel.top),
			'Native wheel moves the hovered TOC',
		).toBeGreaterThan(1)

		await seek('address-resolution')
		await expect
			.poll(() => toc.locator('a[href]').evaluateAll(selectedDestinations))
			.toEqual(['#address-resolution'])
		await page.evaluate(settleFrames)
		expect(Math.abs((await port.evaluate(element => element.scrollTop)) - hovering)).toBeLessThan(1)

		await page.mouse.move(0, 0)
		await expect(port).toHaveCSS('scroll-snap-type', 'block mandatory')
		await expect.poll(currentVisible).toBe(true)
		const areas = await toc
			.locator('a')
			.evaluateAll(links =>
				links
					.filter(link => getComputedStyle(link).scrollSnapAlign !== 'none')
					.map(link => new URL(link.getAttribute('href')!, document.baseURI).hash),
			)

		const currentPaint = await toc.locator('a[href]').evaluateAll(links =>
			links
				.filter(
					link =>
						getComputedStyle(link).getPropertyValue('---navigation-snapAlign').trim() === 'center',
				)
				.map(link => ({
					href: new URL(link.getAttribute('href')!, document.baseURI).hash,
					current: Number.parseFloat(getComputedStyle(link).getPropertyValue('---link-current')),
				})),
		)

		expect(currentPaint).toHaveLength(1)
		expect(
			currentPaint[0].current,
			'The unique current snap destination retains shared current paint state',
		).toBe(1)
		expect(areas).toHaveLength(1)
		expect(areas).toEqual(await toc.locator('a[href]').evaluateAll(selectedDestinations))
		observations.push({
			width,
			hovering,
			resumed: await port.evaluate(element => element.scrollTop),
			areas,
		})
	}
	await info.attach('toc-native-current-snap', {
		body: JSON.stringify(observations, null, 2),
		contentType: 'application/json',
	})
})

import type { Locator } from '@playwright/test'

import { observeStickyChain } from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

test('Security News retains real H2/H3 sticky owners through native disclosure and reverse flow', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 690, height: 900 })
	await page.goto('/metamask/?variant=MOBILE')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	const enhanced = await page.evaluate(
		() =>
			CSS.supports('animation-timeline: scroll()') &&
			CSS.supports('animation-range: 0% 100%') &&
			CSS.supports('timeline-scope: --breadcrumb-size') &&
			CSS.supports('width: anchor-size(--source inline)') &&
			CSS.supports('color: if(style(--a: 1): red)'),
	)
	const toggle = async (details: Locator) => {
		const summary = details.locator(':scope > summary')

		await summary.focus()
		await expect(summary).toBeFocused()
		await summary.press('Space')
	}
	const news = page.locator('aside#security-news[data-sticky-breadcrumb~="scope"]')
	const header = news.locator(':scope > [data-sticky-breadcrumb~="position"]')

	await expect(news).toHaveCount(1)
	await expect(news).not.toHaveAttribute('data-card')
	await expect(news.locator(':scope > details')).toHaveCount(0)
	await expect(header).toHaveCount(1)
	await expect(header.locator('h2')).toHaveCount(1)
	await expect(header.locator('[data-icon~="newsletter"]')).toHaveCount(1)
	await expect(
		news.locator('.news-items > article[data-sticky-breadcrumb~="scope"]').first(),
	).toBeAttached()

	const closedNews = await news
		.locator(
			'.news-items > article[data-sticky-breadcrumb~="scope"] > details:not([open]) > summary[data-sticky-breadcrumb~="position"]',
		)
		.evaluateAll(summaries =>
			summaries.map(summary => {
				const boxes = (element: Element) => {
					const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
					const rects = []

					while (walker.nextNode()) {
						if (walker.currentNode.textContent?.trim()) {
							const range = document.createRange()

							range.selectNodeContents(walker.currentNode)
							rects.push(
								...[...range.getClientRects()]
									.filter(rect => rect.width > 0 && rect.height > 0)
									.map(({ x, y, width, height, top, right, bottom, left }) => ({
										x,
										y,
										width,
										height,
										top,
										right,
										bottom,
										left,
									})),
							)
						}
					}

					return rects
				}
				const title = boxes(summary.querySelector('h3')!)
				const metadata = boxes(summary.querySelector('.news-meta')!)

				return {
					title,
					metadata,
					overlap: title.some(a =>
						metadata.some(
							b =>
								Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
								Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top),
						),
					),
				}
			}),
		)

	await info.attach('natural-closed-news-title-metadata', {
		body: JSON.stringify(closedNews, null, 2),
		contentType: 'application/json',
	})
	expect(closedNews.length, 'Real naturally closed News cards are present').toBeGreaterThan(0)

	for (const card of closedNews) {
		expect(card.title.length).toBeGreaterThan(0)
		expect(card.metadata.length).toBeGreaterThan(0)
		expect(card.overlap, 'Closed News title and metadata glyphs do not overlap').toBe(false)
	}
	const incident = news
		.locator('.news-items > article[data-sticky-breadcrumb~="scope"] > details')
		.first()

	await expect(incident).toBeVisible()

	if (
		!(await incident.evaluate(element => {
			if (!(element instanceof HTMLDetailsElement)) {
				throw new Error('The native disclosure owner must be a details element')
			}

			return element.open
		}))
	) {
		await toggle(incident)
	}

	const originalH2 = await header.locator('h2').elementHandle()
	const originalH3 = await incident.locator('h3').elementHandle()

	await page.locator('#layout').evaluate(element => {
		if (!(element instanceof HTMLElement)) {
			throw new Error('The native scroll owner must be an HTML element')
		}

		element.style.scrollSnapType = 'none'
	})
	const chain = [
		{ level: 1, scope: '#top', heading: '#top h1' },
		{
			level: 2,
			scope: '#security-news',
			heading: '#security-news > [data-sticky-breadcrumb~="position"] h2',
		},
		{
			level: 3,
			scope: '#security-news .news-items > article[data-sticky-breadcrumb~="scope"]:first-child',
			heading:
				'#security-news .news-items > article[data-sticky-breadcrumb~="scope"]:first-child > details > summary[data-sticky-breadcrumb~="position"] h3',
		},
	]
	const seek = async (top: number) =>
		page.locator('#layout').evaluate(async (element, top) => {
			element.scrollTo({ top, behavior: 'instant' })
			await new Promise<void>(resolve =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			)
		}, top)
	const readability = async (selector: string) =>
		page.locator(selector).evaluate(heading => {
			const permalink = heading.closest('a') ?? heading.querySelector('a')

			const range = document.createRange()
			const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT)
			const rectangles: DOMRect[] = []

			while (walker.nextNode()) {
				if (!walker.currentNode.textContent?.trim()) {
					continue
				}

				range.selectNodeContents(walker.currentNode)
				rectangles.push(...range.getClientRects())
			}

			return rectangles.map(rect => {
				const left = Math.max(0, rect.left),
					right = Math.min(innerWidth, rect.right)
				const top = Math.max(0, rect.top),
					bottom = Math.min(innerHeight, rect.bottom)
				const area = Math.max(0, right - left) * Math.max(0, bottom - top)
				const hit =
					area > 0 ? document.elementsFromPoint((left + right) / 2, (top + bottom) / 2)[0] : null

				return {
					left,
					right,
					top,
					bottom,
					area,
					hit: hit?.tagName ?? null,
					readable: !!hit && (heading.contains(hit) || hit === permalink),
				}
			})
		})
	const observations = []

	for (const level of [2, 3]) {
		await seek(0)
		let measured = await page.evaluate(observeStickyChain, chain.slice(0, level))
		const sourceTop = measured.scroll + measured.rows.at(-1)!.scopeBox.top

		await seek(sourceTop - 300)
		const natural = await page.evaluate(observeStickyChain, chain.slice(0, level))
		const naturalStickyHeight = await page
			.locator(chain[level - 1].heading)
			.evaluate((heading, enhanced) => {
				for (let owner: Element | null = heading; owner; owner = owner.parentElement) {
					if (getComputedStyle(owner).position === 'sticky') {
						return owner.getBoundingClientRect().height
					}
				}

				if (!enhanced) {
					return heading.closest('[data-sticky-breadcrumb~="position"]')!.getBoundingClientRect()
						.height
				}

				throw new Error('News heading has no physical sticky owner')
			}, enhanced)
		let contact = natural.scroll

		for (let iteration = 0; iteration < 4; iteration++) {
			measured = await page.evaluate(observeStickyChain, chain.slice(0, level))
			let bottom = measured.siteBottom

			for (const row of measured.rows.slice(0, -1)) {
				if (row.opacity > 0.01 && row.occupiedRow.bottom > 0 && row.occupiedRow.top <= bottom + 2) {
					bottom = Math.max(bottom, row.occupiedRow.bottom)
				}
			}
			contact = sourceTop - bottom
			await seek(contact)
		}
		const contactState = await page.evaluate(observeStickyChain, chain.slice(0, level))
		const contactRow = contactState.rows.at(-1)!
		let firstRequested = contact + naturalStickyHeight + 20

		if (enhanced) {
			const entryProgress = () =>
				page.locator(chain[level - 1].heading).evaluate(heading => {
					const owner = heading.closest('[data-sticky-breadcrumb~="position"]')
					const clock = owner
						?.getAnimations()
						.find(
							animation =>
								animation instanceof CSSAnimation &&
								animation.animationName === 'breadcrumb-entry' &&
								animation.effect instanceof KeyframeEffect &&
								animation.effect.target === owner,
						)
					const progress = clock?.effect?.getComputedTiming().progress

					if (
						!clock?.timeline ||
						clock.timeline === document.timeline ||
						clock.timeline.currentTime === null ||
						clock.currentTime === null
					) {
						throw new Error('News plateau needs its resolved native entry clock')
					}

					return progress
				})
			let low = natural.scroll
			let high = sourceTop + natural.rows.at(-1)!.scopeBox.height

			await seek(low)
			expect(await entryProgress(), 'Natural entry is not complete').not.toBe(1)
			await seek(high)
			expect(await entryProgress(), 'Completed entry endpoint').toBe(1)
			while (high - low > 1) {
				const middle = Math.floor((low + high) / 2)

				await seek(middle)

				if ((await entryProgress()) === 1) {
					high = middle
				} else {
					low = middle
				}
			}
			firstRequested = high + 1
			await seek(firstRequested)
			expect(await entryProgress(), 'Plateau starts after native entry completes').toBe(1)
		}

		await seek(firstRequested)
		const first = await page.evaluate(observeStickyChain, chain.slice(0, level))
		const firstReadable = await readability(chain[level - 1].heading)

		await seek(firstRequested + 20)
		const second = await page.evaluate(observeStickyChain, chain.slice(0, level))
		const secondReadable = await readability(chain[level - 1].heading)

		await seek(natural.scroll)
		const reverse = await page.evaluate(observeStickyChain, chain.slice(0, level))

		observations.push({
			level,
			sourceTop,
			contact,
			natural,
			contactState,
			contactRow,
			firstRequested,
			firstReadable,
			secondReadable,
			first,
			second,
			reverse,
		})
	}
	await info.attach('security-news-native-owners.json', {
		body: JSON.stringify(observations, null, 2),
		contentType: 'application/json',
	})

	for (const observation of observations) {
		const { level, natural, first, second, reverse, contactState } = observation
		const initialRow = natural.rows.at(-1)!,
			finalRow = reverse.rows.at(-1)!

		expect(
			Math.abs(finalRow.headingBox.top - initialRow.headingBox.top),
			`H${level} reverses to natural flow`,
		).toBeLessThanOrEqual(1)

		if (!enhanced) {
			expect(
				second.scroll - first.scroll,
				'Ordinary-flow control actually scrolls',
			).toBeGreaterThan(0)
			expect(
				Math.abs(
					second.rows.at(-1)!.headingBox.top -
						first.rows.at(-1)!.headingBox.top +
						second.scroll -
						first.scroll,
				),
				`H${level} follows ordinary flow without enhanced sticky ownership`,
			).toBeLessThanOrEqual(1)
			continue
		}

		for (const readable of [observation.firstReadable, observation.secondReadable]) {
			expect(
				readable.some(rect => rect.area > 0 && rect.readable),
				`H${level} plateau heading is in viewport and natively hit-testable`,
			).toBe(true)
		}
		const before = first.rows.at(-1)!,
			after = second.rows.at(-1)!

		expect(
			Math.abs(second.scroll - first.scroll - 20),
			'Requested native seek is actually delivered',
		).toBeLessThanOrEqual(1)
		expect(
			Math.abs(before.headingBox.top - after.headingBox.top),
			`H${level} painted heading plateau`,
		).toBeLessThanOrEqual(1)
		expect(
			Math.abs(after.scopeBox.top - before.scopeBox.top + second.scroll - first.scroll),
		).toBeLessThanOrEqual(1)
		expect(
			before.scopeBox.bottom - before.occupiedRow.bottom,
			'First witness is inside real support extent',
		).toBeGreaterThan(20)
		expect(
			after.scopeBox.bottom - after.occupiedRow.bottom,
			'Second witness precedes scope exit',
		).toBeGreaterThan(0)
		let stackBottom = contactState.siteBottom

		for (const row of contactState.rows.slice(0, -1)) {
			if (
				row.opacity > 0.01 &&
				row.occupiedRow.bottom > 0 &&
				row.occupiedRow.top <= stackBottom + 2
			) {
				stackBottom = Math.max(stackBottom, row.occupiedRow.bottom)
			}
		}
		expect(
			Math.abs(contactState.rows.at(-1)!.scopeBox.top - stackBottom),
			'Actual source contacts preceding painted stack',
		).toBeLessThanOrEqual(2)
	}
	await toggle(incident)
	await expect(incident).not.toHaveAttribute('open', '')
	await expect(incident.locator(':scope > [data-scroll-item~="snap-prose"]')).toBeHidden()
	await expect(
		incident.locator(':scope > summary[data-sticky-breadcrumb~="position"]'),
	).toBeVisible()
	await toggle(incident)
	await expect(incident).toHaveAttribute('open', '')
	expect(
		await header.locator('h2').evaluate((element, original) => element === original, originalH2),
	).toBe(true)
	expect(
		await incident.locator('h3').evaluate((element, original) => element === original, originalH3),
	).toBe(true)
	await originalH2?.dispose()
	await originalH3?.dispose()
})

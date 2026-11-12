import { expect, test } from '../../../tests/browser/verified-test'

async function observeArrival(owner: Element) {
	const root = document.querySelector<HTMLElement>('#layout')!
	const item = owner.querySelector('[data-sticky-breadcrumb~="item"]')!
	const animation = item
		.getAnimations()
		.find(effect => effect instanceof CSSAnimation && effect.animationName === 'breadcrumb-arrival')

	if (!(animation?.timeline instanceof ViewTimeline) || !animation.timeline.subject) {
		throw new Error('Missing native arrival timeline: ' + owner.id)
	}

	const timeline = animation.timeline
	const height = () => timeline.subject.getBoundingClientRect().height
	// Exit-crossing starts when the subject's leading edge crosses the view's start edge.
	const entry = timeline.endOffset.to('px').value - height()
	const nativeStart = timeline.startOffset.to('px').value
	const readLandings = () =>
		[...owner.querySelectorAll<HTMLElement>('*')].flatMap(element => {
			const style = getComputedStyle(element)
			const box = element.getBoundingClientRect()

			if (
				style.scrollSnapAlign !== 'start' ||
				box.width <= 0 ||
				box.height <= 0 ||
				style.visibility === 'hidden' ||
				element.closest('details:not([open]) > :not(summary)')
			) {
				return []
			}

			for (
				let ancestor = element.parentElement;
				ancestor && ancestor !== root;
				ancestor = ancestor.parentElement
			) {
				if (/auto|scroll|hidden/.test(getComputedStyle(ancestor).overflowY)) {
					return []
				}
			}

			return [
				root.scrollTop +
					box.top -
					root.getBoundingClientRect().top -
					parseFloat(style.scrollMarginBlockStart) -
					(parseFloat(getComputedStyle(root).scrollPaddingBlockStart) || 0),
			]
		})
	const landings = readLandings()
	const extent = root.scrollHeight
	const originalStyle = timeline.subject.getAttribute('style')
	const subject = timeline.subject

	if (!(subject instanceof HTMLElement)) {
		throw new Error('Missing HTML arrival subject')
	}

	let control: number[]
	let controlExtent: number
	let controlStart: number

	try {
		// Clock extension must not change the existing content's native snap geometry.
		subject.style.setProperty('--stickyBreadcrumb-arrivalInsetEnd', 'initial', 'important')
		await new Promise<void>(resolve =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
		)
		control = readLandings()
		controlExtent = root.scrollHeight
		controlStart = timeline.startOffset.to('px').value
	} finally {
		if (originalStyle === null) {
			subject.removeAttribute('style')
		} else {
			subject.setAttribute('style', originalStyle)
		}

		await new Promise<void>(resolve =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
		)
	}

	const restored = readLandings()
	const restoredStart = timeline.startOffset.to('px').value

	if (control.length !== landings.length || restored.length !== landings.length) {
		throw new Error('Arrival extension changed the native snap inventory: ' + owner.id)
	}

	const layoutDelta = Math.max(
		...landings.flatMap((value, index) => [
			Math.abs(value - control[index]),
			Math.abs(value - restored[index]),
		]),
	)
	const extentDelta = Math.max(
		Math.abs(extent - controlExtent),
		Math.abs(extent - root.scrollHeight),
	)
	const landing = Math.min(...landings.filter(value => value >= entry - 1 / 32))

	if (!Number.isFinite(landing)) {
		throw new Error('No eligible native child snap: ' + owner.id)
	}

	root.scrollTo({ top: Math.round(landing), behavior: 'instant' })
	await new Promise<void>(resolve =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	)
	const currentEntry = timeline.endOffset.to('px').value - height()

	return {
		id: owner.id,
		entry,
		landing,
		end: Math.max(timeline.startOffset.to('px').value + height(), currentEntry),
		scroll: root.scrollTop,
		count: landings.length,
		entryDelta: Math.abs(currentEntry - entry),
		startDelta: Math.max(
			Math.abs(nativeStart - controlStart),
			Math.abs(nativeStart - restoredStart),
			Math.abs(nativeStart - timeline.startOffset.to('px').value),
		),
		layoutDelta,
		extentDelta,
	}
}

const arrivals = [
	{
		width: 390,
		destinations: [['#stages'], ['#privacy'], ['#security-news'], ['#security-news', true]],
	},
	{ width: 1440, destinations: [['#stages'], ['#privacy'], ['#security-news']] },
] as const

for (const { width, destinations } of arrivals) {
	test(`section breadcrumbs finish at existing native snap landings (${width}px)`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('animation-timeline: view()') &&
					CSS.supports('anchor-scope: --snap') &&
					CSS.supports('color: if(style(--support: 1): red)'),
			)),
			'Native snap-linked breadcrumb arrival unavailable',
		)

		for (const [section, open] of destinations) {
			if (open) {
				const disclosure = page.locator(`${section} article > details`).first()

				await disclosure.locator(':scope > summary').press('Space')
				await expect(disclosure).toHaveJSProperty('open', true)
			}

			const result = await page.locator(section).evaluate(observeArrival)

			expect(result.count, section).toBeGreaterThan(0)
			expect(Number.isFinite(result.landing), section).toBe(true)
			expect(result.entryDelta, section).toBeLessThan(1)
			expect(result.startDelta, section).toBeLessThan(1 / 32)
			expect(result.layoutDelta, section).toBeLessThan(1 / 32)
			expect(result.extentDelta, section).toBe(0)
			expect(Math.abs(result.landing - result.end), section).toBeLessThan(1)
			expect(Math.abs(result.scroll - result.end), section).toBeLessThan(1)
		}
	})
}

test('the Stage description snap preserves readable copy and completes shared-row title motion', async ({
	page,
}) => {
	await page.setViewportSize({ width: 768, height: 900 })
	await page.goto('/metamask/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	test.skip(
		!(await page.evaluate(
			() =>
				CSS.supports('animation-timeline: view()') &&
				CSS.supports('anchor-scope: --snap') &&
				CSS.supports('color: if(style(--support: 1): red)'),
		)),
		'Native snap-linked breadcrumb arrival unavailable',
	)

	const stage = page.locator('#stages section[id^="stage:"]:has(> details[open])')

	await expect(stage).toHaveCount(1)
	const result = await stage.evaluate(async section => {
		const title = section.querySelector('h3 [data-sticky-breadcrumb~="item"]')!
		const description = section.querySelector(
			'summary [data-sticky-breadcrumb~="support"] > [data-scroll-item~="snap-block-start"]',
		)!

		description.scrollIntoView({ block: 'start', behavior: 'instant' })
		await new Promise<void>(resolve =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
		)
		const effect = title
			.getAnimations()
			.find(
				animation =>
					animation instanceof CSSAnimation && animation.animationName === 'breadcrumb-arrival',
			)

		return {
			alignment: getComputedStyle(description).scrollSnapAlign,
			clearance: description.getBoundingClientRect().top - title.getBoundingClientRect().bottom,
			opacity: Number(getComputedStyle(description).opacity),
			progress: effect?.effect?.getComputedTiming().progress,
		}
	})

	expect(result.alignment).toBe('start')
	expect(result.clearance).toBeGreaterThan(0)
	expect(result.opacity).toBe(1)
	expect(result.progress).toBeGreaterThanOrEqual(0.99)
})

for (const direction of ['ltr', 'rtl']) {
	test(`attribute arrival geometry follows the first content landing across wrapping in ${direction}`, async ({
		page,
	}) => {
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('animation-timeline: view()') &&
					CSS.supports('color: if(style(--support: 1): red)'),
			)),
			'Native breadcrumb geometry unavailable',
		)
		await page.keyboard.press('ArrowDown')
		await page.evaluate(direction => {
			document.documentElement.dir = direction
			const root = document.querySelector<HTMLElement>('#layout')!

			root.style.scrollSnapType = 'none'
		}, direction)

		for (const width of [390, 690, 1440]) {
			await page.setViewportSize({ width, height: 900 })
			await page.evaluate(async () => {
				await document.fonts.ready
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
			})
			const rows = await page.evaluate(() => {
				const root = document.querySelector<HTMLElement>('#layout')!
				const rootTop = root.getBoundingClientRect().top
				const padding = parseFloat(getComputedStyle(root).scrollPaddingBlockStart) || 0

				return [...document.querySelectorAll<HTMLElement>('.attribute')].map(section => {
					const card = section.querySelector<HTMLElement>(
						':scope > details > .attribute-content > .attribute-rating-details',
					)!
					const flow = section.querySelector<HTMLElement>(
						':scope > [data-sticky-breadcrumb~="flow"]',
					)!
					const item = section.querySelector(
						':scope > details > summary [data-sticky-breadcrumb~="item"]',
					)!
					const animation = item
						.getAnimations()
						.find(
							effect =>
								effect instanceof CSSAnimation && effect.animationName === 'breadcrumb-arrival',
						)

					if (!(animation?.timeline instanceof ViewTimeline) || !animation.timeline.subject) {
						throw new Error('Missing attribute arrival timeline: ' + section.id)
					}

					const timeline = animation.timeline
					const length = timeline.subject.getBoundingClientRect().height
					const end = Math.max(
						timeline.startOffset.to('px').value + length,
						timeline.endOffset.to('px').value - length,
					)
					const style = getComputedStyle(card)
					const landing =
						root.scrollTop +
						card.getBoundingClientRect().top -
						rootTop -
						parseFloat(style.scrollMarginBlockStart) -
						padding

					return {
						id: section.id,
						end,
						landing,
						alignment: style.scrollSnapAlign,
						flowAlignment: getComputedStyle(flow).scrollSnapAlign,
					}
				})
			})

			expect(rows.length).toBeGreaterThan(0)

			for (const row of rows) {
				expect(row.alignment, `${width}: ${row.id}`).toBe('start')
				expect(row.flowAlignment, `${width}: ${row.id}`).toBe('none')
				expect(Math.abs(row.end - row.landing), `${width}: ${row.id}`).toBeLessThan(1)
			}
		}
	})
}

for (const direction of ['ltr', 'rtl']) {
	test(`text Stage arrivals finish at the first eligible native landing in ${direction}`, async ({
		page,
	}) => {
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('animation-timeline: view()') &&
					CSS.supports('color: if(style(--support: 1): red)'),
			)),
			'Native breadcrumb geometry unavailable',
		)
		await page.keyboard.press('ArrowDown')
		await page.evaluate(direction => {
			document.documentElement.dir = direction
			document.querySelector<HTMLElement>('#layout')!.style.scrollSnapType = 'none'
		}, direction)

		for (const width of [390, 690, 1440]) {
			await page.setViewportSize({ width, height: 900 })
			const stages = page.locator(
				'#stages section[data-sticky-breadcrumb~="scope"]:has(> details > summary > [data-sticky-breadcrumb~="support"] > [data-scroll-item~="snap-block-start"]):has(> details > [data-column] > [data-column] > [data-card]:first-child)',
			)

			expect(await stages.count()).toBeGreaterThan(0)

			for (const stage of await stages.all()) {
				const details = stage.locator(':scope > details')

				if ((await details.getAttribute('open')) === null) {
					await details.locator(':scope > summary').press('Space')
				}

				await expect(details).toHaveJSProperty('open', true)
				await page.evaluate(
					() =>
						new Promise<void>(resolve =>
							requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
						),
				)
				const result = await stage.evaluate(observeArrival)

				expect(result.count, `${width}: ${result.id}`).toBeGreaterThan(0)
				expect(Number.isFinite(result.landing), `${width}: ${result.id}`).toBe(true)
				expect(result.entryDelta, `${width}: ${result.id}`).toBeLessThan(1)
				expect(result.startDelta, `${width}: ${result.id}`).toBeLessThan(1 / 32)
				expect(result.layoutDelta, `${width}: ${result.id}`).toBeLessThan(1 / 32)
				expect(result.extentDelta, `${width}: ${result.id}`).toBe(0)
				expect(
					Math.abs(result.end - result.landing),
					JSON.stringify({ width, ...result }),
				).toBeLessThan(1)
				expect(
					Math.abs(result.scroll - result.end),
					JSON.stringify({ width, ...result }),
				).toBeLessThan(1)
			}
		}
	})
}

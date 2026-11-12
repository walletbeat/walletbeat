import { expect, test } from '../../../tests/browser/verified-test'

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

			const result = await page.locator(section).evaluate(async owner => {
				const root = document.querySelector<HTMLElement>('#layout')!
				const item = owner.querySelector('[data-sticky-breadcrumb~="item"]')!
				const animation = item
					.getAnimations()
					.find(
						effect =>
							effect instanceof CSSAnimation && effect.animationName === 'breadcrumb-arrival',
					)

				if (!(animation?.timeline instanceof ViewTimeline) || !animation.timeline.subject) {
					throw new Error('Section arrival needs a native view timeline')
				}

				const timeline = animation.timeline
				const subject = timeline.subject

				if (!(subject instanceof HTMLElement)) {
					throw new Error('Missing HTML arrival subject')
				}

				const end = () => {
					const height = subject.getBoundingClientRect().height

					return Math.max(
						timeline.startOffset.to('px').value + height,
						timeline.endOffset.to('px').value - height,
					)
				}
				const frame = () =>
					new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
				const targets = [...owner.querySelectorAll<HTMLElement>('*')].filter(element => {
					const style = getComputedStyle(element)
					const box = element.getBoundingClientRect()

					let ancestor = element.parentElement

					while (ancestor && ancestor !== root) {
						if (/auto|scroll|hidden/.test(getComputedStyle(ancestor).overflowY)) {
							return false
						}

						ancestor = ancestor.parentElement
					}

					return (
						style.scrollSnapAlign === 'start' &&
						box.width > 0 &&
						box.height > 0 &&
						style.visibility !== 'hidden' &&
						!element.closest('details:not([open]) > :not(summary)')
					)
				})
				const landings = () =>
					targets.map(
						element =>
							root.scrollTop +
							element.getBoundingClientRect().top -
							root.getBoundingClientRect().top -
							parseFloat(getComputedStyle(element).scrollMarginBlockStart) -
							(parseFloat(getComputedStyle(root).scrollPaddingBlockStart) || 0),
					)
				const original = landings()
				const originalExtent = root.scrollHeight
				const originalStart = timeline.startOffset.to('px').value
				let naturalLandings: number[]
				let naturalExtent: number
				let naturalStart: number
				const originalStyle = subject.getAttribute('style')
				let naturalEnd: number

				try {
					// Observe the natural heading boundary independently of its snap extension.
					subject.style.setProperty('--stickyBreadcrumb-arrivalInsetEnd', 'initial', 'important')
					await frame()
					naturalEnd = end()
					naturalLandings = landings()
					naturalExtent = root.scrollHeight
					naturalStart = timeline.startOffset.to('px').value
				} finally {
					if (originalStyle === null) {
						subject.removeAttribute('style')
					} else {
						subject.setAttribute('style', originalStyle)
					}

					await frame()
				}

				const restored = landings()
				const landing = Math.min(...original.filter(value => value >= naturalEnd - 1 / 32))

				root.scrollTo({ top: Math.round(landing), behavior: 'instant' })
				await frame()

				return {
					landing,
					end: end(),
					scroll: root.scrollTop,
					count: targets.length,
					extentDelta: Math.max(
						Math.abs(originalExtent - naturalExtent),
						Math.abs(originalExtent - root.scrollHeight),
					),
					startDelta: Math.abs(originalStart - naturalStart),
					measurementDelta: Math.max(
						...original.map((value, index) => Math.abs(value - naturalLandings[index])),
					),
					geometryDelta: Math.max(
						...original.map((value, index) => Math.abs(value - restored[index])),
					),
				}
			})

			expect(result.count, section).toBeGreaterThan(0)
			expect(Number.isFinite(result.landing), section).toBe(true)
			expect(result.geometryDelta, section).toBeLessThan(1 / 32)
			expect(result.measurementDelta, section).toBeLessThan(1 / 32)
			expect(result.extentDelta, section).toBe(0)
			expect(result.startDelta, section).toBeLessThan(1 / 32)
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

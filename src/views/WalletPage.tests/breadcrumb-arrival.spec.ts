import { expect, test } from '../../../tests/browser/verified-test'

for (const { direction, width, requiresCurve } of [
	{ direction: 'ltr', width: 690, requiresCurve: true },
	{ direction: 'rtl', width: 690, requiresCurve: false },
	{ direction: 'rtl', width: 1440, requiresCurve: true },
] as const) {
	test(`adjacent breadcrumbs follow a reversible rounded corner (${direction}, ${width}px)`, async ({
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
					CSS.supports('width: anchor-size(--source inline)'),
			)),
			'Native breadcrumb arrival enhancement unavailable',
		)
		await page.evaluate(direction => {
			document.documentElement.dir = direction
			const root = document.querySelector<HTMLElement>('#layout')!

			root.style.scrollSnapType = 'none'
			root.style.scrollBehavior = 'auto'
		}, direction)

		let rounded = 0

		for (const id of ['transaction-legibility', 'account-recovery']) {
			const item = page.locator(`#${id} [data-sticky-breadcrumb~="item"]`).first()
			const natural = await page.locator(`#${id}`).evaluate(section => {
				const root = document.querySelector<HTMLElement>('#layout')!
				const flow = section.querySelector(
					':scope > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
				)!

				return root.scrollTop + flow.getBoundingClientRect().top - root.getBoundingClientRect().top
			})
			const seek = (scroll: number) =>
				item.evaluate(async (element, scroll) => {
					const root = document.querySelector('#layout')!

					root.scrollTop = scroll
					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
					const animation = element
						.getAnimations()
						.find(
							animation =>
								animation instanceof CSSAnimation &&
								animation.animationName === 'breadcrumb-arrival',
						)

					if (
						!(animation?.effect instanceof KeyframeEffect) ||
						!(animation.timeline instanceof ViewTimeline)
					) {
						throw new Error('Resolved native rounded arrival required')
					}

					const scope = element.closest('[data-sticky-breadcrumb~="scope"]'),
						flow = scope?.querySelector(
							':scope > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
						)

					if (!flow || animation.timeline.subject !== flow || animation.timeline.source !== root) {
						throw Error('Arrival must follow its own flow subject in the page scroll root')
					}

					const style = getComputedStyle(element)
					const [x = 0, y = 0] = style.translate.split(' ').map(Number.parseFloat)
					const viewStart = animation.timeline.startOffset.to('px').value
					const viewLength = animation.timeline.endOffset.to('px').value - viewStart
					const subjectLength = flow.getBoundingClientRect().height
					const visibleLength = viewLength - subjectLength
					const begin = viewStart + visibleLength
					const end = viewStart + Math.max(subjectLength, visibleLength)

					if (!(end > begin) || animation.playbackRate !== 1) {
						throw Error('Observable physical arrival interval required')
					}

					const clock = (root.scrollTop - begin) / (end - begin)

					return {
						x,
						y,
						clock,
						scroll: root.scrollTop,
					}
				}, scroll)
			const start = await seek(natural - 500)
			const end = await seek(natural + 500)

			expect(start.clock).toBeLessThanOrEqual(0)
			expect(end.clock).toBeGreaterThanOrEqual(1)
			expect(Math.abs(end.y)).toBeGreaterThan(10)
			const curved = Math.abs(end.x) > 20

			if (curved) {
				rounded++
			} else {
				expect(Math.abs(end.x)).toBeLessThan(0.5)
			}

			const slope = (end.clock - start.clock) / (end.scroll - start.scroll)

			expect(Number.isFinite(slope) && slope > 0).toBe(true)
			const samples = []

			for (const target of [0.35, 0.45, 0.5, 0.55, 0.65]) {
				const row = await seek(start.scroll + (target - start.clock) / slope)

				expect(Math.abs(row.clock - target)).toBeLessThanOrEqual(slope + 0.001)
				expect(row.clock).toBeGreaterThan(0)
				expect(row.clock).toBeLessThan(1)

				if (!curved) {
					expect(Math.abs(row.x)).toBeLessThan(0.5)
					expect(row.y).toBeGreaterThan(Math.min(start.y, end.y))
					expect(row.y).toBeLessThan(Math.max(start.y, end.y))
					samples.push(row)
					continue
				}

				const x = row.x / end.x,
					y = row.y / end.y

				expect(
					Math.abs(x * x + (1 - y) * (1 - y) - 1),
					'Rendered translation follows the rounded corner, rather than its diagonal chord',
				).toBeLessThan(0.003)

				if (target === 0.5) {
					expect(x - y).toBeGreaterThan(0.3)
				}

				samples.push(row)
			}

			for (const sample of samples.reverse()) {
				const reversed = await seek(sample.scroll)

				expect(Math.abs(reversed.x - sample.x)).toBeLessThan(0.5)
				expect(Math.abs(reversed.y - sample.y)).toBeLessThan(0.5)
			}
		}

		if (requiresCurve) {
			expect(
				rounded,
				'At least one heading must exercise a genuine two-dimensional arrival',
			).toBeGreaterThan(0)
		}
	})
}

test('reduced breadcrumb arrival has a single endpoint step', async ({ page }, info) => {
	await page.setViewportSize({ width: 690, height: 900 })
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.goto('/metamask/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	test.skip(
		!(await page.evaluate(
			() =>
				CSS.supports('animation-timeline: view()') &&
				CSS.supports('width: anchor-size(--source inline)'),
		)),
		'Native breadcrumb arrival enhancement unavailable',
	)
	await page.evaluate(() => document.fonts.ready)
	const result = await page
		.locator('#transaction-legibility [data-sticky-breadcrumb~="item"]')
		.first()
		.evaluate(async element => {
			const root = document.querySelector<HTMLElement>('#layout')!

			root.style.scrollSnapType = 'none'
			root.style.scrollBehavior = 'auto'
			const animation = element
				.getAnimations()
				.find(
					animation =>
						animation instanceof CSSAnimation &&
						animation.animationName === 'breadcrumb-arrival-step',
				)

			if (
				!(animation?.effect instanceof KeyframeEffect) ||
				!(animation.timeline instanceof ViewTimeline)
			) {
				throw Error('Native reduced arrival required')
			}

			const subject = animation.timeline.subject

			if (!subject || animation.timeline.source !== root) {
				throw Error('Arrival subject must belong to the page scroll root')
			}

			const viewStart = animation.timeline.startOffset.to('px').value
			const viewLength = animation.timeline.endOffset.to('px').value - viewStart
			const subjectLength = subject.getBoundingClientRect().height
			const visibleLength = viewLength - subjectLength
			const begin = viewStart + visibleLength
			const end = viewStart + Math.max(subjectLength, visibleLength)

			if (!(end > begin)) {
				throw Error('Observable physical arrival interval required')
			}

			const positions = [
				...[-0.25, 0, 0.25, 0.5, 0.75].map(fraction => begin + (end - begin) * fraction),
				Math.floor(end) - 1,
				Math.ceil(end) + 1,
				Math.ceil(end) + Math.max(2, Math.ceil((end - begin) / 4)),
			]
			const rows = []

			for (const scroll of [...positions, ...positions.toReversed()]) {
				root.scrollTop = scroll
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
				const translation = getComputedStyle(element).translate

				rows.push({ scroll: root.scrollTop, translation })
			}

			return { samples: rows, begin, end }
		})

	await info.attach('reduced-arrival-poses', {
		body: JSON.stringify(result),
		contentType: 'application/json',
	})
	const { samples } = result
	const forward = samples.slice(0, samples.length / 2)

	expect(forward[5].scroll).toBeLessThan(result.end)
	expect(forward[6].scroll).toBeGreaterThan(result.end)
	expect(new Set(forward.slice(0, 6).map(sample => sample.translation)).size).toBe(1)
	expect(new Set(forward.slice(6).map(sample => sample.translation)).size).toBe(1)
	expect(forward[0].translation).not.toBe(forward.at(-1)!.translation)
	expect(samples.slice(forward.length).map(sample => sample.translation)).toEqual(
		forward.toReversed().map(sample => sample.translation),
	)
})

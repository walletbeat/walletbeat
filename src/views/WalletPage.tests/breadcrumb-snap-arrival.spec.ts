import { expect, test } from '../../../tests/browser/verified-test'

const arrivals = [
	{
		width: 390,
		destinations: [
			['#stages', '[id="stage:software-0"] [data-scroll-item~="snap-block-start"]'],
			['#privacy', '#address-correlation .attribute-rating-details'],
			['#security-news', '#security-news-consensys-metamask-north-korean-hacker'],
			[
				'#security-news',
				'#security-news-metamask-infrastructure-security-incident .news-summary',
				true,
			],
		],
	},
	{
		width: 1440,
		destinations: [
			['#stages', '[id="stage:software-0"]'],
			['#privacy', '#address-correlation'],
			['#security-news', '#security-news-metamask-infrastructure-security-incident'],
		],
	},
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

		for (const [section, destination, open] of destinations) {
			if (open) {
				const disclosure = page.locator(`${section} article > details`).first()

				await disclosure.locator(':scope > summary').press('Space')
				await expect(disclosure).toHaveJSProperty('open', true)
			}

			const result = await page.locator(destination).evaluate(async (snap, section) => {
				const root = document.querySelector<HTMLElement>('#layout')!
				const item = document.querySelector(`${section} [data-sticky-breadcrumb~="item"]`)!
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
				const targetStyle = getComputedStyle(snap)
				const margin = parseFloat(targetStyle.scrollMarginBlockStart) || 0
				const padding = parseFloat(getComputedStyle(root).scrollPaddingBlockStart) || 0
				const landing =
					root.scrollTop +
					snap.getBoundingClientRect().top -
					root.getBoundingClientRect().top -
					margin -
					padding

				root.scrollTo({ top: Math.round(landing), behavior: 'instant' })
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)

				const length = timeline.subject.getBoundingClientRect().height
				const end = Math.max(
					timeline.startOffset.to('px').value + length,
					timeline.endOffset.to('px').value - length,
				)

				return { alignment: targetStyle.scrollSnapAlign, landing, end, scroll: root.scrollTop }
			}, section)

			expect(result.alignment, destination).toBe('start')
			expect(Math.abs(result.landing - result.end), destination).toBeLessThan(1)
			expect(Math.abs(result.scroll - result.end), destination).toBeLessThan(1)
		}
	})
}

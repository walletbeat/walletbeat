import { expect, test } from '../../../tests/browser/verified-test'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test(`TOC preserves native identity clocks through closing (${reducedMotion})`, async ({
		page,
	}, info) => {
		await page.emulateMedia({ reducedMotion })
		await page.setViewportSize({ width: 390, height: 900 })
		await page.goto('/metamask/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const enhanced = await page.evaluate(
			() =>
				CSS.supports('color: if(style(---breadcrumb-wrap: 1): red; else: blue)') &&
				CSS.supports('animation-timeline: scroll()') &&
				CSS.supports('animation-range: 0% 100%') &&
				CSS.supports('timeline-scope: --breadcrumb-size') &&
				CSS.supports('width: anchor-size(--source inline)'),
		)

		test.skip(!enhanced, 'Native identity clocks require the supported sticky enhancement')
		const observations: unknown[] = []

		for (const safeArea of [0, 44, 59]) {
			for (const top of [0, 6000]) {
				await page.evaluate(
					({ safeArea, top }) => {
						document.documentElement.style.setProperty('--safeArea-insetTop', `${safeArea}px`)
						const root = document.querySelector<HTMLElement>('#layout')!

						root.style.scrollSnapType = 'none'
						root.style.scrollBehavior = 'auto'
						root.scrollTop = top
					},
					{ safeArea, top },
				)
				await expect.poll(() => page.locator('#layout').evaluate(e => e.scrollTop)).toBe(top)
				await page.waitForTimeout(1000)
				const witness = await page.evaluateHandle(() => {
					const root = document.querySelector<HTMLElement>('#layout')!
					const owners = [
						document.querySelector('h1')!.closest('.wallet-title-row')!,
						document.querySelector('#nav > header > .logo')!,
					]
					const clocks = owners.flatMap(owner =>
						owner.getAnimations().map(animation => ({ animation, timeline: animation.timeline })),
					)

					return (action: 'sample' | 'open' | 'close') => {
						const panel = document.querySelector<HTMLElement>('#wallet-toc')!

						if (action === 'open') {
							panel.showPopover()
						}

						if (action === 'close') {
							panel.hidePopover()
						}

						return {
							state: root.dataset.walletTocState,
							scroll: root.scrollTop,
							effects: clocks.map(({ animation, timeline }) => ({
								sameTimeline: animation.timeline === timeline,
								nativeTimeline: timeline instanceof ViewTimeline,
								finiteClock: timeline?.currentTime != null,
								pending: animation.pending,
								progress: animation.effect!.getComputedTiming().progress,
							})),
						}
					}
				})
				const capture = async (state: 'open' | 'closing' | 'closed', close = false) => {
					const sample = await page.evaluate(
						({ witness, close }) => witness(close ? 'close' : 'sample'),
						{ witness, close },
					)

					observations.push({ safeArea, top, expectedState: state, ...sample })
					expect(sample.state).toBe(state)

					if (state === 'closed') {
						expect(sample.scroll).toBe(top)
					}

					expect(sample.effects.length).toBeGreaterThanOrEqual(3)

					for (const effect of sample.effects) {
						expect(effect.sameTimeline).toBe(true)
						expect(effect.nativeTimeline).toBe(true)
						expect(effect.finiteClock).toBe(true)
						expect(effect.pending).toBe(false)
						expect(effect.progress).toBe(state === 'closed' && top === 0 ? 0 : 1)
					}
				}

				try {
					await page.evaluate(witness => {
						witness('open')
					}, witness)
					await expect(page.locator('#layout')).toHaveAttribute('data-wallet-toc-state', 'open')
					await page.waitForTimeout(300)
					await capture('open')
					await capture('closing', true)
					await expect(page.locator('#layout')).toHaveAttribute('data-wallet-toc-state', 'closed')
					await capture('closed')
					await page.waitForTimeout(300)
					await capture('closed')
				} finally {
					await witness.dispose()
				}
			}
		}
		await info.attach('native-clock-lifecycle', {
			body: JSON.stringify({
				reducedMotion,
				observations,
				limit:
					'Native open, synchronous closing and host-timed closed clock checkpoints; not frame latency or compositor acceptance.',
			}),
			contentType: 'application/json',
		})
	})
}

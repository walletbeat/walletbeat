import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 1440]) {
	test(`closed foregrounds return to natural geometry and reopen at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		await page.locator('#security-news').evaluate(news => {
			for (const details of news.querySelectorAll<HTMLDetailsElement>('details')) {
				if (details.querySelector(':scope > summary h2')) {
					details.open = true
				}
			}
		})
		const details = page.locator('#security-audits-and-bounties > details')
		const summary = details.locator(':scope > summary')
		const item = summary.locator('[data-sticky-breadcrumb~="item"]').first()
		const focusSummary = () =>
			summary.evaluate(element => {
				if (!(element instanceof HTMLElement)) {
					throw new Error('Native disclosure summary required')
				}

				element.focus({ preventScroll: true })
			})
		const enhanced = await page.evaluate(
			() =>
				CSS.supports('animation-timeline: scroll()') &&
				CSS.supports('animation-range: 0% 100%') &&
				CSS.supports('width: anchor-size(--source inline)') &&
				CSS.supports('color: if(style(--a: 1): red)'),
		)

		await expect(details).toHaveAttribute('open')
		await page.locator('#layout').evaluate(root => {
			if (!(root instanceof HTMLElement)) {
				throw new Error('Native scroll root required')
			}

			root.style.scrollSnapType = 'none'
		})
		const enter = async () => {
			await details.evaluate(element => {
				const root = document.querySelector<HTMLElement>('#layout')!
				const scope = element.parentElement!

				root.scrollTo({
					top:
						scope.getBoundingClientRect().top +
						root.scrollTop +
						Math.min(scope.clientHeight, root.clientHeight) / 2,
					behavior: 'instant',
				})
			})

			if (enhanced) {
				await expect
					.poll(() =>
						item.evaluate(element => {
							const transform = getComputedStyle(element).transform

							return transform === 'none' ? 1 : new DOMMatrix(transform).a
						}),
					)
					.toBeLessThan(0.999)
			}
		}
		const readClosed = () =>
			page
				.locator('details:not([open]) > summary [data-sticky-breadcrumb~="item"]')
				.evaluateAll(items =>
					items
						.filter(
							item =>
								!item.closest('details:not([open]) > :not(summary)') &&
								item.getClientRects().length > 0,
						)
						.map(item => {
							const style = getComputedStyle(item)
							const natural = (element: Element) => {
								const value = getComputedStyle(element).transform

								return value === 'none' || new DOMMatrix(value).isIdentity
							}
							const labels = [...item.querySelectorAll('a > span:not([data-icon])')]

							return {
								id: item.closest('[data-sticky-breadcrumb~="scope"]')?.id,
								family: item.closest('#security-news')
									? 'incident'
									: item.closest('#stages')
										? 'stage'
										: 'attribute',
								natural: natural(item),
								labelCount: labels.length,
								labelsNatural: labels.every(natural),
								transform: style.transform,
								animationName: style.animationName,
							}
						}),
				)
		const assertClosed = async () => {
			await expect
				.poll(async () => {
					const rows = await readClosed()

					return rows.length > 0 && rows.every(row => row.natural && row.labelsNatural)
				})
				.toBe(true)

			return readClosed()
		}

		await enter()
		await focusSummary()
		await page.keyboard.press('Space')
		await expect(details).not.toHaveAttribute('open')
		const nativeClosed = await assertClosed()
		const nativeItem = nativeClosed.find(row => row.id === 'security-audits-and-bounties')

		expect(
			nativeItem?.labelCount,
			'Actual heading label participates in the natural-geometry oracle',
		).toBeGreaterThan(0)

		await page.keyboard.press('Space')
		await expect(details).toHaveAttribute('open')
		await enter()
		await page.evaluate(() => {
			for (const element of document.querySelectorAll<HTMLDetailsElement>(
				'article details[open]',
			)) {
				if (
					!element.closest('details:not([open]) > :not(summary)') &&
					element.querySelector(':scope > summary :is(h3, h4)')
				) {
					element.open = false
				}
			}
		})
		const allClosed = await assertClosed()

		expect(allClosed.some(row => row.id?.startsWith('security-news-'))).toBe(true)

		expect(new Set(allClosed.map(row => row.family))).toEqual(
			new Set(['attribute', 'stage', 'incident']),
		)
		await focusSummary()
		await page.keyboard.press('Space')
		await expect(details).toHaveAttribute('open')
		await enter()
		await info.attach('foreground-lifecycle', {
			body: JSON.stringify({ width, enhanced, nativeClosed, allClosed }),
			contentType: 'application/json',
		})
	})
}

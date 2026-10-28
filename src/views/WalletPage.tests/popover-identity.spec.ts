import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 900]) {
	test(`both navigation popovers preserve the painted wallet identity at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')
		const enhanced = await page.evaluate(
			() =>
				CSS.supports('color: if(style(---breadcrumb-wrap: 1): red; else: blue)') &&
				CSS.supports('animation-timeline: scroll()') &&
				CSS.supports('width: anchor-size(--source inline)'),
		)

		test.skip(
			!enhanced,
			'Shared identity motion requires native scroll and anchor positioning support',
		)
		const root = page.locator('#layout')

		await root.evaluate(element => {
			element.style.scrollSnapType = 'none'
			element.scrollTop = 0
		})
		const originalIdentity = await page.locator('h1 a.wallet-name').elementHandle()
		const originalLogo = await page.locator('#nav .logo').elementHandle()
		const poses: number[][] = []

		for (const [name, panel] of [
			['Table of contents', '#wallet-toc'],
			['Open navigation menu', '#nav-menu'],
		]) {
			await page.getByRole('button', { name, exact: true }).click()
			await expect
				.poll(() => page.locator(panel).evaluate(element => element.matches(':popover-open')))
				.toBe(true)
			await expect
				.poll(() =>
					page.locator('.wallet-title-row').evaluate(
						element =>
							element
								.getAnimations()
								.find(
									animation =>
										animation instanceof CSSAnimation &&
										animation.animationName === 'breadcrumb-item-motion',
								)
								?.effect?.getComputedTiming().progress,
					),
				)
				.toBe(1)
			const identity = await page.locator('h1 a.wallet-name').evaluate(element => {
				const box = element.getBoundingClientRect()
				const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
				const logo = document.querySelector('#nav .logo')!.getBoundingClientRect()

				return {
					hit: hit !== null && element.contains(hit),
					box: [box.x, box.y, box.width, box.height],
					logo: [logo.x, logo.y, logo.width, logo.height],
				}
			})

			expect(
				identity.hit,
				'The original H1 must remain painted and interactive, outside the menu panel top layer',
			).toBe(true)
			await info.attach(`open-${name}`, { body: await page.screenshot(), contentType: 'image/png' })
			poses.push([...identity.box, ...identity.logo])
			const closingIdentity = await page.locator(panel).evaluate(async element => {
				if (!(element instanceof HTMLElement)) {
					throw new Error('Native panel required')
				}

				await new Promise<void>(resolve => {
					element.addEventListener('toggle', () => resolve(), { once: true })
					element.hidePopover()
				})
				const title = document.querySelector('h1 a.wallet-name')!
				const box = title.getBoundingClientRect()
				const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)

				return {
					closing: element.hasAttribute('data-closing'),
					hit: hit !== null && title.contains(hit),
				}
			})

			expect(closingIdentity.closing).toBe(true)
			expect(closingIdentity.hit, 'Original identity remains interactive during panel exit').toBe(
				true,
			)
			await page.locator(panel).evaluate(element => {
				if (!(element instanceof HTMLElement)) {
					throw new Error('Native panel required')
				}

				element.showPopover()
			})
			await expect(page.locator(panel)).not.toHaveAttribute('data-closing')
			await expect
				.poll(() => page.locator(panel).evaluate(element => element.matches(':popover-open')))
				.toBe(true)
			expect(
				await originalIdentity.evaluate(
					element => element === document.querySelector('h1 a.wallet-name'),
				),
			).toBe(true)
			expect(
				await originalLogo.evaluate(element => element === document.querySelector('#nav .logo')),
			).toBe(true)
			await page.keyboard.press('Escape')
			await expect
				.poll(() => page.locator(panel).evaluate(element => element.matches(':popover-open')))
				.toBe(false)
			await expect
				.poll(() => page.locator('#layout').getAttribute('data-wallet-toc-state'))
				.toBe('closed')
			await expect.poll(() => page.locator(panel).getAttribute('data-closing')).toBeNull()
		}

		for (const [index, value] of poses[0].entries()) {
			expect(Math.abs(value - poses[1][index])).toBeLessThanOrEqual(1)
		}
	})
}

import { expect, test } from '../../../tests/browser/verified-test'

test('TOC native invoker remains usable before client enhancement', async ({ browser }, info) => {
	const context = await browser.newContext({
		baseURL: info.project.use.baseURL,
		javaScriptEnabled: false,
		viewport: { width: 390, height: 900 },
	})

	try {
		const page = await context.newPage()

		await page.goto('/metamask/?variant=BROWSER')
		const panel = page.locator('#wallet-toc')
		const button = page.locator('button[popovertarget="wallet-toc"]')

		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(1)
		await expect(button).toBeVisible()
		await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')

		await button.click()
		await expect(page.locator('#wallet-toc:popover-open')).toHaveCount(1)
		await expect(panel).toBeVisible()
		await expect(panel.locator('a[href]').first()).toBeVisible()
		const identity = await page.evaluate(() => {
			const title = document.querySelector('h1')!.getBoundingClientRect()
			const navigation = document.querySelector('#nav > header')!.getBoundingClientRect()
			const logo = document.querySelector('#nav > header > .logo')!.getBoundingClientRect()

			return {
				enhanced:
					CSS.supports('animation-timeline: scroll()') &&
					CSS.supports('animation-range: 0% 100%') &&
					CSS.supports('width: anchor-size(--breadcrumb-source inline)') &&
					CSS.supports('timeline-scope: --breadcrumb-size') &&
					CSS.supports('color: if(style(---breadcrumb-wrap: 1): red; else: blue)'),
				titleTop: title.top,
				titleBottom: title.bottom,
				navigationTop: navigation.top,
				navigationBottom: navigation.bottom,
				logoOverlapsTitle:
					logo.left < title.right - 1 &&
					logo.right > title.left + 1 &&
					logo.top < title.bottom - 1 &&
					logo.bottom > title.top + 1,
			}
		})

		if (identity.enhanced) {
			expect(identity.titleTop).toBeGreaterThanOrEqual(identity.navigationTop - 1)
			expect(identity.titleBottom).toBeLessThanOrEqual(identity.navigationBottom + 1)
			expect(identity.logoOverlapsTitle).toBe(false)
		}

		await page.keyboard.press('Escape')
		await expect(page.locator('#wallet-toc:popover-open')).toHaveCount(0)
		await button.click()
		await expect(page.locator('#wallet-toc:popover-open')).toHaveCount(1)
		await expect(panel).toBeVisible()
		await info.attach('toc-native-fallback', {
			body: JSON.stringify({
				javaScriptEnabled: false,
				nativeOpenEscapeReopen: true,
				identity,
				limit:
					'Native SSR invoker and open identity placement; no intermediate-motion, scroll-restoration or compositor claim.',
			}),
			contentType: 'application/json',
		})
	} finally {
		await context.close()
	}
})

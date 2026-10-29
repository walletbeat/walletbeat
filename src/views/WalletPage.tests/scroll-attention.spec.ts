import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test as base } from '../../../tests/browser/verified-test'
import { launchNativeAttentionBrowser } from './fixtures/native-attention-browser'

type NativeAttention = Awaited<ReturnType<typeof launchNativeAttentionBrowser>>

const test = base.extend<Record<never, never>, { nativeAttention: NativeAttention }>({
	nativeAttention: [
		async ({ browserName }, use, info) => {
			await mkdir(info.project.outputDir, { recursive: true })
			const directory = await mkdtemp(
				join(info.project.outputDir, `native-${browserName}-attention-${info.workerIndex}-`),
			)

			try {
				const native = await launchNativeAttentionBrowser(join(directory, 'browser'))

				try {
					await use(native)
				} finally {
					await native.close()
				}
			} finally {
				await rm(directory, { recursive: true, force: true })
			}
		},
		{ scope: 'worker' },
	],
	browser: [
		async ({ nativeAttention }, use) => {
			await use(nativeAttention.browser)
		},
		{ scope: 'worker' },
	],
	context: async ({ nativeAttention }, use) => {
		try {
			await use(nativeAttention.context)
		} finally {
			await Promise.all(nativeAttention.context.pages().map(page => page.close()))
		}
	},
})

test.skip(
	({ browserName, headless }) =>
		browserName !== 'chromium' || headless || process.platform !== 'darwin',
	'Native OS focus testing requires headed Chromium on macOS',
)

for (const width of [390, 1440]) {
	for (const colorScheme of ['light', 'dark'] as const) {
		for (const reducedMotion of ['reduce', 'no-preference'] as const) {
			test(`scroll attention ${width} ${colorScheme} ${reducedMotion}`, async ({
				page,
				context,
				nativeAttention,
			}, info) => {
				await page.setViewportSize({ width, height: 900 })
				await page.emulateMedia({ colorScheme, reducedMotion })
				await page.goto(new URL('/metamask/?variant=BROWSER', info.project.use.baseURL).href, {
					waitUntil: 'domcontentloaded',
				})
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				await page.evaluate(() => document.fonts.ready)
				await nativeAttention.focus(true)
				await page.bringToFront()
				await page.mouse.click(1, 1)
				await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true)
				const toc = page.locator('#wallet-toc')
				const logo = page.locator('#nav > header .logo')
				const contentFilter = () =>
					page
						.locator('#layout > .attention-backdrop')
						.evaluate(element => getComputedStyle(element).backdropFilter)
				const logoFilter = () => logo.evaluate(element => getComputedStyle(element).filter)
				const tocFilter = () => toc.evaluate(element => getComputedStyle(element).filter)
				const hoverContent = async () => {
					await page.locator('#top h1').hover()
					await expect.poll(contentFilter).toBe('none')
					await expect.poll(logoFilter).toBe('grayscale(1)')
					await expect.poll(tocFilter).toBe('none')
				}
				const geometry = () =>
					page
						.locator(
							'#top > [data-sticky-breadcrumb~="position"], #security-news, .page-navigation > header',
						)
						.evaluateAll(elements =>
							elements.map(element => {
								const { x, y, width, height } = element.getBoundingClientRect()

								return { x, y, width, height }
							}),
						)
				const skip = page.locator('.skip-link')

				await page.keyboard.press('Tab')

				for (
					let step = 0;
					step < 6 && !(await skip.evaluate(element => element === document.activeElement));
					step++
				) {
					await page.keyboard.press('Shift+Tab')
				}
				await expect(skip).toBeFocused()
				await page.keyboard.press('Enter')
				await expect(page.locator('#content:focus-visible')).toHaveCount(1)
				await expect.poll(logoFilter).toBe('grayscale(1)')
				await expect.poll(contentFilter).toBe('none')
				await expect.poll(tocFilter).toBe('none')
				await page.keyboard.press('Tab')
				await expect(page.locator('#top :focus-visible')).toHaveCount(1)
				await hoverContent()
				const initialGeometry = await geometry()

				await page.locator('#nav > header').hover({ position: { x: 2, y: 2 } })
				await expect.poll(contentFilter).toBe('grayscale(1)')
				await expect.poll(geometry).toEqual(initialGeometry)
				await hoverContent()

				if (width < 1024) {
					await page.getByRole('button', { name: 'Open navigation menu' }).click()
				}

				await page.locator('#nav-menu').hover({ position: { x: 15, y: 100 } })
				await expect.poll(contentFilter).toBe('grayscale(1)')
				await expect.poll(logoFilter).toBe('none')
				await page.getByRole('searchbox', { name: 'Search navigation' }).click()
				await page.keyboard.press('Tab')
				await expect(page.locator('#nav-menu summary:focus-visible')).toHaveCount(1)
				await page.keyboard.press('Space')
				await expect.poll(contentFilter).toBe('grayscale(1)')
				await page.keyboard.press('Space')
				await expect.poll(contentFilter).toBe('grayscale(1)')
				await page.getByRole('searchbox', { name: 'Search navigation' }).click()

				if (width > 1024) {
					await hoverContent()
					await page.keyboard.press('Shift')
					await expect.poll(contentFilter).toBe('none')
				}

				await page.keyboard.press('Tab')
				await expect.poll(contentFilter).toBe('grayscale(1)')

				if (width > 1024) {
					await page.mouse.wheel(0, 1)
					await expect.poll(contentFilter).toBe('none')
					await expect.poll(logoFilter).toBe('grayscale(1)')
					await page.keyboard.press('Tab')
					await expect.poll(contentFilter).toBe('grayscale(1)')
				}

				// A separate foreground tab tests retained element focus without synthesizing blur.
				const other = await context.newPage()

				await other.goto('about:blank')
				await other.bringToFront()
				await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(false)
				await expect.poll(contentFilter).toBe('none')
				await expect.poll(logoFilter).toBe('none')
				await expect.poll(tocFilter).toBe('none')
				await other.close()
				await page.bringToFront()
				await nativeAttention.focus(false)
				await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(false)
				await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('visible')
				await expect.poll(contentFilter).toBe('none')
				await expect.poll(logoFilter).toBe('none')
				await expect.poll(tocFilter).toBe('none')
				await nativeAttention.focus(true)
				await page.bringToFront()
				await page.mouse.click(1, 1)
				await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true)

				if (width < 1024) {
					await page.keyboard.press('Escape')
				}

				await page.locator('#top h1').click()
				await hoverContent()

				if (width < 1024) {
					await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
					await expect(toc).toBeVisible()
					await expect.poll(tocFilter).toBe('none')
					await page.locator('#nav > header').hover({ position: { x: 2, y: 2 } })
					await expect.poll(tocFilter).toBe('grayscale(1)')
					await toc.hover({ position: { x: 10, y: 100 } })
					await expect.poll(tocFilter).toBe('none')
					await page.keyboard.press('Tab')
					await expect(toc.locator(':focus-visible')).toHaveCount(1)
					await expect.poll(logoFilter).toBe('grayscale(1)')
					await expect.poll(contentFilter).toBe('none')
					await expect.poll(tocFilter).toBe('none')
					await nativeAttention.focus(false)
					await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(false)
					await expect.poll(logoFilter).toBe('none')
					await expect.poll(contentFilter).toBe('none')
					await expect.poll(tocFilter).toBe('none')
					await expect
						.poll(() => toc.evaluate(element => element.matches(':popover-open')))
						.toBe(true)
					await nativeAttention.focus(true)
					await expect(toc.locator(':focus-visible')).toHaveCount(1)
					await expect.poll(logoFilter).toBe('grayscale(1)')
					await expect.poll(contentFilter).toBe('none')
					await expect.poll(tocFilter).toBe('none')
					await page.keyboard.press('Escape')
				}

				await expect(
					page.locator('#nav-menu[data-closing], #wallet-toc[data-closing]'),
				).toHaveCount(0)
				await page.mouse.move(width > 1024 ? 500 : 200, 500)
				const scrollEnd = page.evaluate(
					() =>
						new Promise<void>((resolve, reject) => {
							const root = document.querySelector('#layout')!
							const timeout = setTimeout(
								() => reject(new Error('Native wheel scroll did not end')),
								5000,
							)

							root.addEventListener(
								'scrollend',
								() => {
									clearTimeout(timeout)
									resolve()
								},
								{ once: true },
							)
						}),
				)

				await page.mouse.wheel(0, 650)
				await scrollEnd
				await expect
					.poll(() => page.locator('#layout').evaluate(element => element.scrollTop))
					.toBeGreaterThan(0)
				const scrolledGeometry = await geometry()

				await page.locator('#nav > header').hover({ position: { x: 2, y: 2 } })
				await expect.poll(contentFilter).toBe('grayscale(1)')
				await expect.poll(geometry).toEqual(scrolledGeometry)
				expect(await page.locator('.attention-backdrop').boundingBox()).toEqual(
					await page.locator('#layout').boundingBox(),
				)

				if (width < 1024) {
					await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
					await expect
						.poll(() => toc.evaluate(element => element.matches(':popover-open')))
						.toBe(true)
					await page.keyboard.press('Escape')
				}
			})
		}
	}
}

import { expect, test } from '@playwright/test'

const imageSelector = '.references .inline-image img, .references .thumbnail img'

for (const javaScriptEnabled of [false, true]) {
	for (const route of ['/ambire/', '/metamask/', '/rabby/', '/wallet/eip/7828/']) {
		test(`${route} reserves reference image geometry with JavaScript ${javaScriptEnabled}`, async ({
			browser,
			baseURL,
		}, info) => {
			const context = await browser.newContext({
				baseURL,
				javaScriptEnabled,
				reducedMotion: 'reduce',
			})
			const page = await context.newPage()
			let releaseImages: () => void = () => {}
			const blocked = new Promise<void>(resolve => {
				releaseImages = resolve
			})
			const externalImages: string[] = []

			await page.route('**/*', async intercepted => {
				const request = intercepted.request()

				if (request.resourceType() === 'image') {
					if (new URL(request.url()).origin !== new URL(baseURL ?? '').origin) {
						externalImages.push(request.url())
						await intercepted.abort()

						return
					}

					if (new URL(request.url()).pathname.startsWith('/references/')) {
						await blocked
					}
				}

				await intercepted.continue()
			})

			try {
				await page.goto(route, { waitUntil: 'domcontentloaded' })

				if (javaScriptEnabled) {
					for (const island of await page
						.locator(
							'astro-island[component-url*="WalletPageContext"], astro-island[component-url*="EipStatusSupportCards"]',
						)
						.all()) {
						await island.locator('h1, h2').first().scrollIntoViewIfNeeded()
						await expect(island).not.toHaveAttribute('ssr')
					}
				}

				// Native disclosures expose their body without requiring application JavaScript.
				await page.locator('details').evaluateAll(elements => {
					for (const element of elements) {
						if (element instanceof HTMLDetailsElement) {
							element.open = true
						}
					}
				})

				if (javaScriptEnabled) {
					for (const button of await page
						.getByRole('button', { name: /^Show (?:all .* sources|fewer sources)$/ })
						.all()) {
						await button.click()
					}
				}

				await page.evaluate(() => document.fonts.ready)
				const images = page.locator(imageSelector)

				expect(await images.count()).toBeGreaterThan(0)
				const before = await images.evaluateAll(elements =>
					elements.map(element => {
						if (!(element instanceof HTMLImageElement)) {
							throw new Error('Expected image')
						}

						const box = element.getBoundingClientRect()
						const style = getComputedStyle(element)

						return {
							src: element.getAttribute('src'),
							width: box.width,
							height: box.height,
							contentWidth:
								box.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth),
							contentHeight:
								box.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth),
							intrinsicWidth: Number(element.getAttribute('width')),
							intrinsicHeight: Number(element.getAttribute('height')),
							naturalWidth: element.naturalWidth,
							loading: element.loading,
							decoding: element.decoding,
							href: element.closest('a')?.getAttribute('href'),
							kind: element.closest('.thumbnail') ? 'thumbnail' : 'inline',
						}
					}),
				)

				for (const image of before) {
					expect(image.naturalWidth).toBe(0)
					expect(image.width).toBeGreaterThan(0)
					expect(image.height).toBeGreaterThan(0)
					expect(image.intrinsicWidth).toBeGreaterThan(0)
					expect(image.intrinsicHeight).toBeGreaterThan(0)
					expect(
						Math.abs(
							image.contentHeight -
								(image.contentWidth * image.intrinsicHeight) / image.intrinsicWidth,
						),
					).toBeLessThan(1)
					expect(image.loading).toBe('lazy')
					expect(image.decoding).toBe('async')
					expect(image.href).toBe(image.src)
				}
				releaseImages()
				const after = []

				for (let index = 0; index < (await images.count()); index++) {
					const image = images.nth(index)

					await image.scrollIntoViewIfNeeded()
					await expect
						.poll(() =>
							image.evaluate(
								element => element instanceof HTMLImageElement && element.naturalWidth > 0,
							),
						)
						.toBe(true)
					after.push(
						await image.evaluate(element => {
							if (!(element instanceof HTMLImageElement)) {
								throw new Error('Expected image')
							}

							const box = element.getBoundingClientRect()

							return {
								width: box.width,
								height: box.height,
								naturalWidth: element.naturalWidth,
								naturalHeight: element.naturalHeight,
							}
						}),
					)
					expect(Math.abs(after[index].width - before[index].width)).toBeLessThan(1)
					expect(Math.abs(after[index].height - before[index].height)).toBeLessThan(1)
					expect(after[index].naturalWidth).toBe(before[index].intrinsicWidth)
					expect(after[index].naturalHeight).toBe(before[index].intrinsicHeight)
				}
				expect(externalImages).toEqual([])
				await info.attach('image-geometry', {
					body: JSON.stringify({ before, after }),
					contentType: 'application/json',
				})
				await images.first().scrollIntoViewIfNeeded()
				await page.screenshot({ path: info.outputPath('reference-images.png') })

				if (javaScriptEnabled) {
					await images.first().click()
					await expect(page.locator('dialog[open]')).toBeVisible()
					await page.keyboard.press('Escape')
					await expect(page.locator('dialog[open]')).toHaveCount(0)
				}
			} finally {
				releaseImages()
				await context.close()
			}
		})
	}
}

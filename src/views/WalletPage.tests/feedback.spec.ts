import sharp from 'sharp'

import { expect, test } from '../../../tests/browser/verified-test'

test('WalletPage feedback: paint, scroll, disclosure and TOC', async ({ page, browser }, info) => {
	test.setTimeout(120000)
	await page.setViewportSize({ width: 768, height: 900 })
	await page.goto('/metamask/?variant=BROWSER#top')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 30000 })
	await page.evaluate(() => document.fonts.ready)
	await expect(page.locator('select').first()).toHaveValue('BROWSER')

	await info.attach('browser-capabilities', {
		body: JSON.stringify({
			version: browser.version(),
			...(await page.evaluate(() => ({
				userAgent: navigator.userAgent,
				viewport: { width: innerWidth, height: innerHeight },
				capabilities: {
					scrollTimeline: CSS.supports('animation-timeline: scroll()'),
					anchorSize: CSS.supports('width: anchor-size(--source inline)'),
					styleConditional: CSS.supports('color: if(style(--x: 1): red; else: blue)'),
				},
			}))),
		}),
		contentType: 'application/json',
	})

	await test.step('the real H1 is visible and painted', async () => {
		const heading = page.locator('h1')

		await expect(heading).toHaveCount(1)
		await expect(heading).toBeInViewport()
		const bounds = await heading.boundingBox()

		if (!bounds || bounds.width < 1 || bounds.height < 1) {
			throw new Error('The real H1 needs a nonempty visible paint region')
		}

		const viewportImage = await page.screenshot()
		const crop = {
			left: Math.floor(bounds.x),
			top: Math.floor(bounds.y),
			width: Math.floor(bounds.width),
			height: Math.floor(bounds.height),
		}
		const image = await sharp(viewportImage).extract(crop).toBuffer()
		const originalStyle = await heading.evaluate(element => {
			const style = element.getAttribute('style')

			element.style.setProperty('visibility', 'hidden', 'important')

			return style
		})
		let hiddenImage: Buffer

		try {
			hiddenImage = await sharp(await page.screenshot())
				.extract(crop)
				.toBuffer()
			expect(await heading.boundingBox(), 'Hiding paint must preserve the H1 geometry').toEqual(
				bounds,
			)
		} finally {
			await heading.evaluate((element, style) => {
				if (style === null) {
					element.removeAttribute('style')
				} else {
					element.setAttribute('style', style)
				}
			}, originalStyle)
		}

		const painted = await sharp(image).removeAlpha().raw().toBuffer()
		const hidden = await sharp(hiddenImage).removeAlpha().raw().toBuffer()
		let difference = 0

		expect(painted.length).toBe(hidden.length)

		for (let index = 0; index < painted.length; index++) {
			difference += Math.abs(painted[index] - hidden[index])
		}
		expect(
			difference / painted.length,
			'The real H1 must contribute contrasting pixels',
		).toBeGreaterThan(1)
		await info.attach('heading-paint', { body: image, contentType: 'image/png' })
		await info.attach('heading-paint-hidden-control', {
			body: hiddenImage,
			contentType: 'image/png',
		})
		await info.attach('page-top', { body: viewportImage, contentType: 'image/png' })
	})

	await test.step('native wheel input moves the page', async () => {
		const scroll = () => page.locator('#layout').evaluate(element => element.scrollTop)
		const before = await page.locator('#layout').evaluate(async element => {
			let previous = element.scrollTop
			let stable = 0

			for (let frame = 0; frame < 60; frame++) {
				await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
				const current = element.scrollTop

				stable = Math.abs(current - previous) < 0.5 ? stable + 1 : 0

				if (stable === 3) {
					return current
				}

				previous = current
			}
			throw new Error('Page scroll did not settle before native input')
		})

		await page.mouse.move(30, 700)
		await page.mouse.wheel(0, 500)
		await expect.poll(scroll, { timeout: 10000 }).toBeGreaterThan(before + 20)
		await info.attach('native-scroll', {
			body: JSON.stringify({ before, after: await scroll() }),
			contentType: 'application/json',
		})
	})

	await test.step('a real summary toggles with the keyboard', async () => {
		const details = page.locator('#scam-prevention > details')
		const summary = details.locator(':scope > summary')
		const before = await details.evaluate(element => element.hasAttribute('open'))

		await summary.focus()
		await expect(summary).toBeFocused()
		await page.keyboard.press('Enter')
		await expect.poll(() => details.evaluate(element => element.hasAttribute('open'))).toBe(!before)
		await page.keyboard.press('Enter')
		await expect.poll(() => details.evaluate(element => element.hasAttribute('open'))).toBe(before)
	})

	await test.step('the native TOC opens and closes', async () => {
		const trigger = page.locator('button[popovertarget="wallet-toc"]')
		const panel = page.locator('#wallet-toc')

		await trigger.focus()
		await page.keyboard.press('Enter')
		await expect.poll(() => panel.evaluate(element => element.matches(':popover-open'))).toBe(true)
		await info.attach('toc-open', { body: await page.screenshot(), contentType: 'image/png' })
		await page.keyboard.press('Escape')
		await expect.poll(() => panel.evaluate(element => element.matches(':popover-open'))).toBe(false)
	})
})

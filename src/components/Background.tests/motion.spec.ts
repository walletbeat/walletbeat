import { expect, test } from '@playwright/test'

test('desktop background moves without changing its viewport coverage', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.emulateMedia({ reducedMotion: 'no-preference' })
	await page.goto('/')
	const background = page.locator('.background-blobs')
	const blob = background.locator('.blob').first()

	await expect(blob).toBeVisible()
	const initial = await blob.boundingBox()

	await expect.poll(async () => await blob.boundingBox()).not.toEqual(initial)
	await expect(background).toHaveCSS('position', 'fixed')
	expect(await background.boundingBox()).toEqual({ x: 0, y: 0, width: 1280, height: 900 })
})

test('reduced motion keeps the background visible and stationary', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.goto('/')
	const background = page.locator('.background-blobs')

	await expect(background.locator('.blob').first()).toBeVisible()
	const positions = async () =>
		await background.locator('.blob').evaluateAll(blobs =>
			blobs.map(blob => {
				const { x, y, width, height } = blob.getBoundingClientRect()

				return { x, y, width, height }
			}),
		)
	const before = await positions()

	await page.waitForTimeout(1000)
	expect(await positions()).toEqual(before)
	expect(
		await background.evaluate(element =>
			element
				.getAnimations({ subtree: true })
				.every(animation => animation.playState !== 'running'),
		),
	).toBe(true)
})

test('a narrow touch viewport suppresses decorative background effects', async ({
	browser,
	baseURL,
}) => {
	const context = await browser.newContext({
		baseURL,
		viewport: { width: 390, height: 844 },
		hasTouch: true,
	})

	try {
		const page = await context.newPage()

		await page.goto('/')
		expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)

		for (const blob of await page.locator('.background-blob').all()) {
			await expect(blob).toBeHidden()
		}
		await expect(page.locator('.background-dither')).toBeHidden()
	} finally {
		await context.close()
	}
})

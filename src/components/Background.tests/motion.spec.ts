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

for (const colorScheme of ['light', 'dark'] as const) {
	test(`weighted wallet opacity interpolates in ${colorScheme} mode`, async ({ page }) => {
		await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' })
		await page.goto('/bitget/')
		await page.waitForFunction(() => !document.querySelector('astro-island[ssr][client="load"]'))
		const samples = await page
			.locator('.background-blob')
			.first()
			.evaluate(async (blob, scheme) => {
				const animation = blob
					.getAnimations({ subtree: true })
					.find(
						effect =>
							effect instanceof CSSAnimation && effect.animationName.endsWith('blob-opacity'),
					)

				if (animation?.effect === null || animation?.effect === undefined) {
					throw new Error('Missing opacity animation')
				}

				const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null

				if (!(target instanceof HTMLElement) || !(blob instanceof HTMLElement)) {
					throw new Error('Missing opacity target')
				}

				const duration = Number(animation.effect.getTiming().duration)
				const values: number[] = []

				animation.pause()

				for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
					animation.currentTime = duration * progress
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
					values.push(Number(getComputedStyle(target).opacity))
				}

				return {
					values,
					weight: Number(getComputedStyle(blob).opacity),
					from: Number.parseFloat(target.style.getPropertyValue('--opacity-from')) / 100,
					to: Number.parseFloat(target.style.getPropertyValue('--opacity-to')) / 100,
					expectedWeight: Number(blob.style.getPropertyValue(`--blob-${scheme}-theme-weight`)),
				}
			}, colorScheme)

		expect(samples.weight).toBeCloseTo(samples.expectedWeight, 6)
		expect(samples.values[0]).toBeCloseTo(samples.from, 6)
		expect(samples.values.at(-1)).toBeCloseTo(samples.to, 6)

		for (let index = 1; index < samples.values.length; index++) {
			expect(samples.values[index]).toBeGreaterThan(samples.values[index - 1])
		}
	})
}

import { expect, test } from '../../../tests/browser/verified-test'

test.describe('native baseline', () => {
	test.use({ javaScriptEnabled: false })
	test('callback controls are disabled while native links remain usable', async ({ page }) => {
		await page.goto('/__pie-motion')
		const buttons = page.locator('[data-pie-case$="-button"] button.slice')

		await expect(buttons).toHaveCount(6)

		for (const button of await buttons.all()) {
			await expect(button).toBeDisabled()
		}
		const link = page.locator('[data-pie-case$="-link"] a.slice').first()

		await expect(link).toHaveAttribute('href', '#pie-destination')
		await expect(link).not.toHaveAttribute('disabled')
		await link.press('Enter')
		await expect(page).toHaveURL(/#pie-destination$/)
		await expect(page.locator('[data-pie-case$="-static"] div.slice')).toHaveCount(6)
	})
	test('slice ink retains its enclosing native disclosure activation', async ({ page }) => {
		for (const width of [390, 1280]) {
			await page.setViewportSize({ width, height: 900 })
			await page.goto('/__pie-motion')
			const disclosure = page.locator('#disclosure-pie details')

			await expect(disclosure).not.toHaveAttribute('open')
			const ink = disclosure.locator('[data-slice-id="security"] .label')

			await ink.scrollIntoViewIfNeeded()
			const box = await ink.boundingBox()

			if (!box) {
				throw new Error('Missing visible slice ink')
			}

			await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
			await expect(disclosure).toHaveAttribute('open', '')
		}
	})
})

test('hydration enables the retained controls and keyboard activation', async ({
	page,
	request,
}) => {
	const response = await request.get('/__pie-motion')
	const component = (await response.text()).match(/component-url="([^"]*PieMotion[^"]*)"/)?.[1]

	if (!component) {
		throw new Error('Missing pie fixture island')
	}

	let release: () => void = () => {}
	const gate = new Promise<void>(resolve => {
		release = resolve
	})
	let held = false

	await page.route(new URL(component, response.url()).href, async route => {
		held = true
		await gate
		await route.continue()
	})

	try {
		await page.goto('/__pie-motion', { waitUntil: 'commit' })
		await expect.poll(() => held).toBe(true)
		const buttons = page.locator('[data-pie-case$="-button"] button.slice')

		await expect(buttons).toHaveCount(6)
		const originals = await buttons.elementHandles()

		for (const button of await buttons.all()) {
			await expect(button).toBeDisabled()
		}
		release()

		for (const [index, button] of (await buttons.all()).entries()) {
			await expect(button).toBeEnabled()
			expect(await button.evaluate((node, original) => node === original, originals[index])).toBe(
				true,
			)
		}
		await buttons.first().press('Enter')
		await expect(page.locator('output')).toHaveText('Activations: 1')
		await buttons.first().press('Space')
		await expect(page.locator('output')).toHaveText('Activations: 2')
		const link = page.locator('[data-pie-case$="-link"] a.slice').first()

		await expect(link).not.toHaveAttribute('disabled')
		await link.press('Enter')
		await expect(page).toHaveURL(/#pie-destination$/)
		await expect(page.locator('output')).toHaveText('Activations: 3')
	} finally {
		release()
	}
})

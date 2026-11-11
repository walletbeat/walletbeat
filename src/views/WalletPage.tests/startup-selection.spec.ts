import { expect, test } from '../../../tests/browser/verified-test'

const selections = [
	{ wallet: 'metamask', key: 'browser--all', query: 'variant=BROWSER', value: 'BROWSER' },
	{
		wallet: 'trezor',
		key: 'all--trezor-safe-5',
		query: 'model=trezor-safe-5',
		value: 'trezor-safe-5',
	},
]

for (const selection of selections) {
	test(`static selection survives pending hydration: ${selection.query}`, async ({ page }) => {
		const errors: string[] = []

		page.on('pageerror', error => errors.push(error.message))
		const routeURL = `/${selection.wallet}/selection/${selection.key}/`
		const response = await page.request.get(routeURL)

		expect(response.ok()).toBe(true)
		const expectedContent = await page.evaluate(
			html =>
				new DOMParser()
					.parseFromString(html, 'text/html')
					.querySelector('#security .attributes')
					?.textContent?.replace(/\s+/g, ' ')
					.trim(),
			await response.text(),
		)

		expect(expectedContent).toBeTruthy()

		if (selection.wallet === 'metamask') {
			const defaultResponse = await page.request.get('/metamask/')
			const defaultContent = await page.evaluate(
				html =>
					new DOMParser()
						.parseFromString(html, 'text/html')
						.querySelector('#security .attributes')
						?.textContent?.replace(/\s+/g, ' ')
						.trim(),
				await defaultResponse.text(),
			)

			expect(
				expectedContent,
				'Selection changes real evaluation content, independently of the picker',
			).not.toBe(defaultContent)
		}

		const component = await page.evaluate(
			html => {
				return new DOMParser()
					.parseFromString(html, 'text/html')
					.querySelector('#top')
					?.closest('astro-island')
					?.getAttribute('component-url')
			},
			await response.text(),
		)

		expect(component).toBeTruthy()

		if (!component) {
			throw new Error('Missing WalletPage island module')
		}

		let release!: () => void
		const pending = new Promise<void>(resolve => {
			release = resolve
		})
		let held = false

		await page.route(`**${component}`, async route => {
			held = true
			await pending
			await route.continue()
		})

		try {
			await page
				.goto(`/${selection.wallet}/?${selection.query}`, { waitUntil: 'commit' })
				.catch(error => {
					if (!String(error).includes('interrupted')) {
						throw error
					}
				})
			await expect.poll(() => held).toBe(true)
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(1)
			await expect(page.locator('#top select')).toHaveValue(selection.value)
			await expect
				.poll(() =>
					page
						.locator('#security .attributes')
						.evaluate(element => element.textContent?.replace(/\s+/g, ' ').trim()),
				)
				.toBe(expectedContent)
			release()
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await expect(page.locator('#top select')).toHaveValue(selection.value)
			await expect
				.poll(() =>
					page
						.locator('#security .attributes')
						.evaluate(element => element.textContent?.replace(/\s+/g, ' ').trim()),
				)
				.toBe(expectedContent)
			await expect(page).toHaveURL(
				new RegExp(`/${selection.wallet}/\\?${selection.query.replace('?', '\\?')}$`),
			)
			expect(errors).toEqual([])
		} finally {
			release()
		}
	})
}

test('selected wallet navigation preserves native swaps and history', async ({ page }) => {
	const errors: string[] = []

	page.on('pageerror', error => errors.push(error.message))
	await page.goto('/metamask/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => {
		document.addEventListener('astro:after-swap', () => {
			document.documentElement.dataset.selectionSwap = 'yes'
		})
	})

	for (const [wallet, variant] of [
		['phantom', 'MOBILE'],
		['metamask', 'MOBILE'],
		['metamask', 'BROWSER'],
	]) {
		const destination = `/${wallet}/?variant=${variant}`

		await page.evaluate(href => {
			const anchor = document.createElement('a')

			anchor.href = href
			anchor.id = 'selection-navigation-probe'
			anchor.textContent = 'Navigate to selected wallet'
			document.body.prepend(anchor)
		}, destination)
		await page.locator('#selection-navigation-probe').click()
		await expect(page).toHaveURL(new URL(destination, page.url()).href)
		await expect(page.locator('html')).toHaveAttribute('data-selection-swap', 'yes')
		await expect(page.locator('#top select')).toHaveValue(variant)
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	}
	await page.goBack()
	await expect(page).toHaveURL(/\/metamask\/\?variant=MOBILE$/)
	await expect(page.locator('#top select')).toHaveValue('MOBILE')
	expect(errors).toEqual([])
})

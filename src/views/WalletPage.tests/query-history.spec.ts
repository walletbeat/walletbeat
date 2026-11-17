import { expect, test } from '../../../tests/browser/verified-test'

test('history traversal restores query selection and preserves unrelated parameters and fragments', async ({
	page,
}) => {
	await page.goto('/metamask/?variant=BROWSER&routeWitness=history')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	const picker = page.getByRole('combobox', { name: 'Wallet version', exact: true })

	await expect(picker).toHaveValue('BROWSER')
	await page.evaluate(() => history.pushState(null, '', '?variant=MOBILE&routeWitness=history#top'))
	await page.goBack()
	await expect(picker).toHaveValue('BROWSER')
	await page.goForward()
	await expect(picker).toHaveValue('MOBILE')
	await expect(page).toHaveURL(
		url => url.searchParams.get('routeWitness') === 'history' && url.hash === '#top',
	)

	for (const query of ['variant=INVALID', '']) {
		await page.evaluate(
			query => history.pushState(null, '', `?${query}${query ? '&' : ''}routeWitness=history#top`),
			query,
		)
		await page.goBack()
		await expect(picker).toHaveValue('MOBILE')
		await page.goForward()
		await expect(picker.locator('option:checked')).toHaveText('All versions')
		await expect(page).toHaveURL(
			url =>
				!url.searchParams.has('variant') &&
				url.searchParams.get('routeWitness') === 'history' &&
				url.hash === '#top',
		)
		await picker.selectOption('MOBILE')
	}
})

test('hardware model history restores supported options and clears unsupported selections', async ({
	page,
}) => {
	await page.goto('/ledger/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await expect(page.getByRole('combobox', { name: 'Wallet version', exact: true })).toHaveCount(0)
	const picker = page.getByRole('combobox', { name: 'Wallet model', exact: true })
	const models = await picker
		.locator('option')
		.evaluateAll((options: HTMLOptionElement[]) =>
			options
				.filter(option => option.textContent?.trim() !== 'All models')
				.map(option => option.value),
		)

	expect(models.length).toBeGreaterThan(1)

	for (const model of [models[1], 'INVALID', 'foreign-wallet-model', undefined]) {
		await page.goto(`/ledger/?model=${encodeURIComponent(models[0])}`)
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await expect(picker).toHaveValue(models[0])

		await page.evaluate(model => {
			const url = new URL(location.href)

			if (model === undefined) {
				url.searchParams.delete('model')
			} else {
				url.searchParams.set('model', model)
			}

			url.searchParams.set('variant', 'HARDWARE')
			url.searchParams.set('routeWitness', 'model-history')
			url.hash = 'top'
			history.pushState(null, '', url)
		}, model)
		await page.goBack()
		await expect(picker).toHaveValue(models[0])
		await page.goForward()

		if (model === models[1]) {
			await expect(picker).toHaveValue(model)
		} else {
			await expect(picker.locator('option:checked')).toHaveText('All models')
		}

		await expect(page).toHaveURL(
			url =>
				!url.searchParams.has('variant') &&
				url.searchParams.get('model') === (model === models[1] ? model : null) &&
				url.searchParams.get('routeWitness') === 'model-history' &&
				url.hash === '#top',
		)
	}
})

test('software wallet report retains the selected hardware wallet badge through history', async ({
	page,
}) => {
	const model = 'ledger-nano-x'
	const selectedURL = `/metamask/?model=${model}`

	await page.goto(selectedURL)
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	const badges = page.locator('.supported-hardware-wallets a')

	await expect(page).toHaveURL(url => url.searchParams.get('model') === model)
	await expect(badges).toHaveCount(1)
	await expect(badges.first()).toHaveAttribute('href', `/ledger/?model=${model}`)

	await page.evaluate(() => history.pushState(history.state, '', location.pathname))
	await page.goBack()
	await expect(badges).toHaveCount(1)
	await page.goForward()
	await expect(badges).not.toHaveCount(1)
	await expect(page).toHaveURL(url => !url.searchParams.has('model'))
})

test('Ambire restores the Keycard Shell badge and includes it in the unfiltered catalog', async ({
	page,
}) => {
	const href = '/keycard-shell/?model=keycard-shell'

	await page.goto('/ambire/?model=keycard-shell')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)

	const badges = page.locator('#hardware-wallet-support .supported-hardware-wallets a')
	const keycard = badges.filter({ hasText: 'Keycard Shell' })

	await expect(badges).toHaveCount(1)
	await expect(keycard).toHaveAttribute('href', href)

	await page.evaluate(() => history.pushState(history.state, '', location.pathname))
	await page.goBack()
	await expect(page).toHaveURL(url => url.searchParams.get('model') === 'keycard-shell')
	await expect(badges).toHaveCount(1)
	await expect(keycard).toHaveAttribute('href', href)

	await page.goForward()
	await expect(page).toHaveURL(url => !url.searchParams.has('model'))
	await expect(badges.nth(1)).toBeAttached()
	await expect(keycard).toHaveAttribute('href', href)
})

test('ClientRouter restores selections in distinct wallet history entries', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 })
	await page.goto('/metamask/?routeWitness=wallet-history#top')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => Reflect.set(window, 'walletQueryHistoryWitness', true))
	const variant = page.getByRole('combobox', { name: 'Wallet version', exact: true })

	await variant.selectOption('BROWSER')
	await expect(page).toHaveURL(url => url.searchParams.get('variant') === 'BROWSER')
	const variantURL = page.url()

	await page.getByRole('searchbox', { name: 'Search navigation' }).fill('Ledger')
	await page.locator('#nav a[href="/ledger/"]').click()
	await expect(page).toHaveURL(/\/ledger\/$/)
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	expect(await page.evaluate(() => Reflect.get(window, 'walletQueryHistoryWitness') === true)).toBe(
		true,
	)
	const model = page.getByRole('combobox', { name: 'Wallet model', exact: true })
	const ledgerModel = await model.locator('option').nth(1).getAttribute('value')

	expect(ledgerModel).toBeTruthy()
	await model.selectOption(ledgerModel)
	await expect(page).toHaveURL(url => url.searchParams.get('model') === ledgerModel)
	const modelURL = page.url()

	await page.goBack()
	await expect(page).toHaveURL(variantURL)
	await expect(variant).toHaveValue('BROWSER')
	expect(await page.evaluate(() => Reflect.get(window, 'walletQueryHistoryWitness') === true)).toBe(
		true,
	)
	await page.goForward()
	await expect(page).toHaveURL(modelURL)
	await expect(model).toHaveValue(ledgerModel!)
	expect(await page.evaluate(() => Reflect.get(window, 'walletQueryHistoryWitness') === true)).toBe(
		true,
	)
})

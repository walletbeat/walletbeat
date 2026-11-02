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
	await picker.selectOption(models[0])

	for (const model of [models[1], 'INVALID', 'foreign-wallet-model', undefined]) {
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
		await picker.selectOption(models[0])
	}
})

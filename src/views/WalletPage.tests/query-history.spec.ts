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

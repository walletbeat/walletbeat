import { expect, test } from '../../../tests/browser/verified-test'

for (const fixture of ['software', 'hardware', 'embedded', 'exemptGroup']) {
	test(`navigation destinations match rendered evaluated attributes: ${fixture}`, async ({
		page,
	}) => {
		await page.goto(`/__wallet-page/${fixture}/`)
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		const inspect = async () =>
			page.evaluate(() => {
				const rendered = [
					...document.querySelectorAll(
						'.attribute-group[aria-label$=" attributes"][id], .attribute-group .attribute[id]',
					),
				].map(element => element.id)
				const destinations = [
					...document.querySelectorAll<HTMLAnchorElement>('.pie-navigation a[href^="#"]'),
				].map(link => decodeURIComponent(link.hash.slice(1)))
				const groups = [
					...document.querySelectorAll('.attribute-group[aria-label$=" attributes"]'),
				].map(group => ({ id: group.id, attributes: group.querySelectorAll('.attribute').length }))

				return { rendered, destinations, groups }
			})
		const verify = async () => {
			const result = await inspect()

			expect(result.rendered.length).toBeGreaterThan(0)
			expect(result.destinations).toEqual(result.rendered)
			expect(new Set(result.destinations).size).toBe(result.destinations.length)
			expect(result.groups.every(group => group.attributes > 0)).toBe(true)

			return result
		}
		const initial = await verify()

		if (fixture === 'exemptGroup') {
			expect(initial.groups.some(group => group.id === 'security')).toBe(false)
		}

		const picker = page.getByRole('combobox', { name: 'Wallet version', exact: true })

		if (await picker.count()) {
			const values = await picker
				.locator('option')
				.evaluateAll((options: HTMLOptionElement[]) => options.map(option => option.value))

			for (const value of values) {
				await picker.selectOption(value)
				await verify()
			}
		}
	})
}

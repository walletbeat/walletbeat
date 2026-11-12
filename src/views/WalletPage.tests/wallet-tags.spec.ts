import { expect, test } from '../../../tests/browser/verified-test'

test('only EIP tags share canonical EIP details while table tags retain filtering', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 1440, height: 900 })
	await page.goto('/')
	await expect(page.locator('astro-island[ssr]:has(.wallet-info)')).toHaveCount(0)
	const row = page
		.locator('.wallet-info')
		.filter({ has: page.getByRole('link', { name: 'MetaMask', exact: true }) })
		.first()

	await expect(row).toBeVisible()
	const href = await row.locator('h3 a').first().getAttribute('href')

	expect(href).toBeTruthy()
	const observations: {
		surface: string
		label: string
		content: string
		links: (string | null)[]
	}[] = []

	for (const surface of ['table', 'page']) {
		if (surface === 'page') {
			await page.goto(href!)
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		}

		const tags = (surface === 'table' ? row : page.locator('#top .wallet-overview')).locator(
			'[data-tag]:not([popover] *)',
		)
		const eips = tags.locator('xpath=self::*[@data-tag="eip"]')

		expect(await eips.count()).toBeGreaterThan(0)

		for (const tag of await eips.all()) {
			const label = (await tag.innerText()).trim()

			expect(label).toMatch(/^#\d+$/)
			await expect(tag).toBeVisible()
			await tag.hover()
			const article = page.locator('[popover]:popover-open .eip-tooltip-content article')

			await expect(article).toHaveCount(1)
			await expect(article).toBeVisible()
			const content = (await article.innerText()).trim()
			const links = await article
				.locator('a')
				.evaluateAll(elements => elements.map(element => element.getAttribute('href')))

			expect(links.some(link => link?.includes(`eip-${label.slice(1)}`))).toBe(true)
			observations.push({ surface, label, content, links })
			await page.mouse.move(0, 0)
			await expect(article).not.toBeVisible()
		}

		for (const tag of await tags.locator('xpath=self::*[not(@data-tag="eip")]').all()) {
			expect(
				await tag.evaluate(
					element => element.parentElement?.closest('.eip-tooltip-content') !== null,
				),
			).toBe(false)

			if (surface === 'page') {
				expect(
					await tag.evaluate(element => element.closest('[data-tooltip-trigger]') !== null),
				).toBe(false)
			}
		}

		if (surface === 'table') {
			const eoa = row.getByRole('button', { name: 'Filter by EOA', exact: true })

			await eoa.click()
			await expect(page.locator('[data-filter="accountType-eoa"] input').first()).toBeChecked()
			await eoa.click()
			await expect(page.locator('[data-filter="accountType-eoa"] input').first()).not.toBeChecked()
		}
	}
	const contentFor = (surface: string) =>
		observations
			.filter(item => item.surface === surface)
			.map(({ label, content, links }) => ({ label, content, links }))

	expect(contentFor('page')).toEqual(contentFor('table'))
	await info.attach('canonical-eip-tag-content', {
		body: JSON.stringify(observations),
		contentType: 'application/json',
	})
})

import { expect, test } from '@playwright/test'

const cases = [
	{
		path: '/wallet/eip/712/',
		date: '2022-08-11',
		absolute: 'August 11, 2022',
		title: 'Typed structured data signing',
		formalTitle: 'Typed structured data hashing and signing',
	},
	{
		path: '/wallet/eip/5792/',
		date: '2025-05-11',
		absolute: 'May 11, 2025',
		title: 'Wallet Call API',
		formalTitle: null,
	},
]

for (const javaScriptEnabled of [false, true]) {
	for (const item of cases) {
		test(`${item.path} retains semantic title and UTC timestamp with JavaScript ${javaScriptEnabled}`, async ({
			browser,
		}, info) => {
			const context = await browser.newContext({
				baseURL: info.project.use.baseURL,
				javaScriptEnabled,
				timezoneId: 'Pacific/Honolulu',
			})

			try {
				const page = await context.newPage()

				if (javaScriptEnabled) {
					// The browser's local day still matches the date; its UTC day is the following day.
					await page.clock.setFixedTime(
						new Date(Date.parse(item.date) + 24 * 60 * 60 * 1000 + 60 * 1000),
					)
				}

				await page.goto(item.path)
				const header = page.locator('main article > header').first()

				expect(await header.evaluate(element => element.closest('astro-island'))).toBeNull()
				const timestampIsland = header.locator('astro-island')

				await expect(timestampIsland).toHaveCount(1)
				const props: unknown = JSON.parse((await timestampIsland.getAttribute('props')) ?? '{}')

				if (props === null || typeof props !== 'object' || !('date' in props)) {
					throw new Error('Expected Timestamp date props')
				}

				expect(Object.keys(props).filter(key => !key.startsWith('data-astro-cid-'))).toEqual([
					'date',
				])
				expect(props.date).toEqual([0, item.date])

				await expect(header.locator('h1')).toHaveText(item.title)
				await expect(header.locator('[data-tag="eip-status"]')).toHaveText('Final')
				await expect(header.locator('.final-since')).toContainText(`since ${item.absolute}`, {
					useInnerText: true,
				})
				await expect(header.locator(`time[datetime="${item.date}"]`)).toHaveText(item.absolute)

				if (item.formalTitle === null) {
					await expect(header.locator('.formal-title')).toHaveCount(0)
				} else {
					await expect(header.locator('p.formal-title')).toHaveText(item.formalTitle)
					await expect(
						page.getByRole('heading', { name: item.formalTitle, exact: true }),
					).toHaveCount(0)
				}

				if (javaScriptEnabled) {
					await header.scrollIntoViewIfNeeded()
					await page.waitForFunction(() => {
						const island = document
							.querySelector('main article .final-since time')
							?.closest('astro-island')

						return island !== null && island !== undefined && !island.hasAttribute('ssr')
					})
					await expect(header.locator('.relative-date')).toHaveText('(yesterday)')
				} else {
					await expect(header.locator('.relative-date')).toHaveCount(1)
					await expect(header.locator('.relative-date')).not.toHaveText('')
				}
			} finally {
				await context.close()
			}
		})
	}
}

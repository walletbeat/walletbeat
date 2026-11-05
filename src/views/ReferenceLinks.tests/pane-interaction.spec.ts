import { test } from '@playwright/test'

import { runImageContract, runPaneContract } from './pane-contract'

for (const width of [390, 1280]) {
	test.describe(`reference interactions at ${width}px`, () => {
		test.use({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })

		for (const path of ['/ambire/?variant=BROWSER', '/wallet/eip/6963/']) {
			test(`${path} preserves cited visibility and manual pane scrolling`, async ({
				page,
			}, info) => {
				const evidence: Record<string, unknown> = {}

				try {
					await runPaneContract(
						page,
						path,
						async (label, body) => {
							await test.step(label, async () => {
								await body()

								if (label === 'native keyboard focus is visible') {
									await info.attach('keyboard-focus', {
										body: await page.screenshot(),
										contentType: 'image/png',
									})
								}
							})
						},
						evidence,
					)
				} finally {
					await info.attach('pane-interaction', {
						body: JSON.stringify(evidence),
						contentType: 'application/json',
					})
				}
			})
		}

		test('Ambire image links retain modified original navigation and plain-click lightbox', async ({
			page,
		}, info) => {
			const evidence = await runImageContract(page)

			await info.attach('image-navigation', {
				body: JSON.stringify(evidence),
				contentType: 'application/json',
			})
		})
	})
}

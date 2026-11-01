import { expect, type Page, test } from '@playwright/test'

async function expectHydrated(page: Page, selector: string) {
	await page.locator(selector).first().scrollIntoViewIfNeeded()
	await page.waitForFunction(selector => {
		const island = document.querySelector(selector)?.closest('astro-island')

		return island !== null && island !== undefined && !island.hasAttribute('ssr')
	}, selector)
}

async function expectContentFits(page: Page) {
	const overflow = await page.locator('main').evaluate(main =>
		Array.from(main.querySelectorAll('h1,h2,h3,h4,h5,summary,p,figcaption'))
			.filter(
				element =>
					element.getClientRects().length > 0 && element.scrollWidth > element.clientWidth + 2,
			)
			.map(element => element.textContent?.trim()),
	)

	expect(overflow).toEqual([])
	const width = page.viewportSize()?.width

	expect(width).toBeDefined()

	for (const card of await page.locator('main .wallet-card').all()) {
		const bounds = await card.boundingBox()

		expect(bounds).not.toBeNull()

		if (bounds !== null && width !== undefined) {
			expect(bounds.x).toBeGreaterThanOrEqual(0)
			expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 2)
		}
	}
}

for (const colorScheme of ['light', 'dark'] as const) {
	for (const width of [390, 1280]) {
		for (const javaScriptEnabled of [false, true]) {
			test(`EIP native consumers ${colorScheme} ${width}px JavaScript ${javaScriptEnabled}`, async ({
				browser,
			}, info) => {
				const context = await browser.newContext({
					baseURL: info.project.use.baseURL,
					viewport: { width, height: 900 },
					colorScheme,
					javaScriptEnabled,
				})

				try {
					const page = await context.newPage()

					await page.goto('/wallet-eips/')
					const firstStandard = page.locator('main details').first()
					const summary = firstStandard.locator('summary')

					await summary.focus()
					await page.keyboard.press('Enter')
					await expect(firstStandard).toHaveAttribute('open', '')
					await expect(firstStandard.locator('summary h2')).toHaveCount(1)
					await expect(
						firstStandard.getByRole('heading', { name: 'Verified support', exact: true }),
					).toHaveJSProperty('tagName', 'H3')

					for (const prefix of ['EIP', 'ERC']) {
						await page.getByRole('radio', { name: `${prefix}s`, exact: true }).check()
						await expect(
							page.locator(`main details[data-prefix="${prefix}"]:visible`).first(),
						).toBeVisible()
						await expect(
							page.locator(`main details:not([data-prefix="${prefix}"]):visible`),
						).toHaveCount(0)
					}
					await page.getByRole('radio', { name: 'All', exact: true }).check()
					const directorySupport = await page
						.locator('main details')
						.filter({
							has: page.locator('a[href="/wallet/eip/5792/"]'),
						})
						.locator('li')
						.evaluateAll(items =>
							items.map(item => {
								const link = item.querySelector('a')
								const name = link?.textContent?.trim() ?? ''

								return {
									href: link?.getAttribute('href'),
									platforms: item.textContent?.trim().slice(name.length).replace(/^:\s*/, ''),
								}
							}),
						)

					expect(directorySupport.length).toBeGreaterThan(0)
					const emptySupport = await page
						.locator('main details section')
						.evaluateAll(sections =>
							sections
								.filter(
									section =>
										section.querySelector('h3')?.textContent?.trim() === 'Verified support' &&
										!section.querySelector('li'),
								)
								.map(section => section.textContent),
						)

					for (const text of emptySupport) {
						expect(text).toContain('no verified support')
						expect(text).toContain('Support may be unknown')
					}
					const tracker = firstStandard.getByRole('link', {
						name: 'Wallet support tracker →',
						exact: true,
					})
					const trackerHref = await tracker.getAttribute('href')

					expect(trackerHref).toMatch(/^\/wallet\/(?:eip\/\d+|7702)\/$/)
					await tracker.focus()
					await page.keyboard.press('Enter')
					await page.waitForURL(url => url.pathname === trackerHref)
					await page.goto('/wallet/eip/5792/')

					if (javaScriptEnabled) {
						await expectHydrated(page, 'main .wallet-card details')
					}

					const statusEntries = await page
						.locator('main [data-support-status]')
						.evaluateAll(headings =>
							headings.flatMap(heading =>
								Array.from(
									heading.parentElement?.parentElement?.querySelectorAll('.wallet-card') ?? [],
								).map(card => ({
									status: heading.getAttribute('data-support-status'),
									href: card.querySelector('.wallet-heading a')?.getAttribute('href'),
									platforms: card.querySelector('.platform-label')?.textContent?.trim(),
								})),
							),
						)
					const supported = statusEntries
						.filter(entry => entry.status === 'SUPPORTED')
						.map(({ href, platforms }) => ({ href, platforms }))
					const byWallet = new Map<string, Set<string | null>>()

					for (const entry of statusEntries) {
						expect(entry.platforms).toBeTruthy()

						if (entry.href) {
							const statuses = byWallet.get(entry.href) ?? new Set<string | null>()

							statuses.add(entry.status)
							byWallet.set(entry.href, statuses)
						}
					}
					expect(
						supported.toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
					).toEqual(
						directorySupport.toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
					)
					await info.attach('platform-statuses', {
						contentType: 'application/json',
						body: JSON.stringify({
							statusEntries,
							mixedWallets: Array.from(byWallet)
								.filter(([, statuses]) => statuses.size > 1)
								.map(([href]) => href),
							emptyDirectoryEntries: emptySupport.length,
						}),
					})

					const chart = page.locator('main figure').filter({
						has: page.locator('a[href^="#software-wallets-"]'),
					})

					await expect(chart).toHaveCount(1)
					const slices = chart.locator('a[href^="#software-wallets-"]')
					const expectedTargets = [
						'#software-wallets-supported',
						'#software-wallets-not-supported',
						'#software-wallets-unknown',
					]

					expect(
						(
							await slices.evaluateAll(links => links.map(link => link.getAttribute('href')))
						).sort(),
					).toEqual(expectedTargets.sort())
					await expect(chart.locator('figcaption')).toContainText('distinct software wallets')
					await expect(chart.locator('figcaption')).toContainText(
						'Slices count platform-qualified status entries',
					)

					for (const href of expectedTargets) {
						await expect(page.locator(href)).toHaveCount(1)
						const slice = chart.locator(`a[href="${href}"]`)

						await slice.focus()
						await page.keyboard.press('Enter')
						await page.waitForURL(url => url.hash === href)
						await expect(page.locator(href)).toBeInViewport()
						await page.goto('/wallet/eip/5792/')
						// The label is painted within the slice; the anchor's bounding-box center is the donut hole.
						await slice.locator('.label').click()
						await page.waitForURL(url => url.hash === href)
						await expect(page.locator(href)).toBeInViewport()
					}

					if (javaScriptEnabled) {
						await expectHydrated(page, 'main .wallet-card details')
					}

					const card = page.locator('main .wallet-card details').first()

					await card.locator('summary').focus()
					await page.keyboard.press('Enter')
					await expect(card).toHaveAttribute('open', '')
					const relationship = await card.evaluate(details => {
						const wallet = details.querySelector('summary .wallet-heading')
						const source = details.querySelector('section.references > :is(h1,h2,h3,h4,h5,h6)')
						const group = details.closest('.wallet-card')?.parentElement?.previousElementSibling
						const section = details.closest('section[data-sticky-container]')

						return {
							wallet: wallet?.tagName,
							source: source?.tagName,
							status: group?.querySelector('[data-support-status]')?.tagName,
							section: section?.querySelector(':scope > header > :is(h1,h2,h3)')?.tagName,
							sourcesBelongToCard: source?.closest('details') === details,
						}
					})

					expect(relationship).toEqual({
						wallet: 'H4',
						source: 'H5',
						status: 'H3',
						section: 'H2',
						sourcesBelongToCard: true,
					})
					await expect(card.locator('.platform-label')).not.toHaveText('')
					await expectContentFits(page)
					await page.screenshot({ path: info.outputPath('tracker.png') })
					const wallet = card.locator('summary .wallet-heading a')
					const destination = await wallet.getAttribute('href')
					const original = page.url()

					expect(destination).toMatch(/^\/[^/?#]+\/$/)
					await card.locator('summary').focus()
					await page.keyboard.press('Tab')
					await expect(wallet).toBeFocused()
					const newPageEvent = context.waitForEvent('page')

					await wallet.click({ modifiers: ['ControlOrMeta'] })
					const newPage = await newPageEvent

					await newPage.waitForLoadState()
					expect(new URL(newPage.url()).pathname).toBe(destination)
					expect(page.url()).toBe(original)
					await newPage.close()
					await wallet.focus()
					await page.keyboard.press('Enter')
					await page.waitForURL(url => url.pathname === destination)
				} finally {
					await context.close()
				}
			})
		}
	}
}

test('EIP-7702 retains its richer hydrated contract inventory', async ({ page }) => {
	await page.goto('/wallet/7702/')
	await expect(
		page.getByRole('heading', { name: 'EIP-7702 Adoption Tracker', exact: true }),
	).toBeVisible()
	await expectHydrated(page, 'main table')
	const table = page.locator('main table')

	for (const name of ['Wallet', 'Type', 'Contract', 'Batching']) {
		await expect(table.getByRole('columnheader', { name, exact: true })).toHaveCount(1)
	}
	const props: unknown = JSON.parse(
		(await table.locator('xpath=ancestor::astro-island').getAttribute('props')) ?? '{}',
	)

	if (!isRecord(props)) {
		throw new Error('Expected table island props')
	}

	const rows = serializedPayload(props.rows)

	if (!Array.isArray(rows) || rows.length === 0) {
		throw new Error('Expected nonempty canonical table rows')
	}

	await expect(table.locator('tbody tr')).toHaveCount(rows.length)

	for (const encodedRow of rows) {
		const row = serializedPayload(encodedRow)

		if (!isRecord(row)) {
			throw new Error('Expected a table row')
		}

		const name = serializedPayload(row.displayName)
		const url = serializedPayload(row.url)

		if (typeof name !== 'string' || typeof url !== 'string') {
			throw new Error('Expected wallet name and URL')
		}

		const renderedRow = table
			.locator('tbody tr')
			.filter({ has: page.locator(`h3 a[href="${url}"]`) })

		await expect(renderedRow).toHaveCount(1)
		await expect(renderedRow.locator('h3 a')).toHaveText(name)
		const contract = serializedPayload(row.contract)

		if (isRecord(contract)) {
			const contractName = serializedPayload(contract.name)
			const address = serializedPayload(contract.address)
			const sourceAvailable = serializedPayload(contract.sourceAvailable)

			if (typeof contractName !== 'string' || typeof address !== 'string') {
				throw new Error('Expected a named contract and address')
			}

			expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/)
			await expect(renderedRow.locator('.contract-info strong > a')).toHaveText(contractName)
			await expect(renderedRow.locator('.contract-info strong > a')).toHaveAttribute(
				'href',
				`https://etherscan.io/address/${address}`,
			)
			await expect(renderedRow.locator('.contract-info strong > a')).toHaveAttribute(
				'target',
				'_blank',
			)

			if (sourceAvailable === true) {
				const sourceUrl = serializedPayload(contract.sourceUrl)

				if (typeof sourceUrl !== 'string') {
					throw new Error('Expected available contract source URL')
				}

				await expect(renderedRow.locator('.source-link')).toHaveText('Source code')
				await expect(renderedRow.locator('.source-link')).toHaveAttribute('href', sourceUrl)
			} else {
				await expect(renderedRow).toContainText('Source unavailable')
			}
		} else {
			await expect(renderedRow.locator('.contract-info')).toHaveCount(0)

			if (contract === 'UNKNOWN') {
				await expect(renderedRow).toContainText('Unknown')
			}
		}
	}
})

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Astro serializes each island prop as a tagged tuple; inspect only the published row payload.
function serializedPayload(value: unknown): unknown {
	if (!Array.isArray(value)) {
		throw new Error('Expected a serialized island prop')
	}

	return value[1]
}

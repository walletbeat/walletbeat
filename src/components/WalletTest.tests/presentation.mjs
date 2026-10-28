import assert from 'node:assert/strict'

/** Local providers keep presentation journeys independent of installed wallets and RPC services. */
export function installProviders() {
	const address = '0x0000000000000000000000000000000000000001'
	const provider = {
		on() {},
		removeListener() {},
		/** @param {{ method: string }} payload */
		request({ method }) {
			switch (method) {
				case 'eth_accounts':
				case 'eth_requestAccounts':
					return Promise.resolve([address])
				case 'eth_chainId':
					return Promise.resolve('0xa')
				case 'wallet_connect':
					return Promise.resolve({ accounts: [{ address }] })
				default:
					return Promise.reject(new Error(`Mock provider does not support ${method}`))
			}
		},
	}

	window.ethereum = provider
	window.addEventListener('eip6963:requestProvider', () => {
		for (const index of [1, 2]) {
			window.dispatchEvent(
				new CustomEvent('eip6963:announceProvider', {
					detail: {
						info: {
							uuid: `00000000-0000-4000-8000-00000000000${index}`,
							name: `Mock Wallet ${index}`,
							rdns: `test.wallet${index}`,
							icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
						},
						provider,
					},
				}),
			)
		}
	})
}

/**
 * Exercise actual compiled tester navigation; callers own browser launch and evidence storage.
 * @param {import('@playwright/test').Page} page
 * @param {string} baseURL
 * @param {string} outputDir
 */
export async function checkPresentation(page, baseURL, outputDir) {
	page.setDefaultTimeout(15000)
	await page.addInitScript(installProviders)
	const reports = []

	for (const width of [1440, 390]) {
		for (const colorScheme of ['light', 'dark']) {
			await page.setViewportSize({ width, height: 900 })
			await page.emulateMedia({ colorScheme })
			await page.goto(`${baseURL}/test/`)
			await page
				.locator('astro-island[component-url*="WalletTest"][ssr]')
				.waitFor({ state: 'detached' })
			const categories = page.getByRole('group', { name: 'Test categories', exact: true })
			const cases = page.getByRole('group', { name: 'Test cases', exact: true })

			assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1)
			assert.equal(
				await page.getByRole('heading', { level: 2 }).textContent(),
				'Wallet interaction playground',
			)
			const labels = await categories.getByRole('button').allTextContents()

			assert.equal(labels.length, 7)
			const panes = []

			for (let categoryIndex = 0; categoryIndex < labels.length; categoryIndex++) {
				const category = categories.getByRole('button').nth(categoryIndex)

				await category.click()
				assert.equal(await category.getAttribute('aria-pressed'), 'true')

				if (labels[categoryIndex].trim() === 'Scam Alerts') {
					await page
						.getByRole('checkbox', {
							name: 'I understand the risks and will only use disposable wallets for testing',
							exact: true,
						})
						.check()
					await page.getByRole('button', { name: 'I Understand', exact: true }).click()
				}

				const count = await cases.getByRole('button').count()

				for (let index = 0; index < count; index++) {
					const item = cases.getByRole('button').nth(index)

					if (await item.isDisabled()) {
						continue
					}

					await item.click()
					assert.equal(await item.getAttribute('aria-pressed'), 'true')
					assert.equal(await cases.locator('[aria-pressed="true"]').count(), 1)
					assert.ok(await page.locator('.main-content h3').count())
					assert.equal(await cases.getByRole('heading').count(), 0)
					panes.push((await item.textContent()).trim())
					const overflow = await page.locator('main').evaluate(main => ({
						viewport: innerWidth,
						scrollWidth: main.scrollWidth,
						clientWidth: main.clientWidth,
						right: main.getBoundingClientRect().right,
						content: main.querySelector('.main-content').getBoundingClientRect().right,
					}))

					assert.ok(
						overflow.right <= width + 1 &&
							overflow.content <= width + 1 &&
							overflow.scrollWidth <= overflow.clientWidth + 1,
						JSON.stringify(overflow),
					)

					if (labels[categoryIndex].trim() === 'EIP Support') {
						await page.getByRole('button', { name: 'Run Step', exact: true }).click()

						if (index + 1 < count) {
							await cases
								.getByRole('button')
								.nth(index + 1)
								.locator('xpath=self::*[@aria-pressed="true"]')
								.waitFor()
						} else {
							await page.getByRole('heading', { name: 'Test Results', exact: true }).waitFor()
							await page.getByRole('button', { name: 'Close', exact: true }).click()
						}
					}
				}
			}
			await categories.getByRole('button', { name: 'App-isolation', exact: true }).click()
			await cases.getByRole('button', { name: /^eth_accounts/ }).click()
			await page.getByRole('button', { name: 'Call eth_accounts', exact: true }).click()
			await page.getByText('1 account(s) exposed', { exact: true }).waitFor()
			const signature = categories.getByRole('button', { name: 'Signatures', exact: true })

			await signature.focus()
			await page.keyboard.press('Enter')
			assert.equal(await signature.getAttribute('aria-pressed'), 'true')
			assert.ok(
				await signature.evaluate(el => {
					const css = getComputedStyle(el)

					return css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) > 0
				}),
			)
			await page.getByRole('button', { name: 'Connect wallet', exact: true }).click()
			await page.getByRole('heading', { name: 'Select a wallet', exact: true }).waitFor()
			assert.equal(await page.getByRole('button', { name: /^Mock Wallet/ }).count(), 2)
			await page.getByRole('button', { name: 'Close', exact: true }).click()
			await page
				.getByRole('heading', { name: 'Select a wallet', exact: true })
				.waitFor({ state: 'hidden' })
			await page.getByRole('button', { name: 'Connect wallet', exact: true }).click()
			await page.getByRole('button', { name: 'Mock Wallet 1', exact: true }).click()
			await page
				.getByRole('heading', { name: 'Select a wallet', exact: true })
				.waitFor({ state: 'hidden' })
			await categories.getByRole('button', { name: 'Transactions', exact: true }).click()
			assert.equal(
				await cases.locator('[aria-pressed="true"] strong').textContent(),
				'Custom Transaction',
			)
			await cases.getByRole('button').first().click()
			await page
				.getByRole('button', { name: 'Send Transaction (Testing Only)', exact: true })
				.click()
			await page.getByRole('heading', { name: 'Switch to Ethereum Mainnet', exact: true }).waitFor()
			await page.getByRole('button', { name: 'Cancel', exact: true }).click()
			await page
				.getByRole('heading', { name: 'Switch to Ethereum Mainnet', exact: true })
				.waitFor({ state: 'hidden' })
			await page.locator('h1').scrollIntoViewIfNeeded()
			await page.screenshot({ path: `${outputDir}/${width}-${colorScheme}.png` })
			reports.push({ width, colorScheme, labels, panes })
		}
	}

	return reports
}

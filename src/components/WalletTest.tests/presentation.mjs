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
 * Verify the shared dialog lifecycle through a real Playground invoker.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {import('@playwright/test').Locator} invoker
 * @param {number} position
 * @param {'escape'|'light'|'close'|'cancel'} [dismiss]
 * @param {number} [remaining]
 */
async function checkModalLifecycle(
	page,
	name,
	invoker,
	position,
	dismiss = 'escape',
	remaining = 0,
) {
	const dialog = page.getByRole('dialog', { name, exact: true })
	const scroll = page.locator('#layout')

	await dialog.waitFor()
	const element = await dialog.elementHandle()

	if (!element) {
		throw new Error('Open dialog has no element')
	}

	await element.evaluate(el => {
		el.dataset.closeCount = '0'

		if (!el.dataset.closeProbe) {
			el.addEventListener('close', () => {
				el.dataset.closeCount = String(Number(el.dataset.closeCount) + 1)
			})
			el.dataset.closeProbe = 'true'
		}
	})
	assert.ok(
		await dialog.evaluate(el => el.matches(':modal') && el.contains(document.activeElement)),
	)
	assert.equal(await scroll.evaluate(el => getComputedStyle(el).overflowY), 'hidden')
	const browserName = page.context().browser().browserType().name()

	for (const direction of ['forward', 'reverse']) {
		const key =
			direction === 'forward'
				? browserName === 'webkit'
					? 'Alt+Tab'
					: 'Tab'
				: browserName === 'webkit'
					? 'Alt+Shift+Tab'
					: 'Shift+Tab'

		for (let index = 0; index < 8; index++) {
			await page.keyboard.press(key)
			const contained = await dialog.evaluate(el => el.contains(document.activeElement))

			if (!contained) {
				assert.ok(
					await dialog.evaluate(
						() => document.activeElement === document.body && !document.hasFocus(),
					),
				)
				await page.keyboard.press(key)
				assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)))
			}
		}
	}
	await page.mouse.move(5, 5)
	await page.mouse.wheel(0, 500)
	await scroll.evaluate(
		el =>
			new Promise(resolve => {
				const start = performance.now()
				const sample = now =>
					now - start >= 300 ? resolve(el.scrollTop) : requestAnimationFrame(sample)

				requestAnimationFrame(sample)
			}),
	)
	assert.equal(await scroll.evaluate(el => el.scrollTop), position)

	if (dismiss === 'light') {
		await page.mouse.click(5, 5)
	} else if (dismiss === 'close' || dismiss === 'cancel') {
		await dialog
			.getByRole('button', { name: dismiss === 'close' ? 'Close' : 'Cancel', exact: true })
			.click()
	} else {
		await page.keyboard.press('Escape')
	}

	await dialog.waitFor({ state: 'hidden' })
	await page.waitForFunction(el => el.dataset.closeCount === '1', element)
	assert.equal(await element.evaluate(el => el.dataset.closeCount), '1')
	assert.ok(await invoker.evaluate(el => el === document.activeElement))
	assert.equal(await page.locator('dialog:modal').count(), remaining)
	assert.equal(
		await scroll.evaluate(el => getComputedStyle(el).overflowY === 'hidden'),
		remaining > 0,
	)
	assert.equal(await scroll.evaluate(el => el.scrollTop), position)
}

/** @param {import('@playwright/test').Page} page */
async function acceptScamConsent(page) {
	await page
		.getByRole('checkbox', {
			name: 'I understand the risks and will only use disposable wallets for testing',
			exact: true,
		})
		.check()
	await page.getByRole('button', { name: 'I Understand', exact: true }).click()
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
					await acceptScamConsent(page)
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
						await page
							.getByRole('button', { name: 'Run Step', exact: true })
							.scrollIntoViewIfNeeded()
						const resultPosition = await page.locator('#layout').evaluate(el => el.scrollTop)

						await page.getByRole('button', { name: 'Run Step', exact: true }).click()

						if (index + 1 < count) {
							await cases
								.getByRole('button')
								.nth(index + 1)
								.locator('xpath=self::*[@aria-pressed="true"]')
								.waitFor()
						} else {
							await page.getByRole('heading', { name: 'Test Results', exact: true }).waitFor()
							await checkModalLifecycle(
								page,
								'Test Results',
								page.locator('.main-content .actions button').first(),
								resultPosition,
							)
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
			await page
				.getByRole('button', { name: 'Connect wallet', exact: true })
				.scrollIntoViewIfNeeded()
			const connectorPosition = await page.locator('#layout').evaluate(el => el.scrollTop)

			await page.getByRole('button', { name: 'Connect wallet', exact: true }).click()
			await checkModalLifecycle(
				page,
				'Select a wallet',
				page.getByRole('button', { name: 'Connect wallet', exact: true }),
				connectorPosition,
			)
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
			const sendInvoker = page.getByRole('button', {
				name: 'Send Transaction (Testing Only)',
				exact: true,
			})

			await sendInvoker.scrollIntoViewIfNeeded()
			const parentOrigin = await page.locator('#layout').evaluate(el => el.scrollTop)

			await sendInvoker.click()
			const parent = page.getByRole('dialog', { name: 'Switch to Ethereum Mainnet', exact: true })
			const switchInvoker = parent.getByRole('button', { name: 'Switch to Mainnet', exact: true })

			await parent.waitFor()

			for (const dismiss of ['escape', 'close']) {
				await switchInvoker.click()
				const error = page.getByRole('dialog', { name: 'Error', exact: true })

				await error.waitFor()
				assert.equal(await page.locator('dialog:modal').count(), 2)
				assert.ok(
					(await error.getByRole('alert').textContent()).includes(
						'Mock provider does not support wallet_switchEthereumChain',
					),
				)
				await checkModalLifecycle(page, 'Error', switchInvoker, parentOrigin, dismiss, 1)
				assert.ok(
					await parent.evaluate(el => el.matches(':modal') && el.contains(document.activeElement)),
				)
			}
			await checkModalLifecycle(
				page,
				'Switch to Ethereum Mainnet',
				sendInvoker,
				parentOrigin,
				'cancel',
			)
			const actions = []

			for (const categoryName of [
				'Transactions',
				'Signatures',
				'Tx Simulations',
				'Scam Alerts',
				'App-isolation',
				'ERC-8213',
			]) {
				await categories.getByRole('button', { name: categoryName, exact: true }).click()

				if (categoryName === 'Scam Alerts') {
					await acceptScamConsent(page)
				}

				for (let index = 0; index < (await cases.getByRole('button').count()); index++) {
					const item = cases.getByRole('button').nth(index)

					if (await item.isDisabled()) {
						continue
					}

					await item.click()
					const main = page.locator('.main-content')

					for (const field of await main.locator('input.address-input').all()) {
						await field.fill('0x0000000000000000000000000000000000000001')
					}

					if (await main.locator('#custom-tx-calldata').count()) {
						await main.locator('#custom-tx-calldata').fill('0x')
					}

					const action = main.locator('button[data-pressable]').first()
					const label = (await action.textContent()).trim()

					await action.scrollIntoViewIfNeeded()
					const before = await page.locator('#layout').evaluate(el => el.scrollTop)

					await action.click()

					if (label.startsWith('Send')) {
						await checkModalLifecycle(page, 'Switch to Ethereum Mainnet', action, before)
					} else if (label.startsWith('Sign')) {
						await page.getByRole('alert').waitFor()
						const method =
							categoryName === 'Scam Alerts' || label.includes('Typed Data')
								? 'eth_signTypedData_v4'
								: 'personal_sign'

						assert.ok(
							(await page.getByRole('alert').textContent()).includes(
								`Mock provider does not support ${method}`,
							),
						)
						await checkModalLifecycle(page, 'Error', action, before)
						await action.click()
						await page.getByRole('alert').waitFor()
						await checkModalLifecycle(page, 'Error', action, before, 'light')
						await action.click()
						await checkModalLifecycle(page, 'Error', action, before, 'close')
					} else if (label.startsWith('Compute')) {
						await main.locator('.hash-value').first().waitFor()
						assert.ok((await main.locator('.hash-value').first().textContent()).startsWith('0x'))
					} else if (label === 'Call eth_accounts') {
						await main.getByText('1 account(s) exposed', { exact: true }).waitFor()
					} else if (label === 'Call wallet_connect') {
						await main.locator('.result-json').waitFor()
						assert.ok(
							(await main.locator('.result-json').textContent()).includes(
								'0x0000000000000000000000000000000000000001',
							),
						)
					} else {
						throw new Error(`Unhandled action: ${label}`)
					}

					actions.push({ category: categoryName, case: (await item.textContent()).trim(), label })
				}
			}
			await page.locator('h1').scrollIntoViewIfNeeded()
			await page.screenshot({ path: `${outputDir}/${width}-${colorScheme}.png` })
			reports.push({ width, colorScheme, labels, panes, actions })
		}
	}

	return reports
}

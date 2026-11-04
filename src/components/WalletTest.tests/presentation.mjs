import assert from 'node:assert/strict'

/**
 * Action identities and unavailable states for the controlled provider fixture.
 * @type {Record<string, Array<[string, string]>>}
 */
const expectedCases = {
	Transactions: [
		['ERC20 Approve', 'Send Transaction (Testing Only)'],
		['ERC20 Transfer', 'Send Transaction (Testing Only)'],
		['Aave Supply', 'Send Transaction (Testing Only)'],
		['EIP-7702 Multi-Call', 'Send Transaction (Testing Only)'],
		['Custom Transaction', 'Send Transaction (Testing Only)'],
	],
	Signatures: [
		['Simple Test Message', 'Sign Message'],
		['SIWE (Sign-In With Ethereum)', 'Sign Message'],
		['EIP-712 Test Signature', 'Sign Typed Data'],
	],
	'EIP Support': [
		['1. Wallet Detection', 'Run Step'],
		['2. Connect Wallet', 'Run Step'],
		['3. Check Account', 'Run Step'],
		['4. Check Network', 'Run Step'],
		['5. Send Batch Calls', 'Run Step'],
		['6. Check Batch Status', 'Run Step'],
	],
	'App-isolation': [
		['eth_accounts', 'Call eth_accounts'],
		['wallet_connect', 'Call wallet_connect'],
	],
	'Tx Simulations': [
		['ERC-20 Mint', 'Send Transaction (Testing Only)'],
		['ERC-721 Mint', 'Send Transaction (Testing Only)'],
		['ERC-1155 Mint', 'Send Transaction (Testing Only)'],
		['ERC-20 Transfer', 'Send Transaction (Testing Only)'],
		['ERC-721 Transfer', 'Send Transaction (Testing Only)'],
		['ERC-1155 Transfer', 'Send Transaction (Testing Only)'],
		['All Token Transfer', 'Send Transaction (Testing Only)'],
		['Misleading Selector', 'Send Transaction (Testing Only)'],
		['Fake Airdrop', 'Send Transaction (Testing Only)'],
		['Volatile Outcome', 'Send Transaction (Testing Only)'],
		['Failing Transaction', 'Send Transaction (Testing Only)'],
	],
	'Scam Alerts': [
		['Recent Contract Warning', 'Send Transaction (Testing Only)'],
		['Previous Contract Transaction', 'Send Transaction (Testing Only)'],
		['Custom Address', 'Send 0.0001 ETH (Testing Only)'],
		['Known scam address', 'Send 0.0001 ETH (Testing Only)'],
		['USDC', 'Send Transaction (Testing Only)'],
		['Gasless Approval: USDC Permit', 'Sign Message (Testing Only)'],
	],
	'ERC-8213': [
		['Calldata digest', 'Compute digest'],
		['EIP-712 digest', 'Compute EIP-712 digest'],
	],
}

const expectedDispatch = {
	ordinary: {
		to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		data: '0x095ea7b300000000000000000000000087870bca3f3fd6335c3f4ce8392d69350b4fa4e20000000000000000000000000000000000000000000000000000000000002710',
	},
	batch: {
		calls: [
			{
				to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
				data: '0x095ea7b300000000000000000000000087870bca3f3fd6335c3f4ce8392d69350b4fa4e20000000000000000000000000000000000000000000000000000000000002710',
				value: '0x0',
			},
			{
				to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
				data: '0xa9059cbb00000000000000000000000006496e706bb260bef1656297a7eaddf5d3e7788a0000000000000000000000000000000000000000000000000000000000002710',
				value: '0x0',
			},
		],
	},
}

/** Local providers keep presentation journeys independent of installed wallets and RPC services. */
export function installProviders() {
	const address = '0x0000000000000000000000000000000000000001'
	let chainId = '0xa'
	let deferSwitches = false
	let completeSends = false
	/** @type {Array<{method: string, params: unknown}>} */
	const dispatches = []
	/** @type {string[]} */
	const requests = []
	/** @type {Array<{resolve: (value: null) => void, reject: (reason: Error) => void}>} */
	const pending = []
	/** @type {Map<string, Set<(value: unknown) => void>>} */
	const listeners = new Map()
	/** @param {string} event @param {unknown} value */
	const emit = (event, value) => {
		for (const listener of listeners.get(event) ?? []) {
			listener(value)
		}
	}
	const publish = () => {
		document.documentElement.dataset.providerRequests = requests.join('\n')
		document.documentElement.dataset.switchCount = String(pending.length)
		document.documentElement.dataset.dispatches = JSON.stringify(dispatches)
	}

	window.addEventListener('playground:switch-control', event => {
		if (!(event instanceof CustomEvent)) {
			throw new Error('Invalid fixture control event')
		}

		/** @type {unknown} */
		const detail = event.detail

		if (typeof detail !== 'object' || detail === null || !('command' in detail)) {
			throw new Error('Missing fixture command')
		}

		if (detail.command === 'defer') {
			deferSwitches = true

			return
		}

		if (detail.command === 'complete-sends') {
			completeSends = true

			return
		}

		if (
			detail.command !== 'settle' ||
			!('index' in detail) ||
			typeof detail.index !== 'number' ||
			!('outcome' in detail) ||
			!['success', 'reject'].includes(String(detail.outcome))
		) {
			throw new Error('Invalid fixture settlement')
		}

		const operation = pending[detail.index]

		if (!operation) {
			throw new Error('Unknown switch request')
		}

		if (detail.outcome === 'success') {
			chainId = '0x1'
			emit('chainChanged', chainId)
			operation.resolve(null)
		} else {
			operation.reject(new Error('Controlled switch rejection'))
		}
	})
	const provider = {
		/** @param {string} event @param {(value: unknown) => void} listener */
		on(event, listener) {
			if (!listeners.has(event)) {
				listeners.set(event, new Set())
			}

			listeners.get(event).add(listener)
		},
		/** @param {string} event @param {(value: unknown) => void} listener */
		removeListener(event, listener) {
			listeners.get(event)?.delete(listener)
		},
		/** @param {{ method: string, params?: unknown }} payload */
		request({ method, params }) {
			requests.push(method)
			publish()

			switch (method) {
				case 'eth_accounts':
				case 'eth_requestAccounts':
					return Promise.resolve([address])
				case 'eth_chainId':
					return Promise.resolve(chainId)
				case 'wallet_connect':
					return Promise.resolve({ accounts: [{ address }] })
				case 'eth_sendTransaction':
				case 'wallet_sendCalls':
					dispatches.push({ method, params })
					publish()

					if (completeSends) {
						return Promise.resolve(
							method === 'wallet_sendCalls'
								? { id: '0x' + 'ab'.repeat(32) }
								: '0x' + 'ab'.repeat(32),
						)
					}

					return Promise.reject(new Error(`Mock provider does not support ${method}`))
				case 'wallet_switchEthereumChain':
					if (deferSwitches) {
						return new Promise((resolve, reject) => {
							pending.push({ resolve, reject })
							publish()
						})
					}

					return Promise.reject(new Error(`Mock provider does not support ${method}`))
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
 * @param {boolean} [nativeOrigin]
 */
async function checkModalLifecycle(
	page,
	name,
	invoker,
	position,
	dismiss = 'escape',
	remaining = 0,
	nativeOrigin = false,
) {
	const dialog = page.getByRole('dialog', { name, exact: true })
	const scroll = page.locator('#layout')

	await dialog.waitFor()
	const invokerAtAdmission = await invoker.evaluate(el => ({
		disabled: el.matches(':disabled'),
		ariaDisabled: el.getAttribute('aria-disabled'),
		connected: el.isConnected,
		active: el === document.activeElement,
	}))
	const originHandle = nativeOrigin
		? await dialog.evaluateHandle(el => {
				const origin = /** @type {unknown} */ (Reflect.get(el, '__playgroundFocusOrigin'))

				return origin instanceof Element ? origin : null
			})
		: null
	const invokerElement =
		/** @type {import('@playwright/test').ElementHandle<Element>|null|undefined} */ (
			nativeOrigin ? originHandle?.asElement() : await invoker.elementHandle()
		)
	const element = await dialog.elementHandle()

	if (!element || !invokerElement) {
		throw new Error('Open dialog or invoker has no element')
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
				let returned = false

				for (let returnStep = 0; returnStep < 4; returnStep++) {
					await page.keyboard.press(key)
					const state = await dialog.evaluate(el => ({
						contained: el.contains(document.activeElement),
						activeTag: document.activeElement?.tagName,
						activeText: (document.activeElement?.textContent ?? '').slice(0, 120),
						body: document.activeElement === document.body,
						focused: document.hasFocus(),
						modal: el.matches(':modal'),
					}))

					assert.ok(state.modal)

					if (state.contained && state.focused) {
						returned = true
						break
					}

					assert.ok(state.body, JSON.stringify(state))
				}

				assert.ok(returned, 'Native traversal did not return focus inside the modal')
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
	const restoredEventually = await page
		.waitForFunction(el => el === document.activeElement, invokerElement, { timeout: 400 })
		.then(
			() => true,
			() => false,
		)

	const focus = await invokerElement.evaluate(
		/** @param {Element} el */ el => {
			const parent = el.closest('dialog')

			return {
				exact: el === document.activeElement,
				focused: document.hasFocus(),
				connected: el.isConnected,
				eligible: !el.matches(':disabled') && !el.closest('[inert]'),
				inParent: Boolean(parent?.matches(':modal') && parent.contains(document.activeElement)),
				tag: document.activeElement?.tagName ?? null,
				text: (document.activeElement?.textContent ?? '').slice(0, 160),
			}
		},
	)

	assert.ok(
		focus.exact && focus.focused && focus.connected && focus.eligible,
		JSON.stringify({
			focus,
			restoredEventually,
			invokerAtAdmission,
			probe: await page.locator('html').getAttribute('data-playground-focus-probe'),
			chronology: await page.locator('html').getAttribute('data-focus-chronology'),
		}),
	)
	assert.equal(await page.locator('dialog:modal').count(), remaining)
	assert.equal(
		await scroll.evaluate(el => getComputedStyle(el).overflowY === 'hidden'),
		remaining > 0,
	)
	assert.equal(await scroll.evaluate(el => el.scrollTop), position)

	return focus
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
 * @param {'keyboard'|'pointer'} [resultAdmission]
 */
export async function checkPresentation(page, baseURL, outputDir, resultAdmission = 'keyboard') {
	page.setDefaultTimeout(15000)
	await page.addInitScript(installProviders)
	await page.addInitScript(() => {
		/** @type {unknown[]} */
		const events = []
		/** @param {EventTarget|null} el */
		const describe = el =>
			el instanceof Element
				? {
						tag: el.tagName,
						text: (el.textContent ?? '').slice(0, 100),
						focusVisible: el.matches(':focus-visible'),
						disabled: el.matches(':disabled'),
						connected: el.isConnected,
						outline: getComputedStyle(el).outline,
					}
				: null
		/** @param {string} kind @param {EventTarget|null} target */
		const record = (kind, target) => {
			events.push({
				kind,
				target: describe(target),
				active: describe(document.activeElement),
				hasFocus: document.hasFocus(),
			})

			if (events.length > 100) {
				events.shift()
			}

			document.documentElement.dataset.playgroundFocusProbe = JSON.stringify(events)
		}

		document.addEventListener('pointerdown', event => record('pointerdown', event.target), true)
		document.addEventListener('click', event => record('click', event.target), true)
		document.addEventListener('focusout', event => record('focusout', event.target), true)
		document.addEventListener('focusin', event => record('focusin', event.target), true)
		document.addEventListener('close', event => record('close', event.target), true)
		new MutationObserver(mutations => {
			for (const mutation of mutations) {
				if (mutation.target instanceof HTMLButtonElement) {
					record(`disabled-change:old=${mutation.oldValue ?? 'absent'}`, mutation.target)
				}
			}
		}).observe(document, {
			subtree: true,
			attributes: true,
			attributeFilter: ['disabled'],
			attributeOldValue: true,
		})
		const descriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
		const showModal = /** @type {unknown} */ (descriptor?.value)

		if (typeof showModal !== 'function') {
			throw new Error('Native showModal unavailable')
		}

		HTMLDialogElement.prototype.showModal = function () {
			Object.defineProperty(this, '__playgroundFocusOrigin', {
				value: document.activeElement,
				configurable: true,
			})
			record('before-showModal', this)
			Reflect.apply(showModal, this, [])
			record('after-showModal', this)
		}
	})
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

			assert.equal(
				JSON.stringify(labels.map(label => label.trim())),
				JSON.stringify(Object.keys(expectedCases)),
			)
			const panes = []
			const actions = []

			for (let categoryIndex = 0; categoryIndex < labels.length; categoryIndex++) {
				const category = categories.getByRole('button').nth(categoryIndex)

				await category.click()
				assert.equal(await category.getAttribute('aria-pressed'), 'true')

				if (labels[categoryIndex].trim() === 'Scam Alerts') {
					await acceptScamConsent(page)
				}

				const count = await cases.getByRole('button').count()
				const categoryName = labels[categoryIndex].trim()

				assert.equal(
					JSON.stringify(await cases.locator('strong').allTextContents()),
					JSON.stringify(expectedCases[categoryName].map(entry => entry[0])),
				)

				if (categoryName === 'EIP Support') {
					assert.equal(
						await page.getByRole('button', { name: 'Reset All Tests', exact: true }).count(),
						0,
					)

					for (let future = 0; future < count; future++) {
						assert.equal(await cases.getByRole('button').nth(future).isDisabled(), future > 0)
					}
				}

				for (let index = 0; index < count; index++) {
					const item = cases.getByRole('button').nth(index)

					assert.equal(await item.isDisabled(), false)

					await item.click()
					assert.equal(await item.getAttribute('aria-pressed'), 'true')
					assert.equal(await cases.locator('[aria-pressed="true"]').count(), 1)
					assert.ok(await page.locator('.main-content h3').count())
					assert.equal(await cases.getByRole('heading').count(), 0)
					panes.push((await item.locator('strong').textContent()).trim())

					if (
						['Transactions', 'Signatures', 'Tx Simulations', 'Scam Alerts'].includes(categoryName)
					) {
						assert.equal(await page.locator('.main-content button[data-pressable]').count(), 1)
						assert.equal(
							await page.locator('.main-content button[data-pressable]').isDisabled(),
							true,
						)
					}

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
						let resultPosition = await page.locator('#layout').evaluate(el => el.scrollTop)

						if (resultAdmission === 'pointer') {
							await page.getByRole('button', { name: 'Run Step', exact: true }).click()
						} else {
							await activateByKeyboard(
								page,
								page.getByRole('button', { name: 'Run Step', exact: true }),
								async () => {
									resultPosition = await page.locator('#layout').evaluate(el => el.scrollTop)
								},
							)
						}

						actions.push({
							category: categoryName,
							case: (await item.locator('strong').textContent()).trim(),
							label: 'Run Step',
						})

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
								page.locator(
									'.main-content .actions button[data-pressable]:not([data-pressable~="secondary"])',
								),
								resultPosition,
							)
							await page.getByRole('button', { name: 'Reset All Tests', exact: true }).click()
							assert.equal(
								await cases.getByRole('button').first().getAttribute('aria-pressed'),
								'true',
							)

							for (let future = 0; future < count; future++) {
								assert.equal(await cases.getByRole('button').nth(future).isDisabled(), future > 0)
							}
							assert.equal(
								await page.getByRole('button', { name: 'Reset All Tests', exact: true }).count(),
								0,
							)
							actions.push({
								category: 'EIP Support',
								case: 'Reset All Tests',
								label: 'Reset All Tests',
							})
						}
					}
				}
			}
			await categories.getByRole('button', { name: 'App-isolation', exact: true }).click()
			await cases.getByRole('button', { name: /^eth_accounts/ }).click()
			await page.getByRole('button', { name: 'Call eth_accounts', exact: true }).click()
			await page.getByText('1 account(s) exposed', { exact: true }).waitFor()
			const signature = categories.getByRole('button', { name: 'Signatures', exact: true })

			const focusBefore = await signature.evaluate(el => ({
				active: document.activeElement?.tagName,
				exact: el === document.activeElement,
				visible: el.matches(':focus-visible'),
				outline: getComputedStyle(el).outline,
			}))

			await activateByKeyboard(page, signature)
			const focusAfter = await signature.evaluate(el => ({
				active: document.activeElement?.tagName,
				exact: el === document.activeElement,
				visible: el.matches(':focus-visible'),
				outline: getComputedStyle(el).outline,
			}))

			const signatureFocusProbe = JSON.stringify({ focusBefore, focusAfter })

			assert.ok(
				await signature.evaluate(
					el => el === document.activeElement && el.matches(':focus-visible'),
				),
			)
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
			let connectorPosition = 0

			await activateByKeyboard(
				page,
				page.getByRole('button', { name: 'Connect wallet', exact: true }),
				async () => {
					connectorPosition = await page.locator('#layout').evaluate(el => el.scrollTop)
				},
			)
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
			let parentOrigin = 0

			await activateByKeyboard(page, sendInvoker, async () => {
				parentOrigin = await page.locator('#layout').evaluate(el => el.scrollTop)
			})
			const parent = page.getByRole('dialog', { name: 'Switch to Ethereum Mainnet', exact: true })
			const switchInvoker = parent.getByRole('button', { name: 'Switch to Mainnet', exact: true })

			await parent.waitFor()

			for (const dismiss of ['escape', 'close']) {
				await activateByKeyboard(page, switchInvoker)
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

					assert.equal(await item.isDisabled(), false)

					await item.click()
					const main = page.locator('.main-content')

					for (const field of await main.locator('input.address-input').all()) {
						await field.fill('0x0000000000000000000000000000000000000001')
					}

					if (await main.locator('#custom-tx-calldata').count()) {
						await main.locator('#custom-tx-calldata').fill('0x')
					}

					assert.equal(await main.locator('button[data-pressable]').count(), 1)
					const action = main.locator('button[data-pressable]')

					assert.equal(await action.isDisabled(), false)
					const label = (await action.textContent()).trim()
					const caseName = (await item.locator('strong').textContent()).trim()

					assert.equal(
						JSON.stringify([caseName, label]),
						JSON.stringify(expectedCases[categoryName][index]),
					)

					await action.scrollIntoViewIfNeeded()
					let before = 0

					if (label.startsWith('Send')) {
						await activateByKeyboard(page, action, async () => {
							before = await page.locator('#layout').evaluate(el => el.scrollTop)
						})
					} else {
						before = await page.locator('#layout').evaluate(el => el.scrollTop)
						await action.click()
					}

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
						await checkModalLifecycle(page, 'Error', action, before, 'escape', 0, true)
						await action.click()
						await page.getByRole('alert').waitFor()
						await checkModalLifecycle(page, 'Error', action, before, 'light', 0, true)
						await action.click()
						await checkModalLifecycle(page, 'Error', action, before, 'close', 0, true)
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

					actions.push({ category: categoryName, case: caseName, label })
				}
			}
			const required = Object.entries(expectedCases).flatMap(([category, entries]) =>
				entries.map(([name, label]) => JSON.stringify([category, name, label])),
			)

			required.push(JSON.stringify(['EIP Support', 'Reset All Tests', 'Reset All Tests']))
			required.sort()
			const observed = actions
				.map(action => JSON.stringify([action.category, action.case, action.label]))
				.sort()

			assert.equal(JSON.stringify(observed), JSON.stringify(required))
			await page.locator('h1').scrollIntoViewIfNeeded()
			await page.screenshot({ path: `${outputDir}/${width}-${colorScheme}.png` })
			reports.push({
				width,
				colorScheme,
				labels,
				panes,
				actions,
				resultAdmission,
				signatureFocusProbe,
				focusProbe: await page.locator('html').getAttribute('data-playground-focus-probe'),
			})
		}
	}

	return reports
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} control
 * @param {() => Promise<void>} [beforeActivate]
 */
async function activateByKeyboard(page, control, beforeActivate = async () => {}) {
	await control.waitFor()
	assert.equal(await control.isDisabled(), false)
	const webkit = page.context().browser().browserType().name() === 'webkit'
	/** @type {unknown[]} */
	const trace = []
	let direction = 0

	for (const key of webkit ? ['Alt+Tab', 'Alt+Shift+Tab'] : ['Tab', 'Shift+Tab']) {
		// The budget bounds the probe; it does not establish a complete focus cycle.
		const budget = direction++ === 0 ? 80 : 160

		for (let step = 0; step <= budget; step++) {
			const state = await control.evaluate(el => {
				const active = document.activeElement
				const parent = el.closest('dialog')

				return {
					exact: el === active,
					hasFocus: document.hasFocus(),
					modal: parent ? parent.matches(':modal') : null,
					contained: parent ? parent.contains(active) : null,
					tag: active?.tagName ?? null,
					text: (active?.textContent ?? '').slice(0, 100),
				}
			})

			trace.push({ key, step, ...state })

			if (state.exact && state.hasFocus) {
				if (state.modal !== null) {
					assert.equal(state.modal, true)
				}

				await beforeActivate()
				await page.keyboard.press('Enter')

				return
			}

			if (step < budget) {
				await page.keyboard.press(key)
				await page.evaluate(
					() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
				)
			}
		}
	}

	throw new Error(
		`Native keyboard admission exhausted for ${await control.textContent()}: ${JSON.stringify(trace)}`,
	)
}

/**
 * Dismissed and superseded provider work cannot own a later transaction intent.
 * @param {import('@playwright/test').Page} page
 * @param {string} baseURL
 */
export async function checkSwitchContinuations(page, baseURL) {
	const reports = []
	/** @type {string[]} */
	const errors = []
	/** @param {Error} error */
	const onError = error => errors.push(error.message)

	page.on('pageerror', onError)
	await page.clock.install()

	try {
		for (const scenario of [
			{ dismiss: 'escape', outcome: 'success', reopen: false },
			{ dismiss: 'light', outcome: 'reject', reopen: false },
			{ dismiss: 'escape', outcome: 'success', reopen: true },
			{ dismiss: 'light', outcome: 'reject', reopen: true },
			{ dismiss: 'escape', outcome: 'success', reopen: false, settleBeforeDismiss: true },
		]) {
			await page.goto(`${baseURL}/test/`)
			await page
				.locator('astro-island[component-url*="WalletTest"][ssr]')
				.waitFor({ state: 'detached' })
			/** @param {{command: 'defer'} | {command: 'settle', index: number, outcome: string}} detail */
			const control = detail =>
				page.evaluate(
					value =>
						window.dispatchEvent(new CustomEvent('playground:switch-control', { detail: value })),
					detail,
				)

			await control({ command: 'defer' })
			await page.getByRole('button', { name: 'Connect wallet', exact: true }).click()
			await page.getByRole('button', { name: 'Mock Wallet 1', exact: true }).click()
			await page
				.getByRole('dialog', { name: 'Select a wallet', exact: true })
				.waitFor({ state: 'hidden' })
			const send = page.getByRole('button', {
				name: 'Send Transaction (Testing Only)',
				exact: true,
			})
			const parent = page.getByRole('dialog', { name: 'Switch to Ethereum Mainnet', exact: true })
			const startSwitch = async count => {
				await activateByKeyboard(page, send)
				await activateByKeyboard(
					page,
					parent.getByRole('button', { name: 'Switch to Mainnet', exact: true }),
				)
				await page.waitForFunction(
					expected => Number(document.documentElement.dataset.switchCount) === expected,
					count,
				)
				assert.equal(
					await parent.getByRole('button', { name: 'Switching…', exact: true }).isDisabled(),
					true,
				)
				assert.equal(
					await parent.getByRole('button', { name: 'Cancel', exact: true }).isDisabled(),
					true,
				)
			}
			const dismiss = async () => {
				if (scenario.dismiss === 'light') {
					await page.mouse.click(5, 5)
				} else {
					await page.keyboard.press('Escape')
				}

				await parent.waitFor({ state: 'hidden' })
				await page
					.getByRole('heading', {
						name: 'Switch to Ethereum Mainnet',
						exact: true,
						includeHidden: true,
					})
					.waitFor({ state: 'detached' })
				assert.ok(await send.evaluate(el => el === document.activeElement))
				assert.equal(await send.isDisabled(), false)
			}

			await startSwitch(1)

			if (scenario.settleBeforeDismiss) {
				await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
				await control({ command: 'settle', index: 0, outcome: scenario.outcome })
				await page.clock.runFor(100)
				assert.ok(await parent.evaluate(el => el.matches(':modal')))
			}

			await dismiss()

			if (scenario.reopen) {
				await startSwitch(2)
			}

			if (!scenario.settleBeforeDismiss) {
				await control({ command: 'settle', index: 0, outcome: scenario.outcome })
			}

			await page.clock.runFor(1000)

			if (scenario.reopen) {
				assert.ok(await parent.evaluate(el => el.matches(':modal')))
				assert.equal(
					await parent.getByRole('button', { name: 'Switching…', exact: true }).isDisabled(),
					true,
				)
				await dismiss()
				await control({
					command: 'settle',
					index: 1,
					outcome: scenario.outcome === 'success' ? 'reject' : 'success',
				})
				await page.clock.runFor(1000)
			}

			assert.ok(
				(await page.getByRole('alert').count()) === 0,
				`Unexpected error after ${JSON.stringify(scenario)}: ${(await page.getByRole('alert').allTextContents()).join(' ')}`,
			)
			assert.ok(
				(await page.locator('dialog:modal').count()) === 0,
				`Unexpected modal after ${JSON.stringify(scenario)}`,
			)
			assert.ok(
				(await send.isDisabled()) === false,
				`Pending transaction after ${JSON.stringify(scenario)}`,
			)
			const requests = (
				(await page.locator('html').getAttribute('data-provider-requests')) ?? ''
			).split('\n')

			assert.equal(requests.includes('wallet_switchEthereumChain'), true)

			assert.equal(requests.includes('eth_sendTransaction'), false)
			assert.equal(requests.includes('wallet_sendCalls'), false)
			reports.push({ ...scenario, requests })
		}
		const completions = await checkCurrentSwitchCompletions(page, baseURL)

		assert.equal(JSON.stringify(errors), '[]')

		return { cancellations: reports, completions }
	} finally {
		await page.clock.resume()
		page.off('pageerror', onError)
	}
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** @param {unknown} value @returns {value is unknown[]} */
function isUnknownArray(value) {
	return Array.isArray(value)
}

/** @param {import('@playwright/test').Page} page */
async function readDispatches(page) {
	/** @type {unknown} */
	const value = JSON.parse((await page.locator('html').getAttribute('data-dispatches')) ?? '[]')

	assert.ok(isUnknownArray(value))

	return value.map(entry => {
		assert.ok(isRecord(entry) && typeof entry.method === 'string' && 'params' in entry)

		return { method: entry.method, params: entry.params }
	})
}

/** @param {{method: string, params: unknown}} dispatch @param {'ordinary'|'batch'} kind */
function checkDispatchPayload(dispatch, kind) {
	assert.ok(isUnknownArray(dispatch.params) && dispatch.params.length === 1)
	const payload = dispatch.params[0]

	assert.ok(isRecord(payload))
	assert.equal(payload.from, '0x0000000000000000000000000000000000000001')

	if (kind === 'ordinary') {
		assert.equal(dispatch.method, 'eth_sendTransaction')
		assert.equal(String(payload.to).toLowerCase(), expectedDispatch.ordinary.to)
		assert.equal(payload.data, expectedDispatch.ordinary.data)
		assert.equal(payload.value ?? '0x0', '0x0')
	} else {
		assert.equal(dispatch.method, 'wallet_sendCalls')
		assert.equal(payload.chainId, '0x1')
		assert.equal(payload.version, '2.0.0')
		assert.equal(payload.atomicRequired, false)
		assert.ok(isUnknownArray(payload.calls) && payload.calls.length === 2)

		for (let index = 0; index < 2; index++) {
			const call = payload.calls[index]

			assert.ok(isRecord(call))
			assert.equal(String(call.to).toLowerCase(), expectedDispatch.batch.calls[index].to)
			assert.equal(call.data, expectedDispatch.batch.calls[index].data)
			assert.equal(call.value ?? '0x0', expectedDispatch.batch.calls[index].value)
		}
	}
}

/**
 * Current work must dispatch once, and a current rejection must retain ownership for retry.
 * @param {import('@playwright/test').Page} page
 * @param {string} baseURL
 */
async function checkCurrentSwitchCompletions(page, baseURL) {
	const reports = []
	/** @type {Array<{kind: 'complete'|'retry', transaction: 'ordinary'|'batch'}>} */
	const scenarios = [
		{ kind: 'complete', transaction: 'ordinary' },
		{ kind: 'complete', transaction: 'batch' },
		{ kind: 'retry', transaction: 'ordinary' },
	]

	for (const scenario of scenarios) {
		await page.clock.resume()
		await page.goto(`${baseURL}/test/`)
		await page
			.locator('astro-island[component-url*="WalletTest"][ssr]')
			.waitFor({ state: 'detached' })
		/** @param {{command: 'defer'|'complete-sends'} | {command: 'settle', index: number, outcome: string}} detail */
		const control = detail =>
			page.evaluate(
				value =>
					window.dispatchEvent(new CustomEvent('playground:switch-control', { detail: value })),
				detail,
			)

		await control({ command: 'defer' })
		await control({ command: 'complete-sends' })
		await page.getByRole('button', { name: 'Connect wallet', exact: true }).click()
		await page.getByRole('button', { name: 'Mock Wallet 1', exact: true }).click()
		await page
			.getByRole('dialog', { name: 'Select a wallet', exact: true })
			.waitFor({ state: 'hidden' })
		const cases = page.getByRole('group', { name: 'Test cases', exact: true })

		await cases
			.getByRole('button', {
				name: scenario.transaction === 'batch' ? /^EIP-7702 Multi-Call/ : /^ERC20 Approve/,
			})
			.click()
		const send = page.getByRole('button', { name: 'Send Transaction (Testing Only)', exact: true })
		const parent = page.getByRole('dialog', { name: 'Switch to Ethereum Mainnet', exact: true })

		if (scenario.kind === 'retry') {
			await page.evaluate(() => {
				/** @type {unknown[]} */
				const events = []
				/** @param {Element|null} el */
				const describe = el =>
					el
						? {
								tag: el.tagName,
								text: (el.textContent ?? '').slice(0, 100),
								disabled: el.matches(':disabled'),
								connected: el.isConnected,
								dialog: el.closest('dialog')?.querySelector('h3')?.textContent ?? null,
							}
						: null
				/** @param {string} type @param {Element|null} target @param {string|null} [previous] */
				const record = (type, target, previous = null) => {
					events.push({
						at: performance.now(),
						type,
						previous,
						target: describe(target),
						active: describe(document.activeElement),
					})
					document.documentElement.dataset.focusChronology = JSON.stringify(events)
				}

				for (const type of ['focusin', 'focusout', 'close', 'cancel']) {
					document.addEventListener(
						type,
						event => record(type, event.target instanceof Element ? event.target : null),
						true,
					)
				}
				new MutationObserver(mutations => {
					for (const mutation of mutations) {
						if (mutation.target instanceof Element && mutation.target.matches('button,dialog')) {
							record('attribute:' + mutation.attributeName, mutation.target, mutation.oldValue)
						}
					}
				}).observe(document, {
					subtree: true,
					attributes: true,
					attributeFilter: ['disabled', 'aria-disabled', 'open'],
					attributeOldValue: true,
				})
				record('installed', document.activeElement)
			})
		}

		await send.scrollIntoViewIfNeeded()
		await activateByKeyboard(page, send)
		await activateByKeyboard(
			page,
			parent.getByRole('button', { name: 'Switch to Mainnet', exact: true }),
		)
		await page.waitForFunction(() => document.documentElement.dataset.switchCount === '1')
		const busy = parent.getByRole('button', { name: 'Switching…', exact: true })

		await busy.waitFor()
		assert.equal(await busy.isDisabled(), true)
		assert.ok(await busy.evaluate(el => el === document.activeElement))
		await page.keyboard.press('Enter')
		await page.evaluate(
			() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
		)
		assert.equal(await page.locator('html').getAttribute('data-switch-count'), '1')
		const origin = await page.locator('#layout').evaluate(el => el.scrollTop)
		let index = 0
		/** @type {unknown[]} */
		const focusEvents = []

		if (scenario.kind === 'retry') {
			await page.evaluate(
				() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
			)
			await control({ command: 'settle', index, outcome: 'reject' })
			const error = page.getByRole('dialog', { name: 'Error', exact: true })

			await error.waitFor()
			assert.ok(
				(await error.getByRole('alert').textContent()).includes('Controlled switch rejection'),
			)
			assert.equal(await page.locator('dialog:modal').count(), 2)
			assert.equal((await readDispatches(page)).length, 0)
			focusEvents.push(
				await checkModalLifecycle(
					page,
					'Error',
					parent.getByRole('button', { name: 'Switch to Mainnet', exact: true }),
					origin,
					'escape',
					1,
				),
			)
			const retry = parent.getByRole('button', { name: 'Switch to Mainnet', exact: true })

			assert.ok(await retry.evaluate(el => el === document.activeElement))
			await page.keyboard.press('Enter')
			index = 1
			await page.waitForFunction(() => document.documentElement.dataset.switchCount === '2')
		}

		await control({ command: 'settle', index, outcome: 'success' })
		await page.clock.runFor(1000)
		await page.getByRole('button', { name: 'Transaction Sent ✓', exact: true }).waitFor()
		await page.clock.runFor(1000)
		const dispatches = await readDispatches(page)

		assert.equal(dispatches.length, 1)
		checkDispatchPayload(dispatches[0], scenario.transaction)
		assert.equal(
			await page.getByRole('button', { name: 'Transaction Sent ✓', exact: true }).isDisabled(),
			false,
		)
		assert.equal(await page.getByRole('alert').count(), 0)
		assert.equal(await page.locator('dialog:modal').count(), 0)
		reports.push({ ...scenario, dispatches, focusEvents })
	}
	assert.equal(reports.length, 3)

	return reports
}

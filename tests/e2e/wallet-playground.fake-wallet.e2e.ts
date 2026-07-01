import { expect, type Page, test } from '@playwright/test'

const account = '0x1234567890abcdef1234567890abcdef12345678'
const chainId = '0x1'
const hash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const signature =
	'0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const batchId = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'

const installFakeWallet = async (page: Page): Promise<void> => {
	await page.addInitScript(
		({ account, batchId, chainId, hash, signature }) => {
			type Listener = (value?: unknown) => void

			const listeners = new Map<string, Set<Listener>>()
			let connected = false
			let currentChainId = chainId

			const emit = (event: string, value?: unknown): void => {
				for (const listener of listeners.get(event) ?? []) {
					listener(value)
				}
			}

			const provider = {
				on(event: string, listener: Listener): void {
					const eventListeners = listeners.get(event) ?? new Set<Listener>()

					eventListeners.add(listener)
					listeners.set(event, eventListeners)
				},
				once(event: string, listener: Listener): void {
					const wrapped = (value?: unknown): void => {
						provider.removeListener(event, wrapped)
						listener(value)
					}

					provider.on(event, wrapped)
				},
				removeListener(event: string, listener: Listener): void {
					listeners.get(event)?.delete(listener)
				},
				removeAllListeners(event?: string): void {
					if (event === undefined) {
						listeners.clear()
					} else {
						listeners.delete(event)
					}
				},
				async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
					await Promise.resolve()

					if (args.method === 'eth_accounts') {
						return connected ? [account] : []
					}

					if (args.method === 'eth_requestAccounts') {
						connected = true
						queueMicrotask(() => emit('connect', { chainId: currentChainId }))

						return [account]
					}

					if (args.method === 'eth_chainId') {
						return currentChainId
					}

					if (args.method === 'wallet_switchEthereumChain') {
						const [request] = args.params ?? []

						if (request && typeof request === 'object' && 'chainId' in request) {
							currentChainId = String(request.chainId)
							emit('chainChanged', currentChainId)
						}

						return null
					}

					if (args.method === 'eth_sendTransaction') {
						return hash
					}

					if (args.method === 'personal_sign' || args.method === 'eth_sign') {
						return signature
					}

					if (args.method === 'eth_signTypedData_v4') {
						return signature
					}

					if (args.method === 'wallet_getCapabilities') {
						return {
							[currentChainId]: {
								atomicBatch: { supported: true },
								wallet_sendCalls: { supportedVersions: ['2.0.0'] },
							},
						}
					}

					if (args.method === 'wallet_sendCalls') {
						return { id: batchId }
					}

					if (args.method === 'wallet_getCallsStatus') {
						return {
							status: 200,
							atomic: true,
							receipts: [
								{
									status: '0x1',
									transactionHash: hash,
									chainId: currentChainId,
								},
							],
						}
					}

					if (args.method === 'wallet_showCallsStatus') {
						return null
					}

					if (args.method === 'wallet_connect') {
						return {
							accounts: [{ address: account, type: 'eip155:eoa' }],
						}
					}

					throw new Error(`Unsupported fake wallet method: ${args.method}`)
				},
			}

			const detail = {
				info: {
					uuid: 'walletbeat-fake-wallet',
					name: 'Walletbeat Fake Wallet',
					icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
					rdns: 'dev.walletbeat.fake',
				},
				provider,
			}
			const announce = (): void => {
				window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail }))
			}

			Object.defineProperty(window, 'ethereum', {
				configurable: true,
				value: provider,
			})
			Object.defineProperty(window, '__walletbeatFakeProviderDetail', {
				configurable: true,
				value: detail,
			})
			window.addEventListener('eip6963:requestProvider', announce)
			queueMicrotask(announce)
		},
		{ account, batchId, chainId, hash, signature },
	)
}

test.beforeEach(async ({ page }) => {
	await installFakeWallet(page)
	await page.goto('/test/', { waitUntil: 'domcontentloaded' })
	await page.reload({ waitUntil: 'domcontentloaded' })
	await page.evaluate(() => {
		window.dispatchEvent(new Event('eip6963:requestProvider'))
	})
})

const runAction = async (page: Page, action: string): Promise<void> => {
	const button = page.locator(`[data-action="${action}"]:visible`)

	await expect(button).toBeEnabled()
	await button.evaluate(element => {
		if (!(element instanceof HTMLElement)) {
			throw new Error('Expected an action button')
		}

		element.click()
	})
}

const openDetails = async (page: Page, selector: string): Promise<void> => {
	const details = page.locator(selector)

	if (selector.includes('data-tab=')) {
		await details.locator('> summary').click()
	} else {
		await details.locator('> summary').evaluate(element => {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Expected a summary element')
			}

			element.click()
		})
	}

	await expect(details).toHaveJSProperty('open', true)

	const tabMatch = /data-tab="([^"]+)"/.exec(selector)

	if (tabMatch?.[1]) {
		await expect(
			page.locator(`[data-tab-panel][data-tab="${tabMatch[1]}"] [data-playground-detail]`),
		).toBeVisible()
	}
}

test('wallet playground native implementation exercises all sections', async ({ page }) => {
	await expect(page.locator('[data-tabs="scroll-inline"] > details[data-tab]')).toHaveCount(7)
	await expect(page.locator('[data-tabs="scroll-inline"] > details > summary')).toHaveCount(7)
	await expect(
		page.locator('[data-tabs="scroll-inline"] > details > [data-tab-panel]'),
	).toHaveCount(7)
	await expect(page.locator('[data-tabs="scroll-inline"]')).not.toHaveAttribute('role', /tablist/)
	await expect(page.locator('[data-account-status]')).toContainText('1 wallet provider(s) found')

	await runAction(page, 'connect')
	await expect(page.getByText('Connected as 0x1234...5678 on chain 1')).toBeVisible()

	await page.getByRole('button', { name: 'Choose wallet' }).click()
	await expect(page.locator('#provider-dialog')).toHaveJSProperty('open', true)
	await expect(
		page.getByRole('button', { name: 'Walletbeat Fake Wallet dev.walletbeat.fake Selected' }),
	).toBeVisible()
	await page.locator('#provider-dialog').getByRole('button', { name: 'Close' }).click()

	await runAction(page, 'send-transaction')
	await expect(page.getByText('Transaction Hash')).toBeVisible()
	await expect(page.getByText(hash)).toBeVisible()

	await openDetails(page, 'details[data-tab="signatures"]')
	await runAction(page, 'sign')
	await expect(page.locator('dt').filter({ hasText: /^Signature$/ })).toBeVisible()
	await expect(page.getByText(signature)).toBeVisible()

	await openDetails(page, 'details[data-tab="eip-support"]')

	for (let step = 1; step <= 6; step += 1) {
		await runAction(page, 'run-eip-step')
		await expect(page.getByText(`${step}/6 steps`)).toBeVisible()
	}
	await expect(page.locator('#eip-results-dialog')).toHaveJSProperty('open', true)
	await page.locator('#eip-results-dialog').getByRole('button', { name: 'Close' }).click()

	await openDetails(page, 'details[data-tab="app-isolation"]')
	await runAction(page, 'run-app-isolation')
	await expect(page.locator('dt').filter({ hasText: /^Response$/ })).toBeVisible()
	await expect(
		page.locator('details[data-tab="app-isolation"] [data-playground-detail] code').filter({
			hasText: account,
		}),
	).toBeVisible()
	await openDetails(page, 'details[data-nav-item="wallet-connect"]')
	await runAction(page, 'run-app-isolation')
	await expect(page.getByText('eip155:eoa')).toBeVisible()

	await openDetails(page, 'details[data-tab="tx-simulations"]')
	await openDetails(page, 'details[data-nav-item="erc20-transfer"]')
	await page.locator('[data-simulation-field="erc20To"]').fill(account)
	await runAction(page, 'send-transaction')
	await expect(page.locator('code:visible').filter({ hasText: hash })).toBeVisible()

	await openDetails(page, 'details[data-tab="scam-alerts"]')
	await page
		.locator('details[data-tab="scam-alerts"] [data-scam-disclaimer-checkbox]:visible')
		.evaluate(element => {
			if (!(element instanceof HTMLInputElement)) {
				throw new Error('Expected a scam disclaimer checkbox')
			}

			element.checked = true
			element.dispatchEvent(new Event('change', { bubbles: true }))
		})
	await expect(page.getByText('Risk Type')).toBeVisible()

	await openDetails(page, 'details[data-tab="erc-8213"]')
	await runAction(page, 'digest-calldata')
	await expect(page.locator('dt').filter({ hasText: /^Calldata digest$/ })).toBeVisible()
	await openDetails(page, 'details[data-nav-item="eip712"]')
	await runAction(page, 'digest-eip712')
	await expect(page.locator('dt').filter({ hasText: /^Domain separator$/ })).toBeVisible()
	await expect(page.locator('dt').filter({ hasText: /^Full EIP-712 digest$/ })).toBeVisible()

	await expect(page.locator('[data-playground-detail]:visible pre > code').first()).toBeVisible()
})

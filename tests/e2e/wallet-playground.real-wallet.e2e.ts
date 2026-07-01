import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { chromium, expect, test } from '@playwright/test'

const extensionPath = process.env.WALLET_EXTENSION_PATH
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4321'

test.describe('wallet playground with a real wallet extension', () => {
	test.skip(
		extensionPath === undefined,
		'Set WALLET_EXTENSION_PATH to an unpacked Chromium wallet extension directory.',
	)

	test('discovers an unpacked extension provider through EIP-6963', async () => {
		if (extensionPath === undefined) {
			throw new Error('WALLET_EXTENSION_PATH is required')
		}

		if (!fs.existsSync(path.join(extensionPath, 'manifest.json'))) {
			throw new Error(`WALLET_EXTENSION_PATH must contain manifest.json: ${extensionPath}`)
		}

		const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walletbeat-wallet-extension-'))
		const context = await chromium.launchPersistentContext(userDataDir, {
			channel: 'chromium',
			headless: false,
			args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
		})

		try {
			let [serviceWorker] = context.serviceWorkers()

			serviceWorker ??= await context.waitForEvent('serviceworker', { timeout: 30_000 })

			const extensionId = serviceWorker.url().split('/')[2]

			expect(extensionId).toBeTruthy()

			const page = await context.newPage()

			await page.goto(`${baseUrl}/test/`)
			await expect(page.locator('[data-account-status]')).not.toContainText(
				'Finding wallet providers',
			)
			await expect(page.locator('[data-provider-list], [data-account-status]')).toContainText(
				/wallet provider|wallet|provider/i,
			)
		} finally {
			await context.close()
			fs.rmSync(userDataDir, { recursive: true, force: true })
		}
	})
})

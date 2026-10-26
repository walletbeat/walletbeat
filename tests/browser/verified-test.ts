import { expect, test as base } from '@playwright/test'

import { sourceSnapshot, verifyServerSource } from './fixtures/source-snapshot.mjs'

type Source = Awaited<ReturnType<typeof sourceSnapshot>>

export { expect }
export const test = base.extend<Record<never, never>, { source: Source }>({
	page: async ({ page, source, browser, browserName }, use, info) => {
		await info.attach('capture-browser', {
			body: JSON.stringify({
				name: browserName,
				version: browser.version(),
				requestedExecutable: info.project.use.launchOptions?.executablePath ?? null,
				channel: info.project.use.channel ?? null,
			}),
			contentType: 'application/json',
		})
		await info.attach('capture-source', {
			body: JSON.stringify(source, null, 2),
			contentType: 'application/json',
		})
		const errors: string[] = []
		const onPageError = (error: Error) => errors.push(error.message)
		const onConsole = (message: import('@playwright/test').ConsoleMessage) => {
			if (message.type() === 'error') {
				errors.push(message.text())
			}
		}

		page.on('pageerror', onPageError)
		page.on('console', onConsole)
		await use(page)
		page.off('pageerror', onPageError)
		page.off('console', onConsole)
		expect(
			errors,
			'The complete page journey must have no browser runtime or console errors',
		).toEqual([])
	},
	source: [
		async ({}, use, info) => {
			const baseURL = info.project.use.baseURL

			if (!baseURL) {
				throw new Error('WalletPage verification requires a base URL')
			}

			const source = await sourceSnapshot()

			await verifyServerSource(baseURL, source)
			await use(source)
			expect(
				await sourceSnapshot(),
				'Source must remain unchanged throughout the worker capture batch',
			).toEqual(source)
		},
		{ auto: true, scope: 'worker' },
	],
})

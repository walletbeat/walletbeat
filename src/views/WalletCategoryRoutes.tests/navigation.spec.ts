import type { Page } from '@playwright/test'

import { SortDirection } from '@/components/table-sort'
import { walletSummaryHref } from '@/views/wallet-table-navigation'

import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [1280, 390]) {
	for (const javaScriptEnabled of [false, true]) {
		test.describe(`category navigation at ${width}, JavaScript ${javaScriptEnabled}`, () => {
			test.use({ viewport: { width, height: 900 }, javaScriptEnabled })

			test('native family links retain keyboard, modified activation and history', async ({
				page,
				context,
			}) => {
				await page.goto('/wallet/summary/')
				const hardware = page.locator('#nav a[href="/hww/summary/"]')

				if (!(await hardware.isVisible())) {
					await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click()
				}

				await hardware.focus()
				await expect(hardware).toBeFocused()
				await hardware.press('Enter')
				await expect(page).toHaveURL(url => url.pathname === '/hww/summary/')
				await expect(page.locator('main h2').first()).toHaveText('Hardware Wallets')
				await page.goBack()
				await expect(page).toHaveURL(url => url.pathname === '/wallet/summary/')
				await page.goForward()
				await expect(page).toHaveURL(url => url.pathname === '/hww/summary/')

				const software = page.locator('#nav a[href="/wallet/summary/"]')

				if (!(await software.isVisible())) {
					await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click()
				}

				const errors: string[] = []
				const observeTab = (tab: Page) => {
					tab.on('pageerror', error => errors.push(error.message))
					tab.on('console', message => {
						if (message.type() === 'error') {
							errors.push(message.text())
						}
					})
				}

				context.on('page', observeTab)
				let tab: Page | undefined

				try {
					const opened = context.waitForEvent('page')

					await software.click({ modifiers: ['ControlOrMeta'] })
					tab = await opened
					await tab.waitForURL(url => url.pathname === '/wallet/summary/')
					await expect(tab.locator('#software-wallets')).toHaveCount(1)

					if (javaScriptEnabled) {
						await expect(tab.locator('astro-island[ssr]:has(#software-wallets)')).toHaveCount(0)
					}

					await expect(page).toHaveURL(url => url.pathname === '/hww/summary/')
				} finally {
					context.off('page', observeTab)
					await tab?.close()
				}

				expect(
					errors,
					'The opened tab journey must have no browser runtime or console errors',
				).toEqual([])
			})

			test('a real wallet link retains report and fragment precedence across history', async ({
				page,
			}) => {
				await page.goto('/wallet/summary/')
				const wallet = page.locator('.wallet-table tbody tr:not([data-disabled]) h3 a').first()
				const href = await wallet.getAttribute('href')

				if (!href) {
					throw new Error('A rendered wallet needs a report destination')
				}

				await wallet.click()
				await expect(page).toHaveURL(new URL(href, page.url()).href)
				await expect(page.locator('#top')).toHaveCount(1)
				const fragment = page.locator('#wallet-toc a[href*="#"]').first()
				const destination = await fragment.getAttribute('href')

				if (!destination) {
					throw new Error('A wallet report needs a native attribute destination')
				}

				const deepLink = new URL(destination, page.url())

				deepLink.searchParams.set('routeWitness', 'native')
				await page.goto(deepLink.href)
				await expect(page).toHaveURL(deepLink.href)
				await expect(page.locator('#top')).toHaveCount(1)
				await expect(
					page.locator(`[id="${decodeURIComponent(deepLink.hash.slice(1))}"]`),
				).toHaveCount(1)
				await page.goBack()
				await expect(page).toHaveURL(new URL(href, page.url()).href)
				await page.goBack()
				await expect(page).toHaveURL(url => url.pathname === '/wallet/summary/')
				await page.goForward()
				await expect(page.locator('#top')).toHaveCount(1)
			})
		})
	}
}

for (const width of [1280, 390]) {
	test.describe(`native summary documents at ${width}`, () => {
		test.use({ viewport: { width, height: 900 }, javaScriptEnabled: false })

		test('filter anchors and sort forms preserve selection through keyboard and history', async ({
			page,
		}) => {
			const sort = { columnId: 'wallet', direction: SortDirection.Ascending }
			const selectedPath = walletSummaryHref('/wallet/summary/', '', sort)

			if (!selectedPath) {
				throw new Error('A native stage/sort choice needs a destination')
			}

			await page.goto('/wallet/summary/')
			const walletSort = page.getByRole('button', { name: 'Sort by Wallet', exact: true })

			await walletSort.focus()
			await walletSort.press('Enter')
			await expect(page).toHaveURL(
				url =>
					url.pathname === walletSummaryHref('/wallet/summary/', 'stage-qualified', sort) &&
					url.hash === '#software-wallets-sort-wallet',
			)
			const sortedUrl = page.url()

			if (width >= 768) {
				await page.locator('thead th[data-table-column="stage"] .filter-trigger').click()
			}

			const all = page.locator('[data-filter-set="stageStatus"] a[data-filter-choice="all"]')

			await expect(all).toHaveAttribute('href', selectedPath)
			await all.focus()
			await all.press('Enter')
			await expect(page).toHaveURL(
				url => url.pathname === selectedPath && url.search === '' && url.hash === '',
			)
			await expect(
				page.locator('[data-filter-set="stageStatus"] a[aria-current="page"]'),
			).toHaveAttribute('data-filter-choice', 'all')
			await expect(page.locator('thead th[data-table-column="wallet"]')).toHaveAttribute(
				'aria-sort',
				'ascending',
			)
			await page.goBack()
			await expect(page).toHaveURL(sortedUrl)
			await expect(
				page.locator('[data-filter-set="stageStatus"] a[aria-current="page"]'),
			).toHaveAttribute('data-filter-choice', 'stage-qualified')
			await page.goForward()
			await expect(page).toHaveURL(url => url.pathname === selectedPath)
			await expect(
				page.locator('[data-filter-set="stageStatus"] a[aria-current="page"]'),
			).toHaveAttribute('data-filter-choice', 'all')
		})
	})
}

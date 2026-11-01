import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { isRecord } from '@/types/utils/record'
import { SortDirection } from '@/components/table-sort'
import { walletSummaryHref, walletSummarySortChoices } from '@/views/wallet-table-navigation'
import { stageQualificationChoices } from '@/views/wallet-table-stage'

import { expect, test } from '../../../tests/browser/verified-test'

let categories: { path: string; names: string[] }[] = []

test.beforeAll(async () => {
	const { stdout } = await promisify(execFile)(
		process.execPath,
		['--import', 'tsx', fileURLToPath(new URL('./category-paths.mjs', import.meta.url))],
		{ cwd: fileURLToPath(new URL('../../../', import.meta.url)), timeout: 30000 },
	)
	const paths: unknown = JSON.parse(stdout)

	if (!Array.isArray(paths)) {
		throw new Error('Category projection must be an array')
	}

	categories = paths.map((category: unknown) => {
		if (
			!isRecord(category) ||
			typeof category.path !== 'string' ||
			!Array.isArray(category.names) ||
			!category.names.every((name: unknown) => typeof name === 'string')
		) {
			throw new Error('Category projection needs a path and wallet names')
		}

		return { path: category.path, names: category.names }
	})
})

for (const width of [1280, 390]) {
	for (const javaScriptEnabled of [false, true]) {
		test.describe(`category routes at ${width}, JavaScript ${javaScriptEnabled}`, () => {
			test.use({ viewport: { width, height: 900 }, javaScriptEnabled })

			test('native summary routes retain initial stage, sort, identity and hydration', async ({
				page,
			}) => {
				for (const stage of stageQualificationChoices) {
					for (const { sort } of walletSummarySortChoices) {
						const href = walletSummaryHref('/wallet/summary/', stage.id, sort)

						if (href === undefined) {
							throw new Error('A declared summary choice must have a native destination')
						}

						await page.goto(href)
						const island = page.locator('main astro-island[component-url*="SoftwareWalletTable"]')

						await expect(island).toHaveCount(1)
						await expect(island).toHaveAttribute('client', 'load')

						if (javaScriptEnabled) {
							await expect(island).not.toHaveAttribute('ssr', '')
						}

						await expect(page.locator('#software-wallets')).toHaveCount(1)

						if (javaScriptEnabled) {
							await expect(
								page.locator('[data-filter-set="stageStatus"] input:checked'),
							).toHaveValue(stage.id)
						} else {
							const selectedStage = page.locator(
								'[data-filter-set="stageStatus"] a[aria-current="page"]',
							)

							await expect(selectedStage).toHaveAttribute('href', href)
							await expect(selectedStage).toHaveAttribute('data-filter-choice', stage.id || 'all')
						}

						await expect(
							page.locator(`thead th[data-table-column="${sort?.columnId ?? 'overall'}"]`),
						).toHaveAttribute(
							'aria-sort',
							sort?.direction === SortDirection.Ascending ? 'ascending' : 'descending',
						)
						await expect(
							page.locator('#nav a[href="/wallet/summary/"][aria-current="page"]'),
						).toHaveCount(1)
						await expect(
							page.getByRole('button', { name: 'Sort by Wallet', exact: true }),
						).toHaveAttribute('id', 'software-wallets-sort-wallet')
					}
				}
			})

			test('category families retain attached content and the layout scroll owner', async ({
				page,
			}) => {
				for (const { path, names } of categories) {
					await page.goto(path)
					const main = page.locator('main')
					const island = main.locator('astro-island[component-url*="WalletTable"]')

					await expect(main).toHaveAttribute('data-scroll-item', 'inline-attached')
					await expect(island).toHaveCount(1)
					await expect(island).toHaveAttribute('client', 'load')

					if (javaScriptEnabled) {
						await expect(island).not.toHaveAttribute('ssr', '')
					}

					await expect
						.poll(() =>
							main
								.locator('.wallet-table tbody tr h3')
								.allTextContents()
								.then(values => values.map(value => value.trim()).toSorted()),
						)
						.toEqual(names)

					if (!path.endsWith('/summary/')) {
						continue
					}

					const layout = page.locator('#layout')

					await main.hover({ position: { x: 20, y: 20 } })
					const vertical = await layout.evaluate(element => ({
						before: element.scrollTop,
						maximum: element.scrollHeight - element.clientHeight,
					}))

					const tableExceedsViewport = await main.locator('.wallet-table table').evaluate(table => {
						const root = document.getElementById('layout')

						if (root === null) {
							throw new Error('Category content needs its layout scroll owner')
						}

						return table.getBoundingClientRect().height > root.clientHeight + 1
					})

					if (tableExceedsViewport) {
						expect(vertical.maximum).toBeGreaterThan(1)
					}

					if (vertical.maximum > vertical.before + 1) {
						await page.mouse.wheel(0, Math.min(350, vertical.maximum - vertical.before))
						await expect
							.poll(() => layout.evaluate(element => element.scrollTop))
							.toBeGreaterThan(vertical.before)
					}

					await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0)
					await main.hover({ position: { x: 20, y: 20 } })
					const horizontal = await layout.evaluate(element => ({
						before: element.scrollLeft,
						maximum: element.scrollWidth - element.clientWidth,
					}))

					if (horizontal.maximum > horizontal.before + 1) {
						await page.mouse.wheel(Math.min(350, horizontal.maximum - horizontal.before), 0)
						await expect
							.poll(() => layout.evaluate(element => element.scrollLeft))
							.toBeGreaterThan(horizontal.before)
					}

					await expect.poll(() => main.evaluate(element => element.scrollLeft)).toBe(0)
				}
			})
		})
	}
}

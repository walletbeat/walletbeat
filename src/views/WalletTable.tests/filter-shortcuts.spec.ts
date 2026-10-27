import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type { Page } from '@playwright/test'

import { isRecord } from '@/types/utils/record'

import { expect, test } from '../../../tests/browser/verified-test'

let allNames: string[] = []
let qualifiedNames: string[] = []
let unqualifiedNames: string[] = []

const stringArray = (value: unknown): string[] => {
	if (!Array.isArray(value) || !value.every((name: unknown) => typeof name === 'string')) {
		throw new Error('Qualification names must be arrays of strings')
	}

	return value
}

test.beforeAll(async () => {
	const { stdout } = await promisify(execFile)(
		process.execPath,
		['--import', 'tsx', fileURLToPath(new URL('./qualification-names.mjs', import.meta.url))],
		{ cwd: fileURLToPath(new URL('../../../', import.meta.url)), timeout: 30000 },
	)
	const names: unknown = JSON.parse(stdout)

	if (!isRecord(names)) {
		throw new Error('Invalid qualification name projection')
	}

	allNames = stringArray(names.allNames)
	qualifiedNames = stringArray(names.qualifiedNames)
	unqualifiedNames = stringArray(names.unqualifiedNames)
})

const expectMatching = async (page: Page, names: string[]) => {
	await expect(page.locator('[data-layout-transition], [data-view-transition-active]')).toHaveCount(
		0,
	)
	await expect
		.poll(async () =>
			page
				.locator('.wallet-table tbody tr:not([data-disabled])')
				.evaluateAll(rows =>
					rows.map(row => row.querySelector('h3')?.textContent?.trim()).toSorted(),
				),
		)
		.toEqual(names)
	await expect(page.locator('.wallet-table tbody tr')).toHaveCount(allNames.length)
	expect(
		await page
			.locator('.wallet-table tbody tr')
			.evaluateAll(rows =>
				rows.every(
					row =>
						getComputedStyle(row).display !== 'none' &&
						getComputedStyle(row).visibility !== 'hidden',
				),
			),
	).toBe(true)
}

for (const width of [1280, 390]) {
	test.describe(`wallet qualification shortcuts at ${width}`, () => {
		test.use({ viewport: { width, height: 900 } })

		test('row shortcuts, neutral selection and scoped reset share the qualification state', async ({
			page,
		}) => {
			await page.goto('/wallet/summary/')
			await expect(page.getByRole('button', { name: 'Sort by Wallet', exact: true })).toBeEnabled()
			await expectMatching(page, qualifiedNames)
			const shortcut = page.getByRole('button', { name: 'Filter by No Stage', exact: true }).first()

			if (unqualifiedNames.length === 0) {
				await expect(shortcut).toHaveCount(0)

				return
			}

			const qualification = page.locator('[data-filter-set="stageStatus"]')

			await shortcut.focus()
			await shortcut.press('Enter')
			await expectMatching(page, unqualifiedNames)
			await expect(shortcut).toBeFocused()
			await expect(qualification.locator('input[value="stage-unqualified"]')).toBeChecked()
			await expect(page.locator('[data-filter-set="stage"] input:checked')).toHaveCount(0)
			await shortcut.press('Enter')
			await expectMatching(page, allNames)
			await expect(shortcut).toBeFocused()
			await expect(qualification.locator('input[value=""]')).toBeChecked()

			if (width >= 768) {
				await page.locator('thead th[data-table-column="stage"] .filter-trigger').click()
			}

			await qualification
				.locator('xpath=ancestor::form')
				.locator('button[data-reset]')
				.filter({ visible: true })
				.click()
			await expectMatching(page, qualifiedNames)
			await expect(qualification.locator('input[value="stage-qualified"]')).toBeChecked()
		})

		test.describe('without JavaScript', () => {
			test.use({ javaScriptEnabled: false })

			test('keeps the native table and marks row filtering as unavailable', async ({ page }) => {
				await page.goto('/wallet/summary/')
				await expectMatching(page, qualifiedNames)
				await expect(
					page.getByRole('button', { name: 'Sort by Wallet', exact: true }),
				).toBeDisabled()

				if (unqualifiedNames.length > 0) {
					await expect(
						page.getByRole('button', { name: 'Filter by No Stage', exact: true }).first(),
					).toBeDisabled()
				}
			})
		})
	})
}

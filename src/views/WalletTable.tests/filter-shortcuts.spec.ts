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
	const rows = await page.locator('.wallet-table tbody tr').evaluateAll(rows =>
		rows.map(row => {
			const style = getComputedStyle(row)
			const paint = row.querySelector('.wallet-info .wallet-icon')
			const filter = paint ? getComputedStyle(paint).filter : ''
			const grayscale = /grayscale\(([\d.]+)(%)?\)/u.exec(filter)
			const opacity = /opacity\(([\d.]+)(%)?\)/u.exec(filter)

			return {
				name: row.querySelector('h3')?.textContent?.trim(),
				disabled: row.hasAttribute('data-disabled'),
				rendered:
					style.display !== 'none' &&
					style.visibility !== 'hidden' &&
					row.getBoundingClientRect().height > 0,
				muted:
					grayscale !== null &&
					Number(grayscale[1]) > 0 &&
					opacity !== null &&
					Number(opacity[1]) > 0 &&
					Number(opacity[1]) / (opacity[2] ? 100 : 1) < 1,
			}
		}),
	)

	expect(rows.map(row => row.name).toSorted()).toEqual(allNames)
	expect(rows.map(row => row.disabled)).toEqual([
		...Array<boolean>(names.length).fill(false),
		...Array<boolean>(allNames.length - names.length).fill(true),
	])
	expect(rows.every(row => row.rendered)).toBe(true)
	expect(rows.filter(row => row.disabled).every(row => row.muted)).toBe(true)
}

const showQualification = async (page: Page) => {
	const qualification = page.locator('[data-filter-set="stageStatus"]')
	const choice = qualification.locator(
		'input[value="stage-unqualified"], a[data-filter-choice="stage-unqualified"]',
	)

	if (!(await choice.isVisible())) {
		await page.locator('thead th[data-table-column="stage"] .filter-trigger').click()
	}

	await expect(choice).toBeVisible()

	return qualification
}

const expectQualificationFocus = async (page: Page) => {
	await expect
		.poll(() =>
			page.evaluate(() => {
				const focus = document.activeElement

				if (!(focus instanceof HTMLElement)) {
					return false
				}

				const style = getComputedStyle(focus)
				const box = focus.getBoundingClientRect()

				return (
					focus.closest('th[data-table-column="stage"], [data-filter-set="stageStatus"]') !==
						null &&
					style.visibility === 'visible' &&
					style.display !== 'none' &&
					box.width > 0 &&
					box.height > 0 &&
					box.right > 0 &&
					box.bottom > 0 &&
					box.left < innerWidth &&
					box.top < innerHeight
				)
			}),
		)
		.toBe(true)
}

type WalletIdentity = { href: string; name: string }

const orderedWallets = (page: Page) =>
	page.locator('.wallet-table tbody tr').evaluateAll(rows =>
		rows.map(row => {
			const href = row.querySelector('.wallet-info h3 a')?.getAttribute('href')
			const name = row.querySelector('.wallet-info h3')?.textContent?.trim()

			if (!href || !name) {
				throw new Error('Every retained wallet needs its report identity')
			}

			return { href, name }
		}),
	)

const partitionWallets = (reference: WalletIdentity[], names: string[]) => {
	const matches = new Set(names)

	return [
		...reference.filter(wallet => matches.has(wallet.name)),
		...reference.filter(wallet => !matches.has(wallet.name)),
	]
}

const expectStablePartition = async (page: Page, reference: WalletIdentity[], names: string[]) => {
	expect(new Set(reference.map(wallet => wallet.href)).size).toBe(reference.length)
	expect(await orderedWallets(page)).toEqual(partitionWallets(reference, names))
}

const expectNativeDestination = (page: Page, path: string, id: string) =>
	expect(page).toHaveURL(
		url =>
			url.pathname === path &&
			url.searchParams.size === 0 &&
			decodeURIComponent(url.hash) === `#${id}`,
	)

const selectedForeignChoices = (page: Page) =>
	page
		.locator('.filter-popover:not([data-filter-kind="stage"]) input:checked')
		.evaluateAll(inputs =>
			inputs
				.map(input => {
					if (!(input instanceof HTMLInputElement)) {
						throw new Error('A filter choice must be an input')
					}

					const set = input.closest('[data-filter-set]')?.getAttribute('data-filter-set')

					if (!set) {
						throw new Error('A filter choice must belong to a filter set')
					}

					return `${set}:${input.value}`
				})
				.toSorted(),
		)

for (const width of [1280, 768, 390]) {
	test.describe(`wallet qualification and information at ${width}`, () => {
		test.use({ viewport: { width, height: 900 } })

		test('Stage explanations preserve filters while header choices own qualification', async ({
			page,
		}) => {
			await page.goto('/wallet/summary/')
			const sort = page.getByRole('button', { name: 'Sort by Wallet', exact: true })

			await expect(sort).toBeEnabled()
			await expect(sort).toHaveAttribute('type', 'button')
			await expect(
				page.locator('[data-filter-set="stageStatus"] input[value="stage-qualified"]'),
			).toBeEnabled()
			const initialUrl = page.url()

			await expectMatching(page, qualifiedNames)
			const initialOrder = await orderedWallets(page)
			const foreignChoices = await selectedForeignChoices(page)

			for (const walletName of [qualifiedNames[0], unqualifiedNames[0]].filter(
				(name): name is string => name !== undefined,
			)) {
				const row = page.locator('.wallet-table tbody tr').filter({
					has: page.getByRole('heading', {
						level: 3,
						name: walletName,
						exact: true,
						includeHidden: true,
					}),
				})
				const stageLink = row.getByRole('link', {
					name: `View ${walletName} stage explanation`,
					exact: true,
				})
				const stageNode = await stageLink.elementHandle()

				if (!stageNode) {
					throw new Error('Missing Stage information action')
				}

				await stageLink.press('Enter')
				const dialog = page.getByRole('dialog', { name: `${walletName} stage`, exact: true })

				await expect(dialog).toBeVisible()
				await expectMatching(page, qualifiedNames)
				expect(page.url()).toBe(initialUrl)
				await page.keyboard.press('Escape')
				await expect(dialog).not.toBeVisible()
				await expect(stageLink).toBeFocused()
				expect(
					await stageNode.evaluate(node => node.isConnected && document.activeElement === node),
				).toBe(true)
			}

			const qualification = await showQualification(page)
			const all = qualification.locator('input[value=""]')

			await all.press('Space')
			await expectMatching(page, allNames)
			const unfilteredOrder = await orderedWallets(page)

			expect(initialOrder).toEqual(partitionWallets(unfilteredOrder, qualifiedNames))
			const belowStage = qualification.locator('input[value="stage-unqualified"]')

			await expect(belowStage).toHaveAttribute('type', 'radio')
			await belowStage.press('Space')
			await expectMatching(page, unqualifiedNames)
			await expectStablePartition(page, unfilteredOrder, unqualifiedNames)
			await expect(belowStage).toBeChecked()
			await expect(belowStage).toBeFocused()
			await expect(page.locator('[data-filter-set="stage"] input:checked')).toHaveCount(0)
			await all.press('Space')
			await expectMatching(page, allNames)
			await expectStablePartition(page, unfilteredOrder, allNames)
			await expect(all).toBeChecked()
			await expect(all).toBeFocused()
			expect(page.url()).toBe(initialUrl)
			await qualification
				.locator('xpath=ancestor::form')
				.locator('button[data-reset]')
				.filter({ visible: true })
				.click()
			await expectMatching(page, qualifiedNames)
			await expectStablePartition(page, unfilteredOrder, qualifiedNames)
			await expect(qualification.locator('input[value="stage-qualified"]')).toBeChecked()
			expect(await selectedForeignChoices(page)).toEqual(foreignChoices)
		})

		test.describe('without JavaScript', () => {
			test.use({ javaScriptEnabled: false })

			test('native sorting and header qualification preserve the complete table', async ({
				page,
			}) => {
				await page.goto('/wallet/summary/')
				await expectMatching(page, qualifiedNames)
				const sort = page.getByRole('button', { name: 'Sort by Wallet', exact: true })

				await expect(sort).toBeEnabled()
				await sort.press('Space')
				await expectNativeDestination(
					page,
					'/wallet/summary/wallet-asc/',
					'software-wallets-sort-wallet',
				)
				await expect(sort).toBeFocused()
				await expectMatching(page, qualifiedNames)
				const qualifiedOrder = await orderedWallets(page)

				await expect(page.locator('thead th[data-table-column="wallet"]')).toHaveAttribute(
					'aria-sort',
					'ascending',
				)
				await expect(page.locator('thead button[aria-label="Expand"]').first()).toBeDisabled()

				const qualification = await showQualification(page)

				for (const reset of await qualification
					.locator('xpath=ancestor::form')
					.locator('button[data-reset]')
					.all()) {
					await expect(reset).toBeDisabled()
				}
				await qualification.locator('a[data-filter-choice="stage-unqualified"]').press('Enter')
				await expect(page).toHaveURL(
					url =>
						url.pathname === '/wallet/summary/below-stage-0/wallet-asc/' &&
						url.searchParams.size === 0,
				)
				await expectMatching(page, unqualifiedNames)
				const belowStageOrder = await orderedWallets(page)

				await expectQualificationFocus(page)
				await showQualification(page)
				await qualification.locator('a[data-filter-choice="all"]').press('Enter')
				await expect(page).toHaveURL(
					url => url.pathname === '/wallet/summary/all/wallet-asc/' && url.searchParams.size === 0,
				)
				await expectMatching(page, allNames)
				const unfilteredOrder = await orderedWallets(page)

				expect(qualifiedOrder).toEqual(partitionWallets(unfilteredOrder, qualifiedNames))
				expect(belowStageOrder).toEqual(partitionWallets(unfilteredOrder, unqualifiedNames))
				await expectQualificationFocus(page)
				await sort.press('Enter')
				await expectNativeDestination(
					page,
					'/wallet/summary/all/wallet-desc/',
					'software-wallets-sort-wallet',
				)
				await expectMatching(page, allNames)
				await expect(sort).toBeFocused()
				const stageLink = page.locator('td[data-table-column="stage"] a').first()

				await expect(stageLink).not.toHaveAttribute('aria-haspopup', 'dialog')
				const href = await stageLink.getAttribute('href')

				if (!href) {
					throw new Error('Stage explanation needs a native destination')
				}

				const destination = new URL(href, page.url()).href

				await stageLink.press('Enter')
				await expect(page).toHaveURL(destination)
				await expect(page.locator('#stages')).toBeAttached()
			})
		})
	})
}

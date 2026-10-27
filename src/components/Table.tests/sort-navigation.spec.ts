import type { Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

const prefix = '/__table-sort-navigation/'
const states = [
	['default', 'attributes', 'descending', ['Birch', 'Cedar', 'Aster', 'Dune']],
	['attributes-asc', 'attributes', 'ascending', ['Aster', 'Cedar', 'Birch', 'Dune']],
	['stage-desc', 'stage', 'descending', ['Cedar', 'Aster', 'Birch', 'Dune']],
	['stage-asc', 'stage', 'ascending', ['Birch', 'Aster', 'Cedar', 'Dune']],
	['wallet-asc', 'wallet', 'ascending', ['Aster', 'Birch', 'Cedar', 'Dune']],
	['wallet-desc', 'wallet', 'descending', ['Dune', 'Cedar', 'Birch', 'Aster']],
] as const

async function assertState(page: Page, mode: (typeof states)[number][0]) {
	const state = states.find(state => state[0] === mode)

	if (!state) {
		throw new Error('Missing native sort oracle')
	}

	await expect(page.locator('table')).toHaveCount(1)
	await expect(page.locator('thead th[aria-sort]')).toHaveCount(1)
	await expect(page.locator('thead th[aria-sort]')).toHaveAttribute('data-table-column', state[1])
	await expect(page.locator('thead th[aria-sort]')).toHaveAttribute('aria-sort', state[2])
	await expect(page.locator('tbody tr td:first-child')).toHaveText([...state[3]])
	await expect(page.locator('tbody tr[data-disabled] td:first-child')).toHaveText(
		state[1] === 'wallet' ? [] : ['Dune'],
	)
}

test.describe('native sort documents', () => {
	test.use({ javaScriptEnabled: false })

	test('semantic order, native keyboard cycles, form ownership and serialization', async ({
		page,
	}) => {
		for (const [mode] of states) {
			await page.goto(`${prefix}${mode}/`)
			await assertState(page, mode)
			await expect(page.locator('table button')).toHaveCount(3)

			for (const button of await page.locator('table button').all()) {
				await expect(button).toBeEnabled()
				await expect(button).toHaveAttribute('type', 'submit')
				await expect(button).toHaveAttribute('form', 'sort-navigation-form')
			}
		}
		await page.goto(`${prefix}default/`)
		expect(
			await page.locator('form').evaluate(form => {
				if (!(form instanceof HTMLFormElement)) {
					throw new Error('Missing caller form')
				}

				return {
					valid: form.checkValidity(),
					height: form.getBoundingClientRect().height,
					focusable: form.querySelectorAll('input:not([type="hidden"]):not([disabled]), button')
						.length,
				}
			}),
		).toEqual({ valid: true, height: 0, focusable: 0 })

		for (const [name, key, mode] of [
			['Stage', 'Enter', 'stage-desc'],
			['Stage', 'Space', 'stage-asc'],
			['Stage', 'Enter', 'default'],
			['Wallet', 'Space', 'wallet-asc'],
			['Wallet', 'Enter', 'wallet-desc'],
			['Wallet', 'Space', 'default'],
			['Attributes', 'Enter', 'attributes-asc'],
			['Attributes', 'Space', 'default'],
		] as const) {
			const button = page.getByRole('button', { name: `Sort by ${name}`, exact: true })
			const id = await button.getAttribute('id')

			await button.focus()
			await button.press(key)
			await expect(page).toHaveURL(
				url =>
					url.pathname === `${prefix}${mode}/` &&
					url.search === '?witness=native' &&
					url.hash === `#${id}`,
			)
			await assertState(page, mode)
			await expect(page.getByRole('button', { name: `Sort by ${name}`, exact: true })).toBeFocused()
		}
	})

	test('missing targets fall back and ordinary consumers stay honest', async ({ page }) => {
		await page.goto(`${prefix}missing/`)
		await assertState(page, 'default')
		await expect(page.locator('table button')).toHaveCount(2)
		const attributes = page.getByRole('button', { name: 'Sort by Attributes', exact: true })
		const id = await attributes.getAttribute('id')

		await attributes.press('Enter')
		await expect(page).toHaveURL(
			url => url.pathname === `${prefix}attributes-asc/` && url.hash === `#${id}`,
		)
		await assertState(page, 'attributes-asc')
		await expect(
			page.getByRole('button', { name: 'Sort by Attributes', exact: true }),
		).toBeFocused()
		await page.goto(`${prefix}baseline/`)
		await assertState(page, 'default')
		await expect(page.locator('table button')).toHaveCount(3)

		for (const button of await page.locator('table button').all()) {
			await expect(button).toBeDisabled()
			await expect(button).toHaveAttribute('type', 'button')
			await expect(button).not.toHaveAttribute('form')
			await expect(button).not.toHaveAttribute('formaction')
		}
	})

	test('associated native constraints control submission', async ({ page }) => {
		await page.goto(`${prefix}default/`)
		const input = page.getByRole('textbox', { name: 'Required witness' })

		await page.locator('input[name="excluded"]').evaluate(input => {
			if (!(input instanceof HTMLInputElement)) {
				throw new Error('Missing constraint witness')
			}

			if (!input.form) {
				throw new Error('Missing caller form')
			}

			input.form.hidden = false
			input.hidden = false
			input.disabled = false
		})
		await page.getByRole('button', { name: 'Sort by Stage', exact: true }).press('Enter')
		await expect(page).toHaveURL(`${prefix}default/`)
		await expect(input).toBeFocused()
		await input.fill('ready')
		await page.getByRole('button', { name: 'Sort by Stage', exact: true }).press('Space')
		await expect(page).toHaveURL(
			url =>
				url.pathname === `${prefix}stage-desc/` &&
				url.searchParams.get('excluded') === 'ready' &&
				url.searchParams.get('witness') === 'native',
		)
		await assertState(page, 'stage-desc')
	})
})

test('hydration retains the initial request and original focused button, then resets to the global default', async ({
	page,
	request,
}) => {
	const path = `${prefix}stage-asc/`
	const response = await request.get(path)
	const component = (await response.text()).match(
		/component-url="([^"]*TableSortNavigation[^"]*)"/,
	)?.[1]

	if (!component) {
		throw new Error('Missing native sort fixture island')
	}

	let release: () => void = () => {}
	const gate = new Promise<void>(resolve => {
		release = resolve
	})
	let held = false

	await page.route(new URL(component, response.url()).href, async route => {
		held = true
		await gate
		await route.continue()
	})

	try {
		await page.goto(path, { waitUntil: 'commit' })
		await expect.poll(() => held).toBe(true)
		await assertState(page, 'stage-asc')
		const button = page.getByRole('button', { name: 'Sort by Stage', exact: true })

		await expect(button).toHaveAttribute('type', 'submit')
		const original = await button.elementHandle()

		await button.focus()
		release()
		await expect(button).toHaveAttribute('type', 'button')
		await assertState(page, 'stage-asc')
		expect(await button.evaluate((button, original) => button === original, original)).toBe(true)
		await expect(button).toBeFocused()
		await button.press('Enter')
		await assertState(page, 'default')
		await expect(page).toHaveURL(path)
		await button.press('Space')
		await assertState(page, 'stage-desc')
		await button.press('Enter')
		await assertState(page, 'stage-asc')
		await button.press('Space')
		await assertState(page, 'default')
		await expect(button).toBeFocused()
		await expect(page).toHaveURL(path)
	} finally {
		release()
	}
})

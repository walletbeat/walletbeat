import { expect, test } from '../../../tests/browser/verified-test'

test.use({ viewport: { width: 1280, height: 900 } })

for (const initial of [false, true]) {
	test(`native disclosure intent survives hydration from ${initial}`, async ({ page, request }) => {
		const response = await request.get('/__tooltip-hydration')

		expect(response.ok()).toBe(true)
		const html = await response.text()
		const component = html.match(/component-url="([^"]*TooltipHydration[^"]*)"/)?.[1]

		if (!component) {
			throw new Error('Missing disclosure fixture island')
		}

		const entry = new URL(component, response.url()).href
		let release: () => void = () => {}
		const gate = new Promise<void>(resolve => {
			release = resolve
		})
		let held = false

		await page.route(entry, async route => {
			held = true
			await gate
			await route.continue()
		})

		try {
			await page.goto('/__tooltip-hydration', { waitUntil: 'commit' })
			await expect.poll(() => held).toBe(true)
			const groupName = initial ? 'open' : 'closed'
			const group = page.locator(`[data-disclosure-group="${groupName}"]`)
			const details = group.locator('details')
			const selected = details.first()
			const body = await selected.locator(':scope > [popover]').elementHandle()
			const originalId = await selected.getAttribute('id')

			if (!originalId || !body) {
				throw new Error('Missing native disclosure identity')
			}

			for (const disclosure of await details.all()) {
				await expect(disclosure).toHaveJSProperty('open', initial)
			}
			await expect(details.last()).toHaveAttribute('id', `${groupName}-explicit`)
			await expect(selected).not.toHaveAttribute('data-tooltip-enhanced')
			await selected.locator(':scope > summary').focus()
			await expect(selected.locator(':scope > summary')).toBeFocused()
			await page.keyboard.press('Enter')
			await expect(selected).toHaveJSProperty('open', !initial)
			await expect(details.last()).toHaveJSProperty('open', initial)
			release()
			await expect(page.locator(`astro-island[component-url="${component}"]`)).not.toHaveAttribute(
				'ssr',
			)
			await expect(selected).toHaveAttribute('data-tooltip-enhanced', '')

			const assertGroup = async (open: boolean) => {
				for (const disclosure of await details.all()) {
					await expect(disclosure).toHaveJSProperty('open', open)
				}
				await expect(group.locator('output')).toHaveText(String(open))
				await expect(selected).toHaveAttribute('id', originalId)

				if (open) {
					await expect(selected.locator(':scope > [popover]')).toBeVisible()
				} else {
					await expect(selected.locator(':scope > [popover]')).toBeHidden()
				}

				expect(
					await selected.evaluate(
						(element, original) =>
							element.querySelector(':scope > [popover]') === original && original?.isConnected,
						body,
					),
				).toBe(true)
			}

			await assertGroup(!initial)
			const untouched = page.locator(
				`[data-disclosure-group="${initial ? 'closed' : 'open'}"] details`,
			)

			for (const disclosure of await untouched.all()) {
				await expect(disclosure).toHaveJSProperty('open', !initial)
			}
			await group.getByRole('button', { name: `Toggle ${groupName} group`, exact: true }).click()
			await assertGroup(initial)
			await selected.locator(':scope > summary').focus()
			await page.keyboard.press('Enter')
			await assertGroup(!initial)
		} finally {
			release()
		}
	})
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test.describe(`wallet disclosure ownership, motion ${reducedMotion}`, () => {
		test.use({ reducedMotion })

		test('independent wallet cells survive compact exclusivity and return to desktop', async ({
			page,
		}) => {
			await page.goto('/wallet/summary/')
			const row = page.locator('.wallet-table tbody > tr').first()
			const wallet = row.locator('td[data-table-column="displayName"] > details')
			const overall = row.locator('td[data-table-column="overall"] > details')
			const walletSummary = wallet.locator(':scope > summary')
			const overallSummary = overall.locator(':scope > summary')

			await walletSummary.scrollIntoViewIfNeeded()
			await expect(wallet).toHaveAttribute('data-tooltip-enhanced', '')
			await expect(overall).toHaveAttribute('data-tooltip-enhanced', '')
			const originalWallet = await wallet.elementHandle()
			const originalOverall = await overall.elementHandle()
			const originalBody = await overall.locator(':scope > [popover]').elementHandle()

			if (!originalWallet || !originalOverall || !originalBody) {
				throw new Error('Missing production wallet disclosure identities')
			}

			await walletSummary.press('Enter')
			await expect(wallet).toHaveJSProperty('open', true)
			await expect(overall).toHaveJSProperty('open', false)
			await overallSummary.press('Enter')
			await expect(wallet).toHaveJSProperty('open', true)
			await expect(overall).toHaveJSProperty('open', true)
			await page.mouse.move(0, 0)
			await page.setViewportSize({ width: 390, height: 900 })
			await expect(wallet).toHaveJSProperty('open', false)
			await expect(overall).toHaveJSProperty('open', true)
			await expect
				.poll(() =>
					overall
						.locator(':scope > [popover]')
						.evaluate(element => element.matches(':popover-open')),
				)
				.toBe(true)

			await walletSummary.press('Enter')
			await expect(wallet).toHaveJSProperty('open', true)
			await expect(overall).toHaveJSProperty('open', false)
			await overallSummary.press('Enter')
			await expect(wallet).toHaveJSProperty('open', false)
			await expect(overall).toHaveJSProperty('open', true)
			await page.keyboard.press('Escape')
			await expect(overall).toHaveJSProperty('open', false)

			await page.setViewportSize({ width: 1280, height: 900 })
			await walletSummary.press('Enter')
			await overallSummary.press('Enter')
			await expect(wallet).toHaveJSProperty('open', true)
			await expect(overall).toHaveJSProperty('open', true)
			expect(
				await wallet.evaluate(
					(element, original) => element === original && element.isConnected,
					originalWallet,
				),
			).toBe(true)
			expect(
				await overall.evaluate(
					(element, original) => element === original && element.isConnected,
					originalOverall,
				),
			).toBe(true)
			expect(
				await overall
					.locator(':scope > [popover]')
					.evaluate(
						(element, original) => element === original && element.isConnected,
						originalBody,
					),
			).toBe(true)
		})
	})
}

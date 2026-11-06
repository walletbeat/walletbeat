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
			const wallet = row.locator('td > details.wallet-info-details')
			const overall = row.locator('td[data-table-column="overall"] > details')
			const walletSummary = wallet.locator(':scope > summary')
			const overallSummary = overall.locator(':scope > summary')

			await expect(wallet).toHaveCount(1)
			await expect(overall).toHaveCount(1)
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

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test.describe(`compact native entry, motion ${reducedMotion}`, () => {
		test.use({ viewport: { width: 390, height: 900 }, reducedMotion })

		test('canceled compact opening restores the source and permits native retry', async ({
			page,
		}) => {
			await page.goto('/__tooltip-hydration')
			const disclosure = page.locator('#foreground-disclosure')
			const summary = disclosure.locator(':scope > summary')
			const body = disclosure.locator(':scope > [popover]')
			const content = body.locator('.expanded-content')

			await expect(disclosure).toHaveAttribute('data-tooltip-enhanced', '')
			const originalBody = await body.elementHandle()

			if (!originalBody) {
				throw new Error('Missing original disclosure body')
			}

			await body.evaluate(node => {
				node.setAttribute('data-cancel-native-entry', '')
				const cancelOpening = (event: Event) => {
					if (
						!(event instanceof ToggleEvent) ||
						event.newState !== 'open' ||
						!node.hasAttribute('data-cancel-native-entry')
					) {
						return
					}

					event.preventDefault()
					node.setAttribute('data-canceled-native-entry', '')
				}

				node.addEventListener('beforetoggle', cancelOpening)
			})
			await summary.press('Enter')
			await expect(body).toHaveAttribute('data-canceled-native-entry', '')
			await expect(disclosure).toHaveJSProperty('open', false)
			await expect.poll(() => body.evaluate(node => node.matches(':popover-open'))).toBe(false)
			await expect(body).toHaveJSProperty('inert', true)
			await expect(body).not.toBeVisible()
			await expect(summary).toBeFocused()
			await expect(content).not.toHaveAttribute('autofocus')
			await expect(content).not.toHaveAttribute('tabindex')

			await body.evaluate(node => node.removeAttribute('data-cancel-native-entry'))
			await summary.press('Space')
			await expect(content).toBeFocused()
			expect(await originalBody.evaluate(node => node.isConnected)).toBe(true)
			await page.keyboard.press('Escape')
			await expect(disclosure).toHaveJSProperty('open', false)
			await expect(summary).toBeFocused()
		})

		test('disclosure focus follows actual activation and native dismissal', async ({
			page,
			browser,
		}) => {
			await page.goto('/__tooltip-hydration')
			const disclosure = page.locator('#foreground-disclosure')
			const summary = disclosure.locator(':scope > summary')
			const body = disclosure.locator(':scope > [popover]')
			const content = body.locator('.expanded-content')
			const link = body.locator('[data-drawer-link]')
			const forward =
				process.platform === 'darwin' && browser.browserType().name() === 'webkit'
					? 'Alt+Tab'
					: 'Tab'

			await expect(disclosure).toHaveAttribute('data-tooltip-enhanced', '')
			const originalBody = await body.elementHandle()
			const originalContent = await content.elementHandle()

			if (!originalBody || !originalContent) {
				throw new Error('Missing original disclosure content')
			}

			await summary.locator('[data-foreground-summary]').click()
			await expect(content).toBeFocused()
			await expect(content).not.toHaveAttribute('autofocus')
			await page.keyboard.press(forward)
			await expect(link).toBeFocused()
			await page.keyboard.press('Escape')
			await expect(disclosure).toHaveJSProperty('open', false)
			await expect(summary).toBeFocused()
			await expect(body).toHaveJSProperty('inert', true)
			await expect(content).not.toHaveAttribute('tabindex')

			await page.keyboard.press('Space')
			await expect(content).toBeFocused()
			await page.keyboard.press('Escape')
			await expect(summary).toBeFocused()
			await expect(disclosure).toHaveJSProperty('open', false)
			expect(await originalBody.evaluate(node => node.isConnected)).toBe(true)
			expect(await originalContent.evaluate(node => node.isConnected)).toBe(true)

			await summary.evaluate(node => {
				document.addEventListener(
					'click',
					event => {
						if (!(event.target instanceof Node) || !node.contains(event.target)) {
							return
						}

						event.preventDefault()
						node.parentElement?.setAttribute('open', '')
					},
					{ once: true },
				)
			})
			await page.keyboard.press('Space')
			await expect(disclosure).toHaveJSProperty('open', true)
			await expect.poll(() => body.evaluate(node => node.matches(':popover-open'))).toBe(true)
			await expect(summary).toBeFocused()
			await expect(content).not.toHaveAttribute('autofocus')
		})
	})
}

for (const action of ['link', 'command', 'checkbox'] as const) {
	test(`foreground ${action} does not authorize programmatic drawer focus`, async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 900 })
		await page.goto('/__tooltip-hydration')
		const disclosure = page.locator('#foreground-disclosure')
		const summary = disclosure.locator(':scope > summary')
		const body = disclosure.locator(':scope > [popover]')

		await expect(disclosure).toHaveAttribute('data-tooltip-enhanced', '')
		await body.evaluate(node => {
			node.setAttribute('data-foreground-focus-count', '0')
			node.addEventListener('focusin', () => {
				node.setAttribute(
					'data-foreground-focus-count',
					String(Number(node.getAttribute('data-foreground-focus-count')) + 1),
				)
			})
		})
		await disclosure.evaluate(node => {
			node.addEventListener(
				'toggle',
				() => {
					if (node instanceof HTMLDetailsElement && node.open) {
						node.setAttribute('data-observed-open-toggle', '')
					}
				},
				{ once: true },
			)
		})
		await summary.evaluate(node => {
			document.addEventListener(
				'click',
				event => {
					if (!(event.target instanceof Node) || !node.contains(event.target)) {
						return
					}

					node.parentElement?.setAttribute('open', '')
				},
				{ once: true },
			)
		})
		const target =
			action === 'link'
				? summary.getByRole('link', { name: 'Foreground link', exact: true })
				: action === 'command'
					? summary.getByRole('button', { name: 'Foreground command', exact: true })
					: summary.getByRole('checkbox', { name: 'Foreground option' })

		await target.click()
		await expect(disclosure).toHaveJSProperty('open', true)
		await expect(disclosure).toHaveAttribute('data-observed-open-toggle', '')
		await expect(body).toHaveAttribute('data-foreground-focus-count', '0')
		await expect(body.locator('.expanded-content')).not.toHaveAttribute('autofocus')
	})
}

test('a canceled native hint opening restores its closed interaction and presentation', async ({
	page,
}) => {
	await page.goto('/__tooltip-hydration')
	const disclosure = page.locator('#foreground-disclosure')
	const body = disclosure.locator(':scope > [popover]')

	await expect(disclosure).toHaveAttribute('data-tooltip-enhanced', '')
	await body.evaluate(node => {
		node.setAttribute('data-canceled-open-count', '0')
		node.addEventListener('beforetoggle', event => {
			if (!(event instanceof ToggleEvent) || event.newState !== 'open') {
				return
			}

			event.preventDefault()
			node.setAttribute(
				'data-canceled-open-count',
				String(Number(node.getAttribute('data-canceled-open-count')) + 1),
			)
		})
	})
	await disclosure.locator('[data-foreground-summary]').hover()
	await expect
		.poll(async () => Number(await body.getAttribute('data-canceled-open-count')))
		.toBeGreaterThan(0)
	await page.mouse.move(0, 0)
	await expect(disclosure).toHaveJSProperty('open', false)
	await expect.poll(() => body.evaluate(node => node.matches(':popover-open'))).toBe(false)
	await expect(body).toHaveJSProperty('inert', true)
	await expect(disclosure).not.toHaveAttribute('data-tooltip-floating')
})

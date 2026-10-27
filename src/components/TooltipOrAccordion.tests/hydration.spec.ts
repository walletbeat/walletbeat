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

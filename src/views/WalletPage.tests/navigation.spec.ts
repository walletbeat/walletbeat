import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [390, 1024, 1025, 1440]) {
	test(`native navigation and root ownership at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		await test.step('🖼️ ScrollRoot: main and footer share the real root scroll owner', async () => {
			const owners = await page.locator('main, footer').evaluateAll(elements =>
				elements.map(element => {
					for (let parent = element.parentElement; parent; parent = parent.parentElement) {
						const style = getComputedStyle(parent)

						if (
							/(auto|scroll)/.test(style.overflowY) &&
							parent.scrollHeight > parent.clientHeight
						) {
							return parent.id
						}
					}

					return null
				}),
			)

			expect(owners.length).toBeGreaterThanOrEqual(2)
			expect(owners.every(owner => owner === 'layout')).toBe(true)
			const main = await page.locator('main').evaluate(element => ({
				overflow: getComputedStyle(element).overflowY,
				scroll: element.scrollHeight,
				height: element.clientHeight,
			}))

			expect(!/(auto|scroll)/.test(main.overflow) || main.scroll <= main.height).toBe(true)
		})
		await test.step('🗂️ HiddenNavigation / PopoverControl / IndependentPie: native reachability cycle', async () => {
			if (width > 1024) {
				return
			}

			const trigger = page.getByRole('button', { name: 'Table of contents', exact: true })
			const toc = page.getByRole('navigation', { name: 'Table of contents', exact: true })

			await expect(toc).toHaveCount(0)
			await trigger.focus()
			await page.keyboard.press('Enter')
			await expect(toc).toBeVisible()
			const links = toc.getByRole('link')

			expect(await links.count()).toBeGreaterThan(0)
			await links.first().focus()
			await expect(links.first()).toBeFocused()
			await page.keyboard.press('Escape')
			await expect(toc).toHaveCount(0)
			await expect(trigger).toBeFocused()
			await page.keyboard.press('Tab')
			expect(
				await page
					.locator('#wallet-toc')
					.evaluate(element => element.contains(document.activeElement)),
			).toBe(false)
			const pie = page.locator('.pie-navigation')

			await expect(pie).toBeVisible()
			expect(await pie.evaluate(element => element.closest('[popover]'))).toBeNull()
			const petal = pie.locator('a[href="#security"]').first()

			await petal.focus()
			await page.keyboard.press('Enter')
			await expect.poll(() => new URL(page.url()).hash).toBe('#security')
		})
		await test.step('🔽 DisclosureTarget: fragment navigation reveals closed ancestor disclosures', async () => {
			const target = page.locator('.attribute-group section.attribute details[id]').first()
			const id = await target.getAttribute('id')

			expect(id).toBeTruthy()
			await target.evaluate(element => {
				for (let owner: Element | null = element; owner; owner = owner.parentElement) {
					if (owner instanceof HTMLDetailsElement) {
						owner.open = false
					}
				}
			})
			await page.goto(`/__wallet-page/software/#${id}`)
			await expect(target).toHaveAttribute('open')
			expect(
				await target.evaluate(element => {
					for (let owner = element.parentElement; owner; owner = owner.parentElement) {
						if (owner instanceof HTMLDetailsElement && !owner.open) {
							return false
						}
					}

					return true
				}),
			).toBe(true)
			await expect(target.locator(':scope > summary')).toBeVisible()
		})
	})
}

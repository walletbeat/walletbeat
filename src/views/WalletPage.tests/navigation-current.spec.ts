import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [690, 1440]) {
	test(`navigation current state clears after forward and reverse travel at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/phantom/?variant=MOBILE')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		test.skip(
			!(await page.evaluate(() => CSS.supports('color: if(style(--a: 1): red)'))),
			'Native current-state enhancement is unavailable',
		)
		await page.evaluate(() => document.fonts.ready)
		await page.mouse.move(0, 899)
		const seek = async (top: number) => {
			await page.locator('#layout').evaluate((element, top) => {
				if (!(element instanceof HTMLElement)) {
					throw new Error('Scroll owner required')
				}

				element.style.scrollSnapType = 'none'
				element.scrollTo({ top, behavior: 'instant' })
			}, top)
		}
		const observe = () =>
			page.locator('.page-navigation').evaluate(navigation => {
				const current = [
					...new Set(
						[...navigation.querySelectorAll('[data-pressable-name]')]
							.filter(
								element =>
									getComputedStyle(element).getPropertyValue('---link-current').trim() === '1',
							)
							.map(element => element.getAttribute('data-pressable-name')),
					),
				].sort()
				const expected = [
					...new Set(
						[
							...navigation.querySelectorAll<HTMLAnchorElement>(
								'.pie-navigation a[data-pressable-targets]',
							),
						]
							.filter(element => getComputedStyle(element).viewTimelineName !== 'none')
							.flatMap(element => element.getAttribute('data-pressable-targets')!.split(/\s+/)),
					),
				].sort()

				return { current, expected }
			})
		const stops = await page.locator('.attribute-group section.attribute').evaluateAll(elements =>
			elements
				.filter(element => element.checkVisibility())
				.slice(0, 4)
				.map(element => element.getBoundingClientRect().top + 200),
		)

		expect(stops).toHaveLength(4)

		for (const top of [...stops, ...stops.toReversed()]) {
			await seek(top)
			await expect
				.poll(async () => {
					const { current, expected } = await observe()

					return (
						current.length > 0 &&
						current.length <= 2 &&
						JSON.stringify(current) === JSON.stringify(expected)
					)
				})
				.toBe(true)
		}
		await seek(0)
		await expect.poll(async () => (await observe()).current).toEqual([])
	})
}

import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [690, 1440]) {
	test(`destination current state follows heading contact and clears after reverse travel at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/phantom/?variant=MOBILE')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		test.skip(
			!(await page.evaluate(() => CSS.supports('color: if(style(--a: 1): red)'))),
			'Native current-state enhancement is unavailable',
		)
		await page.evaluate(async () => {
			await document.fonts.ready
			const images = [...document.images]

			images.forEach(image => {
				image.loading = 'eager'
			})
			await Promise.all(images.map(image => image.decode()))
		})
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
			page.locator('#top').evaluate(root => {
				const scroller = document.querySelector<HTMLElement>('#layout')!
				const origin = scroller.getBoundingClientRect().top + scroller.clientTop
				const current = (elements: Element[]) =>
					[
						...new Set(
							elements
								.filter(element => {
									const value = getComputedStyle(element).getPropertyValue('---link-current').trim()

									if (value !== '0' && value !== '1') {
										throw Error(`Invalid destination current state: ${value}`)
									}

									return value === '1'
								})
								.map(element => element.getAttribute('data-pressable-name')),
						),
					].sort()
				const rows = [
					...root.querySelectorAll<HTMLElement>(
						'.attribute-group [data-row][data-pressable-name]:has(> [data-sticky-breadcrumb~="source"])',
					),
				].filter(
					row =>
						row.getAttribute('data-pressable-name') ===
						`#${row.closest('.attribute-group, section.attribute')?.id}`,
				)
				const anchors = rows.map(row => {
					const anchor = row.querySelector('[data-pressable-current="inherit"]')

					if (
						!anchor ||
						anchor.getAttribute('data-pressable-name') !== row.getAttribute('data-pressable-name')
					) {
						throw Error('A heading anchor must share its row destination')
					}

					return anchor
				})
				const contacts = rows.flatMap(row => {
					const scope = row.closest('section.attribute')
					const sticky = row.closest<HTMLElement>('[data-sticky~="block-start"]')

					if (!scope || !sticky || !row.checkVisibility({ visibilityProperty: true })) {
						return []
					}

					const box = sticky.getBoundingClientRect()
					const inset = Number.parseFloat(getComputedStyle(sticky).insetBlockStart)

					if (!Number.isFinite(inset)) {
						throw Error('A heading needs a resolved cumulative sticky inset')
					}

					return Math.abs(box.top - origin - inset) < 1.5 &&
						scope.getBoundingClientRect().bottom > box.bottom
						? [scope.id]
						: []
				})

				return {
					contacts,
					rowCount: rows.length,
					navigation: current([...root.querySelectorAll('.page-navigation [data-pressable-name]')]),
					rows: current(rows),
					anchors: current(anchors),
				}
			})
		const stops = await page.locator('.attribute-group').evaluateAll(groups =>
			groups.flatMap(group =>
				[...group.querySelectorAll('section.attribute')]
					.filter(element => element.checkVisibility())
					.filter((_, index, siblings) => index === 0 || index === siblings.length - 1)
					.map(element => ({
						id: element.id,
						group: group.id,
					})),
			),
		)

		expect(stops.length).toBeGreaterThanOrEqual(4)
		expect((await observe()).rowCount).toBeGreaterThan(4)

		const unreachable: { id: string; open: boolean; top: number; maximum: number }[] = []

		for (const open of [true, false]) {
			await page
				.locator('.attribute-group section.attribute > details')
				.evaluateAll((elements, open) => {
					elements.forEach(element => {
						if (!(element instanceof HTMLDetailsElement)) {
							throw Error('Attribute disclosure must be a native details element')
						}

						element.open = open
					})
				}, open)
			await page.evaluate(async () => {
				await Promise.all(
					document
						.getAnimations()
						.filter(animation => animation instanceof CSSTransition)
						.map(animation => animation.finished.catch(() => undefined)),
				)
			})

			for (const stop of [...stops, ...stops.toReversed()]) {
				const target = await page.locator(`#${stop.id}`).evaluate((element, open) => {
					const root = document.querySelector('#layout')!
					const subject = open
						? element
						: element.querySelector(
								':scope > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
							)!

					return {
						top:
							root.scrollTop +
							subject.getBoundingClientRect().top -
							root.getBoundingClientRect().top -
							root.clientTop +
							(open ? Math.min(element.getBoundingClientRect().height / 2, 200) : 2),
						maximum: root.scrollHeight - root.clientHeight,
					}
				}, open)

				if (target.top > target.maximum) {
					expect(open, `${stop.id}: every open boundary must be reachable`).toBe(false)
					unreachable.push({ id: stop.id, open, ...target })
					await seek(target.maximum)
					await expect
						.poll(async () => {
							const actual = await observe()

							return (
								actual.rows.join() === actual.navigation.join() &&
								actual.anchors.join() === actual.navigation.join()
							)
						})
						.toBe(true)
					continue
				}

				await seek(target.top)
				const expected = [`#${stop.group}`, `#${stop.id}`].sort()

				await expect.poll(observe).toMatchObject({
					...(open ? { contacts: [stop.id] } : {}),
					navigation: expected,
					rows: expected,
					anchors: expected,
				})
			}
			await seek(0)
			await expect
				.poll(observe)
				.toMatchObject({ contacts: [], navigation: [], rows: [], anchors: [] })
		}
		await info.attach('unreachable-native-boundaries', {
			body: JSON.stringify(unreachable),
			contentType: 'application/json',
		})
	})
}

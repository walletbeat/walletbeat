import { expect, test } from '../../../tests/browser/verified-test'

type Feedback = Record<string, { active: boolean; opacity: number }>

test('native nested press feedback survives enhancement and overlapping input', async ({
	browser,
}, info) => {
	const observations: Record<string, Record<string, Feedback>> = {}

	for (const mode of ['no-js', 'pending', 'hydrated']) {
		const context = await browser.newContext({
			javaScriptEnabled: mode !== 'no-js',
			viewport: { width: 690, height: 900 },
		})

		try {
			const page = await context.newPage()
			let blocked = 0

			if (mode === 'pending') {
				await page.route('**/_astro/WalletPage.*.js', route => {
					blocked++

					return route.abort()
				})
			}

			await page.goto('/metamask/selection/browser--all/', { waitUntil: 'domcontentloaded' })

			if (mode === 'hydrated') {
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			}

			if (mode === 'pending') {
				await expect.poll(() => blocked).toBeGreaterThan(0)
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(1)
			}

			const island = page.locator('astro-island:has(#top)')
			if (mode === 'no-js') {
				await expect(island).not.toHaveAttribute('data-pressable-local', '')
			} else {
				await expect(island).toHaveAttribute('data-pressable-local', '')
			}

			await island.evaluate(owner => {
				owner.querySelector<HTMLElement>('#top')!.style.setProperty('display', 'none', 'important')
				const box = document.createElement('div')

				box.id = 'native-press-fixture'
				box.setAttribute('data-pressable', '')
				box.style.cssText =
					'position:fixed;top:250px;left:20px;width:400px;height:200px;background:black;z-index:2147483647'
				box.innerHTML =
					'<button id="nested" type="button">Nested</button><label id="label"><input id="check" type="checkbox"><span id="label-text">Toggle label</span></label><label id="button-label"><button id="labeled-button" type="button">Label button</button></label>'
				owner.append(box)
			})
			const fixture = page.locator('#native-press-fixture')
			const snapshot = async () => {
				await expect
					.poll(
						() =>
							fixture.evaluate(root =>
								root
									.getAnimations({ subtree: true })
									.every(
										animation =>
											animation.playState === 'finished' || animation.playState === 'idle',
									),
							),
						{ message: 'Native feedback transitions finish before sampling' },
					)
					.toBe(true)

				return fixture.evaluate(root =>
					Object.fromEntries(
						[root, ...root.querySelectorAll('button, label, input')].map(element => [
							element.id,
							{
								active: element.matches(':active'),
								opacity: Number.parseFloat(
									getComputedStyle(element).getPropertyValue('---pressable-opacity'),
								),
							},
						]),
					),
				)
			}
			const cases: Record<string, Feedback> = {}
			const observe = async (name: string) => {
				if (mode !== 'no-js') {
					await expect
						.poll(snapshot, { message: `${mode}: ${name} matches native feedback` })
						.toEqual(observations['no-js'][name])
				}

				cases[name] = await snapshot()
			}

			const pointAt = async (id: string) => {
				const point = await page.locator(`#${id}`).evaluate(element => {
					const box = element.getBoundingClientRect()
					const x = box.x + box.width / 2
					const y = box.y + box.height / 2

					if (!element.contains(document.elementFromPoint(x, y))) {
						throw new Error('Native press target is obscured')
					}

					return { x, y }
				})

				await page.mouse.move(point.x, point.y)
			}

			for (const id of ['nested', 'label-text', 'labeled-button']) {
				await pointAt(id)
				await page.mouse.down()
				await observe(id)
				await page.mouse.up()
			}
			const nested = page.locator('#nested')

			await pointAt('nested')
			await page.mouse.down()
			await page.keyboard.down('Space')
			await page.keyboard.up('Space')
			await observe('mixed')
			await page.mouse.up()
			await observe('released')
			await nested.focus()
			await page.keyboard.down('Space')
			await observe('keyboard')
			await page.keyboard.press('Tab')
			await observe('focusout')
			await page.keyboard.up('Space')

			if (mode !== 'no-js') {
				await nested.evaluate(element =>
					element.addEventListener(
						'pointerdown',
						event => {
							if (!(event instanceof PointerEvent)) {
								throw new Error('Expected native pointer input')
							}

							element.setPointerCapture(event.pointerId)
							element.dataset.pointer = String(event.pointerId)
						},
						{ once: true },
					),
				)
			}

			await pointAt('nested')
			await page.mouse.down()

			if (mode !== 'no-js') {
				await page.mouse.move(
					(await nested.boundingBox())!.x + 2,
					(await nested.boundingBox())!.y + 2,
				)
				await nested.evaluate(element => {
					const pointer = Number(element.dataset.pointer)

					if (!element.hasPointerCapture(pointer)) {
						throw new Error('Native pointer capture was not acquired')
					}

					element.releasePointerCapture(pointer)
				})
			}

			await observe('capture-release')
			await page.mouse.up()
			await observe('capture-released')
			observations[mode] = cases
			expect(cases.nested['native-press-fixture'].opacity).toBe(1)
			expect(cases.nested.nested.active).toBe(true)
			expect(cases.nested.nested.opacity).toBeLessThan(1)
		} finally {
			await context.close()
		}
	}
	await info.attach('native-press-parity', {
		body: JSON.stringify(observations),
		contentType: 'application/json',
	})
})

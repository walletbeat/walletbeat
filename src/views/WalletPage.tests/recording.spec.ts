import { installRecordingCursor } from '../../../tests/browser/recording-cursor'
import { expect, test } from '../../../tests/browser/verified-test'

interface Cell {
	engine: string
	width: number
	height: number
	scenario: string
	wallet: string
	theme: 'light' | 'dark'
	transparency: string
}
function isCell(value: unknown): value is Cell {
	return (
		typeof value === 'object' &&
		value !== null &&
		'engine' in value &&
		typeof value.engine === 'string' &&
		'width' in value &&
		typeof value.width === 'number' &&
		'height' in value &&
		typeof value.height === 'number' &&
		'scenario' in value &&
		typeof value.scenario === 'string' &&
		'wallet' in value &&
		typeof value.wallet === 'string' &&
		'theme' in value &&
		(value.theme === 'light' || value.theme === 'dark') &&
		'transparency' in value &&
		typeof value.transparency === 'string'
	)
}

test('recording native journey', async ({ page, browserName, browser, source }, info) => {
	const cell: unknown = info.project.metadata.recording

	if (!isCell(cell)) {
		throw new Error('Missing recording matrix cell')
	}

	const { width, height, scenario } = cell

	await page.emulateMedia({ colorScheme: cell.theme, reducedMotion: 'no-preference' })

	if (browserName === 'chromium') {
		const session = await page.context().newCDPSession(page)

		await session.send('Emulation.setEmulatedMedia', {
			features: [
				{ name: 'prefers-reduced-transparency', value: cell.transparency },
				{ name: 'prefers-color-scheme', value: cell.theme },
			],
		})
	}

	await installRecordingCursor(page)
	const response = await page.goto(`/${cell.wallet}/`, {
		waitUntil: 'domcontentloaded',
		timeout: 600000,
	})

	expect(response?.ok()).toBe(true)
	await expect(page.locator('#top h1')).toBeVisible()
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 600000 })
	await page.evaluate(() => document.fonts.ready)
	const media = await page.evaluate(() => ({
		dark: matchMedia('(prefers-color-scheme: dark)').matches,
		reducedTransparency: matchMedia('(prefers-reduced-transparency: reduce)').matches,
	}))

	expect(media.dark).toBe(cell.theme === 'dark')

	if (browserName !== 'webkit') {
		expect(media.reducedTransparency).toBe(cell.transparency === 'reduce')
	}

	const root = page.locator('#layout')
	const content = await page.locator('main').boundingBox()

	if (!content) {
		throw new Error('Missing main content pointer destination')
	}

	await page.mouse.move(content.x + Math.min(24, content.width / 2), height * 0.75)
	const actions: { type: string; value: string | number }[] = []
	const settleRoot = async () => {
		let previous = Number.NaN,
			stable = 0

		await expect
			.poll(
				async () => {
					const current = await root.evaluate(element => element.scrollTop)

					stable = Math.abs(current - previous) < 0.1 ? stable + 1 : 0
					previous = current

					return stable
				},
				{ intervals: [100] },
			)
			.toBeGreaterThanOrEqual(3)
	}

	if (scenario === 'linear') {
		let previous = 0

		for (let step = 0; step < 240; step++) {
			const state = await root.evaluate(element => ({
				top: element.scrollTop,
				end: element.scrollHeight - element.clientHeight,
			}))

			expect(state.top).toBeGreaterThanOrEqual(previous - 1)

			if (state.end - state.top <= 2) {
				break
			}

			previous = state.top
			await root.evaluate(element => {
				element.setAttribute('data-recording-scroll-end', 'pending')
				element.addEventListener(
					'scrollend',
					() => element.setAttribute('data-recording-scroll-end', 'complete'),
					{ once: true },
				)
			})
			await page.mouse.wheel(0, height * 0.8)
			await expect
				.poll(() => root.evaluate(element => element.scrollTop), {
					message: 'Native wheel input must advance the root',
				})
				.toBeGreaterThan(previous)
			await expect(
				root,
				'Each wheel settles through native scrollend before the next action',
			).toHaveAttribute('data-recording-scroll-end', 'complete')
			actions.push({ type: 'wheel', value: height * 0.8 })
		}
		expect(
			await root.evaluate(
				element => element.scrollHeight - element.clientHeight - element.scrollTop,
			),
			'Reach the real footer with native snapping enabled',
		).toBeLessThanOrEqual(2)
	} else {
		for (const [index, type] of ['toc', 'heading', 'pie', 'toc', 'heading', 'pie'].entries()) {
			if (
				type === 'toc' &&
				width <= 1024 &&
				!(await page.locator('#wallet-toc').evaluate(element => element.matches(':popover-open')))
			) {
				await page.locator('[popovertarget="wallet-toc"]').click()
			}

			let href: string | null

			if (type === 'pie') {
				const visiblePoints = () =>
					page.locator('.pie-navigation').evaluate(root => {
						const points: { href: string; x: number; y: number }[] = []

						for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
							const glyph = link.querySelector('.pie-navigation-icon')

							if (!glyph?.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
								continue
							}

							const box = glyph.getBoundingClientRect()
							const x = box.x + box.width / 2,
								y = box.y + box.height / 2

							if (document.elementFromPoint(x, y)?.closest('a') === link) {
								points.push({ href: link.hash, x, y })
							}
						}

						return points
					})
				let candidates = await visiblePoints()

				if (!candidates.length) {
					await page.locator('#top h1 a[href="#top"]').focus()
					await page.keyboard.press('Enter')
					await expect.poll(() => new URL(page.url()).hash).toBe('#top')
					await settleRoot()
					actions.push({ type: 'top', value: '#top' })
					candidates = await visiblePoints()
				}

				expect(
					candidates.length,
					'A visible canonical petal label must have a real pointer hit region',
				).toBeGreaterThan(0)
				const point = candidates[Math.min(index, candidates.length - 1)]

				href = point.href
				await page.mouse.move(point.x, point.y)
				await expect
					.poll(() =>
						page.evaluate(
							({ x, y }) => document.elementFromPoint(x, y)?.closest('a')?.getAttribute('href'),
							point,
						),
					)
					.toBe(href)
				await page.mouse.click(point.x, point.y)
			} else {
				const selector =
					type === 'toc'
						? '#wallet-toc a[href^="#"]'
						: '#top article :is(h2 > a[href^="#"], a[href^="#"]:has(> h2))'
				const links = page.locator(selector).filter({ visible: true })

				expect(await links.count()).toBeGreaterThan(0)
				const link = links.nth(Math.min(index, (await links.count()) - 1))

				href = await link.getAttribute('href')
				const heading = link.locator('h2')
				const target = type === 'heading' && (await heading.count()) ? heading : link

				await target.hover()
				await target.click()
			}

			await expect.poll(() => new URL(page.url()).hash).toBe(href)
			await settleRoot()

			if (
				type === 'toc' &&
				width <= 1024 &&
				(await page.locator('#wallet-toc').evaluate(element => element.matches(':popover-open')))
			) {
				await page.keyboard.press('Escape')
				actions.push({ type: 'key', value: 'Escape' })
			}

			actions.push({ type, value: href ?? '' })
		}
	}

	await info.attach('final-frame', { body: await page.screenshot(), contentType: 'image/png' })
	await info.attach('recording-provenance', {
		body: JSON.stringify(
			{
				...cell,
				source,
				engineVersion: browser.version(),
				media,
				transparencyEmulationAvailable: browserName !== 'webkit',
				actions,
				nativeInput: true,
				nativeCursorCaptured: false,
				cursorOverlay: 'computed CSS cursor: pointer, text, default',
			},
			null,
			2,
		),
		contentType: 'application/json',
	})
})

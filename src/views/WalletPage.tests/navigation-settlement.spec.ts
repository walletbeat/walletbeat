import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import {
	observeFixedPieBottom,
	observeStickyChain,
	selectStickyChain,
} from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

declare function recordInstantLanding(id: string, hash: string): Promise<void>
declare function recordNativeTravel(scroll: number, end: boolean): Promise<void>

// Every route exercises the same original nodes; no surrogate anchor or layout is introduced.
for (const width of [390, 864, 1344, 1345, 1440]) {
	test(`native fragment settlement, disclosure and history at ${width}px`, async ({
		page,
		browserName,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const chain = await page.evaluate(selectStickyChain)
		const attributeId = chain[2].scope.slice(1).replace(/\\/g, '')
		const detailId = chain[3].scope.slice(1).replace(/\\/g, '')
		const records: unknown[] = []
		const sample = () => page.evaluate(observeStickyChain, chain)
		const settle = async (id: string, label: string) => {
			await expect.poll(() => new URL(page.url()).hash).toBe(`#${id}`)
			await page.evaluate(() => document.fonts.ready)
			const index = id === detailId ? 3 : 2
			const measure = async () => {
				const observed = await sample()
				const preceding = observed.rows
					.slice(0, index)
					.filter(
						row => row.opacity > 0.01 && row.headingBox.bottom > 0 && row.headingBox.top < 450,
					)
				const pieBottom = await page.evaluate(observeFixedPieBottom)
				const contact = Math.max(
					observed.siteBottom,
					pieBottom,
					...preceding.map(row => row.occupiedRow.bottom),
				)

				return { observed, target: observed.rows[index], preceding, pieBottom, contact }
			}
			let result = await measure()
			let stable = 0

			try {
				await expect
					.poll(
						async () => {
							const previous = result

							result = await measure()
							const { observed, target, contact } = result
							const arrived =
								target.headingBox.bottom > 0 &&
								target.headingBox.top < observed.viewport.height &&
								Math.abs(target.scopeBox.top - contact) <= 3
							const stationary =
								Math.abs(observed.scroll - previous.observed.scroll) < 0.25 &&
								Math.abs(target.scopeBox.top - previous.target.scopeBox.top) < 0.25 &&
								Math.abs(contact - previous.contact) < 0.25

							stable = arrived && stationary ? stable + 1 : 0

							return stable
						},
						{
							message: `${label}: destination lands and settles at the painted stack`,
							intervals: [100],
						},
					)
					.toBeGreaterThanOrEqual(3)
			} finally {
				await info.attach(`settlement-${label}`, {
					body: JSON.stringify({ id, ...result }),
					contentType: 'application/json',
				})
			}

			const { observed, preceding, pieBottom, contact } = result

			records.push({ label, id, observed, pieBottom, contact })

			for (const row of preceding) {
				for (const end of row.endBoxes) {
					for (const line of row.lines) {
						const overlapWidth =
							Math.min(line.right, end.box.right) - Math.max(line.left, end.box.left)
						const overlapHeight =
							Math.min(line.bottom, end.box.bottom) - Math.max(line.top, end.box.top)

						expect(
							overlapWidth > 0.5 && overlapHeight > 0.5,
							`${label}: H${row.level} title must not collide with visible end content ${end.text}`,
						).toBe(false)
					}
				}
			}
			expect(await page.locator(chain[index].heading).count()).toBe(1)

			return observed
		}

		await page.goto(`/__wallet-page/software/#${attributeId}`)
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await settle(attributeId, 'initial-hash')
		const identity = await page.locator(chain[3].scope).elementHandle()

		expect(identity).not.toBeNull()
		const details = page.locator(chain[3].scope)

		if (
			await details.evaluate(element => {
				if (!(element instanceof HTMLDetailsElement)) {
					throw new Error('Expected native disclosure')
				}

				return element.open
			})
		) {
			await details.locator(':scope > summary').focus()
			await page.keyboard.press('Space')
		}

		await expect(details).not.toHaveAttribute('open')
		// The existing permalink is activated through native keyboard input, even while its detail is closed.
		const link = page.locator(`${chain[3].scope} > summary a[href="#${detailId}"]`).first()

		await expect(link).toHaveCount(1)
		await link.focus()
		await page.keyboard.press('Enter')
		await expect(details).toHaveAttribute('open')
		await settle(detailId, 'closed-detail-link')
		expect(
			await identity.evaluate(element => element === document.getElementById(element.id)),
		).toBe(true)
		await page.goBack()
		await settle(attributeId, 'history-back')
		await page.goForward()
		const forward = await settle(detailId, 'history-forward')

		await page.setViewportSize({ width: width <= 1344 ? 1440 : 390, height: 900 })
		await settle(detailId, 'responsive-crossing')
		await page.setViewportSize({ width, height: 900 })
		const returned = await settle(detailId, 'responsive-return')

		expect(
			Math.abs(returned.rows[3].scopeBox.top - forward.rows[3].scopeBox.top),
			'Returning to the same viewport retains the same settled destination geometry',
		).toBeLessThanOrEqual(3)
		await page.mouse.move(width / 2, 650)
		await page.mouse.wheel(0, 900)
		await expect
			.poll(() => page.locator('#layout').evaluate(root => root.scrollTop))
			.toBeGreaterThan(returned.scroll + 100)
		let previousManualScroll = (await sample()).scroll
		let manualStableSamples = 0

		await expect
			.poll(
				async () => {
					const scroll = (await sample()).scroll

					manualStableSamples =
						Math.abs(scroll - previousManualScroll) < 0.25 ? manualStableSamples + 1 : 0
					previousManualScroll = scroll

					return manualStableSamples
				},
				{
					message: 'Native manual scrolling settles before responsive reflow',
					intervals: [100, 100, 100],
				},
			)
			.toBeGreaterThanOrEqual(3)
		await page.setViewportSize({ width: width <= 1344 ? 1440 : 390, height: 900 })
		await page.evaluate(() => document.fonts.ready)
		let previousResizeScroll = (await sample()).scroll
		let canceledLandingSamples = 0

		await expect
			.poll(
				async () => {
					const observed = await sample()
					const preceding = observed.rows
						.slice(0, 3)
						.filter(
							row => row.opacity > 0.01 && row.headingBox.bottom > 0 && row.headingBox.top < 450,
						)
					const contact = Math.max(
						observed.siteBottom,
						await page.evaluate(observeFixedPieBottom),
						...preceding.map(row => row.occupiedRow.bottom),
					)

					const displaced = Math.abs(observed.rows[3].scopeBox.top - contact) > 100

					canceledLandingSamples =
						displaced && Math.abs(observed.scroll - previousResizeScroll) < 0.25
							? canceledLandingSamples + 1
							: 0
					previousResizeScroll = observed.scroll

					return canceledLandingSamples
				},
				{
					message:
						'Manual native scrolling keeps the old fragment displaced through settled resize samples',
					intervals: [100, 100, 100],
				},
			)
			.toBeGreaterThanOrEqual(4)
		const staleHash = new URL(page.url()).hash

		await link.click()
		expect(
			new URL(page.url()).hash,
			'The existing fragment is reactivated without changing its hash',
		).toBe(staleHash)
		await settle(detailId, 'same-hash-reactivation')
		await page.setViewportSize({ width, height: 900 })
		await settle(detailId, 'same-hash-responsive-return')

		const current = await page.locator('.pie-navigation a, #wallet-toc a').evaluateAll(
			(links, id) =>
				links
					.map(link => {
						if (!(link instanceof HTMLAnchorElement)) {
							throw new Error('Expected native navigation anchor')
						}

						return link
					})
					.filter(link => new URL(link.href).hash === `#${id}`)
					.map(link => ({
						href: link.href,
						current: getComputedStyle(link).getPropertyValue('---link-current').trim(),
						ariaCurrent: link.getAttribute('aria-current'),
					})),
			attributeId,
		)

		await info.attach('settlement-current-observations', {
			body: JSON.stringify({
				current,
				records: records.length,
				limitations:
					'Current computed feedback is recorded, not certified across unsupported enhancement engines. Fonts-ready settling and resize are exercised; independently delayed fonts/images and every destination remain unverified.',
			}),
			contentType: 'application/json',
		})
		const contract = await readFile(
			new URL('../../../tests/browser/wallet-page-requirements.md', import.meta.url),
			'utf8',
		)

		await info.attach('contract-evidence', {
			body: JSON.stringify({
				contractHash: createHash('sha256').update(contract).digest('hex'),
				engine: browserName,
				results: ['⚓ FragmentStart', '⚓ HistoryLanding', '🔽 DisclosureTarget'].map(id => ({
					id,
					status: 'pass',
					complete: false,
					widths: [width],
					evidence:
						'Original H3/H4 destinations measured against preceding actual painted rows after initial fragment, native closed-detail permalink, history and responsive crossings. Current feedback is observational; delayed assets, other destinations and full convergence matrix remain unverified.',
				})),
			}),
			contentType: 'application/json',
		})
	})
}

test.describe('native fragment routing', () => {
	test.use({ viewport: { width: 934, height: 1203 }, reducedMotion: 'no-preference' })

	test('ordinary hash pushes avoid instant repair and preserve history landings', async ({
		page,
	}, info) => {
		await page.goto('/rainbow/#top')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const navigationAvailable = await page.evaluate(() => Boolean(globalThis.navigation))

		test.skip(!navigationAvailable, 'Legacy traversal restoration retains its native fallback')
		await expect
			.poll(() => page.locator('#layout').evaluate(root => root.scrollTop))
			.toBeLessThan(500)
		const link = page.locator('.pie-navigation a[href="#self-sovereignty"]')

		await link.focus()
		const start = await page.locator('#layout').evaluate(root => {
			if (!(root instanceof HTMLElement)) {
				throw new Error('Expected page scroll owner')
			}

			return { scroll: root.scrollTop, behavior: getComputedStyle(root).scrollBehavior }
		})

		expect(start.scroll).toBeLessThan(2000)
		expect(start.behavior).toBe('smooth')
		const positions: number[] = []
		const instantRepairs: { id: string; hash: string }[] = []
		let ended = false

		await page.exposeFunction('recordInstantLanding', (id: string, hash: string) => {
			instantRepairs.push({ id, hash })
		})
		await page.evaluate(() => {
			const original: unknown = Reflect.get(Element.prototype, 'scrollIntoView')

			if (typeof original !== 'function') {
				throw new Error('Expected native scrollIntoView')
			}

			Element.prototype.scrollIntoView = function (
				this: Element,
				options?: boolean | ScrollIntoViewOptions,
			) {
				if (typeof options === 'object' && options.behavior === 'instant') {
					void recordInstantLanding(this.id, location.hash)
				}

				Reflect.apply(original, this, [options])
			}
		})
		await page.exposeFunction('recordNativeTravel', (scroll: number, end: boolean) => {
			positions.push(scroll)
			ended ||= end
		})
		await page.locator('#layout').evaluate(root => {
			const record = (event: Event) => {
				void recordNativeTravel(root.scrollTop, event.type === 'scrollend')
			}

			root.addEventListener('scroll', record, { passive: true })
			root.addEventListener('scrollend', record, { passive: true })
		})
		await page.keyboard.press('Enter')
		await expect.poll(() => new URL(page.url()).hash).toBe('#self-sovereignty')
		await expect.poll(() => ended, { message: 'Native fragment travel settles' }).toBe(true)
		const final = await page.locator('#layout').evaluate(root => root.scrollTop)

		expect(final - start.scroll).toBeGreaterThan(5000)
		const travelPositions = [...positions]

		await page.evaluate(
			() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
		)
		const pushInstantRepairs = [...instantRepairs]

		expect(
			pushInstantRepairs,
			'An ordinary hash push must not trigger an instant history repair',
		).toEqual([])
		const heading = await page.locator('#self-sovereignty h2').boundingBox()

		expect(heading).not.toBeNull()
		expect(heading!.y).toBeGreaterThanOrEqual(0)
		expect(heading!.y + heading!.height).toBeLessThan(1203)
		await page.goBack()
		await expect.poll(() => new URL(page.url()).hash).toBe('#top')
		await expect
			.poll(async () =>
				Math.abs((await page.locator('#layout').evaluate(root => root.scrollTop)) - start.scroll),
			)
			.toBeLessThanOrEqual(3)
		await page.goForward()
		await expect.poll(() => new URL(page.url()).hash).toBe('#self-sovereignty')
		await expect
			.poll(async () =>
				Math.abs((await page.locator('#layout').evaluate(root => root.scrollTop)) - final),
			)
			.toBeLessThanOrEqual(3)
		await info.attach('native-fragment-routing', {
			body: JSON.stringify({
				navigationAvailable,
				start,
				final,
				positions: travelPositions,
				pushInstantRepairs,
				traversalInstantRepairs: instantRepairs.slice(pushInstantRepairs.length),
			}),
			contentType: 'application/json',
		})
	})
})

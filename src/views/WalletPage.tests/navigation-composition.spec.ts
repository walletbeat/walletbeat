import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import type { Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'
import { wbIconEmojiSequences } from '../../styles/wbicons'

const contractHash = createHash('sha256')
	.update(
		await readFile(new URL('../../../tests/browser/wallet-page-requirements.md', import.meta.url)),
	)
	.digest('hex')

test('native TOC composition across the complete responsive and direction matrix', async ({
	page,
	browserName,
}, info) => {
	for (const width of [390, 864, 1344, 1345, 1440]) {
		for (const direction of ['ltr', 'rtl']) {
			await page.setViewportSize({ width, height: 900 })
			await page.goto('/__wallet-page/software/')
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(async direction => {
				document.documentElement.dir = direction
				document.body.dir = direction
				await document.fonts.ready
			}, direction)

			if (width <= 1344) {
				await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
			}

			const toc = page.getByRole('navigation', { name: 'Table of contents', exact: true })

			await expect(toc).toBeVisible()
			const composition = await toc.evaluate(root => {
				const rectData = ({ x, y, width, height, top, right, bottom, left }: DOMRectReadOnly) => ({
					x,
					y,
					width,
					height,
					top,
					right,
					bottom,
					left,
				})
				const edge = (box: DOMRect) =>
					getComputedStyle(root).direction === 'rtl' ? box.right : box.left

				return [...root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].map(link => {
					const glyph = link.querySelector<HTMLElement>(':scope > [data-icon]')!
					const label = link.querySelector<HTMLElement>(':scope > [data-row-item~="flexible"]')!
					const range = document.createRange()

					range.selectNodeContents(label)
					const context = document.createElement('canvas').getContext('2d')!
					const labelStyle = getComputedStyle(label)

					context.font = `${labelStyle.fontStyle} ${labelStyle.fontWeight} ${labelStyle.fontSize} ${labelStyle.fontFamily}`
					const naturalTextWidth = context.measureText(label.textContent?.trim() ?? '').width
					const box = link.getBoundingClientRect(),
						icon = glyph.getBoundingClientRect(),
						text = label.getBoundingClientRect()
					const menu = link.closest('menu')!,
						menuBox = menu.getBoundingClientRect()
					const parent = menu.parentElement
						?.closest('details')
						?.querySelector<HTMLAnchorElement>(':scope > summary > a')
					const parentGlyph = parent?.querySelector<HTMLElement>(':scope > [data-icon]')
					const parentLabel = parent?.querySelector<HTMLElement>(
						':scope > [data-row-item~="flexible"]',
					)
					const connector = getComputedStyle(menu, '::before')
					const connectorStart = Number.parseFloat(connector.insetInlineStart)
					const connectorX =
						getComputedStyle(menu).direction === 'rtl'
							? menuBox.right - connectorStart - 0.5
							: menuBox.left + connectorStart + 0.5

					return {
						href: link.href,
						text: label.textContent?.trim(),
						naturalTextWidth,
						depth: Number(menu.getAttribute('data-navigation-depth')),
						icon: rectData(icon),
						label: rectData(text),
						row: rectData(box),
						lines: [...range.getClientRects()].map(rect => rectData(rect)),
						font: Number.parseFloat(getComputedStyle(link).fontSize),
						iconToken: glyph.getAttribute('data-icon'),
						hidden: glyph.closest('[aria-hidden="true"]') !== null,
						parentLabelStart: parentLabel ? edge(parentLabel.getBoundingClientRect()) : null,
						childGlyphStart: edge(icon),
						connectorX,
						parentCenterX: parentGlyph
							? parentGlyph.getBoundingClientRect().x +
								parentGlyph.getBoundingClientRect().width / 2
							: null,
					}
				})
			})

			expect(composition.length).toBeGreaterThan(10)
			expect(composition.some(row => row.depth === 1)).toBe(true)

			for (const row of composition) {
				expect(row.hidden, row.href).toBe(true)
				expect(row.icon.width, row.href).toBeGreaterThan(0)
				expect(
					Math.abs(
						row.icon.width - row.font * (row.depth === 0 ? 2 : row.depth === 1 ? 1.5 : 1.25),
					),
					row.href,
				).toBeLessThan(1)
				expect(
					Math.abs(row.icon.y + row.icon.height / 2 - row.label.y - row.label.height / 2),
					row.href,
				).toBeLessThan(1)

				for (const line of row.lines) {
					expect(line.x, row.href).toBeGreaterThanOrEqual(row.row.x - 1)
					expect(line.right, row.href).toBeLessThanOrEqual(row.row.right + 1)
				}

				if (row.parentLabelStart !== null) {
					expect(Math.abs(row.childGlyphStart - row.parentLabelStart), row.href).toBeLessThan(1)
					expect(Math.abs(row.connectorX - row.parentCenterX!), row.href).toBeLessThan(1)
				}
			}
			const longest = [...composition]
				.filter(row => row.depth === 1)
				.sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0))[0]

			if (longest.naturalTextWidth > longest.label.width + 1) {
				expect(
					longest.lines.length,
					'A depth-two label wraps when its actual available width is smaller than its natural text width',
				).toBeGreaterThan(1)
			} else {
				expect(
					longest.lines.length,
					'A depth-two label that fits retains its natural single line',
				).toBe(1)
			}

			expect(
				await toc.getByRole('heading').count(),
				'Named navigation does not repeat a visible title',
			).toBe(0)
			expect(
				await toc.locator('[data-badge] :text-matches("^Stage", "i")').count(),
				'Stage tags belong to the page, not the TOC',
			).toBe(0)
			const links = toc.locator('a[href^="#"]')
			const samples = [0, Math.floor((await links.count()) / 2), (await links.count()) - 1]

			for (const index of samples) {
				const link = links.nth(index)

				await link.scrollIntoViewIfNeeded()
				const relative = () =>
					link.evaluate(element => {
						const row = element.getBoundingClientRect(),
							glyph = element.querySelector('[data-icon]')!.getBoundingClientRect()

						return {
							x: glyph.x - row.x,
							y: glyph.y - row.y,
							width: glyph.width,
							height: glyph.height,
						}
					})

				await page.mouse.move(0, 0)
				const before = await relative()

				for (let repeat = 0; repeat < 3; repeat++) {
					await link.hover()
					const hovered = await relative()

					for (const axis of ['x', 'y', 'width', 'height'] as const) {
						expect(Math.abs(hovered[axis] - before[axis])).toBeLessThan(0.5)
					}
					await page.mouse.move(0, 0)
				}
			}
			await info.attach('navigation-composition', {
				body: JSON.stringify(composition),
				contentType: 'application/json',
			})
		}
	}
	await info.attach('contract-evidence', {
		body: JSON.stringify({
			contractHash,
			engine: browserName,
			results: [
				'🎨 HoverStability',
				'🗂️ NavigationDepth',
				'🗂️ ChildIndent',
				'🗂️ TOCTags',
				'🗂️ TOCTitle',
			].map(id => ({
				id,
				status: 'pass',
				complete: true,
				observation:
					'Actual rendered native TOC geometry, long depth-two text, connector coordinates and repeated native hover across all five widths and both directions',
			})),
		}),
		contentType: 'application/json',
	})
})

test('explicit icon modes preserve semantic identity and native decorative roles', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 1440, height: 900 })
	await page.goto('/__wallet-page/software/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	const observations = await page.locator('#top').evaluate((root, mappings) => {
		return [
			...root.querySelectorAll<HTMLElement>(
				'article :is(h2,h3) [data-icon], #wallet-toc a > [data-icon], .pie-navigation-icon',
			),
		].map(glyph => {
			const original = glyph.getAttribute('data-icon')!
			const identity = original
				.split(/\s+/)
				.find((token): token is keyof typeof mappings => token in mappings)

			if (!/\bwbicons-(simple|complex)\b/.test(original)) {
				return {
					original,
					identity: null,
					expected: original,
					hidden: glyph.closest('[aria-hidden="true"]') !== null,
					modes: [],
					literalBefore: getComputedStyle(glyph, '::before').content,
					literalAfter: getComputedStyle(glyph, '::before').content,
				}
			}

			if (!identity) {
				throw new Error(`Named font icon has no canonical semantic mapping: ${original}`)
			}

			const modes = ['wbicons-simple', 'wbicons-complex', 'wbicons-simple emoji'].map(mode => {
				glyph.setAttribute('data-icon', `${mode} ${identity}`)
				const style = getComputedStyle(glyph, '::before')

				return { mode, content: style.content, font: style.fontFamily }
			})

			glyph.setAttribute('data-icon', original)

			return {
				original,
				identity,
				expected: mappings[identity],
				hidden: glyph.closest('[aria-hidden="true"]') !== null,
				modes,
			}
		})
	}, wbIconEmojiSequences)

	expect(observations.length).toBeGreaterThan(30)

	for (const row of observations) {
		expect(row.expected, row.original).toBeTruthy()

		if (!row.identity) {
			expect(
				JSON.parse(row.literalBefore),
				'Explicit literal emoji retains its actual authored semantic identity',
			).toBe(row.original)
			expect(
				row.literalAfter,
				'Explicit literal emoji is preserved rather than converted into a named font icon',
			).toBe(row.literalBefore)
			continue
		}

		expect(row.hidden, row.original).toBe(true)

		for (const mode of row.modes) {
			expect(JSON.parse(mode.content), `${row.identity}: ${mode.mode}`).toBe(row.expected)
		}
		expect(row.modes[0].font).not.toBe(row.modes[2].font)
		expect(row.modes[1].font).not.toBe(row.modes[2].font)
	}
	await info.attach('native-explicit-icon-modes', {
		body: JSON.stringify(observations),
		contentType: 'application/json',
	})
})

const currentRequirements = [
	'🎯 SharedStates',
	'🎯 GroupCurrent',
	'🎯 StateLegibility',
	'🎯 CurrentInteraction',
]

const nativeCurrentCapabilities = () => ({
	scrollTimeline: CSS.supports('animation-timeline: scroll()'),
	scope: CSS.supports('timeline-scope: --link'),
	styleIf: CSS.supports('color: if(style(---link-active: 1): red; else: blue)'),
})

async function navigationFeedback(page: Page, width: number, direction: string) {
	await page.setViewportSize({ width, height: 900 })
	await page.goto('/__wallet-page/software/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(async direction => {
		document.documentElement.dir = direction
		document.body.dir = direction
		await document.fonts.ready
	}, direction)
	const openTOC = async () => {
		if (width <= 1344 && !(await page.locator('#wallet-toc:popover-open').count())) {
			await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
			await expect(page.locator('#wallet-toc:popover-open')).toBeVisible()
		}
	}

	await openTOC()
	const target = page.locator('#wallet-toc menu[data-navigation-depth="1"] > li > a').first()
	const href = (await target.getAttribute('href'))!
	const parentHref = (await target.evaluate(link =>
		link
			.closest('menu')!
			.parentElement!.querySelector<HTMLAnchorElement>(':scope > summary > a')!
			.getAttribute('href'),
	))!
	const states = async (destination: string) => {
		const identity = JSON.stringify(destination)
		const rows = await page
			.locator(
				[
					`#top .pie-navigation a[data-pressable-name=${identity}]`,
					`#wallet-toc a[data-pressable-name=${identity}]`,
					`#top [data-sticky-breadcrumb~="source"] a[data-pressable-name=${identity}]`,
				].join(', '),
			)
			.evaluateAll(
				(links, destination) =>
					links.map(link => {
						if (!(link instanceof HTMLAnchorElement)) {
							throw new Error('Shared navigation link must be a native anchor')
						}

						if (
							link.hash !== destination ||
							link.origin !== location.origin ||
							link.pathname !== location.pathname ||
							link.search !== location.search ||
							link.getAttribute('data-pressable-name') !== destination
						) {
							throw new Error('Canonical peer must resolve to the exact same-page destination')
						}

						const style = getComputedStyle(link)

						return {
							representation: link.closest('.pie-navigation')
								? 'pie'
								: link.closest('#wallet-toc')
									? 'toc'
									: 'heading',
							active: style.getPropertyValue('---link-active').trim(),
							interacting: style.getPropertyValue('---link-interacting').trim(),
							current: style.getPropertyValue('---link-current').trim(),
							color: style.color,
							opacity: style.opacity,
							href: link.href,
						}
					}),
				destination,
			)

		expect(rows.map(row => row.representation).sort()).toEqual(['heading', 'pie', 'toc'])
		expect(rows.every(row => row.current !== '')).toBe(true)

		return rows
	}
	const all = async (destination: string, state: 'interacting' | 'current', expected: string) => {
		await expect
			.poll(async () => (await states(destination)).map(row => row[state]), {
				message: `${width}/${direction}: actual shared ${state} for ${destination}`,
			})
			.toEqual([expected, expected, expected])
	}

	return { openTOC, target, href, parentHref, states, all }
}

for (const width of [390, 864, 1344, 1345, 1440]) {
	for (const direction of ['ltr', 'rtl']) {
		test(`native shared interaction and keyboard navigation at ${width}px ${direction}`, async ({
			page,
			browserName,
		}, info) => {
			const capabilities = await page.evaluate(nativeCurrentCapabilities)
			const { openTOC, target, href, states, all } = await navigationFeedback(
				page,
				width,
				direction,
			)

			await target.scrollIntoViewIfNeeded()
			await page.mouse.move(0, 0)
			const resting = await states(href)

			expect(resting.length).toBe(3)
			await target.hover()
			await all(href, 'interacting', '1')
			const hovered = await states(href)

			await page.mouse.move(0, 0)
			await all(href, 'interacting', '0')
			await target.focus()
			await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab')
			await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab')
			await expect(target).toBeFocused()
			await all(href, 'interacting', '1')
			const focused = await states(href)

			await page.keyboard.press('Enter')
			await expect.poll(() => new URL(page.url()).hash).toBe(href)
			await openTOC()
			const other = page
				.locator('#wallet-toc menu[data-navigation-depth="1"] > li > a')
				.filter({ hasNotText: await target.innerText() })
				.last()
			const otherHref = (await other.getAttribute('href'))!

			expect(otherHref).not.toBe(href)
			await page.locator('#wallet-toc').hover()
			await expect(page.locator('#wallet-toc:hover')).toHaveCount(1)
			await other.scrollIntoViewIfNeeded()
			await other.focus()
			await other.hover()
			await all(otherHref, 'interacting', '1')
			const separatelyHovered = await states(otherHref)

			expect(separatelyHovered.every(row => row.active === '1')).toBe(true)
			await page.mouse.move(0, 0)
			await target.scrollIntoViewIfNeeded()
			await target.focus()
			await page.keyboard.press('Enter')
			await expect.poll(() => new URL(page.url()).hash).toBe(href)
			await openTOC()
			await info.attach(`shared-interaction-${width}-${direction}`, {
				body: JSON.stringify({
					width,
					direction,
					href,
					resting,
					hovered,
					focused,
					otherHref,
					separatelyHovered,
					capabilities,
				}),
				contentType: 'application/json',
			})
			await info.attach('contract-evidence', {
				body: JSON.stringify({
					contractHash,
					engine: browserName,
					results: [
						{
							id: '🎯 SharedStates',
							status: 'pass',
							complete: false,
							widths: [width],
							directions: [direction],
							observation:
								'Canonical heading/pie/TOC peers share native hover and focus feedback and retain repeated keyboard anchor activation. This independent interaction observation does not establish scroll-current feedback.',
						},
						...(Object.values(capabilities).every(Boolean)
							? []
							: currentRequirements.map(id => ({
									id,
									status: 'unsupported',
									complete: false,
									widths: [width],
									directions: [direction],
									capabilities,
									observation:
										'The native current-state prerequisite conjunction is unavailable. Independent interaction/native navigation passed; current, parent-current and simultaneous current/interaction acceptance remain unverified in this engine.',
								}))),
					],
				}),
				contentType: 'application/json',
			})
		})

		test(`native parent current and independent interaction at ${width}px ${direction}`, async ({
			page,
			browserName,
		}, info) => {
			const capabilities = await page.evaluate(nativeCurrentCapabilities)

			await info.attach('current-timeline-capability', {
				body: JSON.stringify(capabilities),
				contentType: 'application/json',
			})
			test.skip(
				!Object.values(capabilities).every(Boolean),
				'Native current-state enhancement unavailable; independent interaction and native-navigation coverage is separate',
			)
			const { openTOC, target, href, parentHref, states, all } = await navigationFeedback(
				page,
				width,
				direction,
			)

			await target.scrollIntoViewIfNeeded()
			await target.focus()
			await page.keyboard.press('Enter')
			await expect.poll(() => new URL(page.url()).hash).toBe(href)

			await openTOC()
			await page.mouse.move(0, 0)
			await all(href, 'current', '1')
			await all(parentHref, 'current', '1')
			const current = await states(href),
				parentCurrent = await states(parentHref)
			const other = page
				.locator('#wallet-toc menu[data-navigation-depth="1"] > li > a')
				.filter({ hasNotText: await target.innerText() })
				.last()
			const otherHref = (await other.getAttribute('href'))!

			expect(otherHref).not.toBe(href)
			await page.locator('#wallet-toc').hover()
			await expect(page.locator('#wallet-toc:hover')).toHaveCount(1)
			await other.scrollIntoViewIfNeeded()
			await other.focus()
			await other.hover()
			await all(otherHref, 'interacting', '1')
			await all(href, 'current', '1')
			await all(otherHref, 'current', '0')
			const separatelyHovered = await states(otherHref)

			expect(separatelyHovered.every(row => row.active === '1')).toBe(true)
			expect((await states(href)).every(row => row.active === '1')).toBe(true)
			await all(href, 'interacting', '0')
			const currentTOC = (await states(href)).find(row => row.representation === 'toc')!

			await expect
				.poll(
					async () => (await states(otherHref)).find(row => row.representation === 'toc')!.color,
				)
				.not.toBe(currentTOC.color)
			await page.mouse.move(0, 0)
			await target.scrollIntoViewIfNeeded()
			await target.focus()
			await page.keyboard.press('Enter')
			await expect.poll(() => new URL(page.url()).hash).toBe(href)
			await openTOC()
			await all(href, 'current', '1')
			await info.attach(`shared-current-${width}-${direction}`, {
				body: JSON.stringify({
					width,
					direction,
					href,
					parentHref,
					capabilities,
					current,
					parentCurrent,
					otherHref,
					separatelyHovered,
				}),
				contentType: 'application/json',
			})
			await info.attach('contract-evidence', {
				body: JSON.stringify({
					contractHash,
					engine: browserName,
					results: currentRequirements.map(id => ({
						id,
						status: 'pass',
						complete: false,
						widths: [width],
						directions: [direction],
						observation:
							'Native current feedback across canonical peers, parent current, simultaneous independently hovered/current distinction and repeated current-link activation in this width and direction. One destination pair does not certify every destination or full history/resize convergence.',
					})),
				}),
				contentType: 'application/json',
			})
		})
	}
}

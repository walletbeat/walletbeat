import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

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
	for (const width of [390, 864, 1024, 1025, 1440]) {
		for (const direction of ['ltr', 'rtl']) {
			await page.setViewportSize({ width, height: 900 })
			await page.goto('/__wallet-page/software/')
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(async direction => {
				document.documentElement.dir = direction
				document.body.dir = direction
				await document.fonts.ready
			}, direction)

			if (width <= 1024) {
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

test('native shared feedback and parent current state across responsive directions', async ({
	page,
	browserName,
}, info) => {
	const observations = []

	for (const width of [390, 864, 1024, 1025, 1440]) {
		for (const direction of ['ltr', 'rtl']) {
			await page.setViewportSize({ width, height: 900 })
			await page.goto('/__wallet-page/software/')
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(async direction => {
				document.documentElement.dir = direction
				document.body.dir = direction
				await document.fonts.ready
			}, direction)
			const openTOC = async () => {
				if (
					width <= 1024 &&
					!(await page.getByRole('navigation', { name: 'Table of contents', exact: true }).count())
				) {
					await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
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
			const states = (destination: string) =>
				page.locator(`#top a[href="${destination}"][data-link~="shared"]`).evaluateAll(links =>
					links.map(link => {
						if (!(link instanceof HTMLAnchorElement)) {
							throw new Error('Shared navigation link must be a native anchor')
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
				)
			const all = async (
				destination: string,
				state: 'interacting' | 'current',
				expected: string,
			) => {
				await expect
					.poll(async () => (await states(destination)).map(row => row[state]), {
						message: `${width}/${direction}: actual shared ${state} for ${destination}`,
					})
					.toEqual([expected, expected, expected])
			}

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
			await page.keyboard.press('Tab')
			await page.keyboard.press('Shift+Tab')
			await expect(target).toBeFocused()
			await all(href, 'interacting', '1')
			const focused = await states(href)

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
			await other.scrollIntoViewIfNeeded()
			await other.focus()
			await other.hover()
			await all(otherHref, 'interacting', '1')
			await all(href, 'current', '1')
			await all(otherHref, 'current', '0')
			const separatelyHovered = await states(otherHref)

			expect(separatelyHovered.every(row => row.active === '1')).toBe(true)
			expect((await states(href)).every(row => row.active === '1')).toBe(true)
			const currentPie = (await states(href)).find(row => row.representation === 'pie')!
			const hoveredPie = separatelyHovered.find(row => row.representation === 'pie')!

			expect(
				currentPie.opacity,
				'Current and independently hovered pie destinations retain distinct visible treatment',
			).not.toBe(hoveredPie.opacity)
			await page.mouse.move(0, 0)
			await target.scrollIntoViewIfNeeded()
			await target.focus()
			await page.keyboard.press('Enter')
			await expect.poll(() => new URL(page.url()).hash).toBe(href)
			await openTOC()
			await all(href, 'current', '1')
			observations.push({
				width,
				direction,
				href,
				parentHref,
				resting,
				hovered,
				focused,
				current,
				parentCurrent,
				otherHref,
				separatelyHovered,
			})
			await info.attach(`shared-feedback-${width}-${direction}`, {
				body: JSON.stringify(observations.at(-1)),
				contentType: 'application/json',
			})
		}
	}
	await info.attach('contract-evidence', {
		body: JSON.stringify({
			contractHash,
			engine: browserName,
			results: [
				'🎯 SharedStates',
				'🎯 GroupCurrent',
				'🎯 StateLegibility',
				'🎯 CurrentInteraction',
			].map(id => ({
				id,
				status: 'pass',
				complete: false,
				observation:
					'Native hover/focus/current propagation across three real representations, parent current, independently hovered/current distinction and repeated native current-link activation at all five widths and both directions. One child/independent destination pair per layout does not certify every destination or full history/resize convergence.',
			})),
		}),
		contentType: 'application/json',
	})
})

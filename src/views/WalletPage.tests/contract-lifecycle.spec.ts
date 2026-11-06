import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { expect, test } from '../../../tests/browser/verified-test'

const widths = [390, 864, 1344, 1345, 1440]

test('real semantic owners survive scroll, reversal and both responsive crossings', async ({
	page,
	browserName,
}, info) => {
	await page.goto('/__wallet-page/software/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	const original = await page.locator('#top').evaluateHandle(root => ({
		root,
		header: root.querySelector(':scope > header'),
		title: root.querySelector('h1'),
		aside: root.querySelector(':scope > aside'),
		article: root.querySelector(':scope > article'),
		headings: [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')],
	}))
	const samples = []

	for (const [visit, width] of [...widths, 1344, 1345, 390].entries()) {
		await page.setViewportSize({ width, height: 900 })

		for (const fraction of [0, 0.3, 0.8, 1, 0.4, 0]) {
			await page.locator('#layout').evaluate(async (root, fraction) => {
				root.scrollTo({
					top: fraction * (root.scrollHeight - root.clientHeight),
					behavior: 'instant',
				})
				await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
			}, fraction)
			const state = await original.evaluate(original => {
				const root = document.querySelector('#top')!
				const headings = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')]
				const stage = root.querySelector('#stages')!
				const layout = document.querySelector('#layout')!
				const content = document.querySelector('#content')!
				const main = document.querySelector('main')!
				const site = document.querySelector('#nav')!
				const footer = content.querySelector(':scope > footer')!
				const bounds = footer.getBoundingClientRect()
				const column = content.getBoundingClientRect()

				return {
					scroll: layout.scrollTop,
					scrollExtent: layout.scrollHeight - layout.clientHeight,
					sameRoot: root === original.root,
					sameHeader:
						root.firstElementChild === original.header && original.header!.contains(original.title),
					sameHeadingOwners:
						headings.length === original.headings.length &&
						headings.every(
							(heading, index) => heading === original.headings[index] && heading.isConnected,
						),
					headingCount: headings.length,
					h1Count: document.querySelectorAll('h1').length,
					sameAside:
						root.querySelectorAll(':scope > aside').length === 1 &&
						root.querySelector(':scope > aside') === original.aside,
					sameArticle:
						root.querySelectorAll(':scope > article').length === 1 &&
						root.querySelector(':scope > article') === original.article,
					asideBeforeStage: !!(
						original.aside!.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING
					),
					distinctFrame:
						document.querySelectorAll('main').length === 1 &&
						!site.contains(main) &&
						!main.contains(site) &&
						site.getBoundingClientRect().width > 0 &&
						main.getBoundingClientRect().width > 0,
					footer: {
						position: getComputedStyle(footer).position,
						blockStart: getComputedStyle(footer).insetBlockStart,
						blockEnd: getComputedStyle(footer).insetBlockEnd,
						left: bounds.left,
						right: bounds.right,
						columnLeft: column.left,
						columnRight: column.right,
						documentTop: bounds.top + layout.scrollTop,
					},
				}
			})

			expect(state.sameRoot).toBe(true)
			expect(state.sameHeader).toBe(true)
			expect(state.sameHeadingOwners).toBe(true)
			expect(state.headingCount).toBeGreaterThan(10)
			expect(state.h1Count).toBe(1)
			expect(state.sameAside).toBe(true)
			expect(state.sameArticle).toBe(true)
			expect(state.asideBeforeStage).toBe(true)
			expect(state.distinctFrame).toBe(true)
			expect(['static', 'relative', 'sticky']).toContain(state.footer.position)

			if (state.footer.position === 'sticky') {
				// Inline detachment uses sticky positioning without creating block-axis sticking.
				expect(state.footer.blockStart).toBe('auto')
				expect(state.footer.blockEnd).toBe('auto')
			}

			expect(state.footer.left).toBeGreaterThanOrEqual(state.footer.columnLeft - 1)
			expect(state.footer.right).toBeLessThanOrEqual(state.footer.columnRight + 1)
			samples.push({ visit, width, fraction, ...state })
		}

		const delivered = samples.filter(sample => sample.visit === visit)

		expect(delivered[3].scroll).toBeGreaterThan(delivered[3].scrollExtent / 2)
		expect(delivered[0].scroll).toBeLessThanOrEqual(1)
		expect(delivered.at(-1)!.scroll).toBeLessThanOrEqual(1)

		for (let phase = 1; phase < delivered.length; phase++) {
			const previous = delivered[phase - 1]
			const current = delivered[phase]
			const direction = Math.sign(current.fraction - previous.fraction)

			expect(
				direction * (current.scroll - previous.scroll),
				'Every forward and reverse lifecycle phase delivers distinct scroll movement',
			).toBeGreaterThan(1)
		}
	}

	for (const width of widths) {
		const positions = samples
			.filter(sample => sample.width === width)
			.map(sample => sample.footer.documentTop)

		expect(
			Math.max(...positions) - Math.min(...positions),
			'Footer remains in ordinary root flow throughout forward/reverse scroll',
		).toBeLessThanOrEqual(1)
	}
	await original.dispose()
	await info.attach('native-owner-lifecycle', {
		body: JSON.stringify(samples),
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
			results: [
				'🏗️ HeaderAncestry',
				'🏗️ RealHeadings',
				'🏗️ SourceOrder',
				'🖼️ Frame',
				'🖼️ Footer',
			].map(id => ({
				id,
				status: 'pass',
				complete: true,
				evidence:
					'Original semantic owner identities, counts, source order and ordinary footer root coordinates survive forward/reverse scroll and responsive crossings at 390/864/1344/1345/1440px.',
				widths,
				fixture: 'software',
			})),
		}),
		contentType: 'application/json',
	})
})

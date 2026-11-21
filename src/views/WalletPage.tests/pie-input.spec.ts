import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { expect, test } from '../../../tests/browser/verified-test'
import { wbIconEmojiSequences } from '../../styles/wbicons'

const contractHash = createHash('sha256')
	.update(
		await readFile(new URL('../../../tests/browser/wallet-page-requirements.md', import.meta.url)),
	)
	.digest('hex')

for (const width of [390, 1440]) {
	test(`pie rendering and input capabilities at ${width}px`, async ({
		page,
		browserName,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		const state = await page.locator('.pie-navigation').evaluate(root => {
			const geometry = root.querySelector('.pie-navigation-geometry')!
			const bounds = ({ x, y, top, bottom, left, right, width, height }: DOMRectReadOnly) => ({
				x,
				y,
				top,
				bottom,
				left,
				right,
				width,
				height,
			})

			return {
				shape: CSS.supports('clip-path: shape(from 0 0, line to 1px 1px, close)'),
				path: CSS.supports('clip-path: path("M0 0L1 1Z")'),
				display: getComputedStyle(root).display,
				geometry: bounds(geometry.getBoundingClientRect()),
				links: [...root.querySelectorAll('a')].map(element => {
					const glyph = element.querySelector('.pie-navigation-icon')!
					const box = glyph.getBoundingClientRect()
					const x = box.x + box.width / 2,
						y = box.y + box.height / 2

					return {
						title: element.getAttribute('title'),
						text: element.textContent?.trim(),
						icon: element
							.querySelector('.pie-navigation-icon')
							?.getAttribute('data-icon')
							?.split(/\s+/)
							.at(-1),
						href: element.getAttribute('href'),
						clip: getComputedStyle(element).clipPath,
						opacity: getComputedStyle(element).opacity,
						scale: getComputedStyle(element).scale,
						glyph: bounds(box),
						hit: document.elementFromPoint(x, y)?.closest('a')?.getAttribute('href'),
					}
				}),
			}
		})

		await info.attach('pie-flow-frame', { body: await page.screenshot(), contentType: 'image/png' })
		await info.attach('native-pie-capabilities', {
			body: JSON.stringify(state, null, 2),
			contentType: 'application/json',
		})
		expect(state.display, JSON.stringify(state)).not.toBe('none')
		expect(state.geometry.width).toBeGreaterThan(0)

		for (const link of state.links) {
			const emoji = Object.entries(wbIconEmojiSequences).find(([icon]) => icon === link.icon)?.[1]

			expect(emoji).toBeTruthy()
			expect(link.title).toBe(`${emoji} ${link.text}`)
		}
		expect(
			state.links.length,
			'The label check must observe both navigation layers',
		).toBeGreaterThan(10)
		expect(
			state.links.filter(link => link.hit === link.href).length,
			JSON.stringify(state),
		).toBeGreaterThan(0)
		await info.attach('contract-evidence', {
			body: JSON.stringify({
				contractHash,
				engine: browserName,
				results: [
					{
						id: '🌸 PetalLabels',
						status: 'pass',
						complete: true,
						observation: `Every native pie link title at ${width}px equals its canonical semantic emoji followed by its rendered label; raw titles and glyph identities are attached`,
					},
				],
			}),
			contentType: 'application/json',
		})
	})
}

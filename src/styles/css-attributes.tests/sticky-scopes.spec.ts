import { readFile } from 'node:fs/promises'

import { expect, test } from '../../../tests/browser/verified-test'

const axes = ['BlockStart', 'BlockEnd', 'InlineStart', 'InlineEnd'] as const
const css = await readFile(new URL('../css-attributes.css', import.meta.url), 'utf8')
const inputs = (margin: number[], padding: number[]) =>
	`data-margin="${margin.join(',')}" data-padding="${padding.join(',')}" style="${axes.map((axis, index) => `--sticky-margin${axis}:${margin[index]}px;--sticky-padding${axis}:${padding[index]}px`).join(';')}"`
const branch = (prefix: string, depth = 6) =>
	Array.from(
		{ length: depth },
		(_, index) =>
			`<div class="wrapper"><section id="${prefix}-${index + 1}" data-sticky-container ${inputs(index === 2 ? [29, 31, 37, 41] : [3, 5, 7, 11], [13, 17, 19, 23])}><header data-sticky="block block-start inline inline-start">${prefix} ${index + 1}</header>`,
	).join('') +
	'<p>Inner content</p>' +
	'</section></div>'.repeat(depth)
const sizes = ['Block', 'Inline'] as const
const probes =
	axes
		.map(
			axis =>
				`@property --fixture-${axis} { syntax: "<length>"; inherits: false; initial-value: 0px; }`,
		)
		.join('') +
	sizes
		.map(
			axis =>
				`@property --fixture-size${axis} { syntax: "<length>"; inherits: false; initial-value: 0px; }`,
		)
		.join('') +
	`[data-sticky-container] { ${axes.map(axis => `--fixture-${axis}: var(--sticky-inset${axis})`).join(';')}; ${sizes.map(axis => `--fixture-size${axis}: var(--sticky-size${axis})`).join(';')} }`

for (const direction of ['ltr', 'rtl']) {
	for (const rootSticky of [false, true]) {
		test(`sticky scope recurrence and nested scroll resets in ${direction}, root sticky ${rootSticky}`, async ({
			page,
		}, info) => {
			await page.setViewportSize({ width: 1000, height: 800 })
			await page.setContent(`<!doctype html><html dir="${direction}"><head><style>${css}
${probes}
main{width:600px;height:360px}main,[data-scroll-container]{box-sizing:content-box;border:0;padding:0}#nested-only-child-1{min-height:700px}section{min-height:50px}header{width:80px;height:20px}[data-scroll-container] [data-scroll-container]{width:400px;height:150px}</style></head><body><main id="fixture-root" data-scroll-container ${rootSticky ? 'data-sticky-container' : ''} ${inputs([11, 13, 17, 19], [2, 3, 5, 7])}>${branch('outer')}<div class="wrapper"><section id="nested-parent" data-sticky-container ${inputs([3, 5, 7, 11], [13, 17, 19, 23])}><div id="nested-both" data-scroll-container data-sticky-container ${inputs([43, 47, 53, 59], [3, 5, 7, 11])}>${branch('nested-both-child', 3)}</div><div id="nested-only" data-scroll-container ${inputs([61, 67, 71, 73], [11, 13, 17, 19])}>${branch('nested-only-child', 3)}</div><section id="outer-sibling" data-sticky-container ${inputs([3, 5, 7, 11], [13, 17, 19, 23])}><header data-sticky="block block-start">Sibling</header></section></section></div></main></body></html>`)
			const rows = await page.evaluate(axes => {
				const values = (element: Element, attribute: string) => {
					const raw = element.getAttribute(attribute)

					if (raw === null) {
						throw new Error(`Missing fixture input ${attribute}`)
					}

					const result = raw.split(',').map(Number)

					if (result.length !== axes.length || !result.every(Number.isFinite)) {
						throw new Error('Invalid fixture axis inputs')
					}

					return result
				}

				return [...document.querySelectorAll('[data-sticky-container]')].map(element => {
					const scroller = element.parentElement?.closest('[data-scroll-container]') ?? null
					const chain: Element[] = []

					if (scroller) {
						for (
							let node: Element | null = element;
							node && node !== scroller;
							node = node.parentElement
						) {
							if (node.matches('[data-sticky-container]')) {
								chain.unshift(node)
							}
						}
					}

					const expected = values(scroller ?? element, 'data-margin')
					let previousPadding = values(scroller ?? element, 'data-padding')

					// The public ladder has five levels; deeper containers retain level five.
					for (const node of chain.slice(0, 5)) {
						const margin = values(node, 'data-margin')

						axes.forEach((_, index) => (expected[index] += previousPadding[index] + margin[index]))
						previousPadding = values(node, 'data-padding')
					}
					const style = getComputedStyle(element)

					if (scroller && !(scroller instanceof HTMLElement)) {
						throw new Error('Fixture scroll viewport must be HTML')
					}

					const viewport = scroller
						? [scroller.clientHeight, scroller.clientWidth]
						: [innerHeight, innerWidth]

					return {
						id: element.id,
						level: Number(style.getPropertyValue('--sticky-level')),
						expectedLevel: Math.min(chain.length, 5),
						insets: axes.map(axis =>
							Number.parseFloat(style.getPropertyValue(`--fixture-${axis}`)),
						),
						expected,
						sizes: ['Block', 'Inline'].map(axis =>
							Number.parseFloat(style.getPropertyValue(`--fixture-size${axis}`)),
						),
						expectedSizes: [
							viewport[0] - expected[0] - expected[1],
							viewport[1] - expected[2] - expected[3],
						],
						viewport,
						scrollOwner: scroller?.id ?? null,
					}
				})
			}, axes)

			await info.attach('sticky-scope-recurrence', {
				body: JSON.stringify({ direction, rootSticky, rows }, null, 2),
				contentType: 'application/json',
			})
			expect(rows).toHaveLength(rootSticky ? 16 : 15)

			for (const row of rows) {
				expect(row.level, row.id).toBe(row.expectedLevel)

				for (const [index, axis] of axes.entries()) {
					expect(Number.isFinite(row.insets[index]), `${row.id}: ${axis} resolves`).toBe(true)
					expect(
						Math.abs(row.insets[index] - row.expected[index]),
						`${row.id}: ${axis}`,
					).toBeLessThanOrEqual(0.01)
				}

				for (const [index, axis] of sizes.entries()) {
					expect(Number.isFinite(row.sizes[index]), `${row.id}: available ${axis} resolves`).toBe(
						true,
					)
					expect(
						Math.abs(row.sizes[index] - row.expectedSizes[index]),
						`${row.id}: available ${axis}`,
					).toBeLessThanOrEqual(0.01)
				}
			}
			const contact = await page.evaluate(() => {
				const root = document.querySelector<HTMLElement>('#fixture-root')!
				const nested = document.querySelector<HTMLElement>('#nested-only')!
				const section = document.querySelector<HTMLElement>('#nested-only-child-1')!
				const header = section.querySelector('header')!

				root.scrollTo({ top: root.scrollHeight, behavior: 'instant' })
				nested.scrollTo({ top: 200, behavior: 'instant' })
				const nestedBox = nested.getBoundingClientRect()
				const rootBox = root.getBoundingClientRect()
				const sectionBox = section.getBoundingClientRect()
				const headerBox = header.getBoundingClientRect()
				const margins = nested.getAttribute('data-margin')!.split(',').map(Number)
				const padding = nested.getAttribute('data-padding')!.split(',').map(Number)
				const childMargins = section.getAttribute('data-margin')!.split(',').map(Number)

				return {
					scrollTop: nested.scrollTop,
					rootScrollTop: root.scrollTop,
					inset: margins[0] + padding[0] + childMargins[0],
					actualInset: headerBox.top - nestedBox.top - nested.clientTop,
					headerTop: headerBox.top,
					headerBottom: headerBox.bottom,
					nestedTop: nestedBox.top,
					nestedBottom: nestedBox.top + nested.clientTop + nested.clientHeight,
					rootTop: rootBox.top,
					rootBottom: rootBox.top + root.clientTop + root.clientHeight,
					sectionBottom: sectionBox.bottom,
				}
			})

			await info.attach('nested-sticky-contact', {
				body: JSON.stringify(contact, null, 2),
				contentType: 'application/json',
			})
			expect(contact.scrollTop, 'Nested native scroll input must be delivered').toBe(200)
			expect(
				contact.rootScrollTop,
				'Outer root must scroll to expose the nested region',
			).toBeGreaterThan(0)
			expect(
				Math.abs(contact.actualInset - contact.inset),
				'Native header contacts the independent cumulative sticky inset',
			).toBeLessThanOrEqual(0.5)
			expect(contact.headerTop).toBeGreaterThanOrEqual(contact.nestedTop)
			expect(contact.headerBottom).toBeLessThanOrEqual(contact.nestedBottom)
			expect(contact.headerTop).toBeGreaterThanOrEqual(contact.rootTop)
			expect(contact.headerBottom).toBeLessThanOrEqual(contact.rootBottom)
			expect(contact.headerBottom).toBeLessThan(contact.sectionBottom)
		})
	}
}

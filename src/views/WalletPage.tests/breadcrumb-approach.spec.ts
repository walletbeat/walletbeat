import type { Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

async function settleDocumentTransitions(page: Page) {
	await expect
		.poll(
			() =>
				page.evaluate(
					() =>
						document.getAnimations().filter(animation => {
							const timing = animation.effect?.getComputedTiming()

							return (
								animation.timeline instanceof DocumentTimeline &&
								timing &&
								Number.isFinite(timing.endTime) &&
								(animation.playState === 'running' || animation.pending)
							)
						}).length,
				),
			{
				timeout: 5000,
				message: 'Finite document transitions must settle before comparing title paint',
			},
		)
		.toBe(0)
}

async function observeApproach(page: Page) {
	return page.evaluate(() => {
		const root = document.querySelector('#layout')
		const section = document.querySelector('#transparency')
		const heading = section?.querySelector('h2')
		const pie = document.querySelector('.pie-navigation-geometry')

		if (!root || !section || !heading || !pie) {
			throw new Error('Actual title, section, scroll and pie owners are required')
		}

		const rect = (box: DOMRect) => ({
			x: box.x,
			y: box.y,
			width: box.width,
			height: box.height,
		})
		const range = document.createRange()

		range.selectNodeContents(heading)
		const lines = [...range.getClientRects()].filter(box => box.width > 0 && box.height > 0)

		return {
			scroll: root.scrollTop,
			windowY: scrollY,
			section: {
				x: section.getBoundingClientRect().x,
				y: section.getBoundingClientRect().y,
			},
			root: rect(root.getBoundingClientRect()),
			heading: rect(heading.getBoundingClientRect()),
			range: rect(range.getBoundingClientRect()),
			lines: lines.map(rect),
			pie: rect(pie.getBoundingClientRect()),
		}
	})
}

type Approach = Awaited<ReturnType<typeof observeApproach>>

function expectSameApproach(actual: Approach, expected: Approach) {
	const differences: { field: string; actual: number; expected: number }[] = []
	const compare = (field: string, value: number, reference: number) => {
		if (
			!Number.isFinite(value) ||
			!Number.isFinite(reference) ||
			Math.abs(value - reference) > 0.5
		) {
			differences.push({ field, actual: value, expected: reference })
		}
	}

	for (const key of ['scroll', 'windowY'] as const) {
		compare(key, actual[key], expected[key])
	}

	for (const key of ['x', 'y'] as const) {
		compare(`section.${key}`, actual.section[key], expected.section[key])
	}

	for (const field of ['root', 'heading', 'range', 'pie'] as const) {
		for (const key of ['x', 'y', 'width', 'height'] as const) {
			compare(`${field}.${key}`, actual[field][key], expected[field][key])
		}
	}
	expect(actual.lines.length, 'Title line count stays fixed during paint comparison').toBe(
		expected.lines.length,
	)
	actual.lines.forEach((line, index) => {
		for (const key of ['x', 'y', 'width', 'height'] as const) {
			compare(`line.${index}.${key}`, line[key], expected.lines[index][key])
		}
	})
	expect(
		differences,
		'Only pie paint may change, while relevant geometry and scroll remain fixed',
	).toEqual([])
}

for (const direction of ['ltr', 'rtl'] as const) {
	test(`incoming H2 title stays clear of pie paint (${direction})`, async ({ page }, info) => {
		await page.setViewportSize({ width: 390, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(direction => {
			document.documentElement.dir = direction
		}, direction)
		await page.evaluate(() => document.fonts.ready)
		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('animation-timeline: scroll()') &&
					CSS.supports('animation-range: 0% 100%') &&
					CSS.supports('width: anchor-size(--breadcrumb-source inline)') &&
					CSS.supports('timeline-scope: --breadcrumb-size') &&
					CSS.supports('color: if(style(--a: 1): red)'),
			)),
			'Native breadcrumb enhancement unavailable',
		)
		const referenceImage = page.locator('#permissions-management .references img').first()

		if (await referenceImage.count()) {
			await referenceImage.evaluate(element =>
				element.scrollIntoView({ behavior: 'instant', block: 'center' }),
			)
			await expect
				.poll(
					() =>
						referenceImage.evaluate(
							element =>
								element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
						),
					{
						timeout: 15000,
						message: 'The identified lazy reference image must load before the deep seek',
					},
				)
				.toBe(true)
			await referenceImage.evaluate(async element => {
				if (!(element instanceof HTMLImageElement)) {
					throw new Error('Reference image must be native HTML')
				}

				await element.decode()
			})
		}

		await page.locator('#layout').evaluate(element => {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Scroll owner must be HTML')
			}

			element.style.scrollSnapType = 'none'
			element.style.scrollBehavior = 'auto'
			element.style.overflowAnchor = 'none'
		})
		const owner = page.locator('.pie-navigation-geometry')

		await expect(owner).toHaveCount(1)

		for (const top of [80, 60, 40, 20]) {
			await page.evaluate(async top => {
				const root = document.querySelector('#layout'),
					section = document.querySelector('#transparency')

				if (!root || !section) {
					throw new Error('Actual scroll destination absent')
				}

				for (let attempt = 0; attempt < 8; attempt++) {
					root.scrollTo({
						top: root.scrollTop + section.getBoundingClientRect().top - top,
						behavior: 'instant',
					})
					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)

					if (Math.abs(section.getBoundingClientRect().top - top) < 0.6) {
						break
					}
				}
			}, top)
			await settleDocumentTransitions(page)
			const natural = await observeApproach(page)

			expect(
				Math.abs(natural.section.y - top),
				'The actual section reaches the requested approach pose',
			).toBeLessThan(1)
			expect(natural.lines.length).toBeGreaterThan(0)
			expect(natural.range.x).toBeGreaterThanOrEqual(0)
			expect(natural.range.y).toBeGreaterThanOrEqual(0)
			expect(natural.range.x + natural.range.width).toBeLessThanOrEqual(390)
			expect(natural.range.y + natural.range.height).toBeLessThanOrEqual(900)
			const x = Math.floor(natural.range.x),
				y = Math.floor(natural.range.y)
			const clip = {
				x,
				y,
				width: Math.ceil(natural.range.x + natural.range.width) - x,
				height: Math.ceil(natural.range.y + natural.range.height) - y,
			}

			expect(clip.width).toBeGreaterThan(0)
			expect(clip.height).toBeGreaterThan(0)
			const naturalPng = await page.screenshot({ clip })

			expectSameApproach(await observeApproach(page), natural)
			const previousStyle = await owner.getAttribute('style')
			let hiddenPng: Buffer | undefined

			try {
				await owner.evaluate(element => element.style.setProperty('opacity', '0', 'important'))
				await settleDocumentTransitions(page)
				expect(
					await owner.evaluate(element => getComputedStyle(element).opacity),
					'The entire pie paint owner is hidden',
				).toBe('0')
				expectSameApproach(await observeApproach(page), natural)
				hiddenPng = await page.screenshot({ clip })
				expectSameApproach(await observeApproach(page), natural)
			} finally {
				await owner.evaluate(
					(element, style) =>
						style === null
							? element.removeAttribute('style')
							: element.setAttribute('style', style),
					previousStyle,
				)
			}

			await settleDocumentTransitions(page)
			expectSameApproach(await observeApproach(page), natural)
			const restoredPng = await page.screenshot({ clip })

			expectSameApproach(await observeApproach(page), natural)
			await info.attach(`approach-${top}-geometry`, {
				body: JSON.stringify(natural),
				contentType: 'application/json',
			})

			for (const [name, body] of [
				['natural', naturalPng],
				['hidden', hiddenPng],
				['restored', restoredPng],
			] as const) {
				if (body) {
					await info.attach(`approach-${top}-${name}`, {
						body,
						contentType: 'image/png',
					})
				}
			}
			expect(
				restoredPng.equals(naturalPng),
				'Restoring pie paint reproduces the natural title crop',
			).toBe(true)
			expect(
				hiddenPng?.equals(naturalPng),
				'Pie paint must not alter the complete incoming title region',
			).toBe(true)
		}
	})
}

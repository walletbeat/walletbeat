import type { Locator, Page } from '@playwright/test'

import { expect, test } from '../../../tests/browser/verified-test'

type OuterPosition = number[][]
type InitialPaneScroll = {
	index: number
	before: OuterPosition
	after: OuterPosition
	settled: OuterPosition | null
}

declare global {
	interface Window {
		referenceInitialPaneScrolls: InitialPaneScroll[]
	}
}

async function observeInitialPaneScrolling(page: Page) {
	await page.addInitScript(() => {
		window.referenceInitialPaneScrolls = []
		const nativeScrollTo: unknown = Object.getOwnPropertyDescriptor(
			Element.prototype,
			'scrollTo',
		)?.value

		if (typeof nativeScrollTo !== 'function') {
			throw new Error('Native element scrolling is unavailable')
		}

		const outerPosition = (element: Element): OuterPosition => {
			const positions = [[window.scrollX, window.scrollY]]

			for (let parent = element.parentElement; parent; parent = parent.parentElement) {
				positions.push([parent.scrollLeft, parent.scrollTop])
			}

			return positions
		}

		Element.prototype.scrollTo = function (
			this: Element,
			...args: [ScrollToOptions?] | [number, number]
		) {
			const pane = this.matches('.references .code-snippet pre')
			const before = pane ? outerPosition(this) : null

			Reflect.apply(nativeScrollTo, this, args)

			if (!before) {
				return
			}

			const record: InitialPaneScroll = {
				index: Array.from(document.querySelectorAll('.references .code-snippet pre')).indexOf(this),
				before,
				after: outerPosition(this),
				settled: null,
			}

			window.referenceInitialPaneScrolls.push(record)
			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					record.settled = outerPosition(this)
				}),
			)
		}
	})
}

async function paneState(pane: Locator) {
	return pane.evaluate(element => {
		if (!(element instanceof HTMLElement)) {
			throw new Error('Code pane must be an HTML element')
		}

		const box = element.getBoundingClientRect()
		const scale = box.height / element.offsetHeight
		const viewportTop = box.top + element.clientTop * scale
		const viewportBottom = viewportTop + element.clientHeight * scale
		const rows = Array.from(element.querySelectorAll('.row.highlighted'))
		const bounds = rows.map(row => row.getBoundingClientRect())
		const outer = [[window.scrollX, window.scrollY]]

		for (let parent = element.parentElement; parent; parent = parent.parentElement) {
			outer.push([parent.scrollLeft, parent.scrollTop])
		}
		const style = getComputedStyle(element)

		return {
			top: element.scrollTop,
			maximum: element.scrollHeight - element.clientHeight,
			citedVisible:
				bounds.length > 0 &&
				bounds.every(row => row.top >= viewportTop - 1 && row.bottom <= viewportBottom + 1),
			outer,
			focusVisible: element.matches(':focus-visible'),
			outlineWidth: parseFloat(style.outlineWidth),
			outlineStyle: style.outlineStyle,
			outlineColor: style.outlineColor,
		}
	})
}

function expectOuterStable(before: OuterPosition, after: OuterPosition) {
	expect(after).toHaveLength(before.length)
	expect(after[0]).toEqual(before[0])

	for (const [index, [x, y]] of after.entries()) {
		expect(Math.abs(x - before[index][0])).toBeLessThanOrEqual(1)
		expect(Math.abs(y - before[index][1])).toBeLessThanOrEqual(1)
	}
}

async function openAncestors(pane: Locator) {
	const ancestors = pane.locator('xpath=ancestor::details')
	const count = await ancestors.count()

	for (let index = 0; index < count; index++) {
		const details = ancestors.nth(index)

		if ((await details.getAttribute('open')) === null) {
			await details.locator(':scope > summary').click()
		}
	}
}

async function keyboardFocus(page: Page, pane: Locator) {
	await pane.locator('xpath=..').locator('figcaption a').focus()
	await page.keyboard.press('Tab')
	await expect(pane).toBeFocused()
	await expect(pane).toHaveAttribute('tabindex', '0')
	await expect(pane).toHaveAttribute('aria-label', /^Code: .+/)
	const focused = await paneState(pane)

	expect(focused.focusVisible).toBe(true)
	expect(focused.outlineWidth).toBeGreaterThanOrEqual(2)
	expect(focused.outlineStyle).toBe('solid')
	expect(focused.outlineColor).not.toBe('rgba(0, 0, 0, 0)')
}

async function settledPane(pane: Locator) {
	let previous = Number.NaN
	let stable = 0

	await expect
		.poll(
			async () => {
				const current = (await paneState(pane)).top

				stable = Math.abs(current - previous) < 0.25 ? stable + 1 : 0
				previous = current

				return stable
			},
			{ intervals: [100] },
		)
		.toBeGreaterThanOrEqual(3)

	return paneState(pane)
}

async function checkPane(page: Page, path: string) {
	await observeInitialPaneScrolling(page)
	await page.goto(path)
	await expect(page.locator('astro-island[ssr]:not([client="visible"])')).toHaveCount(0)
	const panes = page.locator('.references .code-snippet pre')

	await expect(panes.first()).toBeAttached()

	const candidates = await panes.evaluateAll(elements =>
		elements.map((element, index) => {
			const style = getComputedStyle(element)
			const line = parseFloat(style.lineHeight)
			const cap = parseFloat(style.maxBlockSize)
			const rows = Array.from(element.querySelectorAll('.row'))
			const highlighted = rows.flatMap((row, rowIndex) =>
				row.classList.contains('highlighted') ? [rowIndex] : [],
			)

			return {
				index,
				fits:
					highlighted.length > 0 &&
					(highlighted.at(-1)! - highlighted[0] + 1) * line < cap - 2 * line,
				overflows: rows.length * line > cap + 2 * line,
			}
		}),
	)
	const candidate = candidates.find(pane => pane.fits && pane.overflows)

	expect(
		candidate,
		'Consumer must contain an overflowing pane whose entire cited span fits',
	).toBeDefined()
	const pane = panes.nth(candidate!.index)
	const initiallyClosed = await pane.evaluate(
		element => element.closest('details:not([open])') !== null,
	)

	if (path.startsWith('/wallet/eip/')) {
		expect(initiallyClosed).toBe(true)
	}

	await test.step('first activation exposes every cited row', async () => {
		await openAncestors(pane)
		await page.evaluate(
			() =>
				new Promise<void>(resolve => {
					requestAnimationFrame(() =>
						requestAnimationFrame(() =>
							requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
						),
					)
				}),
		)
		await pane.evaluate((element, index) => {
			if (!window.referenceInitialPaneScrolls.some(record => record.index === index)) {
				element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
			}
		}, candidate!.index)
		await expect(pane.locator('xpath=ancestor::astro-island[1]')).not.toHaveAttribute('ssr', '')
		await expect.poll(async () => (await paneState(pane)).citedVisible).toBe(true)
		expect((await paneState(pane)).maximum).toBeGreaterThan(0)
	})

	await test.step('initial pane positioning leaves every outer scroll owner unchanged', async () => {
		await expect
			.poll(async () =>
				page.evaluate(
					index =>
						window.referenceInitialPaneScrolls.filter(
							record => record.index === index && record.settled !== null,
						).length,
					candidate!.index,
				),
			)
			.toBeGreaterThan(0)
		const records = await page.evaluate(
			index => window.referenceInitialPaneScrolls.filter(record => record.index === index),
			candidate!.index,
		)

		for (const record of records) {
			expectOuterStable(record.before, record.after)
			expect(record.settled).not.toBeNull()

			if (record.settled) {
				expectOuterStable(record.before, record.settled)
			}
		}
	})
	const initialPosition = (await paneState(pane)).top

	await pane.scrollIntoViewIfNeeded()
	const semantics = await pane.evaluate(element => {
		const figure = element.parentElement!
		const caption = figure.querySelector('figcaption')!
		const filename = caption.querySelector('code')
		const snippet = element.querySelector('code')!

		return {
			filename: filename?.textContent,
			font: filename && getComputedStyle(filename).fontFamily,
			snippetFont: getComputedStyle(snippet).fontFamily,
			captionFits: caption.scrollWidth <= figure.clientWidth + 1,
		}
	})

	expect(semantics.filename).toBeTruthy()
	expect(semantics.font).toBe(semantics.snippetFont)
	expect(semantics.captionFits).toBe(true)

	await test.step('native keyboard focus is visible', async () => {
		await keyboardFocus(page, pane)
	})
	const activated = await paneState(pane)

	await page.keyboard.press('Home')
	await expect.poll(async () => (await paneState(pane)).top).toBeLessThanOrEqual(1)
	const home = await settledPane(pane)

	expectOuterStable(activated.outer, home.outer)
	await page.keyboard.press('PageDown')
	await expect.poll(async () => (await paneState(pane)).top).toBeGreaterThan(home.top + 1)
	const manual = await settledPane(pane)

	expect(
		Math.abs(manual.top - initialPosition),
		'Manual position must differ from initial centering so reentry can detect unwanted reset',
	).toBeGreaterThan(2)
	expectOuterStable(home.outer, manual.outer)

	await test.step('viewport reentry preserves the manual position', async () => {
		await pane.evaluate(element => {
			for (let parent = element.parentElement; parent; parent = parent.parentElement) {
				parent.scrollTo({ top: 0, left: 0, behavior: 'instant' })
			}
			window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
		})
		await expect(pane).not.toBeInViewport()
		await pane.scrollIntoViewIfNeeded()
		expect((await settledPane(pane)).top).toBeCloseTo(manual.top, 0)
	})
	const details = pane.locator('xpath=ancestor::details[1]')

	expect(await details.count(), 'Consumer must exercise a disclosure').toBe(1)
	await test.step('disclosure reopening preserves the manual position', async () => {
		const summary = details.locator(':scope > summary')
		const rating = summary
			.locator(':scope > header [data-sticky-breadcrumb~="end"] > data[data-badge]')
			.last()
		const activationTarget = (await rating.count()) > 0 ? rating : summary

		await activationTarget.click()
		await expect(details).not.toHaveAttribute('open', '')
		await activationTarget.click()
		await pane.scrollIntoViewIfNeeded()
		expect((await settledPane(pane)).top).toBeCloseTo(manual.top, 0)
	})
}

async function checkImageClicks(page: Page) {
	const context = page.context()

	await page.goto('/ambire/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr]:not([client="visible"])')).toHaveCount(0)
	const link = page.locator('.references .inline-image > a, .references a.thumbnail').first()

	await expect(link).toHaveCount(1)
	await openAncestors(link)
	const island = link.locator('xpath=ancestor::astro-island[1]')

	await expect(island).not.toHaveAttribute('ssr', '')
	await expect(page).toHaveURL(new URL('/ambire/', page.url()).href)
	const original = await link.evaluate(element => {
		if (!(element instanceof HTMLAnchorElement)) {
			throw new Error('Reference image target must be an anchor')
		}

		return element.href
	})
	const location = page.url()
	const newPage = context.waitForEvent('page')

	await link.click({ modifiers: ['ControlOrMeta'] })
	const opened = await newPage

	try {
		await expect(opened).toHaveURL(original)
		expect(page.url()).toBe(location)
		await expect(page.getByRole('dialog', { name: 'Reference image viewer' })).not.toBeVisible()
	} finally {
		await opened.close()
	}

	const count = context.pages().length

	await link.click()
	const dialog = page.getByRole('dialog', { name: 'Reference image viewer' })

	await expect(dialog).toBeVisible()
	await expect(dialog.locator('img')).toHaveAttribute(
		'src',
		(await link.getAttribute('href')) ?? '',
	)
	expect(context.pages()).toHaveLength(count)
	await page.keyboard.press('Escape')
	await expect(dialog).not.toBeVisible()
	expect(page.url()).toBe(location)
}

for (const width of [390, 1280]) {
	test.describe(`reference interactions at ${width}px`, () => {
		test.use({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })

		for (const path of ['/ambire/?variant=BROWSER', '/wallet/eip/6963/']) {
			test(`${path} preserves cited visibility and manual pane scrolling`, async ({ page }) => {
				await checkPane(page, path)
			})
		}
		test('Ambire image links retain modified original navigation and plain-click lightbox', async ({
			page,
		}) => {
			await checkImageClicks(page)
		})
	})
}

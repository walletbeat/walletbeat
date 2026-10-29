import { expect, type Locator, type Page } from '@playwright/test'

type OuterPosition = {
	document: { x: number; y: number }
	ancestors: Array<{ tag: string; id: string; top: number; left: number }>
}
type InitialPaneScroll = {
	index: number
	label: string | null
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

		const outerPosition = (element: Element) => {
			const ancestors = []

			for (let parent = element.parentElement; parent; parent = parent.parentElement) {
				ancestors.push({
					tag: parent.tagName,
					id: parent.id,
					top: parent.scrollTop,
					left: parent.scrollLeft,
				})
			}

			return { document: { x: window.scrollX, y: window.scrollY }, ancestors }
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
				label: this.getAttribute('aria-label'),
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
		const ancestors = []

		for (let parent = element.parentElement; parent; parent = parent.parentElement) {
			ancestors.push({
				tag: parent.tagName,
				id: parent.id,
				top: parent.scrollTop,
				left: parent.scrollLeft,
			})
		}
		const style = getComputedStyle(element)

		return {
			top: element.scrollTop,
			maximum: element.scrollHeight - element.clientHeight,
			citedVisible:
				bounds.length > 0 &&
				bounds.every(row => row.top >= viewportTop - 1 && row.bottom <= viewportBottom + 1),
			ancestors,
			document: { x: window.scrollX, y: window.scrollY },
			focusVisible: element.matches(':focus-visible'),
			outlineWidth: parseFloat(style.outlineWidth),
			outlineStyle: style.outlineStyle,
			outlineColor: style.outlineColor,
		}
	})
}

function expectOuterStable(before: OuterPosition, after: OuterPosition) {
	expect(after.document).toEqual(before.document)
	expect(after.ancestors.map(({ tag, id }) => ({ tag, id }))).toEqual(
		before.ancestors.map(({ tag, id }) => ({ tag, id })),
	)

	for (const [index, ancestor] of after.ancestors.entries()) {
		expect(Math.abs(ancestor.top - before.ancestors[index].top)).toBeLessThanOrEqual(1)
		expect(Math.abs(ancestor.left - before.ancestors[index].left)).toBeLessThanOrEqual(1)
	}
}

async function openAncestors(pane: Locator) {
	const count = await pane.evaluate(element => {
		let count = 0

		for (let parent = element.parentElement; parent; parent = parent.parentElement) {
			if (parent instanceof HTMLDetailsElement) {
				count++
			}
		}

		return count
	})

	for (let index = 0; index < count; index++) {
		const details = pane.locator('xpath=ancestor::details').nth(index)

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

export async function runPaneContract(
	page: Page,
	path: string,
	step: (label: string, body: () => Promise<void>) => Promise<void> = async (_label, body) =>
		body(),
	observations: Record<string, unknown> = {},
) {
	await observeInitialPaneScrolling(page)
	await page.goto(path)
	await expect(page.locator('astro-island[ssr][client="load"]')).toHaveCount(0)
	const panes = page.locator('.references .code-snippet pre')

	await expect(panes.first()).toBeAttached()
	const island = panes.first().locator('xpath=ancestor::astro-island[1]')

	if ((await island.getAttribute('ssr')) !== null) {
		await island.locator(':scope > *').first().scrollIntoViewIfNeeded()
		await expect(island).not.toHaveAttribute('ssr', '')
	}

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

	observations.candidates = candidates
	observations.candidate = candidate

	expect(
		candidate,
		'Consumer must contain an overflowing pane whose entire cited span fits',
	).toBeDefined()
	const pane = panes.nth(candidate!.index)
	const initiallyClosed = await pane.evaluate(
		element => element.closest('details:not([open])') !== null,
	)

	observations.initiallyClosed = initiallyClosed

	if (path.startsWith('/wallet/eip/')) {
		expect(initiallyClosed).toBe(true)
	}

	await step('first activation exposes every cited row', async () => {
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
		observations.reveal = await pane.evaluate((element, index) => {
			if (window.referenceInitialPaneScrolls.some(record => record.index === index)) {
				return 'observer already activated; outer positioning held until samples complete'
			}

			element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })

			return 'native reveal completed before the observer could run'
		}, candidate!.index)
		await expect(pane.locator('xpath=ancestor::astro-island[1]')).not.toHaveAttribute('ssr', '')
		await expect.poll(async () => (await paneState(pane)).citedVisible).toBe(true)
		expect((await paneState(pane)).maximum).toBeGreaterThan(0)
		observations.firstActivation = await settledPane(pane)
	})

	await step('initial pane positioning leaves every outer scroll owner unchanged', async () => {
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

		observations.initialPositioning = records

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
		const section = element.closest('section.references')!
		const heading = section.querySelector('h2,h3,h4,h5,h6')!
		const owner = section.closest('details')
		const subject = owner?.querySelector(':scope > summary')?.querySelector('h1,h2,h3,h4,h5,h6')
		const filename = element.parentElement!.querySelector('figcaption .source-location')
		const style = filename && getComputedStyle(filename)
		const fontProbe = document.createElement('code')

		fontProbe.style.cssText =
			'position:absolute;visibility:hidden;font-family:var(--fontFamily-monospace)'
		element.parentElement!.append(fontProbe)
		const sharedFont = getComputedStyle(fontProbe).fontFamily

		fontProbe.remove()

		return {
			sourceLevel: Number(heading.tagName.slice(1)),
			subjectLevel: Number(subject?.tagName.slice(1)),
			subject: subject?.textContent?.trim(),
			subjectId: owner?.id,
			filename: filename?.textContent,
			font: style?.fontFamily,
			sharedFont,
			fontSize: style ? parseFloat(style.fontSize) : null,
			parentFontSize: filename
				? parseFloat(getComputedStyle(filename.parentElement!).fontSize)
				: null,
			wrap: style?.overflowWrap,
		}
	})

	observations.semantics = semantics
	expect(semantics.subject).toBeTruthy()
	expect(semantics.subjectLevel).toBe(path.startsWith('/ambire/') ? 3 : 4)
	expect(semantics.sourceLevel).toBe(semantics.subjectLevel + 1)
	expect(semantics.filename).toBeTruthy()
	expect(semantics.sharedFont).toContain('monospace')
	expect(semantics.font).toBe(semantics.sharedFont)
	expect(semantics.fontSize! / semantics.parentFontSize!).toBeCloseTo(0.85, 2)
	expect(semantics.wrap).toBe('anywhere')

	await step('native keyboard focus is visible', async () => {
		await keyboardFocus(page, pane)
	})
	const activated = await paneState(pane)

	observations.activated = activated
	await page.keyboard.press('Home')
	await expect.poll(async () => (await paneState(pane)).top).toBeLessThanOrEqual(1)
	const home = await settledPane(pane)

	observations.home = home
	expectOuterStable(activated, home)
	await page.keyboard.press('PageDown')
	await expect.poll(async () => (await paneState(pane)).top).toBeGreaterThan(home.top + 1)
	const manual = await settledPane(pane)

	observations.manual = manual
	expect(
		Math.abs(manual.top - initialPosition),
		'Manual position must differ from initial centering so reentry can detect unwanted reset',
	).toBeGreaterThan(2)
	expectOuterStable(home, manual)

	await step('viewport reentry preserves the manual position', async () => {
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
	await step('disclosure reopening preserves the manual position', async () => {
		await details.locator(':scope > summary').click()
		await expect(details).not.toHaveAttribute('open', '')
		await details.locator(':scope > summary').click()
		await pane.scrollIntoViewIfNeeded()
		expect((await settledPane(pane)).top).toBeCloseTo(manual.top, 0)
	})
	observations.final = await paneState(pane)

	return observations
}

export async function runImageContract(page: Page) {
	const context = page.context()

	await page.goto('/ambire/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr][client="load"]')).toHaveCount(0)
	const link = page.locator('.references .inline-image > a, .references a.thumbnail').first()

	await expect(link).toHaveCount(1)
	await openAncestors(link)
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

	return { original, location, pages: count }
}

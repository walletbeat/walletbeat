import { expect, test } from '../../../tests/browser/verified-test'

const enhancedNavigation = () =>
	CSS.supports('animation-timeline: scroll()') &&
	CSS.supports('width: anchor-size(--source inline)') &&
	CSS.supports('color: if(style(--a: 1): red)')

const currentIndex = (owner: Element) => {
	const value = getComputedStyle(owner).getPropertyValue('---pie-currentIndex').trim()
	const index = Number(value)

	if (!value || !Number.isFinite(index) || !Number.isInteger(index)) {
		throw new Error(`Missing or invalid shared navigation current index: ${value}`)
	}

	return index
}

const selectedDestinations = (links: Element[]) =>
	links
		.filter(
			link =>
				getComputedStyle(link).getPropertyValue('---navigation-snapAlign').trim() === 'center',
		)
		.map(link => new URL(link.getAttribute('href')!, document.baseURI).hash)

test('stage current state selects only criterion-related attribute pie slices and reverses', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 690, height: 900 })
	await page.goto('/metamask/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	test.skip(
		!(await page.evaluate(enhancedNavigation)),
		'Enhanced pie current state has separate fallback coverage',
	)
	await page.evaluate(() => document.fonts.ready)
	await page.locator('#layout').evaluate(element => {
		if (!(element instanceof HTMLElement)) {
			throw new Error('Expected native HTML scroll root')
		}

		element.style.scrollSnapType = 'none'
	})
	const slices = await page
		.locator('.pie-navigation a[href]')
		.evaluateAll(links =>
			links.map(link => new URL(link.getAttribute('href')!, document.baseURI).hash),
		)

	expect(slices).not.toContain('#security-news')
	expect(slices).not.toContain('#stages')
	const stages = await page
		.locator('#stages section[data-sticky-breadcrumb~="scope"]')
		.evaluateAll(elements => elements.map(element => element.id))

	expect(stages.length).toBeGreaterThan(0)
	const observations = []

	for (const id of ['stages', ...stages, ...stages.toReversed(), 'stages']) {
		const index = id === 'stages' ? -1 : -stages.indexOf(id) - 2

		await page.evaluate(
			async ({ id, index }) => {
				const stage = document.getElementById(id)!
				const details = stage.querySelector<HTMLDetailsElement>(':scope > details')

				if (details) {
					details.open = true
				}

				const settle = () =>
					new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)

				await settle()
				await Promise.race([
					Promise.all(
						document
							.getAnimations()
							.filter(
								animation =>
									animation.timeline instanceof DocumentTimeline &&
									animation.playState === 'running' &&
									animation.effect?.getComputedTiming().iterations !== Infinity,
							)
							.map(animation => animation.finished.catch(() => undefined)),
					),
					new Promise<never>((_, reject) =>
						setTimeout(
							() => reject(new Error('Native disclosure transitions did not settle')),
							2500,
						),
					),
				])
				await settle()
				const root = document.querySelector('#layout')!
				const owner = document.querySelector('.page-navigation')!
				const currentRank = () => {
					const state = getComputedStyle(owner).getPropertyValue('---pie-currentIndex').trim()
					const value = Number(state)

					if (!state || !Number.isFinite(value) || !Number.isInteger(value)) {
						throw new Error(`Missing or invalid shared navigation current index: ${state}`)
					}

					return value < 0 ? -value : value === 0 ? 0 : Infinity
				}
				const box = stage.getBoundingClientRect()
				let lower = Math.max(0, Math.floor(root.scrollTop + box.top - root.clientHeight))
				let upper = Math.min(
					root.scrollHeight - root.clientHeight,
					Math.ceil(root.scrollTop + box.bottom),
				)

				root.scrollTo({ top: upper, behavior: 'instant' })
				await settle()

				if (currentRank() < -index) {
					throw new Error(
						`No observed current interval for ${id} within its physical section bounds`,
					)
				}

				while (lower < upper) {
					const middle = Math.floor((lower + upper) / 2)

					root.scrollTo({ top: middle, behavior: 'instant' })
					await settle()

					if (currentRank() >= -index) {
						upper = middle
					} else {
						lower = middle + 1
					}
				}
				root.scrollTo({ top: lower, behavior: 'instant' })
				await settle()
			},
			{ id, index },
		)
		await expect.poll(() => page.locator('.page-navigation').evaluate(currentIndex)).toBe(index)
		const observation = await page.evaluate(id => {
			const rect = (box: DOMRect) => ({
				x: box.x,
				y: box.y,
				width: box.width,
				height: box.height,
				top: box.top,
				right: box.right,
				bottom: box.bottom,
				left: box.left,
			})
			const stage = document.getElementById(id)!
			const heading = stage.querySelector<HTMLElement>(
				':scope > header h2, :scope > details > summary h3',
			)!
			const presented =
				heading.querySelector<HTMLElement>('[data-sticky-breadcrumb~="item"]') ?? heading
			const headingBox = presented.getBoundingClientRect()
			const sectionBox = stage.getBoundingClientRect()
			const x = (Math.max(0, headingBox.left) + Math.min(innerWidth, headingBox.right)) / 2
			const y = (Math.max(0, headingBox.top) + Math.min(innerHeight, headingBox.bottom)) / 2
			const hit = document.elementFromPoint(x, y)
			const visibleHeading =
				headingBox.bottom > 0 && headingBox.top < innerHeight && !!hit && heading.contains(hit)

			const links = [...document.querySelectorAll<HTMLAnchorElement>('.pie-navigation a[href]')]
			const criteria = new Set(
				[
					...stage.querySelectorAll<HTMLAnchorElement>('[data-stage-criterion-rating] > a[href]'),
				].map(link => new URL(link.href).hash),
			)
			const selected = links.filter(link => criteria.has(link.hash))

			for (const link of [...selected]) {
				const parent = link
					.closest('menu[data-navigation-depth="1"]')
					?.parentElement?.querySelector<HTMLAnchorElement>(':scope > summary > a')

				if (parent) {
					selected.push(parent)
				}
			}

			return {
				id,
				visibleHeading,
				heading: rect(headingBox),
				section: rect(sectionBox),
				expected: id === 'stages' ? [] : [...new Set(selected.map(link => link.hash))].sort(),
				highlighted: links
					.filter(
						link => Number(getComputedStyle(link).getPropertyValue('---pie-highlighted')) === 1,
					)
					.map(link => link.hash),
				actual: links
					.filter(link => getComputedStyle(link).getPropertyValue('---pie-relevant').trim() === '1')
					.map(link => link.hash)
					.sort(),
				slices: links.map(link => link.hash),
			}
		}, id)

		await info.attach(`stage-${observations.length}`, {
			body: JSON.stringify(observation, null, 2),
			contentType: 'application/json',
		})
		expect(
			observation.visibleHeading,
			`${id} heading participates visibly in its discovered current interval`,
		).toBe(true)
		expect(observation.section.bottom).toBeGreaterThan(observation.heading.top)
		expect(observation.slices).toEqual(slices)
		expect(observation.actual).toEqual(observation.expected)
		expect(observation.highlighted).toEqual([])

		if (id === stages[2] && observations.length === 3) {
			await info.attach('stage-related-pie', {
				body: await page.screenshot(),
				contentType: 'image/png',
			})
		}

		observations.push(observation)
	}
	const attribute = page.locator('article .attribute-group .attribute[id]').first()
	const attributeId = await attribute.getAttribute('id')

	expect(attributeId, 'The selected attribute must have a real destination').toBeTruthy()

	await attribute.evaluate(async element => {
		for (let parent: Element | null = element; parent; parent = parent.parentElement) {
			if (parent instanceof HTMLDetailsElement) {
				parent.open = true
			}
		}
		await new Promise<void>(resolve =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
		)
		const root = document.querySelector('#layout')!

		root.scrollTo({
			top: root.scrollTop + element.getBoundingClientRect().top + 250,
			behavior: 'instant',
		})
	})
	await expect
		.poll(() => page.locator('.page-navigation').evaluate(currentIndex))
		.toBeGreaterThan(0)
	await expect
		.poll(() => page.locator('.pie-navigation a[href]').evaluateAll(selectedDestinations))
		.toEqual([`#${attributeId}`])
	await expect
		.poll(() =>
			page
				.locator('.pie-navigation a[href]')
				.evaluateAll(links =>
					links
						.filter(
							link => getComputedStyle(link).getPropertyValue('---pie-highlighted').trim() === '1',
						)
						.map(link => new URL(link.getAttribute('href')!, document.baseURI).hash),
				),
		)
		.toEqual([`#${attributeId}`])

	await info.attach('stage-pie-current', {
		body: JSON.stringify(observations, null, 2),
		contentType: 'application/json',
	})
})

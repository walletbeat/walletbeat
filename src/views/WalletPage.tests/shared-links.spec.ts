import { expect, test } from '../../../tests/browser/verified-test'

test('shared destination bindings and native feedback survive variant changes', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 1440, height: 900 })
	await page.goto('/__wallet-page/software/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	const bindings = () =>
		page.locator('#top').evaluate(root => {
			const groups = new Map<
				string,
				{
					name: string
					sources: string
					target: string | null
					representation: string
					attribute: boolean
				}[]
			>()

			for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
				const url = new URL(link.href)

				if (
					url.origin !== location.origin ||
					url.pathname !== location.pathname ||
					url.search !== location.search ||
					url.hash.length <= 1
				) {
					continue
				}

				const owner = document.getElementById(decodeURIComponent(url.hash.slice(1)))
				const values = groups.get(url.href) ?? []

				values.push({
					name: link.getAttribute('data-pressable-name') ?? '',
					sources: getComputedStyle(link).getPropertyValue('--link-current-sources').trim(),
					target: owner?.id ?? null,
					attribute: Boolean(
						owner?.matches('.attribute-group, .attribute-group section.attribute'),
					),
					representation: link.closest('.pie-navigation')
						? 'pie'
						: link.closest('#wallet-toc')
							? 'toc'
							: link.closest('[data-stage-criterion-rating]')
								? 'criterion'
								: link.closest('h2,h3') || link.querySelector('h2,h3')
									? 'heading'
									: 'other',
				})
				groups.set(url.href, values)
			}

			return [...groups].map(([href, links]) => ({ href, links }))
		})
	const check = (groups: Awaited<ReturnType<typeof bindings>>) => {
		expect(groups.length).toBeGreaterThan(0)

		for (const group of groups) {
			expect(group.links.length, group.href).toBeGreaterThan(0)

			if (group.links.some(link => link.attribute)) {
				for (const representation of ['pie', 'toc', 'heading']) {
					expect(
						group.links.filter(link => link.representation === representation).length,
						`${group.href}: ${representation}`,
					).toBe(1)
				}
			}

			expect(
				group.links.every(link => link.target),
				group.href,
			).toBe(true)

			if (group.links.length < 2) {
				continue
			}

			expect(
				group.links.every(link => link.name && link.sources),
				group.href,
			).toBe(true)
			expect(new Set(group.links.map(link => link.name)), group.href).toEqual(
				new Set([new URL(group.href).hash]),
			)
		}
	}
	const before = await bindings()

	check(before)
	const picker = page.getByRole('combobox', { name: 'Wallet version', exact: true })

	for (const key of ['m', 'a']) {
		await page.keyboard.press('Tab')
		await picker.focus()

		if (key === 'm') {
			await page.keyboard.press(key)
			await page.keyboard.press('Enter')
		} else {
			await picker.selectOption('')
		}

		await expect.poll(() => new URL(page.url()).searchParams.has('variant')).toBe(key === 'm')
		await page
			.locator('#top')
			.evaluate(
				() =>
					new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					),
			)
		const after = await bindings()

		await info.attach(`bindings-after-${key}`, {
			body: JSON.stringify(after),
			contentType: 'application/json',
		})
		check(after)
		const href = await page
			.locator('.pie-navigation menu[data-navigation-depth="1"] > li > a')
			.first()
			.getAttribute('href')
		const nativeTarget = page.locator(`#wallet-toc a[href="${href}"]`)
		const interaction = () =>
			page
				.locator('#top a[href]')
				.evaluateAll(
					(links, href) =>
						links
							.filter(
								link =>
									new URL(link.getAttribute('href')!, document.baseURI).href ===
									new URL(href!, location.href).href,
							)
							.map(link => getComputedStyle(link).getPropertyValue('---link-interacting').trim()),
					href,
				)
		const sharedCount = (await interaction()).length

		expect(sharedCount).toBeGreaterThanOrEqual(3)
		await nativeTarget.scrollIntoViewIfNeeded()
		await nativeTarget.hover()
		await expect
			.poll(interaction, {
				message: 'Variant updates preserve actual shared hover feedback, not only matching names',
			})
			.toEqual(Array(sharedCount).fill('1'))
		await page.mouse.move(0, 0)
		await expect.poll(interaction).toEqual(Array(sharedCount).fill('0'))
		await page.keyboard.press('Tab')
		await nativeTarget.focus()
		await expect(nativeTarget).toBeFocused()
		await expect
			.poll(() => nativeTarget.evaluate(link => link.matches(':focus-visible')))
			.toBe(true)
		await expect
			.poll(interaction, {
				message: 'Variant updates preserve actual shared keyboard-focus feedback',
			})
			.toEqual(Array(sharedCount).fill('1'))
		await info.attach(`variant-feedback-${key}`, {
			body: JSON.stringify({ href, interaction: await interaction() }),
			contentType: 'application/json',
		})
	}
})

test('destination feedback keeps current, focus and hover independent across own and parent peers', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 1440, height: 900 })
	await page.goto('/__wallet-page/software/')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await expect
		.poll(() =>
			page.locator('[data-wallet-peer-fallback]').evaluate(element => {
				if (!(element instanceof HTMLStyleElement)) {
					throw new Error('Native fallback stylesheet absent')
				}

				return element.sheet?.cssRules.length ?? 0
			}),
		)
		.toBe(0)
	const destinations = await page.locator('#wallet-toc a[href]').evaluateAll(links => {
		return links.flatMap(link => {
			if (!(link instanceof HTMLAnchorElement)) {
				throw new Error('TOC destinations must be native anchors')
			}

			const url = new URL(link.href)
			const target = document.getElementById(decodeURIComponent(url.hash.slice(1)))

			return target?.matches('.attribute-group section.attribute') ? [url.hash] : []
		})
	})

	expect(new Set(destinations).size).toBeGreaterThanOrEqual(3)
	const [current, focused, hovered] = [...new Set(destinations)]
	const toc = (hash: string) => page.locator(`#wallet-toc a[href="${hash}"]`)
	const snapshot = () =>
		page.locator('#top').evaluate(root => {
			return Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]')).flatMap(link => {
				const url = new URL(link.href)

				if (
					url.origin !== location.origin ||
					url.pathname !== location.pathname ||
					url.search !== location.search ||
					!url.hash
				) {
					return []
				}

				const target = document.getElementById(decodeURIComponent(url.hash.slice(1)))

				if (!target) {
					return []
				}

				const parent = target.parentElement?.closest('.attribute-group[id], .security-news[id]')
				const style = getComputedStyle(link)

				return [
					{
						hash: url.hash,
						parent: parent ? `#${parent.id}` : null,
						interacting: style.getPropertyValue('---link-interacting').trim(),
						current: style.getPropertyValue('---link-current').trim(),
						active: style.getPropertyValue('---link-active').trim(),
						opacity: style.opacity,
						scale: style.scale,
						color: style.color,
						decoration: style.textDecorationColor,
						decorationLine: style.textDecorationLine,
						camouflaged: link.matches('[data-link~="camouflaged"]'),
					},
				]
			})
		})
	const checkInteractions = async (sources: string[]) => {
		await expect
			.poll(
				async () => {
					const state = await snapshot()
					const expected = new Set(sources)

					for (const source of sources) {
						const parent = state.find(link => link.hash === source)?.parent

						if (parent) {
							expected.add(parent)
						}
					}

					return state.filter(
						link =>
							link.interacting !== (expected.has(link.hash) ? '1' : '0') ||
							(expected.has(link.hash) &&
								!link.camouflaged &&
								!link.decorationLine.includes('underline')),
					)
				},
				{
					message:
						'Actual feedback matches canonical fragment destinations and structural parents, including unrelated negatives',
				},
			)
			.toEqual([])
	}

	const currentCapability = await page.evaluate(
		() =>
			CSS.supports('animation-timeline: --destination') &&
			CSS.supports('view-timeline-name: --destination') &&
			CSS.supports('timeline-scope: --link') &&
			CSS.supports('color: if(style(---link-active: 1): red; else: blue)'),
	)

	await info.attach('current-timeline-capability', {
		body: JSON.stringify({
			supported: currentCapability,
			coverage: currentCapability
				? 'asserted below'
				: 'unobserved: native scroll timelines unsupported; interaction fallback remains asserted',
		}),
		contentType: 'application/json',
	})
	await toc(current).click()
	await page.mouse.move(0, 0)

	if (currentCapability) {
		await expect
			.poll(async () =>
				(await snapshot()).filter(link => link.hash === current).map(link => link.current),
			)
			.toEqual(Array((await snapshot()).filter(link => link.hash === current).length).fill('1'))
	}

	await page.keyboard.press('Tab')
	await toc(focused).focus()
	await expect(toc(focused)).toBeFocused()
	await expect.poll(() => toc(focused).evaluate(link => link.matches(':focus-visible'))).toBe(true)
	await toc(hovered).hover()
	await checkInteractions([focused, hovered])

	if (currentCapability) {
		await expect
			.poll(async () =>
				(await snapshot())
					.filter(link => link.hash === current)
					.every(link => link.current === '1' && link.active === '1'),
			)
			.toBe(true)
	}

	await info.attach('independent-current-focus-hover', {
		body: JSON.stringify({ current, focused, hovered, state: await snapshot() }),
		contentType: 'application/json',
	})
	await page.mouse.move(0, 0)
	await checkInteractions([focused])
	const glyphPoint = await page
		.locator(`.pie-navigation a[href="${focused}"] .pie-navigation-icon`)
		.evaluate(glyph => {
			const box = glyph.getBoundingClientRect()
			const x = box.x + box.width / 2,
				y = box.y + box.height / 2

			return {
				x,
				y,
				width: box.width,
				height: box.height,
				hit: document.elementFromPoint(x, y)?.closest('a')?.getAttribute('href'),
			}
		})

	await info.attach('same-destination-pie-hit', {
		body: JSON.stringify({ focused, ...glyphPoint }),
		contentType: 'application/json',
	})
	expect(glyphPoint.width).toBeGreaterThan(0)
	expect(glyphPoint.height).toBeGreaterThan(0)
	expect(glyphPoint.hit).toBe(focused)
	await page.mouse.move(glyphPoint.x, glyphPoint.y)
	await checkInteractions([focused])
	await page.mouse.move(0, 0)
	await checkInteractions([focused])
	await toc(focused).evaluate(link => {
		if (!(link instanceof HTMLElement)) {
			throw new Error('Focused TOC link must be an HTML element')
		}

		link.blur()
	})
	await checkInteractions([])
	await toc(hovered).hover()
	await page.mouse.down()
	await page.waitForTimeout(1200)
	await expect
		.poll(async () =>
			(await snapshot())
				.filter(link => link.hash === hovered)
				.every(link => Number.parseFloat(link.opacity) < 1 && Number.parseFloat(link.scale) < 1),
		)
		.toBe(true)
	await page.mouse.up()
	await page.mouse.move(0, 0)
	await expect(page.locator('#top [data-pressable-state~="pressed"]')).toHaveCount(0)
})

test('peer feedback retains its native stylesheet without JavaScript', async ({ browser }) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		viewport: { width: 1440, height: 900 },
	})

	try {
		const page = await context.newPage()

		await page.goto('/__wallet-page/software/')
		await expect
			.poll(() =>
				page.locator('[data-wallet-peer-fallback]').evaluate(element => {
					if (!(element instanceof HTMLStyleElement)) {
						throw new Error('Native fallback stylesheet absent')
					}

					return element.sheet?.cssRules.length ?? 0
				}),
			)
			.toBeGreaterThan(0)
		const source = page
			.locator('#wallet-toc a[data-pressable-targets]')
			.filter({ hasText: 'Scam prevention' })
			.first()
		const identity = await source.getAttribute('data-pressable-name')

		await source.scrollIntoViewIfNeeded()
		await source.hover()
		await expect
			.poll(() =>
				page
					.locator(`#top a[data-pressable-name="${identity}"]`)
					.evaluateAll(owners =>
						owners.map(owner =>
							getComputedStyle(owner).getPropertyValue('---link-interacting').trim(),
						),
					),
			)
			.toEqual(['1', '1', '1'])
	} finally {
		await context.close()
	}
})

for (const width of [690, 1440]) {
	for (const family of ['group', 'leaf'] as const) {
		test(`pie interaction paints shared navigation peers and releases for ${family} at ${width}px`, async ({
			page,
		}, info) => {
			await page.setViewportSize({ width, height: 900 })
			await page.goto('/metamask/?variant=BROWSER')
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(() => document.fonts.ready)
			const revealLeaf = async () => {
				const point = await page.locator('.pie-navigation summary > a').evaluateAll(links => {
					for (const link of links) {
						const box = link.querySelector('.pie-navigation-icon')?.getBoundingClientRect()

						if (!box) {
							continue
						}

						const x = box.left + box.width / 2,
							y = box.top + box.height / 2

						if (document.elementFromPoint(x, y)?.closest('a') === link) {
							return { x, y }
						}
					}
					throw new Error('No native group control to reveal its leaves')
				})

				await page.mouse.move(point.x, point.y)
				await expect
					.poll(() =>
						page.locator('.pie-navigation details[data-pressable-state~="interacting"]').count(),
					)
					.toBeGreaterThan(0)
			}

			if (family === 'leaf') {
				await revealLeaf()
			}

			const hit = await page.locator('.pie-navigation').evaluate((root, family) => {
				for (const link of root.querySelectorAll<HTMLAnchorElement>('a[data-pressable-name]')) {
					if ((link.closest('summary') !== null) !== (family === 'group')) {
						continue
					}

					const icon = link.querySelector('.pie-navigation-icon')

					if (!icon) {
						continue
					}

					const box = icon.getBoundingClientRect()

					if (box.width === 0 || box.height === 0) {
						const area = root.querySelector('.pie-navigation-geometry')!.getBoundingClientRect()

						for (let y = Math.max(0, area.top); y < Math.min(innerHeight, area.bottom); y += 8) {
							for (let x = Math.max(0, area.left); x < Math.min(innerWidth, area.right); x += 8) {
								if (document.elementFromPoint(x, y)?.closest('a') === link) {
									return { x, y, name: link.getAttribute('data-pressable-name')! }
								}
							}
						}
						continue
					}

					const x = box.left + box.width / 2,
						y = box.top + box.height / 2

					if (document.elementFromPoint(x, y)?.closest('a') === link) {
						return { x, y, name: link.getAttribute('data-pressable-name')! }
					}
				}
				throw new Error('No native hit-testable pie destination')
			}, family)
			const peer = page.locator(`#wallet-toc a[data-pressable-name="${hit.name}"]`)

			await expect(peer).toHaveCount(1)
			await peer.scrollIntoViewIfNeeded()
			await expect(peer).toBeInViewport()
			const paint = () =>
				peer.evaluate(link => {
					const owner = link.closest('summary') ?? link
					const style = getComputedStyle(owner)

					return {
						state: link.getAttribute('data-pressable-state'),
						background: getComputedStyle(owner, owner.matches('[data-sticky]') ? '::before' : null)
							.backgroundColor,
						color: style.color,
						opacity: getComputedStyle(link).opacity,
						scale: getComputedStyle(link).scale,
						grayscale: style.getPropertyValue('--icon-grayscale-filter').trim(),
					}
				})

			if (family === 'group') {
				await page.mouse.move(0, 0)
			}

			const baseline = await paint()

			await expect
				.poll(() =>
					page.evaluate(({ x, y, name }) => {
						const link = document.elementFromPoint(x, y)?.closest('a')

						return (
							link?.getAttribute('data-pressable-name') === name &&
							Boolean(link.closest('.pie-navigation'))
						)
					}, hit),
				)
				.toBe(true)
			await page.mouse.move(hit.x, hit.y)
			const source = page.locator(`.pie-navigation a[data-pressable-name="${hit.name}"]`)

			await expect.poll(() => source.evaluate(link => link.matches(':hover'))).toBe(true)
			await expect
				.poll(() => peer.evaluate(link => link.matches(':hover, :focus-within')))
				.toBe(false)
			await expect.poll(async () => (await paint()).state).toContain('interacting')
			await expect.poll(async () => (await paint()).background).not.toBe(baseline.background)
			await expect.poll(async () => (await paint()).grayscale).toBe('none')
			// Isolate transient press feedback from the independently tested fragment navigation.
			await source.evaluate(link =>
				link.addEventListener('click', event => event.preventDefault(), { once: true }),
			)

			try {
				await page.mouse.down()
				await expect.poll(async () => (await paint()).state).toContain('pressed')
				await expect.poll(async () => Number((await paint()).opacity)).toBeLessThan(1)
			} finally {
				await page.mouse.up()
			}

			await expect.poll(async () => (await paint()).state ?? '').not.toContain('pressed')
			await page.mouse.move(0, 0)
			await expect.poll(async () => (await paint()).state).toBeNull()
			await expect.poll(async () => (await paint()).background).toBe(baseline.background)
			await page.keyboard.press('Tab')

			if (family === 'leaf') {
				await revealLeaf()
			}

			await source.focus()
			await expect.poll(async () => (await paint()).state).toContain('interacting')
			await expect.poll(async () => (await paint()).background).not.toBe(baseline.background)
			await info.attach('shared-peer-paint', {
				body: JSON.stringify({ hit, baseline, focused: await paint() }),
				contentType: 'application/json',
			})
		})
	}
}

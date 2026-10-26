import { expect, test } from '../../../tests/browser/verified-test'

for (const width of [1400, 690]) {
	test(`TOC snap ownership and viewport hover at ${width}px`, async ({
		page,
		browserName,
	}, info) => {
		await page.setViewportSize({ width, height: 1000 })
		await page.goto('/metamask/?variant=BROWSER#l1-provider-independence')
		await page.locator('astro-island[ssr]:has(#top)').waitFor({ state: 'detached', timeout: 60000 })
		await page.evaluate(() => document.fonts.ready)

		if (width === 690) {
			await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
		}

		const owner = page.locator(width === 1400 ? '.page-navigation' : '#wallet-toc')
		const enhanced = await page.evaluate(
			() =>
				CSS.supports('animation-timeline: scroll()') &&
				CSS.supports('color: if(style(--state: 1): red)'),
		)

		if (browserName !== 'firefox') {
			expect(enhanced).toBe(true)
		}

		if (!enhanced) {
			info.annotations.push({
				type: 'capability',
				description:
					'Current-item enhancement unavailable; native hover and scroll fallback remains covered.',
			})
			await owner.scrollIntoViewIfNeeded()
		}

		const read = () =>
			owner.evaluate(port => {
				const nav = document.querySelector('#wallet-toc')!
				const frame = port.getBoundingClientRect()
				const portStyle = getComputedStyle(port)
				const paint = (style: CSSStyleDeclaration) => [
					style.transform,
					style.scale,
					style.translate,
					style.rotate,
					style.offsetPath,
				]
				const areas = [...nav.querySelectorAll('*')].flatMap(element => {
					const pseudos = element.matches('li:has(>details)') ? [null, '::before'] : [null]

					return pseudos.flatMap(pseudo => {
						const style = getComputedStyle(element, pseudo)

						if (
							style.scrollSnapAlign === 'none' ||
							!element.checkVisibility() ||
							(pseudo && ['none', 'normal'].includes(style.content))
						) {
							return []
						}

						const box = element.getBoundingClientRect()
						const carrier = getComputedStyle(element)
						const number = (value: string) => parseFloat(value) || 0
						const dimension = (axis: 'width' | 'height') => {
							if (!pseudo) {
								return box[axis]
							}

							const edges =
								axis === 'width'
									? [
											style.paddingLeft,
											style.paddingRight,
											style.borderLeftWidth,
											style.borderRightWidth,
										]
									: [
											style.paddingTop,
											style.paddingBottom,
											style.borderTopWidth,
											style.borderBottomWidth,
										]

							return (
								parseFloat(style[axis]) +
								(style.boxSizing === 'border-box'
									? 0
									: edges.reduce((sum, edge) => sum + number(edge), 0))
							)
						}
						const width = dimension('width'),
							height = dimension('height')

						if (!(width > 0 && height > 0)) {
							return []
						}

						return [
							{
								href:
									element.getAttribute('data-pressable-name') ??
									element.querySelector(':scope > details')?.getAttribute('data-pressable-name') ??
									element.getAttribute('href'),
								width,
								height,
								x: box.left - frame.left + port.scrollLeft + width / 2,
								y: box.top - frame.top + port.scrollTop + height / 2,
								paint: paint(style),
								carrierPaint: paint(carrier),
								originEdges: pseudo
									? [
											style.marginLeft,
											style.marginTop,
											style.marginRight,
											style.marginBottom,
											carrier.paddingLeft,
											carrier.paddingTop,
											carrier.paddingRight,
											carrier.paddingBottom,
											carrier.borderLeftWidth,
											carrier.borderTopWidth,
											carrier.borderRightWidth,
											carrier.borderBottomWidth,
										].map(value => parseFloat(value))
									: [],
								alignment: pseudo
									? [
											style.alignSelf,
											style.justifySelf,
											carrier.alignItems,
											carrier.justifyItems,
											carrier.alignContent,
											carrier.justifyContent,
										]
									: [],
								position: style.position,
								cell: pseudo
									? [
											style.gridRowStart,
											style.gridColumnStart,
											style.gridRowEnd,
											style.gridColumnEnd,
										]
									: null,
							},
						]
					})
				})
				const summary = nav.querySelector(
					'details[data-pressable-name="#self-sovereignty"] > summary',
				)!
				const link = nav.querySelector('a[href="#l1-provider-independence"]')!
				const header = summary.getBoundingClientRect()

				return {
					areas,
					hovered: port.matches(':hover'),
					navHovered: nav.matches(':hover'),
					snap: portStyle.scrollSnapType,
					overflow: portStyle.overflowY,
					navOverflow: getComputedStyle(nav).overflowY,
					top: port.scrollTop,
					max: port.scrollHeight - port.clientHeight,
					center:
						port.clientTop +
						(port.clientHeight +
							(parseFloat(portStyle.scrollPaddingTop) || 0) -
							(parseFloat(portStyle.scrollPaddingBottom) || 0)) /
							2,
					open: summary.parentElement!.hasAttribute('open'),
					header: { width: header.width, height: header.height },
					linkScale: parseFloat(getComputedStyle(link).scale) || 1,
					summaryScale: parseFloat(getComputedStyle(summary).scale) || 1,
					pressedScale: parseFloat(
						getComputedStyle(link).getPropertyValue('--pressable-pressed-scale'),
					),
				}
			})

		type Snapshot = Awaited<ReturnType<typeof read>>
		const snapshots: { phase: string; value: Snapshot }[] = []
		const capture = async (phase: string) => {
			const value = await read()

			snapshots.push({ phase, value })

			return value
		}
		const stable = (before: Snapshot, after: Snapshot, href: string) => {
			for (const value of [before, after]) {
				expect(value.areas.map(area => area.href)).toEqual([href])
				expect(value.areas[0].paint).toEqual(['none', 'none', 'none', 'none', 'none'])

				if (value.areas[0].cell) {
					expect(value.areas[0].cell).toEqual(['1', '1', 'auto', 'auto'])
					expect(value.areas[0].position).toBe('static')
					expect(
						value.areas[0].originEdges.every(edge => edge === 0),
						'Pseudo origin reconstruction requires zero margins and carrier edges',
					).toBe(true)
					expect(
						value.areas[0].alignment.every(alignment =>
							['auto', 'normal', 'stretch', 'start'].includes(alignment),
						),
						'First grid-cell alignment must preserve its origin',
					).toBe(true)
					expect(value.areas[0].carrierPaint).toEqual(['none', 'none', 'none', 'none', 'none'])
				} else {
					expect(['sticky', 'fixed']).not.toContain(value.areas[0].position)
				}
			}

			for (const key of ['width', 'height', 'x', 'y'] as const) {
				expect(Number.isFinite(before.areas[0][key]) && Number.isFinite(after.areas[0][key])).toBe(
					true,
				)
				expect(
					Math.abs(before.areas[0][key] - after.areas[0][key]),
					`Stable snap ${key}`,
				).toBeLessThanOrEqual(0.125)
			}
		}

		try {
			await page.mouse.move(1, 1)
			const idle = await capture('idle')

			expect(idle).toMatchObject({ hovered: false, snap: 'block mandatory', overflow: 'auto' })
			expect(idle.max).toBeGreaterThan(0)

			if (width === 1400) {
				expect(idle.navOverflow).toBe('visible')
				const point = await owner.evaluate(port => {
					const box = port.getBoundingClientRect()

					for (let y = Math.max(1, box.top); y < Math.min(innerHeight, box.bottom); y += 8) {
						for (let x = Math.max(1, box.left); x < Math.min(innerWidth, box.right); x += 8) {
							const hit = document.elementFromPoint(x, y)

							if (hit && port.contains(hit) && !hit.closest('#wallet-toc')) {
								return { x, y }
							}
						}
					}
					throw new Error('No hit-testable scroll rail outside the TOC')
				})

				await page.mouse.move(point.x, point.y)
				expect(await capture('rail-hover')).toMatchObject({
					hovered: true,
					navHovered: false,
					snap: 'none',
				})
			}

			await owner.hover()

			if (!enhanced) {
				expect(await capture('fallback-hover')).toMatchObject({ hovered: true, snap: 'none' })
				await page.mouse.move(1, 1)
				expect(await capture('fallback-return')).toMatchObject({
					hovered: false,
					snap: 'block mandatory',
				})

				return
			}

			const link = page.locator('#wallet-toc a[href="#l1-provider-independence"]')

			await link.hover()
			await expect
				.poll(async () => (await read()).areas.map(area => area.href))
				.toEqual(['#l1-provider-independence'])
			const leaf = await capture('leaf')

			expect(leaf).toMatchObject({ hovered: true, navHovered: true, snap: 'none' })

			await page.mouse.down()

			try {
				await expect.poll(async () => (await read()).linkScale).toBeCloseTo(leaf.pressedScale, 4)
				stable(leaf, await capture('leaf-pressed'), '#l1-provider-independence')
			} finally {
				await page.mouse.move(1, 1)
				await page.mouse.up()
			}

			const summary = page.locator(
				'#wallet-toc details[data-pressable-name="#self-sovereignty"] > summary',
			)

			await summary.press('Space')
			await expect
				.poll(async () => (await read()).areas.map(area => area.href))
				.toEqual(['#self-sovereignty'])
			await expect.poll(async () => (await read()).summaryScale).toBe(leaf.summaryScale)
			const closed = await capture('closed')

			expect(closed.open).toBe(false)

			for (const key of ['width', 'height'] as const) {
				expect(Math.abs(closed.areas[0][key] - closed.header[key])).toBeLessThanOrEqual(0.125)
			}
			await page.keyboard.down('Space')

			try {
				await expect
					.poll(async () => (await read()).summaryScale)
					.toBeCloseTo(closed.pressedScale, 4)
				stable(closed, await capture('summary-pressed'), '#self-sovereignty')
			} finally {
				await page.keyboard.up('Space')
			}

			await expect
				.poll(async () => (await read()).areas.map(area => area.href))
				.toEqual(['#l1-provider-independence'])
			expect((await capture('reopened')).open).toBe(true)
			await summary.press('Space')
			await expect
				.poll(async () => (await read()).areas.map(area => area.href))
				.toEqual(['#self-sovereignty'])
			await page.mouse.move(1, 1)
			const returned = await capture('closed-return')

			stable(closed, returned, '#self-sovereignty')
			const landing = returned.areas[0].y - returned.center

			expect(landing).toBeGreaterThan(2)
			expect(landing).toBeLessThan(returned.max - 2)
			await owner.hover()
			await page.mouse.wheel(0, 160)
			await expect.poll(async () => (await read()).top).not.toBe(returned.top)
			await page.mouse.move(1, 1)
			await expect.poll(async () => Math.abs((await read()).top - landing)).toBeLessThanOrEqual(1)
			expect(await capture('native-return')).toMatchObject({
				hovered: false,
				snap: 'block mandatory',
			})
		} finally {
			await info.attach('toc-phase-snapshots', {
				body: JSON.stringify(snapshots),
				contentType: 'application/json',
			})
		}
	})
}

for (const width of [1400, 690]) {
	test(`TOC initial target remains visible before attribute contact at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const first = page.locator(
			'#wallet-toc > .navigation-items > menu:first-of-type > li:first-child',
		)

		await expect(first.locator(':scope > details')).toHaveCount(1)
		const firstLink = first.locator(':scope > details > summary > a')

		await expect(firstLink).toBeInViewport()
		const read = () =>
			first.evaluate(item => {
				const owner = item.closest('.page-navigation')!
				const toc = item.closest('#wallet-toc')!
				const scroller = getComputedStyle(toc).overflowY === 'auto' ? toc : owner
				const style = getComputedStyle(scroller)

				return {
					index: Number(getComputedStyle(owner).getPropertyValue('---pie-currentIndex')),
					align: getComputedStyle(item, '::before').scrollSnapAlign,
					outerTop: owner.scrollTop,
					tocTop: toc.scrollTop,
					hovered: scroller.matches(':hover'),
					mode: style.scrollSnapType,
					startOffset:
						item.getBoundingClientRect().top -
						scroller.getBoundingClientRect().top -
						(Number.parseFloat(style.borderTopWidth) || 0) -
						(Number.parseFloat(style.scrollPaddingBlockStart) || 0),
				}
			})
		const initial = await read()
		const enhanced = await page.evaluate(
			() =>
				CSS.supports('color: if(style(--x: 1): red)') &&
				CSS.supports('animation-timeline: scroll()'),
		)

		if (enhanced) {
			expect(initial.align).toBe('start')
			expect(Math.abs(initial.startOffset)).toBeLessThanOrEqual(1)
		}

		if (width === 690) {
			await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
			await expect(page.locator('#wallet-toc')).toHaveJSProperty('popover', 'auto')
			await expect(firstLink).toBeInViewport()
			await page.keyboard.press('Escape')
			await expect.poll(() => page.locator('#wallet-toc').getAttribute('data-closing')).toBeNull()
		}

		await page.mouse.move(0, 450)
		await expect.poll(async () => (await read()).hovered).toBe(false)
		await expect.poll(async () => (await read()).mode).toBe('block mandatory')

		if (enhanced) {
			await page.locator('#l1-provider-independence').evaluate(target => {
				const root = document.querySelector<HTMLElement>('#layout')!

				root.style.scrollSnapType = 'none'
				root.style.scrollBehavior = 'auto'
				target.scrollIntoView({ block: 'start', behavior: 'instant' })
			})
			await expect.poll(async () => (await read()).index).toBeGreaterThan(0)
			await expect.poll(async () => (await read()).align).toBe('none')
			await page.locator('#layout').evaluate(root => (root.scrollTop = 0))
			await expect.poll(async () => (await read()).index).toBe(0)
			await expect.poll(async () => (await read()).align).toBe('start')
			await info.attach('restored-snap-owner', {
				body: JSON.stringify(await read()),
				contentType: 'application/json',
			})
			await expect(firstLink).toBeInViewport()
		}

		await info.attach('initial-and-current-snap-owner', {
			body: JSON.stringify({ width, enhanced, initial, restored: await read() }),
			contentType: 'application/json',
		})
	})
}

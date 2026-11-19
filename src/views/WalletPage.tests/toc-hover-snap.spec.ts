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

		const owner = page.locator('#wallet-toc')
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
			for (const interrupt of [false, true]) {
				const follow = await page.locator('#wallet-toc').evaluateHandle((nav, interrupt) => {
					const root = document.querySelector<HTMLElement>('#layout')!
					const owner = nav.closest('.page-navigation')!
					const first = nav.querySelector<HTMLElement>('menu > li')!
					const leaf = nav.querySelector<HTMLElement>(
						'li[data-pressable-name="#l1-provider-independence"]',
					)!
					const number = (value: string) => Number.parseFloat(value) || 0
					const pose = () => {
						const style = getComputedStyle(nav)
						const portStart = nav.getBoundingClientRect().top + nav.clientTop
						const snapStart = portStart + number(style.scrollPaddingTop)
						const snapEnd = portStart + nav.clientHeight - number(style.scrollPaddingBottom)
						const maximum = nav.scrollHeight - nav.clientHeight
						const geometry = (target: HTMLElement, center: boolean) => {
							const box = target.getBoundingClientRect()
							const targetStyle = getComputedStyle(target)
							const start = box.top - number(targetStyle.scrollMarginTop)
							const end = box.bottom + number(targetStyle.scrollMarginBottom)
							const desired =
								nav.scrollTop +
								(center ? (start + end - snapStart - snapEnd) / 2 : start - snapStart)

							const expected = Math.max(0, Math.min(maximum, desired))

							return {
								desired,
								expected,
								error: nav.scrollTop - expected,
								areaStart: start,
								areaEnd: end,
							}
						}

						const initial = geometry(first, false)
						const selected = geometry(leaf, true)

						return {
							index: Number(getComputedStyle(owner).getPropertyValue('---pie-currentIndex')),
							inputOwners: [
								owner,
								nav,
								first.closest('.navigation-items')!,
								first.parentElement!,
								first,
							].map(element => ({
								tag: element.tagName,
								id: element.id,
								className: element.getAttribute('class'),
								index: getComputedStyle(element).getPropertyValue('---pie-currentIndex'),
								snap: getComputedStyle(element).getPropertyValue('---navigation-snapAlign'),
							})),
							pseudoIndex: getComputedStyle(first, '::before').getPropertyValue(
								'---pie-currentIndex',
							),
							initialError: initial.error,
							selectedError: selected.error,
							initial,
							selected,
							rootTop: root.scrollTop,
							maximum,
							snapStart,
							snapEnd,
							scrollendSupported: 'onscrollend' in nav,
							initialAlign: getComputedStyle(first, '::before').scrollSnapAlign,
							selectedAlign: getComputedStyle(leaf).scrollSnapAlign,
							hovered: nav.matches(':hover'),
							behavior: style.scrollBehavior,
							top: nav.scrollTop,
						}
					}
					const state = {
						seekStarted: 0,
						returnStarted: 0,
						initialTop: nav.scrollTop,
						ends: [] as { time: number; observedAt: number; pose: ReturnType<typeof pose> }[],
						scrolls: [] as { time: number; observedAt: number; pose: ReturnType<typeof pose> }[],
						pose,
						seek: () => {
							state.ends = []
							state.scrolls = []
							state.seekStarted = performance.now()
							root.style.scrollSnapType = 'none'
							root.style.scrollBehavior = 'auto'
							document
								.querySelector('#l1-provider-independence')!
								.scrollIntoView({ block: 'start', behavior: 'instant' })
						},
						returnToTop: () => {
							state.returnStarted = performance.now()
							root.scrollTop = 0
						},
						dispose: () => {
							nav.removeEventListener('scroll', onScroll)
							nav.removeEventListener('scrollend', onEnd)
						},
					}
					const onScroll = (event: Event) => {
						state.scrolls.push({
							time: event.timeStamp,
							observedAt: performance.now(),
							pose: pose(),
						})

						if (
							interrupt &&
							state.seekStarted &&
							!state.returnStarted &&
							pose().index > 0 &&
							Math.abs(nav.scrollTop - state.initialTop) > 1
						) {
							state.returnToTop()
						}
					}
					const onEnd = (event: Event) =>
						state.ends.push({ time: event.timeStamp, observedAt: performance.now(), pose: pose() })

					nav.addEventListener('scroll', onScroll)
					nav.addEventListener('scrollend', onEnd)

					return state
				}, interrupt)

				try {
					expect(await follow.evaluate(state => state.pose().behavior)).toBe('auto')
					await follow.evaluate(state => state.seek())

					if (!interrupt) {
						await expect
							.poll(() =>
								follow.evaluate(state =>
									state.ends.some(
										event =>
											event.time >= state.seekStarted &&
											event.pose.index > 0 &&
											event.pose.selectedAlign === 'center' &&
											Math.abs(event.pose.selectedError) <= 1,
									),
								),
							)
							.toBe(true)
						await follow.evaluate(state => state.returnToTop())
					}

					await expect.poll(() => follow.evaluate(state => state.returnStarted)).toBeGreaterThan(0)
					await expect
						.poll(() =>
							follow.evaluate(state =>
								state.ends.some(
									event =>
										event.time >= state.returnStarted &&
										event.pose.index === 0 &&
										event.pose.initialAlign === 'start' &&
										Math.abs(event.pose.initialError) <= 1,
								),
							),
						)
						.toBe(true)
					const restored = await follow.evaluate(state => state.pose())

					expect(restored).toMatchObject({
						index: 0,
						initialAlign: 'start',
						hovered: false,
						behavior: 'auto',
					})
					expect(Math.abs(restored.initialError)).toBeLessThanOrEqual(1)
				} finally {
					try {
						await info.attach(`restored-snap-owner-${interrupt ? 'during-follow' : 'settled'}`, {
							body: JSON.stringify(
								await follow.evaluate(state => ({
									seekStarted: state.seekStarted,
									returnStarted: state.returnStarted,
									ends: state.ends,
									scrolls: state.scrolls,
									restored: state.pose(),
								})),
							),
							contentType: 'application/json',
						})
					} finally {
						await follow.evaluate(state => state.dispose())
						await follow.dispose()
					}
				}
			}
		}

		await info.attach('initial-and-current-snap-owner', {
			body: JSON.stringify({ width, enhanced, initial, restored: await read() }),
			contentType: 'application/json',
		})
	})
}

test('in-flow navigation preserves its width when the longest group closes', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 1008, height: 1200 })
	await page.goto('/phantom/?variant=MOBILE')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	const toc = page.locator('#wallet-toc')
	const identity = await toc.evaluate(nav => {
		const links = [...nav.querySelectorAll('details > menu a')]
		const longest = links.reduce<Element | null>((longest, link) => {
			const width = (element: Element) => {
				const range = document.createRange()

				range.selectNodeContents(element)

				return range.getBoundingClientRect().width
			}

			return !longest || width(link) > width(longest) ? link : longest
		}, null)

		return longest?.closest('details')?.getAttribute('data-pressable-name')
	})

	expect(identity).toBeTruthy()
	const before = await toc.boundingBox()
	const group = toc.locator(`details[data-pressable-name="${identity}"]`)

	await expect(group).toHaveAttribute('open', '')
	await group.locator(':scope > summary').press('Space')
	await expect(group).not.toHaveAttribute('open', '')
	const after = await toc.boundingBox()

	expect(before).not.toBeNull()
	expect(after).not.toBeNull()
	expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(0.125)
	await info.attach('closed-group-width', {
		body: JSON.stringify({ identity, before, after }),
		contentType: 'application/json',
	})
})

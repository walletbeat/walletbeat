import { expect, test } from '../../../tests/browser/verified-test'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test(`native pie contracts at its source contact and reverses (${reducedMotion})`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width: 690, height: 900 })
		await page.emulateMedia({ reducedMotion })
		await page.goto('/metamask/?variant=MOBILE')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		const supported = await page.evaluate(
			() =>
				CSS.supports('animation-timeline: scroll()') &&
				CSS.supports('width: anchor-size(--source inline)') &&
				CSS.supports('color: if(style(--a: 1): red)'),
		)

		test.skip(
			!supported,
			'Measured native compaction is unavailable; fallback geometry has separate coverage',
		)
		const original = await page.locator('.pie-navigation-geometry').elementHandle()
		const observations = await page.evaluate(async () => {
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
			const root = document.querySelector<HTMLElement>('#layout')!
			const source = document.querySelector<HTMLElement>('.page-navigation > .pie-navigation')!
			const pie = source.querySelector<HTMLElement>('.pie-navigation-geometry')!
			const button = document.querySelector<HTMLButtonElement>('button[popovertarget="wallet-toc"]')

			if (!button) {
				throw new Error('Actual combined TOC button missing')
			}

			const navigation = Array.from(document.querySelectorAll<HTMLElement>('*')).find(element =>
				getComputedStyle(element)
					.anchorName.split(',')
					.some(name => name.trim() === '--navigation-row'),
			)

			if (!navigation) {
				throw new Error('Actual navigation row missing')
			}

			const safeTop = () => {
				const padding = parseFloat(getComputedStyle(root).paddingTop)

				if (!Number.isFinite(padding)) {
					throw new Error('Actual scroll-root top padding must resolve')
				}

				return root.getBoundingClientRect().top + root.clientTop + padding + 20
			}

			root.style.scrollSnapType = 'none'
			const settle = () =>
				new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)

			root.scrollTo({ top: 0, behavior: 'instant' })
			await settle()
			const flow = rect(pie.getBoundingClientRect())
			const initialSource = source.getBoundingClientRect()
			const contact = root.scrollTop + initialSource.top - safeTop()
			const read = (requested: number) => ({
				requested,
				maximumScroll: root.scrollHeight - root.clientHeight,
				scroll: root.scrollTop,
				source: rect(source.getBoundingClientRect()),
				pie: rect(pie.getBoundingClientRect()),
				safeTop: safeTop(),
				overflow: Math.max(
					root.scrollWidth - root.clientWidth,
					document.documentElement.scrollWidth - document.documentElement.clientWidth,
				),
			})

			root.scrollTo({ top: contact + flow.height + 1, behavior: 'instant' })
			await settle()
			const compact = read(flow.height + 1)
			const buttonBox = button.getBoundingClientRect()
			const center = {
				x: buttonBox.left + buttonBox.width / 2,
				y: buttonBox.top + buttonBox.height / 2,
			}
			const hit = document.elementFromPoint(center.x, center.y)
			const combinedControl = {
				button: rect(buttonBox),
				center,
				originalTop:
					navigation.getBoundingClientRect().top +
					(navigation.getBoundingClientRect().height - buttonBox.height) / 2,
				originalRight:
					innerWidth - parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.75,
				hit: hit && { tag: hit.tagName, id: hit.id },
				buttonOwnsCenter: hit === button || button.contains(hit),
				overlap: {
					inline:
						Math.min(compact.pie.right, buttonBox.right) -
						Math.max(compact.pie.left, buttonBox.left),
					block:
						Math.min(compact.pie.bottom, buttonBox.bottom) -
						Math.max(compact.pie.top, buttonBox.top),
				},
			}
			const samples = []
			const easing = new Animation(
				new KeyframeEffect(null, [], {
					duration: 1,
					fill: 'both',
					easing: getComputedStyle(root).getPropertyValue('--transition-easeInOutExpo').trim(),
				}),
			)

			for (const requested of [-1, 0, 55, 110, 165, 220, 221, 165, 110, 55, 0, -1]) {
				root.scrollTo({ top: contact + requested, behavior: 'instant' })
				await settle()
				const delivered = read(requested)

				await settle()
				easing.currentTime = Math.max(
					0,
					Math.min(
						1,
						(delivered.safeTop - delivered.source.top) / (flow.height - compact.pie.height),
					),
				)
				samples.push({
					...delivered,
					stability: read(requested),
					eased: easing.effect!.getComputedTiming().progress!,
				})
			}

			easing.cancel()

			return { flow, contact, compact, combinedControl, samples }
		})

		await info.attach('native-pie-compaction.json', {
			body: JSON.stringify(observations, null, 2),
			contentType: 'application/json',
		})
		expect(
			await page
				.locator('.pie-navigation-geometry')
				.evaluate((element, original) => element === original, original),
		).toBe(true)
		expect(observations.flow.height).toBeGreaterThan(observations.compact.pie.height + 100)
		expect(Math.abs(observations.compact.pie.height - 128)).toBeLessThanOrEqual(1)
		expect(
			observations.combinedControl.overlap.inline,
			'Compact pie and actual TOC button share horizontal paint bounds',
		).toBeGreaterThan(0)
		expect(
			observations.combinedControl.overlap.block,
			'Compact pie and actual TOC button overlap vertically',
		).toBeGreaterThan(0)
		expect(
			observations.combinedControl.buttonOwnsCenter,
			'The actual button center retains its native hit above the pie',
		).toBe(true)
		expect(
			Math.abs(observations.combinedControl.button.top - observations.combinedControl.originalTop),
			'TOC button keeps its navigation-row position',
		).toBeLessThanOrEqual(1)
		expect(
			Math.abs(
				observations.combinedControl.button.right - observations.combinedControl.originalRight,
			),
			'TOC button keeps its original edge inset',
		).toBeLessThanOrEqual(1)
		expect(observations.combinedControl.button.width).toBeGreaterThan(0)
		expect(observations.combinedControl.button.height).toBeGreaterThan(0)

		for (const sample of observations.samples) {
			const displacement = sample.safeTop - sample.source.top
			const requestedScroll = Math.max(
				0,
				Math.min(sample.maximumScroll, observations.contact + sample.requested),
			)

			expect(
				Math.abs(sample.scroll - requestedScroll),
				'Actual root delivered the requested native seek',
			).toBeLessThanOrEqual(1)
			expect(
				Math.abs(displacement - (sample.scroll - observations.contact)),
				'Actual source contact remains at the measured viewport safe-area top',
			).toBeLessThanOrEqual(1)
			expect(sample.overflow).toBeLessThanOrEqual(1)
			expect(
				Math.abs(sample.stability.pie.height - sample.pie.height),
				'Native endpoint delivery is stable',
			).toBeLessThanOrEqual(1)
			expect(Math.abs(sample.stability.pie.top - sample.pie.top)).toBeLessThanOrEqual(1)

			if (reducedMotion === 'no-preference') {
				const expected =
					observations.flow.height +
					(observations.compact.pie.height - observations.flow.height) * sample.eased

				expect(
					Math.abs(sample.pie.height - expected),
					`actual contraction at ${sample.requested}`,
				).toBeLessThanOrEqual(1)

				if (displacement >= 0) {
					expect(
						Math.abs(sample.pie.top - sample.safeTop),
						`contact top at ${sample.requested}`,
					).toBeLessThanOrEqual(1)
				}
			} else {
				const distanceToEndpoint = Math.min(
					Math.abs(sample.pie.height - observations.flow.height),
					Math.abs(sample.pie.height - observations.compact.pie.height),
				)

				expect(distanceToEndpoint, 'Reduced motion retains a real endpoint').toBeLessThanOrEqual(1)
			}
		}
		const first = observations.samples[0]
		const last = observations.samples.at(-1)!

		expect(Math.abs(first.pie.left - last.pie.left)).toBeLessThanOrEqual(1)
		expect(Math.abs(first.pie.height - last.pie.height)).toBeLessThanOrEqual(1)
		await original?.dispose()
	})
}

for (const width of [390, 1024]) {
	for (const direction of ['ltr', 'rtl'] as const) {
		test(`TOC runtime state compacts and restores the same pie at ${width}px (${direction})`, async ({
			page,
		}, info) => {
			await page.setViewportSize({ width, height: 900 })
			await page.goto('/phantom/?variant=MOBILE#top')
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await page.evaluate(direction => {
				document.documentElement.dir = direction
			}, direction)
			await page.evaluate(() => document.fonts.ready)
			const supported = await page.evaluate(
				() =>
					CSS.supports('clip-path: shape(from 0 0, line to 1px 1px, close)') &&
					CSS.supports('animation-timeline: scroll()') &&
					CSS.supports('animation-range: 0% 100%') &&
					CSS.supports('width: anchor-size(--source inline)') &&
					CSS.supports('timeline-scope: --source') &&
					CSS.supports('color: if(style(--a: 1): red)'),
			)

			test.skip(
				!supported,
				'Native pie compaction unavailable; fallback navigation is tested separately',
			)
			const source = page.locator('.page-navigation > .pie-navigation')
			const geometry = source.locator('.pie-navigation-geometry')
			const flower = geometry.locator(':scope > .navigation-items')
			const original = await flower.elementHandle()
			const read = () =>
				flower.evaluate(element => {
					const box = element.getBoundingClientRect()

					return {
						left: box.left,
						right: box.right,
						top: box.top,
						width: box.width,
						height: box.height,
					}
				})
			const before = await read()

			expect(before.width).toBeGreaterThan(208)
			await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
			await expect(source).toHaveAttribute('data-wallet-toc-state', 'open')
			await expect.poll(async () => Math.abs((await read()).width - 128)).toBeLessThanOrEqual(1)
			const opened = await read()

			expect(
				Math.abs(direction === 'rtl' ? opened.left - 8 : width - opened.right - 8),
			).toBeLessThanOrEqual(1)
			expect(Math.abs(opened.height - 128)).toBeLessThanOrEqual(1)
			await expect
				.poll(() => geometry.evaluate(element => getComputedStyle(element).animationName))
				.toBe('none')
			await expect
				.poll(() => source.evaluate(element => getComputedStyle(element, '::before').animationName))
				.toBe('none')
			await expect(page.locator('#wallet-toc')).toBeVisible()
			await page.keyboard.press('Escape')
			await expect(source).toHaveAttribute('data-wallet-toc-state', 'closed')
			await expect
				.poll(async () => Math.abs((await read()).width - before.width))
				.toBeLessThanOrEqual(1)
			expect(await flower.evaluate((element, original) => element === original, original)).toBe(
				true,
			)
			await info.attach('pie-native-overlay-cycle', {
				body: JSON.stringify({ width, direction, before, opened, returned: await read() }),
				contentType: 'application/json',
			})
		})
	}
}

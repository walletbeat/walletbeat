import { expect, test } from '../../../tests/browser/verified-test'

for (const path of ['/__wallet-page/software/', '/metamask/?variant=BROWSER']) {
	test(`slice relevance, exact contact and interaction remain independent: ${path}`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width: 690, height: 900 })
		await page.goto(path)
		test.skip(
			!(await page.evaluate(
				() =>
					CSS.supports('animation-timeline: scroll()') &&
					CSS.supports('color: if(style(--native: 1): red)'),
			)),
			'Exact sticky contact requires native scroll timelines and style conditionals; fallback is covered separately',
		)
		await page.locator('astro-island[ssr]:has(#top)').waitFor({ state: 'detached' })
		await page.evaluate(async () => {
			await document.fonts.ready
			document.querySelector<HTMLElement>('#layout')!.style.scrollSnapType = 'none'
		})
		const petals = page.locator(
			'.pie-navigation-geometry .navigation-items summary > a, .pie-navigation-geometry .navigation-items menu[data-navigation-depth="1"] > li > a',
		)
		const read = () =>
			petals.evaluateAll(elements =>
				elements.map(element => {
					const style = getComputedStyle(element)

					return {
						href: element.getAttribute('href'),
						relevant: Number(style.getPropertyValue('---pie-relevant')),
						highlighted: Number(style.getPropertyValue('---pie-highlighted')),
						opacity: Number(style.opacity),
						scale: Number(style.scale),
						filter: getComputedStyle(element.nextElementSibling!).filter,
						strokeOpacity: Number(getComputedStyle(element.nextElementSibling!).opacity),
						transitions: style.transitionProperty,
						easing: style.transitionTimingFunction,
					}
				}),
			)
		const leave = async () => {
			await page.mouse.move(0, 899)
			await page.evaluate(() => {
				if (document.activeElement instanceof HTMLElement) {
					document.activeElement.blur()
				}
			})
		}
		const moveHeading = async (id: string, distance: number) => {
			await leave()

			return page.evaluate(
				async ({ id, distance }) => {
					const target = document.getElementById(id)!

					for (let parent: Element | null = target; parent; parent = parent.parentElement) {
						if (parent instanceof HTMLDetailsElement) {
							parent.open = true
						}
					}
					const ownDetails = target.querySelector(':scope > details')

					if (ownDetails instanceof HTMLDetailsElement) {
						ownDetails.open = true
					}

					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
					const link = target.querySelector<HTMLAnchorElement>(
						`[data-sticky-breadcrumb~="source"] a[data-pressable-name="#${id}"]`,
					)!
					const row = link.closest<HTMLElement>('[data-sticky]')!
					const inset = Number.parseFloat(getComputedStyle(row).insetBlockStart)

					if (!Number.isFinite(inset)) {
						throw Error('Heading needs an actual native sticky inset')
					}

					const root = document.querySelector<HTMLElement>('#layout')!
					const flow = target.querySelector<HTMLElement>(
						':scope > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
					)!

					root.scrollTo({
						top: root.scrollTop + flow.getBoundingClientRect().top - distance,
						behavior: 'instant',
					})
					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)

					return { inset }
				},
				{ id, distance },
			)
		}

		await leave()
		await expect
			.poll(async () =>
				(await read()).every(row => row.highlighted === 0 && Math.abs(row.opacity - 1) < 0.01),
			)
			.toBe(true)
		await moveHeading('open-source', 100)
		await expect
			.poll(async () => (await read()).find(row => row.href === '#open-source')?.highlighted)
			.toBe(0)
		const source = page
			.locator(
				'#open-source [data-sticky-breadcrumb~="source"] a[data-pressable-name="#open-source"]',
			)
			.first()
		const beforeInteraction = (await read())
			.filter(row => row.highlighted === 1)
			.map(row => row.href)
		const interactingHighlights = [...new Set([...beforeInteraction, '#open-source'])].sort()

		await source.hover()
		await expect
			.poll(async () =>
				(await read())
					.filter(row => row.highlighted === 1)
					.map(row => row.href)
					.sort(),
			)
			.toEqual(interactingHighlights)
		await expect
			.poll(async () => {
				const rows = await read()

				return (
					rows.some(row => row.relevant === 0) &&
					rows.every(row => Math.abs(row.opacity - (row.relevant ? 1 : 0.2)) < 0.01)
				)
			})
			.toBe(true)
		await leave()
		await page.keyboard.press('Tab')
		await expect
			.poll(async () => (await read()).find(row => row.href === '#open-source')?.scale)
			.toBe(1)
		const focusTransitions = await source.evaluate(async element => {
			if (!(element instanceof HTMLElement)) {
				throw Error('Expected native anchor')
			}

			const petal = document.querySelector<HTMLElement>('.pie-navigation a[href="#open-source"]')!
			const targets = [petal, petal.nextElementSibling!]
			const initialScale = getComputedStyle(petal).scale
			const transitions: { property: string }[] = []
			const listeners = new AbortController()
			let timeout: ReturnType<typeof setTimeout> | undefined

			try {
				await new Promise<void>((resolve, reject) => {
					const record = (event: Event) => {
						if (
							!(event instanceof TransitionEvent) ||
							!event.isTrusted ||
							!(event.target instanceof Element) ||
							!targets.includes(event.target)
						) {
							return
						}

						transitions.push({ property: event.propertyName })

						if (
							transitions.some(value => value.property === 'scale') &&
							transitions.some(value => value.property === 'opacity')
						) {
							resolve()
						}
					}

					for (const target of targets) {
						target.addEventListener('transitionrun', record, { signal: listeners.signal })
					}
					timeout = setTimeout(
						() => reject(new Error('Native focus did not start scale and opacity transitions')),
						3000,
					)
					element.focus({ preventScroll: true })
				})

				return { initialScale, finalScale: getComputedStyle(petal).scale, transitions }
			} finally {
				listeners.abort()

				if (timeout !== undefined) {
					clearTimeout(timeout)
				}
			}
		})

		expect(focusTransitions.initialScale).toBe('1')
		expect(
			focusTransitions.transitions.some(transition => transition.property === 'scale'),
			'Exact native focus starts a real compositor-property transition',
		).toBe(true)
		expect(
			focusTransitions.transitions.some(transition => transition.property === 'opacity'),
			'Static stroke starts an opacity transition',
		).toBe(true)
		await expect(source).toBeFocused()
		await expect
			.poll(async () =>
				(await read())
					.filter(row => row.highlighted === 1)
					.map(row => row.href)
					.sort(),
			)
			.toEqual(interactingHighlights)
		await leave()
		await moveHeading('open-source', -100)
		await expect
			.poll(async () => (await read()).filter(row => row.highlighted === 1).map(row => row.href))
			.toEqual(['#open-source'])
		const contact = await source.evaluate(element => {
			const row = element.closest<HTMLElement>('[data-sticky]')!

			return {
				top: row.getBoundingClientRect().top,
				inset: Number.parseFloat(getComputedStyle(row).insetBlockStart),
				state: getComputedStyle(element).getPropertyValue('---breadcrumb-entry'),
			}
		})

		expect(
			Math.abs(contact.top - contact.inset),
			'The associated row must actually touch its sticky inset',
		).toBeLessThan(1.5)
		expect(Number(contact.state.trim())).toBeGreaterThan(0)
		await expect
			.poll(async () => {
				const rows = await read()

				return (
					rows.find(row => row.href === '#transparency')?.relevant === 1 &&
					rows.find(row => row.href === '#transparency')?.highlighted === 0 &&
					rows.every(row => Math.abs(row.opacity - (row.relevant ? 1 : 0.2)) < 0.01)
				)
			})
			.toBe(true)
		await expect
			.poll(async () => {
				const rows = await read()

				return rows.every(
					row =>
						Math.abs(row.scale - (row.highlighted ? 1.05 : 1)) < 0.001 &&
						row.filter !== 'none' &&
						Math.abs(row.strokeOpacity - row.highlighted) < 0.001,
				)
			})
			.toBe(true)
		const visual = await read()

		expect(
			visual.every(row => row.transitions.includes('opacity') && row.transitions.includes('scale')),
		).toBe(true)
		expect(visual.every(row => row.easing.includes('0.87'))).toBe(true)
		const point = await page.locator('.pie-navigation-geometry').evaluate(geometry => {
			const box = geometry.getBoundingClientRect()

			for (let y = Math.max(0, box.top) + 2; y < Math.min(innerHeight, box.bottom); y += 4) {
				for (let x = Math.max(0, box.left) + 2; x < Math.min(innerWidth, box.right); x += 4) {
					const hit = document.elementFromPoint(x, y)

					if (hit && geometry.contains(hit) && hit.closest('a')) {
						return { x, y }
					}
				}
			}
			throw Error('No actual native petal hit region')
		})

		await page.mouse.move(point.x, point.y)
		await expect
			.poll(async () => (await read()).every(row => Math.abs(row.opacity - 1) < 0.01))
			.toBe(true)
		await leave()
		await moveHeading('open-source', 100)
		await expect
			.poll(async () => (await read()).find(row => row.href === '#open-source')?.highlighted)
			.toBe(0)
		await page.evaluate(() => {
			const target = document.getElementById('stage:software-1')!
			const details = target.querySelector('details')

			if (details) {
				details.open = true
			}

			const root = document.querySelector<HTMLElement>('#layout')!

			root.scrollTo({
				top: root.scrollTop + target.getBoundingClientRect().top + 200,
				behavior: 'instant',
			})
		})
		await expect
			.poll(async () => {
				const rows = await read()

				return (
					rows.some(row => row.relevant === 1) &&
					rows.some(row => row.relevant === 0) &&
					rows.every(
						row =>
							row.highlighted === 0 &&
							Math.abs(row.scale - 1) < 0.001 &&
							row.strokeOpacity === 0 &&
							Math.abs(row.opacity - (row.relevant ? 1 : 0.2)) < 0.01,
					)
				)
			})
			.toBe(true)
		await info.attach('slice-contact-and-relevance', {
			body: JSON.stringify({ contact, visual, stage: await read() }, null, 2),
			contentType: 'application/json',
		})
	})
}

for (const id of ['transparency', 'open-source']) {
	test(`petal paint shares native rotation approach and endpoint handoff: ${id}`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width: 690, height: 1000 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		test.skip(
			!(await page.evaluate(() =>
				CSS.supports('(animation-timeline: scroll()) and (color: if(style(--native: 1): red))'),
			)),
			'Native scroll paint enhancement unavailable',
		)
		await page.evaluate(() => document.fonts.ready)
		await page.mouse.move(1, 999)
		const range = await page.evaluate(async id => {
			const root = document.querySelector<HTMLElement>('#layout')!
			const scope = document.getElementById(id)!

			root.style.scrollSnapType = 'none'
			root.style.scrollBehavior = 'auto'

			for (let parent: Element | null = scope; parent; parent = parent.parentElement) {
				if (parent instanceof HTMLDetailsElement) {
					parent.open = true
				}
			}
			const own = scope.querySelector(':scope > details')

			if (own instanceof HTMLDetailsElement) {
				own.open = true
			}

			const approach = scope.querySelector<HTMLElement>(
				':scope > [data-sticky-breadcrumb~="approach"]',
			)

			if (!approach) {
				throw Error('Missing natural approach owner')
			}

			root.scrollTo({
				top: root.scrollTop + approach.getBoundingClientRect().top - 100,
				behavior: 'instant',
			})
			await new Promise<void>(resolve =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			)
			const measure = () => {
				const style = getComputedStyle(approach)
				const timeline = new ViewTimeline({
					subject: approach,
					axis: 'block',
					inset: style.viewTimelineInset,
				})
				const size = approach.getBoundingClientRect().height

				if (
					timeline.source !== root ||
					!timeline.endOffset ||
					!Number.isFinite(size) ||
					size <= 0
				) {
					throw Error('Native approach range unresolved')
				}

				const end = timeline.endOffset.to('px').value - size

				return { start: end - size, end, size }
			}
			const samples = []
			const deadline = performance.now() + 10000

			while (performance.now() < deadline) {
				const before = measure()
				const requested = (before.start + before.end) / 2

				root.scrollTo({ top: requested, behavior: 'instant' })
				await new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
				const after = measure()

				samples.push({ before, after, requested, scroll: root.scrollTop })

				if (
					Math.abs(after.end - before.end) <= 0.5 &&
					Math.abs(after.size - before.size) <= 0.5 &&
					Math.abs(root.scrollTop - requested) <= 1
				) {
					return { ...after, samples }
				}
			}
			throw Error(`Approach offsets did not settle: ${JSON.stringify(samples)}`)
		}, id)
		const read = (requested: number) =>
			page.evaluate(
				async ({ requested, id }) => {
					const root = document.querySelector<HTMLElement>('#layout')!

					root.scrollTo({ top: requested, behavior: 'instant' })
					await new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					)
					const approach = document
						.getElementById(id)!
						.querySelector(':scope > [data-sticky-breadcrumb~="approach"]')!
					const icon = document.querySelector('.pie-navigation-icon')!
					const rotation = icon
						.getAnimations()
						.find(
							animation =>
								animation instanceof CSSAnimation &&
								animation.timeline instanceof ViewTimeline &&
								animation.timeline.subject === approach,
						)
					const clock = (animation: Animation) => {
						if (!('rangeStart' in animation) || !('rangeEnd' in animation)) {
							throw Error('Native animation range observation unavailable')
						}

						return {
							name:
								animation instanceof CSSAnimation
									? animation.animationName
									: animation.constructor.name,
							phase: animation.effect?.getComputedTiming().progress,
							ownApproach:
								animation.timeline instanceof ViewTimeline &&
								animation.timeline.subject === approach,
							rangeStart: String(animation.rangeStart),
							rangeEnd: String(animation.rangeEnd),
						}
					}
					const petals = Array.from(
						document.querySelectorAll<HTMLElement>(
							'.pie-navigation-geometry .navigation-items summary > a, .pie-navigation-geometry .navigation-items menu[data-navigation-depth="1"] > li > a',
						),
					)
					const rows = petals.map(anchor => {
						const style = getComputedStyle(anchor),
							decoration = anchor.nextElementSibling

						if (!decoration?.matches('.pie-navigation-highlight')) {
							throw Error('Missing actual decorative highlight paint owner')
						}

						const group = anchor.closest('details')?.querySelector(':scope > summary > a')
						const paint = (element: Element) =>
							element
								.getAnimations()
								.filter(
									animation =>
										animation instanceof CSSAnimation &&
										['wallet-pie-opacity', 'wallet-pie-scale', 'wallet-pie-highlight'].includes(
											animation.animationName,
										),
								)
								.map(clock)

						return {
							href: anchor.getAttribute('href'),
							group: group?.getAttribute('href'),
							opacity: Number(style.opacity),
							scale: Number(style.scale),
							stroke: Number(getComputedStyle(decoration).opacity),
							highlighted: Number(style.getPropertyValue('---pie-highlighted')),
							relevant: Number(style.getPropertyValue('---pie-relevant')),
							hoverScale: Number(style.getPropertyValue('--hover-scale')),
							effects: [...paint(anchor), ...paint(decoration)],
						}
					})

					return {
						requested,
						scroll: root.scrollTop,
						rotation: rotation ? clock(rotation) : null,
						rotate: getComputedStyle(icon).rotate,
						rows,
					}
				},
				{ requested, id },
			)
		const records = []
		const poses = [
			{ label: 'before', scroll: range.start - 1 },
			...[0, 0.25, 0.5, 0.75, 1].map(fraction => ({
				label: String(fraction),
				scroll: range.start + range.size * fraction,
			})),
			{ label: 'after', scroll: range.end + 1 },
		]

		for (const pose of poses) {
			const observation = await read(pose.scroll)

			records.push({ ...pose, observation })
			await info.attach(`petal-native-${pose.label}`, {
				body: JSON.stringify({ range, ...pose, observation }),
				contentType: 'application/json',
			})
		}
		const middle = records.filter(record => ['0.25', '0.5', '0.75'].includes(record.label))

		for (const record of middle) {
			expect(
				record.observation.rotation,
				`Authored rotation must bind at ${record.label}: ${JSON.stringify(record.observation)}`,
			).not.toBeNull()
		}

		for (let index = 1; index < middle.length; index++) {
			expect(middle[index].observation.rotation!.phase!).toBeGreaterThan(
				middle[index - 1].observation.rotation!.phase!,
			)
		}

		const startRotation = Number.parseFloat(records[0].observation.rotate)
		const endRotation = Number.parseFloat(records.at(-1)!.observation.rotate)

		expect(Math.abs(endRotation - startRotation)).toBeGreaterThan(1)

		for (const record of middle) {
			const observation = record.observation

			expect(observation.rotation?.phase).toBeGreaterThan(0)
			expect(observation.rotation?.phase).toBeLessThan(1)
			const incoming = observation.rows.findIndex(row => row.href === `#${id}`)

			expect(incoming).toBeGreaterThan(0)
			const from = observation.rows[incoming - 1],
				to = observation.rows[incoming]

			for (const row of observation.rows) {
				const effects = row.effects.filter(effect => effect.ownApproach)

				expect(effects.map(effect => effect.name).sort()).toEqual([
					'wallet-pie-highlight',
					'wallet-pie-opacity',
					'wallet-pie-scale',
				])

				for (const effect of effects) {
					expect(effect.phase).toBeCloseTo(observation.rotation!.phase!, 3)
				}
				const phase =
					(Number.parseFloat(observation.rotate) - startRotation) / (endRotation - startRotation)
				const fromOpacity = row.group === from.group ? 1 : 0.2
				const toOpacity = row.group === to.group ? 1 : 0.2
				const highlight = row.href === from.href ? 1 - phase : row.href === to.href ? phase : 0

				expect(row.opacity).toBeCloseTo(fromOpacity + (toOpacity - fromOpacity) * phase, 3)
				expect(row.stroke).toBeCloseTo(highlight, 3)
				expect(row.scale).toBeCloseTo(1 + highlight * (row.hoverScale - 1), 3)
			}
		}
		const after = records.at(-1)!.observation

		expect(after.rows.every(row => row.effects.every(effect => effect.phase === null))).toBe(true)

		for (const row of after.rows) {
			expect(row.stroke).toBeCloseTo(row.highlighted, 3)
			expect(row.scale).toBeCloseTo(1 + row.highlighted * (row.hoverScale - 1), 3)
			expect(row.opacity).toBeCloseTo(row.relevant ? 1 : 0.2, 3)
		}

		for (const record of [...middle].reverse()) {
			const reverse = await read(record.observation.scroll)

			await info.attach(`petal-native-reverse-${record.label}`, {
				body: JSON.stringify(reverse),
				contentType: 'application/json',
			})
			expect(Math.abs(reverse.scroll - record.observation.scroll)).toBeLessThanOrEqual(0.5)
			expect(reverse.rotate).toBe(record.observation.rotate)

			for (const row of reverse.rows) {
				const forward = record.observation.rows.find(previous => previous.href === row.href)!

				expect(row.opacity).toBeCloseTo(forward.opacity, 3)
				expect(row.scale).toBeCloseTo(forward.scale, 3)
				expect(row.stroke).toBeCloseTo(forward.stroke, 3)
			}
		}
	})
}

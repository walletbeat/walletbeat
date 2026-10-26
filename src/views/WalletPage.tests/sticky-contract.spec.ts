import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import {
	observeStickyChain,
	qualifyNativeBreadcrumbClock,
	selectStickyChain,
} from '../../../tests/browser/sticky-observation.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

const widths = [390, 864, 1024, 1025, 1440]

for (const width of widths) {
	test(`native sticky contact, prose travel and current disclosure extent at ${width}px`, async ({
		page,
		browserName,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		await expect
			.poll(() => page.evaluate(qualifyNativeBreadcrumbClock))
			.toMatchObject({ resolved: true })
		const chain = await page.evaluate(selectStickyChain)

		expect(chain.map(owner => owner.level)).toEqual([1, 2, 3, 4])
		const enhanced = await page.evaluate(() =>
			[
				'animation-timeline: scroll()',
				'animation-range: 0% 100%',
				'width: anchor-size(--breadcrumb-source inline)',
				'timeline-scope: --breadcrumb-size',
				'color: if(style(---breadcrumb-wrap: 1): red)',
			].every(feature => CSS.supports(feature)),
		)
		// Snap selection is independent of breadcrumb geometry. Measure the requested
		// source positions directly while preserving every application animation.
		const scrollControl = await page.addStyleTag({
			content: '#layout { scroll-snap-type: none !important; scroll-behavior: auto !important; }',
		})
		const move = async (top: number) => {
			await page.locator('#layout').evaluate(async (root, top) => {
				root.scrollTo({ top, behavior: 'instant' })
				await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
			}, top)

			return page.evaluate(observeStickyChain, chain)
		}

		await move(0)
		// The reference uses the same real nodes in ordinary flow. It supplies
		// independent natural boxes; no animation variable is an expected value.
		const naturalControl = await page.addStyleTag({
			content: `
   #top [data-sticky-breadcrumb~="position"], #top .attribute-accordions > details > summary { position: static !important; }
   #top *, #top *::before, #top *::after { transform: none !important; translate: none !important; scale: none !important; rotate: none !important; }
  `,
		})
		const natural = await move(0)

		await naturalControl.evaluate(element => {
			if (!(element instanceof HTMLStyleElement)) {
				throw new Error('Expected diagnostic style element')
			}

			element.remove()
		})
		await expect
			.poll(() => page.evaluate(qualifyNativeBreadcrumbClock))
			.toMatchObject({ resolved: true })
		const samples = []
		const contacts = []
		let supportAssertions = 0

		for (let index = 1; index < chain.length; index++) {
			const origin = natural.rows[index]
			const estimate = await move(Math.max(0, origin.scopeBox.top - natural.siteBottom))
			const preceding = estimate.rows
				.slice(0, index)
				.filter(
					row =>
						row.opacity > 0.01 &&
						row.occupiedRow.bottom > estimate.siteBottom &&
						row.occupiedRow.top < estimate.viewport.height / 2,
				)
			const stackBottom = Math.max(
				estimate.siteBottom,
				...preceding.map(row => row.occupiedRow.bottom),
			)
			const contact = origin.scopeBox.top - stackBottom

			contacts.push({
				level: origin.level,
				naturalScopeTop: origin.scopeBox.top,
				measuredPrecedingRows: preceding.map(row => ({
					level: row.level,
					box: row.occupiedRow,
					surfaces: row.surfaces,
				})),
				stackBottom,
				expectedContact: contact,
			})
			const offsets = [
				-48,
				-24,
				-8,
				-2,
				0,
				2,
				8,
				24,
				48,
				96,
				Math.max(160, origin.rowBox.height * 2),
			]
			const positions = offsets.map(offset => Math.max(0, contact + offset))
			const forward = []

			for (const top of positions) {
				forward.push(await move(top))
			}
			const reverse = []

			for (const top of [...positions].reverse()) {
				reverse.push(await move(top))
			}
			await info.attach(`contact-H${origin.level}-${width}`, {
				body: JSON.stringify({ enhanced, origin, contact: contacts.at(-1), forward, reverse }),
				contentType: 'application/json',
			})

			for (const state of [...forward, ...reverse]) {
				const current = state.rows[index]

				expect(current.scopeBox.height).toBeGreaterThan(0)
				expect(current.headingBox.height).toBeGreaterThan(0)

				for (const row of state.rows) {
					if (row.opacity <= 0.01 || row.visibility !== 'visible') {
						continue
					}

					for (const line of row.lines.filter(
						line => line.bottom > 0 && line.top < state.viewport.height,
					)) {
						expect(
							line.left,
							`H${row.level} text remains inside its actual content column`,
						).toBeGreaterThanOrEqual(state.frame.left - 1)
						expect(
							line.right,
							`H${row.level} text remains inside its actual content column`,
						).toBeLessThanOrEqual(state.frame.right + 1)
					}
				}
				const currentPreceding = state.rows
					.slice(0, index)
					.filter(
						row =>
							row.opacity > 0.01 &&
							row.occupiedRow.bottom > state.siteBottom &&
							row.occupiedRow.top < state.viewport.height / 2,
					)
				const currentStackBottom = Math.max(
					state.siteBottom,
					...currentPreceding.map(row => row.occupiedRow.bottom),
				)

				if (enhanced && current.scopeBox.top > currentStackBottom + 8) {
					expect(
						current.headingBox.top + state.scroll,
						`H${current.level} must not begin moving before natural container contact`,
					).toBeCloseTo(origin.headingBox.top, 0)
					expect(
						current.headingBox.height,
						`H${current.level} must retain natural height before contact`,
					).toBeCloseTo(origin.headingBox.height, 0)
				}
			}

			for (const [position, state] of forward.entries()) {
				const returned = reverse[reverse.length - 1 - position]

				expect(returned.scroll).toBeCloseTo(state.scroll, 0)

				for (const [level, row] of state.rows.entries()) {
					expect(
						returned.rows[level].headingBox.top,
						`H${row.level} same-position reverse geometry`,
					).toBeCloseTo(row.headingBox.top, 0)
					expect(returned.rows[level].headingBox.height).toBeCloseTo(row.headingBox.height, 0)
				}
			}

			if (enhanced) {
				const arrived = forward.at(-1)!
				const heading = arrived.rows[index].headingBox

				expect(
					Math.abs(heading.top + arrived.scroll - origin.headingBox.top) > 2 ||
						Math.abs(heading.height - origin.headingBox.height) > 1,
					`H${origin.level} must actually participate after measured contact`,
				).toBe(true)
			}

			const a = forward.at(-2)!
			const b = forward.at(-1)!
			const prose = a.rows[index]
			const supportBox = b.rows[index].supportBox

			if (prose.supportBox && supportBox && Math.abs(b.scroll - a.scroll) > 4) {
				supportAssertions++
				expect(
					supportBox.top - prose.supportBox.top,
					`H${prose.level} supporting prose follows actual root-scroll displacement`,
				).toBeCloseTo(a.scroll - b.scroll, 0)
			}

			samples.push({ level: origin.level, forward, reverse })
		}
		expect(
			supportAssertions,
			'The fixture must exercise real supporting prose at multiple heading depths',
		).toBeGreaterThanOrEqual(2)
		const detail = page.locator(chain[3].scope)
		const outerBefore = await move(Math.max(0, natural.rows[3].scopeBox.top - 180))
		const summary = detail.locator(':scope > summary')

		await summary.focus()
		await page.keyboard.press('Space')
		await expect(detail).not.toHaveAttribute('open')
		await detail.evaluate(async element => {
			await Promise.allSettled(
				element
					.getAnimations({ subtree: true })
					.filter(
						animation =>
							animation.timeline === document.timeline &&
							Number.isFinite(animation.effect?.getComputedTiming().endTime),
					)
					.map(animation => animation.finished),
			)
		})
		const closed = await page.evaluate(observeStickyChain, chain)

		expect(closed.rows[3].scopeBox.height).toBeLessThan(outerBefore.rows[3].scopeBox.height)
		expect(closed.rows[2].scopeBox.height).toBeLessThan(outerBefore.rows[2].scopeBox.height)
		expect(
			closed.rows[3].headingBox.height,
			'The closed detail retains its real visible summary heading',
		).toBeGreaterThan(0)
		expect(
			closed.rows[2].scopeBox.bottom,
			'The parent scope still contains the visible final summary',
		).toBeGreaterThanOrEqual(closed.rows[3].scopeBox.bottom - 1)
		await summary.focus()
		await page.keyboard.press('Space')
		await expect(detail).toHaveAttribute('open')
		await info.attach('sticky-native-contact', {
			body: JSON.stringify({ width, enhanced, natural, contacts, samples, outerBefore, closed }),
			contentType: 'application/json',
		})
		await scrollControl.evaluate(element => {
			if (!(element instanceof HTMLStyleElement)) {
				throw new Error('Expected diagnostic style element')
			}

			element.remove()
		})
		const contract = await readFile(
			new URL('../../../tests/browser/wallet-page-requirements.md', import.meta.url),
			'utf8',
		)

		await info.attach('contract-evidence', {
			body: JSON.stringify({
				contractHash: createHash('sha256').update(contract).digest('hex'),
				engine: browserName,
				results: [
					'🧭 EntryContact',
					'🧭 ScopeExtent',
					'🧭 ScrollCoupling',
					'🧭 SupportFlow',
					'⚡ VisibleBounds',
				].map(id => ({
					id,
					status: 'pass',
					complete: false,
					widths: [width],
					fixture: 'software',
					evidence:
						'Native H1–H4 ancestor chain measured forward/reverse around natural scope contact against preceding actual row boxes; real supporting prose displacement, inline text bounds and current disclosure shrinkage are asserted. This one chain does not certify every scope, collision silhouette, exact departure, or visual frame.',
				})),
			}),
			contentType: 'application/json',
		})
	})
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test(`support content preserves ordinary flow and reversal with ${reducedMotion} motion`, async ({
		page,
	}, info) => {
		test.setTimeout(180_000)
		await page.setViewportSize({ width: 690, height: 900 })
		await page.emulateMedia({ reducedMotion })
		await page.goto('/metamask/?variant=MOBILE')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		await page.addStyleTag({
			content: '#layout { scroll-snap-type: none !important; scroll-behavior: auto !important; }',
		})
		const evidence = await page.evaluate(async () => {
			const root = document.querySelector<HTMLElement>('#layout')!
			const move = async (top: number) => {
				root.scrollTo({ top, behavior: 'instant' })

				for (let frame = 0; frame < 3; frame++) {
					await new Promise(requestAnimationFrame)
				}

				if (
					Math.abs(
						root.scrollTop - Math.min(root.scrollHeight - root.clientHeight, Math.max(0, top)),
					) > 1
				) {
					throw new Error('Support probe scroll was not delivered')
				}
			}

			await move(0)
			const selector = '[data-sticky-breadcrumb~="support"], .section-caption, .subsection-caption'
			const owners = [...document.querySelectorAll<HTMLElement>(`#top :is(${selector})`)].filter(
				element => !element.parentElement?.closest(selector),
			)
			const inventory = owners.map(parent => {
				const scope = parent.closest('[data-sticky-breadcrumb~="scope"]')
				const position =
					parent.closest('[data-sticky-breadcrumb~="position"]') ??
					scope?.querySelector(
						':scope > [data-sticky-breadcrumb~="position"], :scope > details > [data-sticky-breadcrumb~="position"]',
					)
				const heading = position?.querySelector('h1,h2,h3,h4')
				const kind =
					scope?.id === 'security-news'
						? 'News'
						: scope?.id.startsWith('stage:')
							? 'Stage'
							: heading?.tagName === 'H1'
								? `H1-${parent.tagName}`
								: heading?.tagName
				const disclosure = parent.closest('details')

				return {
					kind,
					heading: heading?.textContent?.trim(),
					scope: scope?.id,
					state: disclosure ? (disclosure.open ? 'open' : 'closed') : 'flow',
					rendered:
						parent.checkVisibility() &&
						parent.getBoundingClientRect().height > 0 &&
						!!parent.textContent?.trim(),
				}
			})
			const selected = owners.filter(
				(_, index) =>
					inventory[index].rendered &&
					inventory.findIndex(
						row =>
							row.rendered &&
							row.kind === inventory[index].kind &&
							row.state === inventory[index].state,
					) === index,
			)
			const records = []

			for (const parent of selected) {
				await move(0)
				const subject = inventory[owners.indexOf(parent)]
				const ranges: Range[] = []
				const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT)

				while (walker.nextNode()) {
					const node = walker.currentNode

					if (!node.textContent?.trim() || node.parentElement?.closest('[aria-hidden="true"]')) {
						continue
					}

					const range = document.createRange()

					range.selectNodeContents(node)

					if ([...range.getClientRects()].some(box => box.width > 0 && box.height > 0)) {
						ranges.push(range)
					}
				}
				const boxes = () =>
					ranges.flatMap(range =>
						[...range.getClientRects()]
							.filter(box => box.width > 0 && box.height > 0)
							.map(box => ({ top: box.top, bottom: box.bottom })),
					)
				const natural = boxes()

				if (!natural.length) {
					throw new Error(`No actual support text for ${subject.kind}`)
				}

				const first = Math.min(...natural.map(box => box.top))
				const last = Math.max(...natural.map(box => box.bottom))
				const start = Math.max(0, first - root.clientHeight)
				const end = Math.min(root.scrollHeight - root.clientHeight, last + root.clientHeight / 2)
				const positions = [
					...new Set(
						Array.from({ length: 17 }, (_, index) =>
							Math.round(start + ((end - start) * index) / 16),
						),
					),
				]
				const sample = async (scroll: number) => {
					await move(scroll)

					return {
						scroll: root.scrollTop,
						boxes: boxes().map((box, index) => ({
							...box,
							worldError: box.top + root.scrollTop - natural[index]?.top,
						})),
					}
				}
				const forward = []

				for (const scroll of positions) {
					forward.push(await sample(scroll))
				}
				const reverse = []

				for (const scroll of [...positions].reverse()) {
					reverse.push(await sample(scroll))
				}
				records.push({ ...subject, natural, forward, reverse })
			}

			return { inventory, records }
		})

		await info.attach('support-document-travel', {
			body: JSON.stringify({
				reducedMotion,
				...evidence,
				limits:
					'Real text geometry at delivered scroll positions, one representative per heading/disclosure topology. Does not prove occlusion, fade timing or compositor execution.',
			}),
			contentType: 'application/json',
		})

		for (const kind of ['H1-DIV', 'H1-SECTION', 'H2', 'H3', 'Stage', 'News']) {
			expect(
				evidence.records.some(record => record.kind === kind),
				`${kind} support is measured`,
			).toBe(true)
		}

		for (const record of evidence.records) {
			for (const [index, frame] of record.forward.entries()) {
				expect(frame.boxes.length, `${record.kind} ${record.state}: text remains measurable`).toBe(
					record.natural.length,
				)
				const reverse = record.reverse.at(-1 - index)!

				expect(reverse.scroll).toBe(frame.scroll)
				expect(reverse.boxes.length).toBe(frame.boxes.length)

				for (const [line, box] of frame.boxes.entries()) {
					expect(
						Math.abs(box.worldError),
						`${record.kind} ${record.state} ${record.heading}: text world travel at ${frame.scroll}`,
					).toBeLessThan(0.5)
					expect(
						Math.abs(box.top - reverse.boxes[line].top),
						`${record.kind}: reverse restoration`,
					).toBeLessThan(0.5)
				}
			}
		}
	})
}

for (const width of [390, 1073, 1440]) {
	test(`support paragraph fade preserves ordinary flow at ${width}px`, async ({ page }, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/metamask/?variant=BROWSER')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		test.skip(
			!(await page.evaluate(qualifyNativeBreadcrumbClock)).applicable,
			'Enhanced caption fading requires native breadcrumb geometry; ordinary-flow fallback is covered separately',
		)
		await expect
			.poll(() => page.evaluate(qualifyNativeBreadcrumbClock))
			.toMatchObject({ resolved: true })
		const samples = await page.evaluate(async () => {
			const root = document.querySelector('#layout')

			if (!(root instanceof HTMLElement)) {
				throw new Error('Page scroll owner absent')
			}

			root.style.scrollSnapType = 'none'
			root.style.scrollBehavior = 'auto'
			const result = []
			const textBounds = (element: Element) => {
				const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
				const boxes: Array<{ top: number; bottom: number }> = []
				let lastLineHeight = Number.NaN
				let node: Node | null

				while ((node = walker.nextNode())) {
					if (
						!(node instanceof Text) ||
						!node.data.trim() ||
						node.parentElement?.closest('[aria-hidden="true"], [data-icon]')
					) {
						continue
					}

					const range = document.createRange()

					range.selectNodeContents(node)
					boxes.push(...[...range.getClientRects()].map(({ top, bottom }) => ({ top, bottom })))

					if (node.parentElement) {
						lastLineHeight = Number.parseFloat(getComputedStyle(node.parentElement).lineHeight)
					}
				}

				if (!boxes.length) {
					throw new Error('Required rendered copy has no text rectangles')
				}

				return {
					firstTop: boxes[0].top,
					bottom: Math.max(...boxes.map(box => box.bottom)),
					lastLineHeight,
				}
			}

			for (const selector of [
				'#transparency .section-caption',
				'#security .subsection-caption',
				'#security-news > header .section-caption',
			]) {
				const support = document.querySelector(selector)
				const content = support?.firstElementChild

				if (!support || !content || !content.textContent?.trim()) {
					throw new Error('Actual supporting paragraph absent')
				}

				root.scrollTop += content.getBoundingClientRect().top - 240
				await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
				await Promise.allSettled(
					document
						.getAnimations()
						.filter(
							animation =>
								animation.timeline === document.timeline &&
								Number.isFinite(animation.effect?.getComputedTiming().endTime),
						)
						.map(animation => animation.finished),
				)
				const foreground = support.previousElementSibling

				if (!foreground?.matches('[data-sticky]')) {
					throw new Error('Supporting copy requires its actual sticky foreground')
				}

				const poses = []

				for (const top of [
					240, 200, 180, 170, 160, 150, 130, 120, 100, 80, 60, 40, 0, -120, 0, 80, 160, 240,
				]) {
					for (let n = 0; n < 8; n++) {
						root.scrollTop += content.getBoundingClientRect().top - top
						await new Promise(resolve =>
							requestAnimationFrame(() => requestAnimationFrame(resolve)),
						)

						if (Math.abs(content.getBoundingClientRect().top - top) < 1) {
							break
						}
					}
					const box = content.getBoundingClientRect()
					const style = getComputedStyle(content)
					const foregroundStyle = getComputedStyle(foreground)
					const surface = getComputedStyle(foreground, '::before')
					const foregroundBox = foreground.getBoundingClientRect()
					const heading = foreground.querySelector('h2, h3')

					if (!heading) {
						throw new Error('Required foreground heading absent')
					}

					const copy = textBounds(content)
					const title = textBounds(heading)

					poses.push({
						requested: top,
						top: box.top,
						height: box.height,
						scroll: root.scrollTop,
						opacity: Number(style.opacity),
						boundary: Number.parseFloat(style.getPropertyValue('---breadcrumb-blockEnd')),
						foregroundBottom: foreground.getBoundingClientRect().bottom,
						lineHeight: Number.parseFloat(style.lineHeight),
						lastLineHeight: copy.lastLineHeight,
						firstTextTop: copy.firstTop,
						titleTop: title.firstTop,
						titleBottom: title.bottom,
						foregroundTop: foregroundBox.top,
						surfaceVisibility: surface.visibility,
						ownSurface: surface.content !== 'none' && Number.parseFloat(surface.height) > 0,
						surfaceBottom: foregroundBox.top + Number.parseFloat(surface.height),
						surfaceOpacity: Number(surface.opacity),
						stuck:
							foregroundStyle.position === 'sticky' &&
							Math.abs(foregroundBox.top - Number.parseFloat(foregroundStyle.insetBlockStart)) < 1,
						transform: style.transform,
						translate: style.translate,
						scale: style.scale,
					})
				}
				result.push({ selector, poses })
			}

			return result
		})

		await info.attach('paragraph-flow-opacity', {
			body: JSON.stringify(samples),
			contentType: 'application/json',
		})

		for (const { poses } of samples) {
			const origin = poses[0]

			expect(origin.height).toBeGreaterThan(0)
			expect(origin.opacity).toBe(1)
			expect(poses.find(pose => pose.requested === -120)?.opacity).toBe(0)
			expect(poses.some(p => p.opacity > 0 && p.opacity < 1)).toBe(true)

			for (const pose of poses) {
				expect(Number.isFinite(pose.boundary), 'The cumulative sticky boundary resolves').toBe(true)
				expect(Number.isFinite(pose.lineHeight), 'The rendered line height resolves').toBe(true)
				expect(
					Math.abs(pose.lineHeight - pose.lastLineHeight),
					'The fade carrier uses the final text line height',
				).toBeLessThan(0.1)

				if (pose.top + pose.height >= pose.boundary + pose.lineHeight + 1) {
					expect(
						pose.opacity,
						'Uncovered lines remain fully readable before the final line departs',
					).toBe(1)
				}

				if (pose.top > pose.foregroundBottom + 1) {
					expect(pose.opacity, 'Copy outside the rendered foreground remains visible').toBe(1)
				}

				expect(Math.abs(pose.top - pose.requested)).toBeLessThan(1)
				expect(Math.abs(pose.top + pose.scroll - origin.top - origin.scroll)).toBeLessThan(1)
				expect(pose.transform).toBe('none')
				expect(pose.translate).toBe('none')
				expect(pose.scale).toBe('none')

				if (pose.top >= pose.boundary + 1) {
					expect(
						pose.opacity,
						'Supporting copy stays visible until reaching the sticky stack',
					).toBe(1)
				}

				if (pose.top + pose.height <= pose.boundary - 1) {
					expect(pose.opacity, 'Supporting copy fades after passing behind the sticky stack').toBe(
						0,
					)
				}
			}

			const resting = poses.find(pose => pose.requested === -120)

			if (!resting) {
				throw new Error('Required compact-rest witness absent')
			}

			// A joined title paints above its physical sticky box; a new row stays inside it.
			if (resting.titleTop >= resting.foregroundTop - 1) {
				const contacts = poses.filter(
					pose => pose.stuck && pose.firstTextTop <= pose.surfaceBottom + 1,
				)

				expect(contacts.length, 'The row has an admitted copy/surface contact').toBeGreaterThan(0)

				for (const pose of contacts) {
					expect(pose.ownSurface, 'A row foreground owns its surface').toBe(true)
					expect(pose.surfaceVisibility).toBe('visible')
					expect(pose.surfaceOpacity, 'The surface is ready before copy reaches it').toBe(1)
					expect(
						pose.titleBottom,
						'The compact title stays inside its surface',
					).toBeLessThanOrEqual(pose.surfaceBottom + 1)
				}
			}

			const turn = poses.findIndex(pose => pose.requested === -120)

			for (let i = 1; i <= turn; i++) {
				expect(poses[i].opacity).toBeLessThanOrEqual(poses[i - 1].opacity + 0.001)
			}

			for (let i = turn + 1; i < poses.length; i++) {
				expect(poses[i].opacity).toBeGreaterThanOrEqual(poses[i - 1].opacity - 0.001)
			}
		}
	})
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
	test(`a growing foreground and its metadata reach contact together with ${reducedMotion} motion`, async ({
		page,
	}, info) => {
		await page.emulateMedia({ reducedMotion })
		await page.setViewportSize({ width: 390, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		await page.evaluate(() => document.fonts.ready)
		test.skip(
			!(await page.evaluate(qualifyNativeBreadcrumbClock)).applicable,
			'Native breadcrumb geometry is required',
		)
		const sample = await page.evaluate(async () => {
			const root = document.querySelector<HTMLElement>('#layout')
			const scope = document.querySelector<HTMLElement>(
				'.attribute:has(> details[open] > summary > [data-sticky-breadcrumb~="support"])',
			)
			const position = scope?.querySelector<HTMLElement>(':scope > details > summary')
			const flow = scope?.querySelector<HTMLElement>(
				':scope > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
			)

			if (!root || !scope || !position || !flow) {
				throw new Error('Required foreground composition absent')
			}

			scope.style.setProperty('--stickyBreadcrumb-minBlockSize', '200px')
			root.style.scrollSnapType = 'none'
			root.style.scrollBehavior = 'auto'
			const frames = () =>
				new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

			await frames()
			const clock = new ViewTimeline({
				subject: flow,
				axis: 'block',
				inset: getComputedStyle(flow).viewTimelineInset,
			})
			const start = clock.startOffset
			const clockEnd = clock.endOffset

			if (!start || !clockEnd) {
				throw new Error('Native foreground interval unresolved')
			}

			const height = flow.getBoundingClientRect().height
			const extent = 2 * height - (clockEnd.to('px').value - start.to('px').value)
			const metadataEnd = position.querySelector<HTMLElement>('[data-sticky-breadcrumb~="end"]')
			const paint =
				metadataEnd &&
				[...metadataEnd.children].find(
					element =>
						!element.matches('[data-sticky-breadcrumb~="size-export"]') &&
						element.checkVisibility(),
				)

			if (!metadataEnd || !paint) {
				throw new Error('Required visible metadata paint owner absent')
			}

			const poses = []

			for (const top of [4, -4, -40, 4]) {
				for (let n = 0; n < 6; n++) {
					root.scrollTop += flow.getBoundingClientRect().top - top
					await frames()

					if (Math.abs(flow.getBoundingClientRect().top - top) < 0.5) {
						break
					}
				}
				const animation = position
					.getAnimations()
					.find(
						animation =>
							animation instanceof CSSAnimation && animation.animationName === 'breadcrumb-entry',
					)
				const title = position.querySelector('h3')?.getBoundingClientRect()
				const translate = getComputedStyle(paint).translate
				const endY =
					translate === 'none' ? 0 : Number.parseFloat(translate.split(/\s+/)[1] ?? '0px')
				const endDeltaY = Number.parseFloat(
					getComputedStyle(metadataEnd).getPropertyValue('---breadcrumb-clearance-arc-deltaY'),
				)
				const endAnimation = paint
					.getAnimations()
					.find(
						animation =>
							animation instanceof CSSAnimation &&
							animation.animationName === 'breadcrumb-clearance-block' &&
							animation.effect instanceof KeyframeEffect &&
							animation.effect.target === paint,
					)

				poses.push({
					requested: top,
					endY,
					endDeltaY,
					endAnimation: !!endAnimation,
					top: flow.getBoundingClientRect().top,
					entry: getComputedStyle(position).getPropertyValue('---breadcrumb-entry').trim(),
					pending: animation?.pending,
					width: title?.width,
					height: title?.height,
				})
			}

			return { extent, poses }
		})

		await info.attach('growing-foreground-contact', {
			body: JSON.stringify(sample),
			contentType: 'application/json',
		})
		expect(Number.isFinite(sample.extent)).toBe(true)
		expect(
			sample.extent,
			'The compact row is genuinely larger than its natural subject',
		).toBeLessThan(0)

		for (const pose of sample.poses) {
			expect(
				Math.abs(pose.top - pose.requested),
				'The requested contact pose is attained',
			).toBeLessThan(1)
			expect(pose.entry).toBe(pose.requested > 0 ? '0' : '1')
			expect(pose.pending).toBe(false)
			expect(pose.width).toBeGreaterThan(0)
			expect(pose.height).toBeGreaterThan(0)
			expect(pose.endAnimation, 'The actual metadata owns its native block-motion effect').toBe(
				true,
			)
			expect(Number.isFinite(pose.endY) && Number.isFinite(pose.endDeltaY)).toBe(true)
			expect(
				Math.abs(pose.endDeltaY),
				'The fixture requires a visible metadata displacement',
			).toBeGreaterThan(1)
			expect(
				Math.abs(pose.endY - (pose.requested > 0 ? 0 : pose.endDeltaY)),
				'Metadata reaches its endpoint with the heading, including reverse contact',
			).toBeLessThan(0.125)
		}
	})
}

test('reduced caption fading preserves visible and hidden flow endpoints', async ({
	page,
}, info) => {
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await page.setViewportSize({ width: 768, height: 900 })
	await page.goto('/metamask/?variant=BROWSER')
	await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
	await page.evaluate(() => document.fonts.ready)
	test.skip(
		!(await page.evaluate(qualifyNativeBreadcrumbClock)).applicable,
		'Enhanced caption fading requires native breadcrumb geometry',
	)
	const samples = await page.evaluate(async () => {
		const root = document.querySelector<HTMLElement>('#layout')!

		root.style.scrollSnapType = 'none'
		root.style.scrollBehavior = 'auto'
		const samples = []

		for (const selector of [
			'#transparency .section-caption',
			'#scam-prevention .subsection-caption',
			'#security-news > header .section-caption',
		]) {
			const content = document.querySelector(selector)?.firstElementChild

			if (!content?.textContent?.trim()) {
				throw new Error('Required caption family absent: ' + selector)
			}

			for (const top of [500, 0, 500]) {
				for (let n = 0; n < 4; n++) {
					root.scrollTop += content.getBoundingClientRect().top - top
					await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
				}
				const box = content.getBoundingClientRect()
				const style = getComputedStyle(content)

				samples.push({
					selector,
					requested: top,
					top: box.top,
					scroll: root.scrollTop,
					opacity: Number(style.opacity),
					transform: style.transform,
					translate: style.translate,
				})
			}
		}

		return samples
	})

	await info.attach('reduced-caption-endpoints', {
		body: JSON.stringify(samples, null, 2),
		contentType: 'application/json',
	})

	for (const sample of samples) {
		expect(Math.abs(sample.top - sample.requested)).toBeLessThan(1)
		expect(sample.opacity).toBe(sample.requested === 0 ? 0 : 1)
		expect(sample.transform).toBe('none')
		expect(sample.translate).toBe('none')
	}
})

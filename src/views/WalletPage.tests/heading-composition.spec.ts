import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { expect, test } from '../../../tests/browser/verified-test'

const enhancedBreadcrumbs = () =>
	CSS.supports('animation-timeline: scroll()') &&
	CSS.supports('animation-range: 0% 100%') &&
	CSS.supports('width: anchor-size(--breadcrumb-source inline)') &&
	CSS.supports('timeline-scope: --breadcrumb-size') &&
	CSS.supports('color: if(style(---breadcrumb-wrap: 1): red)')

const headingVariants = [
	{ name: 'attribute-h2', selector: 'article .attribute-group > header h2' },
	{
		name: 'attribute-h3',
		selector: 'article .attribute-group .attribute > details > summary h3',
	},
	{
		name: 'stage-h3',
		selector: '#stages [data-sticky-breadcrumb~="scope"] > details > summary h3',
	},
	{ name: 'news-h3', selector: '#security-news .news-items summary h3' },
]

for (const width of [390, 1440]) {
	test(`natural heading glyphs follow real title, support and gap metrics at ${width}px`, async ({
		page,
		browserName,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 180_000 })
		const enhanced = await page.evaluate(enhancedBreadcrumbs)

		await page.evaluate(() => document.fonts.ready)
		await page.locator('#layout').evaluate(element => {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Expected native HTML scroll root')
			}

			element.style.scrollSnapType = 'none'
		})
		const scopes = await page
			.locator(
				'#top .attribute-group, #top .attribute-group section.attribute, #security-news, #stages section[data-sticky-breadcrumb~="scope"]',
			)
			.evaluateAll(elements => elements.map(element => element.id))
		const observations = []

		for (const id of scopes) {
			await page.evaluate(async id => {
				const root = document.querySelector('#layout')!
				const scope = document.getElementById(id)!

				root.scrollTo({
					top: scope.getBoundingClientRect().top + root.scrollTop - 250,
					behavior: 'instant',
				})
				await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
				await document.fonts.ready
			}, id)
			const sample = await page.evaluate(
				async ({ id, enhanced }) => {
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
					const scope = document.getElementById(id)!
					const owner = scope.querySelector(
						':scope > [data-sticky-breadcrumb~="position"][data-column~="span-start"], :scope > details > summary[data-column~="span-start"]',
					)
					const header = owner?.querySelector(':scope > [data-sticky]') ?? owner
					const heading = header?.querySelector('h2,h3')
					const glyph =
						heading?.closest('a')?.querySelector('[data-icon]') ??
						heading?.querySelector('a [data-icon]')
					const support = owner?.querySelector(
						':scope > [data-sticky-breadcrumb~="support"], :scope > .section-caption, :scope > .subsection-caption',
					)
					const firstRow = header?.matches('[data-row]')
						? header
						: header?.querySelector(':scope > [data-row]')

					if (!header || !owner || !heading || !support || !firstRow) {
						throw new Error(
							`${id}: expected heading/support composition is missing its local header, column owner, intrinsic row or direct support`,
						)
					}

					const stage = scope.id.startsWith('stage:')

					if (!glyph && !stage) {
						throw new Error(`${id}: expected font-glyph composition is missing its real icon`)
					}

					const textLines = (element: Element) => {
						const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
						const range = document.createRange()
						const rects: { left: number; right: number; top: number; bottom: number }[] = []

						while (walker.nextNode()) {
							const node = walker.currentNode

							if (
								!node.textContent?.trim() ||
								node.parentElement?.closest('[aria-hidden="true"], [data-badge]')
							) {
								continue
							}

							range.selectNodeContents(node)
							rects.push(
								...[...range.getClientRects()].map(rect => ({
									left: rect.left,
									right: rect.right,
									top: rect.top,
									bottom: rect.bottom,
								})),
							)
						}
						const lines: typeof rects = []

						for (const rect of rects) {
							const line = lines.find(line => Math.abs(line.top - rect.top) < 1)

							if (line) {
								line.left = Math.min(line.left, rect.left)
								line.right = Math.max(line.right, rect.right)
								line.bottom = Math.max(line.bottom, rect.bottom)
							} else {
								lines.push({ ...rect })
							}
						}

						return lines.sort((a, b) => a.top - b.top)
					}
					const title = heading.querySelector(':scope > a:first-child') ?? heading
					const titleLines = textLines(title)
					const supportLines = textLines(support)
					const titleStyle = getComputedStyle(heading)
					const supportStyle = getComputedStyle(support)
					const surface = header.closest('[data-sticky]') ?? header
					const headerBox = surface.getBoundingClientRect()
					const compositionOwnerBox = owner.getBoundingClientRect()
					const positionBox = (
						header.closest('[data-sticky-breadcrumb~="position"]') ?? header
					).getBoundingClientRect()
					const scopeBox = scope.getBoundingClientRect()
					const rowBox = firstRow.getBoundingClientRect()
					const supportBox = support.getBoundingClientRect()
					const titleStart = titleLines[0]?.left
					const supportStart = supportLines[0]?.left
					const textColumn =
						titleStart !== undefined &&
						supportStart !== undefined &&
						Math.abs(titleStart - supportStart) <= 2
					const brokenColumn =
						supportStart !== undefined &&
						Math.abs(supportStart - rowBox.left) <= 2 &&
						supportBox.top >= rowBox.bottom - 1
					const flattened = getComputedStyle(owner).display === 'contents'
					const glyphMetrics = (() => {
						if (!glyph) {
							return null
						}

						const glyphStyle = getComputedStyle(glyph, '::before')
						const canvas = document.createElement('canvas')
						const context = canvas.getContext('2d')!
						const font = `${glyphStyle.fontStyle} ${glyphStyle.fontWeight} ${glyphStyle.fontSize} ${glyphStyle.fontFamily}`

						context.font = font
						const glyphText: unknown = JSON.parse(glyphStyle.content)

						if (typeof glyphText !== 'string') {
							throw new Error('The actual icon must expose a font glyph')
						}

						const primaryFont = `${glyphStyle.fontStyle} ${glyphStyle.fontWeight} ${glyphStyle.fontSize} ${glyphStyle.fontFamily.split(',')[0]}`

						if (!document.fonts.check(primaryFont, glyphText)) {
							throw new Error(
								`${id}: actual icon font is not loaded: ${font}; glyph ${JSON.stringify(glyphText)}`,
							)
						}

						const ink = context.measureText(glyphText)
						const resolution = 4
						const padding = 2
						const left = Math.ceil(Math.max(0, ink.actualBoundingBoxLeft) + padding)
						const right = Math.ceil(Math.max(ink.width, ink.actualBoundingBoxRight) + padding)
						const ascent = Math.ceil(Math.max(0, ink.actualBoundingBoxAscent) + padding)
						const descent = Math.ceil(Math.max(0, ink.actualBoundingBoxDescent) + padding)

						canvas.width = (left + right) * resolution
						canvas.height = (ascent + descent) * resolution
						context.scale(resolution, resolution)
						context.font = font
						context.fillText(glyphText, left, ascent)
						const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
						let minX = canvas.width,
							minY = canvas.height,
							maxX = -1,
							maxY = -1

						for (let y = 0; y < canvas.height; y++) {
							for (let x = 0; x < canvas.width; x++) {
								if (pixels[(y * canvas.width + x) * 4 + 3] > 0) {
									minX = Math.min(minX, x)
									maxX = Math.max(maxX, x)
									minY = Math.min(minY, y)
									maxY = Math.max(maxY, y)
								}
							}
						}

						if (maxY < minY) {
							throw new Error('The actual glyph has no painted alpha')
						}

						if (
							minX === 0 ||
							minY === 0 ||
							maxX === canvas.width - 1 ||
							maxY === canvas.height - 1
						) {
							throw new Error('The actual glyph exceeds its raster allocation')
						}

						const paintedGlyphHeight = (maxY - minY + 1) / resolution

						return {
							fontSize: parseFloat(glyphStyle.fontSize),
							paintedHeight: paintedGlyphHeight,
							conservativeHeight: ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent,
							box: rect(glyph.getBoundingClientRect()),
						}
					})()
					const composition = {
						id,
						applicable: true as const,
						flattened,
						enhanced,
						stage,
						glyphApplicable: glyphMetrics !== null,
						textGap: supportLines[0]?.top - Math.max(...titleLines.map(line => line.bottom)),
						level: Number(heading.tagName.slice(1)),
						mode: textColumn
							? 'title-and-support-column'
							: brokenColumn
								? 'support-below-whole-row'
								: 'unresolved',
						titleLines,
						supportLines,
						titleLineHeight: parseFloat(titleStyle.lineHeight),
						supportLineHeight: parseFloat(supportStyle.lineHeight),
						actualGap: supportBox.top - rowBox.bottom,
						glyphFontSize: glyphMetrics?.fontSize ?? null,
						paintedGlyphHeight: glyphMetrics?.paintedHeight ?? null,
						conservativeGlyphHeight: glyphMetrics?.conservativeHeight ?? null,
						glyphBox: glyphMetrics?.box ?? null,
						headerBox: rect(headerBox),
						compositionOwnerBox: rect(compositionOwnerBox),
						layout: {
							physicalHeaderBeforeRow: rowBox.top - headerBox.top,
							physicalHeaderAfterRow: headerBox.bottom - rowBox.bottom,
							rowToSupport: supportBox.top - rowBox.bottom,
							titleInkToSupportInk:
								supportLines[0]?.top - Math.max(...titleLines.map(line => line.bottom)),
							physicalHeaderContainsSupport: surface.contains(support),
							supportPaddingBlockEnd: parseFloat(getComputedStyle(support).paddingBlockEnd),
						},
						positionBox: rect(positionBox),
						rowBox: rect(rowBox),
						scopeBox: rect(scopeBox),
						supportBox: rect(supportBox),
						natural: scopeBox.top > 180 && rowBox.top > 180,
						padding: {
							headerStart: rowBox.top - headerBox.top,
							headerEnd: surface.contains(support)
								? headerBox.bottom - supportBox.bottom
								: parseFloat(getComputedStyle(support).paddingBlockEnd),
							scopeToRow: rowBox.top - scopeBox.top,
						},
					}
					let fallbackFlow: {
						scrollDelta: number
						supportDelta: number
						attempts: { requestedDelta: number; actualDelta: number }[]
					} | null = null

					if (!enhanced && composition.natural) {
						const root = document.querySelector('#layout')!
						const beforeScroll = root.scrollTop
						const beforeSupport = support.getBoundingClientRect().top
						const attempts: { requestedDelta: number; actualDelta: number }[] = []

						for (const requestedDelta of [128, 256, 512, root.clientHeight]) {
							root.scrollTo({ top: beforeScroll + requestedDelta, behavior: 'instant' })
							await new Promise(resolve =>
								requestAnimationFrame(() => requestAnimationFrame(resolve)),
							)
							attempts.push({ requestedDelta, actualDelta: root.scrollTop - beforeScroll })

							if (root.scrollTop > beforeScroll) {
								break
							}
						}
						fallbackFlow = {
							scrollDelta: root.scrollTop - beforeScroll,
							supportDelta: support.getBoundingClientRect().top - beforeSupport,
							attempts,
						}
						root.scrollTo({ top: beforeScroll, behavior: 'instant' })
						await new Promise(resolve =>
							requestAnimationFrame(() => requestAnimationFrame(resolve)),
						)
					}

					return { ...composition, fallbackFlow }
				},
				{ id, enhanced },
			)

			observations.push(sample)
		}
		await info.attach('natural-heading-composition', {
			body: JSON.stringify({ width, observations }),
			contentType: 'application/json',
		})
		const applicable = observations.filter(row => row.applicable).filter(row => row.natural)

		expect(
			applicable.some(row => row.level === 2),
			'A real natural H2 with support must be exercised',
		).toBe(true)
		expect(
			applicable.some(row => row.level === 3 && !row.stage),
			'A real natural H3 with support must be exercised',
		).toBe(true)

		expect(
			applicable.some(row => row.stage),
			'A real Stage title/support composition must be exercised',
		).toBe(true)

		for (const row of applicable) {
			expect(row.titleLines.length, row.id).toBeGreaterThan(0)
			expect(row.supportLines.length, row.id).toBeGreaterThan(0)
			expect(row.titleLineHeight, row.id).toBeGreaterThan(0)
			expect(row.supportLineHeight, row.id).toBeGreaterThan(0)

			if (!row.enhanced) {
				expect(
					row.textGap,
					`${row.id}: fallback title and prose have positive visible text separation`,
				).toBeGreaterThan(0)
				expect(
					row.supportBox.top,
					`${row.id}: fallback prose does not overlap its real row`,
				).toBeGreaterThanOrEqual(row.rowBox.bottom - 0.1)

				if (row.glyphBox) {
					expect(
						row.glyphBox.right,
						`${row.id}: fallback glyph retains a real title gap`,
					).toBeLessThan(row.titleLines[0].left)
				}

				expect(
					row.fallbackFlow!.scrollDelta,
					`${row.id}: prose-flow sample must actually scroll`,
				).toBeGreaterThan(0)
				expect(
					Math.abs(row.fallbackFlow!.supportDelta + row.fallbackFlow!.scrollDelta),
					`${row.id}: fallback prose moves with ordinary root flow`,
				).toBeLessThanOrEqual(1)
				continue
			}

			expect(
				row.actualGap,
				`${row.id}: supporting prose retains a real gap after its source row`,
			).toBeGreaterThan(0)
			expect(
				row.mode,
				`${row.id}: title and supporting text must form a measurable composition`,
			).not.toBe('unresolved')
			expect(
				row.textGap,
				`${row.id}: natural title ink and supporting prose do not overlap`,
			).toBeGreaterThan(0)
			expect(
				row.supportBox.top,
				`${row.id}: direct support clears the complete intrinsic source row`,
			).toBeGreaterThanOrEqual(row.rowBox.bottom - 0.1)

			if (!row.glyphBox || row.paintedGlyphHeight === null) {
				expect(row.stage, `${row.id}: only Stage badge/text compositions omit a font glyph`).toBe(
					true,
				)
				continue
			}

			const expectedSize =
				row.mode === 'title-and-support-column'
					? (row.titleLineHeight + row.supportLineHeight + row.actualGap) * 1.1
					: row.titleLineHeight * 1.5

			expect(
				Math.abs(row.paintedGlyphHeight - expectedSize),
				`${row.id}: natural glyph ink height derives from one title line, one support line and their actual gap, independently of wrapped line count or badges`,
			).toBeLessThanOrEqual(1)
			expect(row.glyphBox.right, `${row.id}: the glyph leaves a real text gap`).toBeLessThan(
				row.titleLines[0].left,
			)

			if (row.level === 2) {
				expect(
					row.padding.headerStart,
					`${row.id}: visible natural block padding above its first row`,
				).toBeGreaterThan(0)
				expect(
					row.padding.headerEnd,
					`${row.id}: visible natural block padding below supporting prose`,
				).toBeGreaterThan(0)
			}
		}
		const modes = [...new Set(applicable.map(row => row.mode))]
		const lines = [
			...new Set(
				applicable.map(row =>
					row.supportLines.length > 1 ? 'wrapped-support' : 'one-line-support',
				),
			),
		]

		await info.attach('natural-composition-coverage', {
			body: JSON.stringify({
				modes,
				lines,
				unresolved: applicable.filter(row => row.mode === 'unresolved').map(row => row.id),
				missing: ['title-and-support-column', 'support-below-whole-row'].filter(
					mode => !modes.includes(mode),
				),
				nativeFallback: applicable.filter(row => !row.enhanced).map(row => row.id),
				accepted: false,
				reason:
					'Available native fixtures are reported explicitly. Native fallback asserts visible text separation, row separation and ordinary prose flow; enhanced span sizing and header-box padding are unverified there. Missing composition modes and unsampled motion phases remain unverified.',
			}),
			contentType: 'application/json',
		})
		const contract = await readFile(
			new URL('../../../tests/browser/wallet-page-requirements.md', import.meta.url),
			'utf8',
		)

		await info.attach('contract-evidence', {
			body: JSON.stringify({
				contractHash: createHash('sha256').update(contract).digest('hex'),
				engine: browserName,
				results: ['🎨 NaturalGlyphs', '📐 TextColumn', '📐 RowPadding'].map(id => ({
					id,
					status: 'pass',
					complete: false,
					widths: [width],
					fixture: 'software',
					evidence:
						'Enhanced natural H2/H3 line metrics, actual gap, glyph sizing and header padding are asserted. Native fallback instead asserts visible text separation, row separation and ordinary prose flow; enhanced sizing there, missing modes and compact phases remain unverified.',
				})),
			}),
			contentType: 'application/json',
		})
	})
}

for (const width of [390, 1440]) {
	test(`native source padding agrees with its physical H2/H3 owner at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 180_000 })
		await page.evaluate(() => document.fonts.ready)
		test.skip(
			!(await page.evaluate(enhancedBreadcrumbs)),
			'Measured source padding requires enhanced breadcrumb geometry',
		)
		const observations = []

		for (const variant of [
			...headingVariants,
			{ name: 'stage-h2', selector: '#stages > header h2' },
			{ name: 'news-h2', selector: '#security-news > header h2' },
		]) {
			const heading = page.locator(variant.selector).first()

			await expect(heading, `${variant.name}: actual fixture heading exists`).toHaveCount(1)
			await test.step(
				`${variant.name}: open native ancestors and position natural row`,
				() =>
					heading.evaluate(async element => {
						const opened: HTMLDetailsElement[] = []

						for (
							let ancestor = element.parentElement;
							ancestor;
							ancestor = ancestor.parentElement
						) {
							if (ancestor instanceof HTMLDetailsElement && !ancestor.open) {
								opened.push(ancestor)
								ancestor.open = true
							}
						}
						await Promise.race([
							new Promise<void>(resolve =>
								requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
							),
							new Promise<never>((_, reject) =>
								setTimeout(
									() =>
										reject(
											new Error('Native geometry frame boundary did not arrive within 3000ms'),
										),
									3000,
								),
							),
						])
						await Promise.race([
							Promise.allSettled(
								opened
									.flatMap(details => details.getAnimations())
									.filter(
										animation =>
											animation instanceof CSSTransition && animation.playState === 'running',
									)
									.map(animation => animation.finished),
							),
							new Promise<never>((_, reject) =>
								setTimeout(
									() =>
										reject(
											new Error(
												'Opened native disclosure transitions did not settle within 3000ms',
											),
										),
									3000,
								),
							),
						])
						const root = document.querySelector<HTMLElement>('#layout')!

						root.style.scrollSnapType = 'none'
						const scope = element.closest('[data-sticky-breadcrumb~="scope"]')!
						const sourceWorldTop = root.scrollTop + scope.getBoundingClientRect().top

						for (let attempt = 0; attempt < 4; attempt++) {
							let precedingBottom = document
								.querySelector('#nav > header')!
								.getBoundingClientRect().bottom

							for (
								let ancestor = scope.parentElement;
								ancestor;
								ancestor = ancestor.parentElement
							) {
								if (!ancestor.matches('[data-sticky-breadcrumb~="scope"]')) {
									continue
								}

								const position = ancestor.querySelector(
									':scope > [data-sticky-breadcrumb~="position"], :scope > details > [data-sticky-breadcrumb~="position"]',
								)

								if (!position) {
									continue
								}

								const box = position.getBoundingClientRect()

								if (box.bottom > 0 && box.top <= precedingBottom + 2) {
									precedingBottom = Math.max(precedingBottom, box.bottom)
								}
							}
							root.scrollTo({
								top: sourceWorldTop - Math.max(root.clientHeight / 2, precedingBottom + 20),
								behavior: 'instant',
							})
							await Promise.race([
								new Promise<void>(resolve =>
									requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
								),
								new Promise<never>((_, reject) =>
									setTimeout(
										() =>
											reject(
												new Error('Native geometry frame boundary did not arrive within 3000ms'),
											),
										3000,
									),
								),
							])
						}
					}),
				{ timeout: 15_000 },
			)
			observations.push(
				await test.step(
					`${variant.name}: measure physical source padding`,
					() =>
						heading.evaluate(element => {
							const position = element.closest('[data-sticky-breadcrumb~="position"]')!
							const scope = element.closest('[data-sticky-breadcrumb~="scope"]')!
							const support = position.querySelector(':scope > [data-sticky-breadcrumb~="support"]')
							const splitRow = position.querySelector(':scope > [data-sticky]')
							const structural =
								!!splitRow && position.matches('[data-column~="span-start"], summary')
							const owner = structural ? splitRow : position
							const column = element.closest('[data-column~="span-start"]')
							const row =
								owner.querySelector(':scope > [data-row]') ??
								column?.querySelector(':scope > [data-row]') ??
								element.closest('[data-row]')!
							const trailingOwner = structural && support ? support : owner
							const item =
								element.closest('[data-sticky-breadcrumb~="item"]') ??
								element.querySelector('[data-sticky-breadcrumb~="item"]')

							if (!item) {
								throw new Error('The real source heading must retain its actual item owner')
							}

							const style = getComputedStyle(owner),
								box = owner.getBoundingClientRect(),
								rowBox = row.getBoundingClientRect()
							const scopeStyle = getComputedStyle(scope)
							const firstTrack = parseFloat(scopeStyle.gridTemplateRows)
							const trailingSpace =
								structural && !support
									? scope.getBoundingClientRect().top +
										parseFloat(scopeStyle.borderTopWidth) +
										parseFloat(scopeStyle.paddingTop) +
										firstTrack -
										rowBox.bottom
									: parseFloat(getComputedStyle(trailingOwner).paddingBottom)

							return {
								name: element.textContent?.trim(),
								level: element.tagName,
								rootFontSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
								scope: scope.id,
								variant: scope.closest('#stages')
									? 'stage'
									: scope.closest('#security-news')
										? 'news'
										: 'attribute',
								owner: {
									tag: owner.tagName,
									display: style.display,
									top: box.top,
									bottom: box.bottom,
									borderTop: parseFloat(style.borderTopWidth),
									paddingTop: parseFloat(style.paddingTop),
									paddingBottom: trailingSpace,
									cssPaddingBottom: getComputedStyle(trailingOwner).paddingBottom,
									trailingOwner:
										structural && !support ? 'first scope grid track' : trailingOwner.tagName,
								},
								row: { top: rowBox.top, bottom: rowBox.bottom },
								declaredPadding: parseFloat(
									getComputedStyle(item).getPropertyValue('--stickyBreadcrumb-sourcePaddingBlock'),
								),
								entry: getComputedStyle(position).getPropertyValue('---breadcrumb-entry').trim(),
							}
						}),
					{ timeout: 15_000 },
				),
			)
		}
		await info.attach('physical-source-padding-owners', {
			body: JSON.stringify({
				width,
				observations,
				compactContentCenter: {
					verified: false,
					reason:
						'Compact painted content-center alignment requires a qualified actual compact row witness; no typographic baseline is inferred from Range rectangles.',
				},
			}),
			contentType: 'application/json',
		})

		for (const variant of ['stage', 'news', 'attribute']) {
			expect(
				observations.some(observation => observation.variant === variant),
				`Real ${variant} headings are sampled`,
			).toBe(true)
		}

		for (const level of ['H2', 'H3']) {
			expect(observations.some(observation => observation.level === level)).toBe(true)
		}

		for (const observation of observations) {
			if (observation.owner.display === 'contents') {
				continue
			}

			const label = `${observation.level} ${observation.variant} ${observation.scope}: ${observation.name}`

			expect(observation.entry, `${label}: source padding is sampled before compaction`).toBe('0')
			expect(Number.isFinite(observation.declaredPadding), label).toBe(true)

			if (observation.level === 'H2') {
				expect(Number.isFinite(observation.rootFontSize), label).toBe(true)
				expect(observation.rootFontSize, label).toBeGreaterThan(0)

				for (const padding of [observation.owner.paddingTop, observation.owner.paddingBottom]) {
					expect(
						padding + 0.1,
						`${label}: visible H2 source padding is at least 1.5rem`,
					).toBeGreaterThanOrEqual(1.5 * observation.rootFontSize)
				}
			}

			expect(
				Math.abs(observation.owner.paddingTop - observation.declaredPadding),
				`${label}: physical leading padding equals the resolved source input`,
			).toBeLessThanOrEqual(0.1)
			expect(
				Math.abs(observation.owner.paddingBottom - observation.declaredPadding),
				`${label}: physical trailing padding equals the resolved source input`,
			).toBeLessThanOrEqual(0.1)
			expect(
				Math.abs(
					observation.row.top -
						observation.owner.top -
						observation.owner.borderTop -
						observation.owner.paddingTop,
				),
				`${label}: first row starts at the actual padded content edge`,
			).toBeLessThanOrEqual(1)
		}
	})
}

for (const width of [390, 1440]) {
	test(`compact native H2/H3 items align with their occupied row at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 180_000 })
		test.skip(
			!(await page.evaluate(enhancedBreadcrumbs)),
			'Measured compact rows require enhanced breadcrumb geometry',
		)
		await page.evaluate(() => document.fonts.ready)
		const observations = []

		for (const variant of [
			...headingVariants,
			{ name: 'stage-h2', selector: '#stages > header h2' },
			{ name: 'news-h2', selector: '#security-news > header h2' },
		]) {
			const heading = page.locator(variant.selector).first()

			await expect(heading, `${variant.name}: actual fixture heading exists`).toHaveCount(1)
			const observation = await test.step(
				`${variant.name}: native compact residence and geometry`,
				() =>
					heading.evaluate(async heading => {
						const rect = (box: DOMRect) => ({
							top: box.top,
							bottom: box.bottom,
							left: box.left,
							right: box.right,
							width: box.width,
							height: box.height,
						})
						const settle = () =>
							Promise.race([
								new Promise<void>(resolve =>
									requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
								),
								new Promise<never>((_, reject) =>
									setTimeout(
										() =>
											reject(
												new Error('Native geometry frame boundary did not arrive within 3000ms'),
											),
										3000,
									),
								),
							])
						const opened: HTMLDetailsElement[] = []

						for (
							let ancestor = heading.parentElement;
							ancestor;
							ancestor = ancestor.parentElement
						) {
							if (ancestor instanceof HTMLDetailsElement && !ancestor.open) {
								opened.push(ancestor)
								ancestor.open = true
							}
						}
						await settle()
						await Promise.race([
							Promise.allSettled(
								opened
									.flatMap(details => details.getAnimations())
									.filter(
										animation =>
											animation instanceof CSSTransition && animation.playState === 'running',
									)
									.map(animation => animation.finished),
							),
							new Promise<never>((_, reject) =>
								setTimeout(
									() =>
										reject(
											new Error(
												'Opened native disclosure transitions did not settle within 3000ms',
											),
										),
									3000,
								),
							),
						])
						const root = document.querySelector<HTMLElement>('#layout')!

						root.style.scrollSnapType = 'none'
						const scope = heading.closest('[data-sticky-breadcrumb~="scope"]')!
						const position = heading.closest('[data-sticky-breadcrumb~="position"]')!
						const item =
							heading.closest('[data-sticky-breadcrumb~="item"]') ??
							heading.querySelector('[data-sticky-breadcrumb~="item"]')

						if (!item) {
							throw new Error('Real compact identity owner missing')
						}

						let physicalOwner: Element | null = item

						while (
							physicalOwner &&
							position.contains(physicalOwner) &&
							getComputedStyle(physicalOwner).position !== 'sticky'
						) {
							physicalOwner = physicalOwner.parentElement
						}

						if (!physicalOwner || !position.contains(physicalOwner)) {
							throw new Error('Actual sticky foreground owner is absent inside the position')
						}

						const marker = scope.querySelector(
							':scope > [data-sticky-breadcrumb~="flow"]:not([data-sticky-breadcrumb~="exit"])',
						)!
						const seeks = []

						for (let attempt = 0; attempt < 2; attempt++) {
							const blockEnd = parseFloat(
								getComputedStyle(item).getPropertyValue('---breadcrumb-blockEnd'),
							)
							const requested =
								root.scrollTop +
								marker.getBoundingClientRect().bottom -
								root.getBoundingClientRect().top -
								root.clientTop -
								blockEnd +
								32

							root.scrollTo({ top: requested, behavior: 'instant' })
							await settle()
							seeks.push({ requested, delivered: root.scrollTop })
						}
						const beforeProbe = rect(item.getBoundingClientRect())
						const probe = document.createElement('span')

						probe.style.cssText =
							'all:initial;position:fixed;visibility:hidden;pointer-events:none;box-sizing:content-box;margin:0;padding:0;border:0;font-size:inherit;line-height:inherit;width:calc(var(---breadcrumb-endWrap)*1px);height:var(--stickyBreadcrumb-paddingBlock)'
						let endWrap: number, padding: number

						try {
							item.append(probe)
							const style = getComputedStyle(probe)

							endWrap = parseFloat(style.width)
							padding = parseFloat(style.height)
						} finally {
							probe.remove()
						}

						const afterProbe = rect(item.getBoundingClientRect())
						const style = getComputedStyle(item)
						const blockStart = parseFloat(style.getPropertyValue('---breadcrumb-blockStart'))
						const blockEnd = parseFloat(style.getPropertyValue('---breadcrumb-blockEnd'))
						const rowHeight = blockEnd - blockStart - 2 * padding
						const origin = root.getBoundingClientRect().top + root.clientTop
						const ownerBox = physicalOwner.getBoundingClientRect()
						const insetRaw = getComputedStyle(physicalOwner).insetBlockStart
						const inset = /^[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?px$/i.test(insetRaw.trim())
							? parseFloat(insetRaw)
							: NaN
						const source = heading.closest('[data-sticky-breadcrumb~="source"]')!
						const row = source.parentElement!.closest('[data-row]')!
						const rowStyle = getComputedStyle(row)
						const rowMatrix = new DOMMatrix(
							rowStyle.transform === 'none' ? undefined : rowStyle.transform,
						)
						const positionTranslateRaw = getComputedStyle(position).translate

						if (!(position instanceof HTMLElement)) {
							throw new Error('Native position must own HTML box dimensions')
						}

						const translationProbeItemBefore = rect(item.getBoundingClientRect())
						const translationProbe = document.createElement('span')

						translationProbe.style.cssText =
							'all:initial;position:fixed;inset:0 auto auto 0;visibility:hidden;pointer-events:none;box-sizing:border-box;margin:0;padding:0;border:0;contain:strict'
						translationProbe.style.width = `${position.offsetWidth}px`
						translationProbe.style.height = `${position.offsetHeight}px`
						let positionTranslate: number[]

						try {
							document.body.append(translationProbe)
							const baseline = translationProbe.getBoundingClientRect()

							translationProbe.style.translate = positionTranslateRaw
							const translated = translationProbe.getBoundingClientRect()

							positionTranslate = [translated.left - baseline.left, translated.top - baseline.top]
						} finally {
							translationProbe.remove()
						}

						const translationProbeItemAfter = rect(item.getBoundingClientRect())
						const end = [...position.querySelectorAll('[data-sticky-breadcrumb~="end"]')].find(
							element => element.closest('[data-sticky-breadcrumb~="position"]') === position,
						)
						const endPaint = end
							? (end.matches('[data-sticky-breadcrumb~="contents"]') ? [...end.children] : [end])
									.filter(
										element =>
											element.checkVisibility() &&
											getComputedStyle(element).visibility === 'visible',
									)
									.map(element => rect(element.getBoundingClientRect()))
									.filter(box => box.width > 0 && box.height > 0)
							: []

						if (end && !endPaint.length) {
							throw new Error('Actual metadata paint boxes are absent')
						}

						const endBox = endPaint.length
							? {
									top: Math.min(...endPaint.map(box => box.top)),
									bottom: Math.max(...endPaint.map(box => box.bottom)),
									left: Math.min(...endPaint.map(box => box.left)),
									right: Math.max(...endPaint.map(box => box.right)),
								}
							: null
						const itemBox = rect(item.getBoundingClientRect())
						const hit = document.elementFromPoint(
							(Math.max(0, itemBox.left) + Math.min(innerWidth, itemBox.right)) / 2,
							(Math.max(0, itemBox.top) + Math.min(innerHeight, itemBox.bottom)) / 2,
						)
						const reasons = []

						if (style.getPropertyValue('---breadcrumb-entry').trim() !== '1') {
							reasons.push('arrival is not fully compact')
						}

						if (!item.checkVisibility()) {
							reasons.push('actual compact item is not visible')
						}

						if (!Number.isFinite(inset) || Math.abs(ownerBox.top - origin - inset) > 1) {
							reasons.push('physical owner has not reached its native sticky inset')
						}

						if (
							!positionTranslate.every(
								component => Number.isFinite(component) && Math.abs(component) <= 0.1,
							)
						) {
							reasons.push('position departure translation is active')
						}

						if (Math.abs(rowMatrix.m42) > 0.1 || parseFloat(rowStyle.opacity) < 0.999) {
							reasons.push('row departure paint is active')
						}

						if (scope.getBoundingClientRect().bottom <= origin + blockEnd + rowHeight + 1) {
							reasons.push('scope is outside interior sticky residence')
						}

						if (
							![blockStart, blockEnd, rowHeight, padding, endWrap].every(Number.isFinite) ||
							![0, 1].includes(endWrap)
						) {
							reasons.push('native row allocation or wrap resolution is unavailable')
						}

						if (!hit || !item.contains(hit)) {
							reasons.push('actual item center does not receive native hit testing')
						}

						return {
							scope: scope.id,
							headingLevel: heading.tagName,
							rootRem: parseFloat(getComputedStyle(document.documentElement).fontSize),

							seeks,
							beforeProbe,
							afterProbe,
							item: itemBox,
							end: endBox,
							endPaint,
							physicalOwner: {
								tag: physicalOwner.tagName,
								sticky: physicalOwner.getAttribute('data-sticky'),
								box: rect(ownerBox),
								insetRaw,
								inset,
							},
							endWrap,
							padding,
							blockStart,
							blockEnd,
							origin,
							positionTranslateRaw,
							translationProbeItemBefore,
							translationProbeItemAfter,
							positionTranslate,
							qualified: reasons.length === 0,
							reasons,
							limits:
								'Element boxes verify native transformed geometry and hit delivery, not typographic baselines or glyph ink centers.',
						}
					}),
				{ timeout: 15_000 },
			)

			observations.push({ variant: variant.name, ...observation })

			if (observation.headingLevel === 'H2') {
				await info.attach(`compact-${variant.name}-${width}`, {
					body: await page.screenshot(),
					contentType: 'image/png',
				})
			}
		}
		await info.attach('compact-heading-row-centers', {
			body: JSON.stringify({ width, observations }, null, 2),
			contentType: 'application/json',
		})

		for (const observation of observations) {
			const label = `${observation.variant} ${observation.scope}`

			for (const axis of ['top', 'bottom', 'left', 'right', 'width', 'height'] as const) {
				expect(
					Math.abs(observation.beforeProbe[axis] - observation.afterProbe[axis]),
					`${label}: native length probe preserves item ${axis}`,
				).toBeLessThanOrEqual(0.1)
				expect(
					Math.abs(
						observation.translationProbeItemBefore[axis] -
							observation.translationProbeItemAfter[axis],
					),
					`${label}: native translation probe preserves item ${axis}`,
				).toBeLessThanOrEqual(0.1)
			}
			expect(observation.qualified, `${label}: ${observation.reasons.join('; ')}`).toBe(true)

			if (observation.headingLevel === 'H2') {
				expect(
					Math.abs(observation.padding - observation.rootRem),
					`${label}: compact H2 padding is one rem`,
				).toBeLessThanOrEqual(0.1)
				const paintTop = Math.min(
					observation.item.top,
					observation.end?.top ?? observation.item.top,
				)
				const paintBottom = Math.max(
					observation.item.bottom,
					observation.end?.bottom ?? observation.item.bottom,
				)

				expect(
					paintTop - observation.origin - observation.blockStart,
					`${label}: leading compact whitespace`,
				).toBeGreaterThanOrEqual(observation.rootRem - 1)
				expect(
					observation.origin + observation.blockEnd - paintBottom,
					`${label}: trailing compact whitespace`,
				).toBeGreaterThanOrEqual(observation.rootRem - 1)
			}

			const contentTop = observation.origin + observation.blockStart + observation.padding
			const contentBottom = observation.origin + observation.blockEnd - observation.padding

			if (observation.endWrap === 0) {
				const center = (contentTop + contentBottom) / 2

				expect(
					Math.abs((observation.item.top + observation.item.bottom) / 2 - center),
					`${label}: transformed identity is centered in its allocated compact row`,
				).toBeLessThanOrEqual(1)

				if (observation.end) {
					expect(
						Math.abs((observation.end.top + observation.end.bottom) / 2 - center),
						`${label}: metadata shares the allocated row center`,
					).toBeLessThanOrEqual(1)
				}
			} else {
				expect(
					Math.abs(observation.item.top - contentTop),
					`${label}: stacked identity starts at the allocated content edge`,
				).toBeLessThanOrEqual(1)
				const bottom = observation.end?.bottom ?? observation.item.bottom

				expect(
					Math.abs(bottom - contentBottom),
					`${label}: compact stack ends at the allocated content edge`,
				).toBeLessThanOrEqual(1)

				if (observation.end) {
					expect(
						observation.end.top,
						`${label}: stacked metadata does not overlap the identity`,
					).toBeGreaterThanOrEqual(observation.item.bottom - 1)
				}
			}
		}
	})
}

for (const width of [390, 1440]) {
	test(`breadcrumb end clusters respect intrinsic wrap boundaries at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		test.skip(
			!(await page.evaluate(enhancedBreadcrumbs)),
			'Native breadcrumb measurements unavailable',
		)
		const cases = await page.evaluate(async () => {
			await document.fonts.ready
			CSS.registerProperty({
				name: '--probe-length',
				syntax: '<length>',
				inherits: false,
				initialValue: '0px',
			})
			CSS.registerProperty({
				name: '--probe-number',
				syntax: '<number>',
				inherits: false,
				initialValue: '0',
			})
			const settle = () =>
				new Promise<void>(resolve =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
				)
			const observations = []
			const excluded = []

			for (const scope of document.querySelectorAll<HTMLElement>(
				'[data-sticky-breadcrumb~="scope"]',
			)) {
				const position = scope.querySelector<HTMLElement>(
					':scope > [data-sticky-breadcrumb~="position"], :scope > details > [data-sticky-breadcrumb~="position"]',
				)
				const measure = scope.querySelector<HTMLElement>(
					':scope > [data-sticky-breadcrumb~="flow"] > [data-sticky-breadcrumb~="measure"]',
				)

				if (!position || !measure || !position.querySelector('[data-sticky-breadcrumb~="end"]')) {
					continue
				}

				if (position.closest('details:not([open])')) {
					excluded.push({ id: scope.id, reason: 'closed disclosure' })
					continue
				}

				const owner = position.parentElement === scope ? position : position.parentElement!

				position.style.setProperty('--probe-length', 'var(---breadcrumb-availableInlineSize)')
				const available = parseFloat(getComputedStyle(position).getPropertyValue('--probe-length'))

				position.style.setProperty('--probe-length', 'var(---breadcrumb-endGap)')
				position.style.setProperty('--probe-number', 'var(---breadcrumb-endWrap)')
				const required =
					parseFloat(getComputedStyle(scope, '::before').width) +
					parseFloat(getComputedStyle(measure, '::before').width) +
					parseFloat(getComputedStyle(position).getPropertyValue('--probe-length')) +
					parseFloat(
						getComputedStyle(position).getPropertyValue('--stickyBreadcrumb-sourcePaddingInline'),
					)

				try {
					if (!Number.isFinite(required) || !Number.isFinite(available)) {
						throw new Error(`${scope.id}: intrinsic boundary is unavailable`)
					}

					if (required <= 0 || required + 1 >= available) {
						excluded.push({ id: scope.id, reason: 'threshold exceeds available width' })
						continue
					}

					const samples = []

					for (const delta of [-0.25, -0.0078125, 0.25]) {
						owner.style.setProperty(
							'--stickyBreadcrumb-availableInlineSize',
							`${required + delta}px`,
						)
						await settle()
						samples.push({
							delta,
							wrap: Number(getComputedStyle(position).getPropertyValue('--probe-number')),
						})
					}
					observations.push({
						id: scope.id,
						family: scope.closest('#stages')
							? 'stage'
							: scope.matches('.attribute-group')
								? 'group'
								: 'attribute',
						required,
						samples,
					})
				} finally {
					owner.style.removeProperty('--stickyBreadcrumb-availableInlineSize')
					position.style.removeProperty('--probe-length')
					position.style.removeProperty('--probe-number')
					await settle()
				}
			}

			return { observations, excluded }
		})

		await info.attach('intrinsic-wrap-boundaries', {
			body: JSON.stringify(cases),
			contentType: 'application/json',
		})
		expect(cases.observations.map(({ family }) => family)).toEqual(
			expect.arrayContaining(
				width === 1440 ? ['stage', 'group', 'attribute'] : ['group', 'attribute'],
			),
		)
		expect(
			cases.observations.length,
			'Actual end clusters must exercise both sides of their intrinsic threshold',
		).toBeGreaterThan(0)

		for (const { id, samples } of cases.observations) {
			for (const { delta, wrap } of samples) {
				expect(wrap, `${id}: ${delta}px from its intrinsic boundary`).toBe(delta < 0 ? 1 : 0)
			}
		}
	})
}

for (const width of [390, 1440]) {
	test(`description-free Stage H2 retains natural icon composition at ${width}px`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 180_000 })
		await page.evaluate(() => document.fonts.ready)
		const stage = page.locator('#stages')

		await stage.evaluate(element => {
			const root = document.querySelector('#layout')!

			root.setAttribute(
				'style',
				`${root.getAttribute('style') ?? ''};scroll-snap-type:none;scroll-behavior:auto`,
			)
			root.scrollTop += element.getBoundingClientRect().top - 250
		})
		await expect
			.poll(() => stage.evaluate(element => element.getBoundingClientRect().top))
			.toBeGreaterThan(180)
		const composition = await stage.evaluate(element => {
			const header = element.querySelector(':scope > header')!
			const title = header.querySelector('h2')!
			const icon = header.querySelector('[data-icon]')!
			const style = getComputedStyle(icon, '::before')
			const glyph: unknown = JSON.parse(style.content)

			if (typeof glyph !== 'string' || !glyph) {
				throw new Error('Stage icon must expose its actual font glyph')
			}

			const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`

			const primaryFont = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily.split(',')[0]}`

			if (!document.fonts.check(primaryFont, glyph)) {
				throw new Error(`Stage icon font is unavailable: ${primaryFont}`)
			}

			const context = document.createElement('canvas').getContext('2d')!

			context.font = font
			const ink = context.measureText(glyph)
			const titleBox = title.getBoundingClientRect(),
				iconBox = icon.getBoundingClientRect()

			return {
				support: header.querySelectorAll('[data-sticky-breadcrumb~=support]').length,
				lineHeight: parseFloat(getComputedStyle(title).lineHeight),
				inkHeight: ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent,
				wrapperCenterDifference: Math.abs(
					(titleBox.top + titleBox.bottom - iconBox.top - iconBox.bottom) / 2,
				),
				font,
				naturalTop: header.getBoundingClientRect().top,
			}
		})

		await info.attach('stage-natural-composition', {
			body: JSON.stringify(composition),
			contentType: 'application/json',
		})
		expect(composition.support).toBe(0)
		expect(composition.naturalTop).toBeGreaterThan(180)
		expect(Math.abs(composition.inkHeight - composition.lineHeight * 1.5 * 1.1)).toBeLessThan(2)
		expect(composition.wrapperCenterDifference).toBeLessThan(2)
	})
}

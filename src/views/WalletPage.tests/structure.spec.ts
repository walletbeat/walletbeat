import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import sharp from 'sharp'

import { semanticOutline } from '../../../tests/browser/semantic-outline.mjs'
import { expect, test } from '../../../tests/browser/verified-test'

const contractHash = createHash('sha256')
	.update(
		await readFile(new URL('../../../tests/browser/wallet-page-requirements.md', import.meta.url)),
	)
	.digest('hex')

for (const width of [390, 768, 1024, 1025, 1440]) {
	test(`structure at ${width}px`, async ({ page, browserName }, info) => {
		await page.setViewportSize({ width, height: 900 })
		const response = await page.goto('/__wallet-page/software/', {
			waitUntil: 'domcontentloaded',
			timeout: 600000,
		})

		expect(response?.ok(), 'Fixture must render successfully before checking its structure').toBe(
			true,
		)
		await expect(page.locator('#top h1')).toBeVisible()
		await test.step('🏗️ Singleton: exactly one real accessible H1', async () => {
			await expect(page.locator('h1')).toHaveCount(1)
			await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
			await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(
				await page.locator('#top h1 span').innerText(),
			)
		})
		await test.step('🏗️ Header ancestry, source order, outline and contextual regions', async () => {
			const structure = await page.locator('#top').evaluate(root => {
				const header = root.querySelector(':scope > header')
				const aside = root.querySelector(':scope > aside')
				const stage = root.querySelector('#stages')

				return {
					headerContainsTitle: header?.contains(root.querySelector('h1')),
					headerFirst: root.firstElementChild === header,
					asides: root.querySelectorAll(':scope > aside').length,
					asideBeforeStages:
						!!aside &&
						!!stage &&
						!!(aside.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING),
					stageHeading: stage?.querySelector(':scope > header h2')?.textContent?.trim(),
					stages: [...root.querySelectorAll('#stages section[id] > details > summary')].map(
						summary => summary.querySelectorAll('h3').length,
					),
					groups: [...root.querySelectorAll('.attribute-group')].map(group => {
						const heading = group.querySelector(':scope > header h2')

						return { title: heading?.textContent?.trim(), name: group.getAttribute('aria-label') }
					}),
					attributes: [
						...root.querySelectorAll('.attribute-group section.attribute > details > summary'),
					].map(summary => summary.querySelectorAll('h3').length),
				}
			})

			expect(structure.headerContainsTitle).toBe(true)
			expect(structure.headerFirst).toBe(true)
			expect(structure.asides).toBe(1)
			expect(structure.asideBeforeStages).toBe(true)
			expect(structure.stageHeading).toBe('Stage Progress')
			expect(structure.stages.length).toBeGreaterThan(0)
			expect(structure.stages.every(count => count === 1)).toBe(true)
			expect(structure.groups.length).toBeGreaterThan(0)

			for (const group of structure.groups) {
				expect(group.name).toBe(`${group.title} attributes`)
			}
			expect(structure.attributes.length).toBeGreaterThan(0)
			expect(structure.attributes.every(count => count === 1)).toBe(true)
		})
		await test.step('🏗️ Outline: all real headings follow their semantic owner', async () => {
			const outline = await page.locator('#top').evaluate(semanticOutline)

			expect(outline.filter(heading => heading.level !== heading.expected)).toEqual([])
		})
		await test.step('🏗️ Sources headings follow their actual semantic parent', async () => {
			const sources = await page.locator('#top .references').evaluateAll(sections =>
				sections.map(section => {
					const heading = section.querySelector(':scope > :is(h2,h3,h4,h5,h6)')

					for (let parent = section.parentElement; parent; parent = parent.parentElement) {
						if (!parent.matches('section,details,article')) {
							continue
						}

						const title = [...parent.querySelectorAll('h1,h2,h3,h4,h5,h6')].find(
							candidate => candidate.closest('section,details,article') === parent,
						)

						if (title) {
							return {
								level: Number(heading?.tagName.slice(1)),
								parent: Number(title.tagName.slice(1)),
								title: title.textContent?.trim(),
							}
						}
					}

					return { level: Number(heading?.tagName.slice(1)), parent: null, title: null }
				}),
			)

			expect(sources.length).toBeGreaterThan(0)

			for (const source of sources) {
				expect(source.parent, `Semantic parent for ${source.title}`).not.toBeNull()
				expect(source.level, `Sources under ${source.title}`).toBe((source.parent ?? 0) + 1)
			}
		})
		await test.step('🏗️ Destinations: unique local targets shared by pie and TOC', async () => {
			const result = await page.evaluate(() => {
				const ids = [...document.querySelectorAll('[id]')].map(element => element.id)
				const links = [...document.querySelectorAll<HTMLAnchorElement>('#top a[href^="#"]')]
				const localTargets = links.map(link => link.hash.slice(1)).filter(Boolean)
				const targets = (selector: string) =>
					[...document.querySelectorAll<HTMLAnchorElement>(selector)]
						.map(link => link.hash)
						.filter(Boolean)
						.sort()

				return {
					duplicates: ids.filter((id, index) => ids.indexOf(id) !== index),
					missing: localTargets.filter(id => !document.getElementById(decodeURIComponent(id))),
					pie: targets('.pie-navigation a[href^="#"]'),
					toc: targets('#wallet-toc a[href^="#"]'),
					attributes: [
						...document.querySelectorAll('.attribute-group[id], .attribute-group .attribute[id]'),
					]
						.map(element => `#${element.id}`)
						.sort(),
				}
			})

			expect(result.duplicates).toEqual([])
			expect(result.missing).toEqual([])
			expect(result.pie.length).toBeGreaterThan(0)
			expect(result.pie).toEqual(result.attributes)
			expect(result.pie).toEqual(result.toc.filter(href => result.attributes.includes(href)))
			expect(result.pie.some(href => href.startsWith('#security-news'))).toBe(false)
		})
		await test.step('🏗️ Landmarks: named Table of contents navigation', async () => {
			await expect(
				page.getByRole('navigation', {
					name: 'Table of contents',
					exact: true,
					includeHidden: true,
				}),
			).toHaveCount(1)
			const visibleLandmark = page.getByRole('navigation', {
				name: 'Table of contents',
				exact: true,
			})

			if (width <= 1024) {
				await expect(visibleLandmark).toHaveCount(0)
				await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
				await expect(visibleLandmark).toBeVisible()
				await page.keyboard.press('Escape')
				await expect(visibleLandmark).toHaveCount(0)
			} else {
				await expect(visibleLandmark).toBeVisible()
			}
		})
		await test.step('🔽 AttributeDefaults: real attribute disclosures initially open', async () => {
			const details = page.locator('#top .attribute-group section.attribute > details')

			expect(await details.count()).toBeGreaterThan(0)
			expect(
				await details.evaluateAll(elements =>
					elements.every(element => element.hasAttribute('open')),
				),
			).toBe(true)
		})
		await test.step('🔽 StageAccordion: native stage disclosure remains exclusive and keyboard operable', async () => {
			const stages = page.locator('#stages section[id] > details[name]')

			expect(await stages.count()).toBeGreaterThan(1)
			const names = await stages.evaluateAll(elements =>
				elements.map(element => element.getAttribute('name')),
			)

			expect(new Set(names).size).toBe(1)
			expect(names[0]).toBeTruthy()
			expect(
				await stages.evaluateAll(
					elements => elements.filter(element => element.hasAttribute('open')).length,
				),
			).toBeLessThanOrEqual(1)
			const first = stages.nth(0)
			const second = stages.nth(1)

			await first.locator(':scope > summary').focus()

			if (!(await first.evaluate(element => element.hasAttribute('open')))) {
				await page.keyboard.press('Space')
			}

			await second.locator(':scope > summary').focus()
			await page.keyboard.press('Space')
			await expect(first).not.toHaveAttribute('open')
			await expect(second).toHaveAttribute('open')
		})
		await test.step('⚓ Proximity: root retains block proximity snapping', async () => {
			const snap = await page
				.locator('#layout')
				.evaluate(element => getComputedStyle(element).scrollSnapType)

			expect(snap).toMatch(/^(block|y)( proximity)?$/)
		})
		await test.step('♿ Hydration: the real wallet island hydrates without page errors', async () => {
			await page.reload({ waitUntil: 'domcontentloaded' })
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 600000 })
		})
		await info.attach('contract-evidence', {
			body: JSON.stringify({
				contractHash,
				engine: browserName,
				results: [
					'🏗️ Singleton',
					'🏗️ Outline',
					'🏗️ RegionNames',
					'🏗️ Landmarks',
					'🔽 AttributeDefaults',
				].map(id => ({
					id,
					status: 'pass',
					complete: true,
					widths: [width],
					fixture: 'software',
					observation:
						'All real semantic headings and Sources owners, contextual group names, singleton accessible H1, unique named TOC with native open/Escape behavior, and every attribute initial disclosure state are asserted.',
				})),
			}),
			contentType: 'application/json',
		})
	})
}

test.describe('native page without JavaScript', () => {
	test.use({ javaScriptEnabled: false })
	test('♿ NoScript: semantic destinations remain readable and reachable', async ({
		page,
		browserName,
	}, info) => {
		const response = await page.goto('/__wallet-page/software/', {
			waitUntil: 'domcontentloaded',
			timeout: 600000,
		})

		expect(response?.ok(), 'Fixture must render successfully before checking its structure').toBe(
			true,
		)
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
		const destinations = await page.locator('#top').evaluate(root =>
			[...root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].map(link => ({
				href: link.hash,
				found: !!document.getElementById(decodeURIComponent(link.hash.slice(1))),
			})),
		)

		expect(destinations.length).toBeGreaterThan(0)
		expect(destinations.filter(destination => !destination.found)).toEqual([])
		const jsControls = page.locator(
			'#top select, #top button[aria-label="Expand or collapse all details in the current section"], #top button[aria-label="Previous rating section or attribute"], #top button[aria-label="Next rating section or attribute"]',
		)

		await expect(jsControls).toHaveCount(4)

		for (const control of await jsControls.all()) {
			await expect(control).toBeHidden()
			expect(await control.evaluate(element => element.closest('[inert]') !== null)).toBe(true)
		}
		const reached = []

		for (const level of [1, 2, 3, 4]) {
			const heading = page
				.locator(`#top h${level}:has(a[href^="#"]), #top a[href^="#"] > h${level}`)
				.first()

			await expect(heading).toHaveCount(1)

			for (const closed of await heading.locator('xpath=ancestor::details').all()) {
				if ((await closed.getAttribute('open')) !== null) {
					continue
				}

				const toggle = closed.locator(':scope > summary')

				await toggle.focus()
				await toggle.press('Enter')
				await expect(closed).toHaveAttribute('open')
			}
			await expect(heading).toHaveText(/\S/)
			const permalink = heading
				.locator('a[href^="#"]')
				.or(heading.locator('xpath=parent::a'))
				.first()
			const href = await permalink.getAttribute('href')

			expect(href).toMatch(/^#.+/)
			await permalink.focus()
			await page.keyboard.press('Enter')
			await expect.poll(() => new URL(page.url()).hash).toBe(href)
			await expect(heading).toBeVisible()
			reached.push({ level, href })
		}
		await info.attach('native-noscript-destinations', {
			body: JSON.stringify({ destinations, reached }),
			contentType: 'application/json',
		})
		const summary = page.locator('.attribute-group section.attribute > details > summary').first()

		await summary.focus()
		await summary.press('Enter')
		await expect(summary.locator('..')).not.toHaveAttribute('open')
		await summary.press('Enter')
		await expect(summary.locator('..')).toHaveAttribute('open', '')
		await info.attach('contract-evidence', {
			body: JSON.stringify({
				contractHash,
				engine: browserName,
				results: [
					{
						id: '♿ NoScript',
						status: 'pass',
						complete: true,
						observation:
							'Without JavaScript every local destination resolves; real H1–H4 destinations are reached with native keyboard permalinks after native disclosure opening and content remains readable.',
					},
					{
						id: '♿ Hydration',
						status: 'pass',
						complete: false,
						observation:
							'Without JavaScript wallet variant/model selects and scripted details/previous/next controls are absent; hydration-pending presentation still requires its own observation.',
					},
				],
			}),
			contentType: 'application/json',
		})
	})
})

test.describe('wallet ladder membership', () => {
	for (const [fixture, present] of [
		['embedded', false],
		['short', false],
		['unknown', true],
	] as const) {
		test(`🏗️ LadderPresence: ${fixture}`, async ({ page }) => {
			const response = await page.goto(`/__wallet-page/${fixture}/`)

			expect(response?.ok()).toBe(true)
			await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
			await expect(page.locator('#stages')).toHaveCount(present ? 1 : 0)

			if (fixture === 'unknown') {
				await expect(page.locator('#stages section[id] > details[name]').first()).toHaveAttribute(
					'open',
				)
			}
		})
	}

	test('🧩 TypeBadges: assigned types retain distinct ladder applicability', async ({ page }) => {
		const response = await page.goto('/__wallet-page/multipleTypes/')

		expect(response?.ok()).toBe(true)
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		const header = page.locator('#top > .wallet-header-flow')
		const software = header.locator('span[data-row]').filter({ hasText: /^software\s/i })
		const hardware = header.locator('span[data-row]').filter({ hasText: /^hardware\s/i })

		await expect(software).toHaveCount(1)
		await expect(hardware).toHaveCount(1)
		await expect(software.locator('[data-badge]')).not.toHaveAttribute('value', 'NOT_APPLICABLE')
		await expect(hardware.locator('[data-badge]')).toHaveAttribute('value', 'NOT_APPLICABLE')
		await expect(software.locator('a:has(data[data-badge])')).toHaveCount(1)
		await expect(hardware.locator('a:has(data[data-badge])')).toHaveCount(0)
	})
})

test('accessible native control names across ordinary and open navigation', async ({
	page,
	browserName,
}, info) => {
	const observations: { width: number; state: string; controls: number }[] = []

	for (const width of [390, 1440]) {
		await page.setViewportSize({ width, height: 900 })
		await page.goto('/__wallet-page/software/')
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		const check = async (state: string) => {
			const controls = page.locator(
				'a[href]:visible, button:visible, input:not([type="hidden"]):visible, select:visible, summary:visible, [role="button"]:visible',
			)

			expect(await controls.count()).toBeGreaterThan(0)

			for (const control of await controls.all()) {
				await expect(control).toHaveAccessibleName(/[\p{L}\p{N}]/u)
			}
			observations.push({ width, state, controls: await controls.count() })
		}

		await check('ordinary')

		if (width <= 1024) {
			const trigger = page.getByRole('button', { name: 'Table of contents', exact: true })

			await trigger.focus()
			await page.keyboard.press('Enter')
			await expect(
				page.getByRole('navigation', { name: 'Table of contents', exact: true }),
			).toBeVisible()
			await check('toc-open')
			await page.keyboard.press('Escape')
			await expect(trigger).toBeFocused()
			const menu = page.locator('#menu-toggle')

			await menu.focus()
			await page.keyboard.press('Enter')
			await expect
				.poll(() => page.locator('#nav-menu').evaluate(element => element.matches(':popover-open')))
				.toBe(true)
			await check('site-menu-open')
			await page.keyboard.press('Escape')
			await expect
				.poll(() => page.locator('#nav-menu').evaluate(element => element.matches(':popover-open')))
				.toBe(false)
		}
	}
	await info.attach('native-control-names', {
		body: JSON.stringify(observations),
		contentType: 'application/json',
	})
	await info.attach('contract-evidence', {
		body: JSON.stringify({
			contractHash,
			engine: browserName,
			results: [
				{
					id: '♿ ControlNames',
					status: 'pass',
					complete: false,
					widths: [390, 1440],
					observation:
						'Every visible native link, button, input, select and disclosure summary has an accessible name containing words or numbers in ordinary desktop/mobile, open TOC and open site navigation states; semantic meaningfulness of each name still requires role-specific assertions.',
				},
			],
		}),
		contentType: 'application/json',
	})
})

for (const hash of ['', '#scam-prevention']) {
	test(`real MetaMask presentation survives held-module hydration: ${hash || 'no-fragment fresh navigation'}`, async ({
		browser,
		browserName,
		baseURL,
	}, info) => {
		if (!baseURL) {
			throw new Error('Missing verified preview baseURL')
		}

		expect(
			info.config.updateSnapshots,
			'Runtime visual parity requires --update-snapshots=none',
		).toBe('none')

		const context = await browser.newContext({
			baseURL,
			viewport: { width: 933, height: 1203 },
			deviceScaleFactor: 1.64,
			colorScheme: 'dark',
		})
		const page = await context.newPage()
		const browserErrors: string[] = []

		page.on('pageerror', error => browserErrors.push(error.message))
		page.on('console', message => {
			if (message.type() === 'error') {
				browserErrors.push(message.text())
			}
		})
		const routeURL = `/metamask/?candidate=beta-pie-navigation-2.5.2${hash}`
		let releaseModule!: () => void
		const released = new Promise<void>(resolve => {
			releaseModule = resolve
		})
		let held = false

		try {
			const response = await page.request.get(routeURL)

			expect(response.ok()).toBe(true)
			const documentHTML = await response.text()
			const componentPath = await page.evaluate(html => {
				const parsed = new DOMParser().parseFromString(html, 'text/html')

				return parsed.querySelector('#top')?.closest('astro-island')?.getAttribute('component-url')
			}, documentHTML)

			expect(
				componentPath,
				'The served real page identifies the island that actually owns #top',
			).toBeTruthy()

			if (!componentPath) {
				throw new Error('Missing real WalletPage island module')
			}

			await page.route(new URL(componentPath, response.url()).href, async route => {
				held = true
				await released
				await route.continue()
			})
			await page.goto(routeURL, { waitUntil: 'commit' })
			await expect.poll(() => held).toBe(true)
			const island = page.locator('astro-island[ssr]:has(#top)')

			await expect(island).toHaveCount(1)
			await expect(page.locator('#top h1')).toBeVisible()
			await page.evaluate(() => document.fonts.ready)
			const observe = () =>
				page.locator('#top').evaluate(root => {
					const scroller = document.querySelector('#layout')

					if (!scroller) {
						throw new Error('Missing actual root scroll owner')
					}

					const rect = (element: Element) => {
						const box = element.getBoundingClientRect()

						return { x: box.x, y: box.y, width: box.width, height: box.height }
					}
					const owners = [
						'#top',
						'#scam-prevention',
						'#top > .wallet-header-flow',
						'.pie-navigation-geometry',
						'.wallet-device-controls',
						'#top select',
						'#top button[aria-label="Expand or collapse all details in the current section"]',
						'#top button[aria-label="Previous rating section or attribute"]',
						'#top button[aria-label="Next rating section or attribute"]',
					].map(selector => {
						const element = document.querySelector(selector)

						if (!element) {
							return {
								selector,
								box: null,
								opacity: null,
								display: null,
								visibility: null,
								color: null,
								background: null,
								filter: null,
								backdropFilter: null,
								font: null,
							}
						}

						const style = getComputedStyle(element)

						return {
							selector,
							box: rect(element),
							opacity: style.opacity,
							display: style.display,
							visibility: style.visibility,
							color: style.color,
							background: style.background,
							filter: style.filter,
							backdropFilter: style.backdropFilter,
							font: style.font,
						}
					})
					const petals = [
						...root.querySelectorAll('.pie-navigation :is(details[data-navigation-item], a[href])'),
					].map(element => {
						let opacity = 1

						for (
							let ancestor: Element | null = element;
							ancestor;
							ancestor = ancestor.parentElement
						) {
							opacity *= Number(getComputedStyle(ancestor).opacity)

							if (getComputedStyle(ancestor).visibility !== 'visible') {
								opacity = 0
							}

							if (ancestor === root) {
								break
							}
						}

						return {
							kind: element.tagName,
							id: element.getAttribute('data-navigation-item'),
							href: element.getAttribute('href'),
							box: rect(element),
							opacity,
						}
					})
					const select = root.querySelector('select')

					const nativeSelect = select instanceof HTMLSelectElement ? select : null

					return {
						url: location.href,
						fonts: document.fonts.status,
						root: {
							scrollTop: scroller.scrollTop,
							scrollHeight: scroller.scrollHeight,
							box: rect(scroller),
						},
						window: { x: scrollX, y: scrollY },
						owners,
						petals,
						visiblePetals: petals.filter(
							petal => petal.opacity > 0 && petal.box.width > 0 && petal.box.height > 0,
						).length,
						selection: nativeSelect
							? {
									selectedIndex: nativeSelect.selectedIndex,
									selectedLabel: nativeSelect.selectedOptions[0]?.label,
									nativeLabel: CSS.supports('appearance: base-select')
										? nativeSelect
												.querySelector('selectedcontent .select-label')
												?.textContent?.trim()
										: null,
								}
							: null,
						details: [...root.querySelectorAll('details')].map(element => ({
							id: element.id,
							open: element.open,
						})),
					}
				})
			const settle = async () => {
				let previous = await observe()
				let stable = 0

				await expect
					.poll(
						async () => {
							await page.evaluate(
								() =>
									new Promise<void>(resolve =>
										requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
									),
							)
							const next = await observe()

							stable = JSON.stringify(next) === JSON.stringify(previous) ? stable + 1 : 0
							previous = next

							return stable
						},
						{
							message:
								'Natural hash restoration and native geometry must settle without resetting scroll',
							timeout: 10000,
						},
					)
					.toBeGreaterThanOrEqual(2)

				return previous
			}
			const comparePaint = async (expected: Buffer, actual: Buffer, state: string) => {
				const name = `hydration-${state}-repeat-${info.repeatEachIndex}-retry-${info.retry}.png`
				const baseline = info.snapshotPath(name)

				await mkdir(dirname(baseline), { recursive: true })
				await writeFile(baseline, expected)
				expect(actual).toMatchSnapshot(name, { threshold: 0.2, maxDiffPixels: 0 })
			}

			const captureStablePaint = async (state: string) => {
				const samples = []
				const failures: string[] = []
				const deadline = Date.now() + 5000
				let stable = false

				for (let index = 0; index < 8 && Date.now() < deadline; index++) {
					const before = await observe()
					let image: Buffer

					try {
						image = await page.screenshot({ timeout: Math.max(1, deadline - Date.now()) })
					} catch (error) {
						failures.push(String(error))
						break
					}

					const after = await observe()

					await info.attach(`real-hydration-${state}-${index}`, {
						body: image,
						contentType: 'image/png',
					})
					await info.attach(`real-hydration-${state}-${index}-geometry`, {
						body: JSON.stringify({ before, after }),
						contentType: 'application/json',
					})
					samples.push({
						before,
						after,
						image,
						pixels: await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
					})

					if (samples.length >= 2) {
						const previous = samples[samples.length - 2]
						const current = samples[samples.length - 1]

						try {
							await comparePaint(previous.image, current.image, `${state}-stability-${index}`)
							stable =
								JSON.stringify(previous.before) === JSON.stringify(previous.after) &&
								JSON.stringify(previous.after) === JSON.stringify(current.before) &&
								JSON.stringify(current.before) === JSON.stringify(current.after)
						} catch (error) {
							failures.push(String(error))
						}

						if (stable) {
							break
						}
					}
				}
				await info.attach(`real-hydration-${state}-paint-admission`, {
					body: JSON.stringify({ stable, attempts: samples.length, failures }),
					contentType: 'application/json',
				})

				return { state, samples, stable, failures }
			}
			const controls = page.locator(
				'#top select, #top button[aria-label="Expand or collapse all details in the current section"], #top button[aria-label="Previous rating section or attribute"], #top button[aria-label="Next rating section or attribute"]',
			)
			const pending = await settle()
			const pendingInput = await controls.evaluateAll(elements =>
				elements.map(element => ({
					name: element.getAttribute('aria-label'),
					inert:
						!!element.closest('[inert]') ||
						((element instanceof HTMLButtonElement || element instanceof HTMLSelectElement) &&
							element.disabled),
				})),
			)
			const originalRoot = await page.locator('#top').elementHandle()

			await info.attach('real-hydration-pending-state', {
				body: JSON.stringify(pending),
				contentType: 'application/json',
			})
			const pendingPaint = await captureStablePaint('pending')

			releaseModule()
			await expect(island).toHaveCount(0)
			const immediate = await observe()

			await info.attach('real-hydration-immediate-state', {
				body: JSON.stringify(immediate),
				contentType: 'application/json',
			})
			const hydrated = await settle()

			await info.attach('real-hydration-ready-state', {
				body: JSON.stringify(hydrated),
				contentType: 'application/json',
			})
			const readyPaint = await captureStablePaint('ready')

			await info.attach('real-hydration-comparison', {
				body: JSON.stringify({
					pending,
					immediate,
					hydrated,
					browserErrors,
					captures: [pendingPaint, readyPaint].map(capture => ({
						state: capture.state,
						samples: capture.samples.map(sample => ({
							before: sample.before,
							after: sample.after,
							info: sample.pixels.info,
						})),
						stablePixels:
							capture.samples.length >= 2 &&
							capture.samples[0].pixels.data.equals(capture.samples[1].pixels.data),
					})),
					crossStatePixels:
						pendingPaint.samples.length > 0 &&
						readyPaint.samples.length > 0 &&
						pendingPaint.samples[0].pixels.data.equals(readyPaint.samples[0].pixels.data),
				}),
				contentType: 'application/json',
			})

			for (const capture of [pendingPaint, readyPaint]) {
				for (const sample of capture.samples) {
					expect(
						sample.after,
						`Inconclusive ${capture.state} capture: natural scroll or owned geometry changed during screenshot`,
					).toEqual(sample.before)
				}
				expect(
					capture.stable,
					`Inconclusive ${capture.state} paint: no consecutive perceptually stable same-geometry captures within 5 seconds / 8 samples`,
				).toBe(true)
			}

			expect(pendingInput).toHaveLength(4)
			expect(
				pendingInput.every(control => control.inert),
				'Held scripted controls remain inert without changing presentation',
			).toBe(true)
			expect(
				hydrated.visiblePetals,
				'Real petals must be painted before and after hydration',
			).toBeGreaterThan(0)
			expect(
				hydrated.owners.every(owner => owner.box !== null),
				'Every required real presentation owner is rendered',
			).toBe(true)
			expect(hydrated.selection?.selectedLabel).toMatch(/\S/)

			if (await page.evaluate(() => CSS.supports('appearance: base-select'))) {
				expect(pending.selection?.nativeLabel).toMatch(/\S/)
				expect(hydrated.selection?.nativeLabel).toMatch(/\S/)
			}

			expect(
				pending,
				'Hydration preserves natural restoration, whole scroll extent, real petals and owned control appearance',
			).toEqual(hydrated)
			expect(readyPaint.samples[0].pixels.info).toEqual(pendingPaint.samples[0].pixels.info)
			await comparePaint(
				pendingPaint.samples[pendingPaint.samples.length - 1].image,
				readyPaint.samples[readyPaint.samples.length - 1].image,
				'cross-state',
			)
			expect(
				await originalRoot?.evaluate(element => element === document.querySelector('#top')),
			).toBe(true)
			await expect(controls).toHaveCount(4)

			for (const control of await controls.all()) {
				await expect(control).toBeVisible()
				await expect(control).toBeEnabled()
				expect(await control.evaluate(element => !!element.closest('[inert]'))).toBe(false)
			}
			await info.attach('contract-evidence', {
				body: JSON.stringify({
					contractHash,
					engine: browserName,
					results: [
						{
							id: '♿ Hydration',
							status: 'pass',
							complete: false,
							observation:
								'Real MetaMask default/hash fresh journeys retain natural scroll restoration, document extent, visible petals, picker selection and owned controls at the measured viewport across an actual held island module. Query-selected variants/models, prior user-modified disclosures and other viewport sizes remain unverified.',
						},
					],
				}),
				contentType: 'application/json',
			})
		} finally {
			releaseModule()
			await context.close()
			expect(browserErrors, 'Real-page hydration has no browser runtime or console errors').toEqual(
				[],
			)
		}
	})
}

test('native disclosures work while the fixture module is pending and the ready picker updates its query', async ({
	page,
}) => {
	const routeURL = '/__wallet-page/software/'
	const response = await page.request.get(routeURL)

	expect(response.ok()).toBe(true)
	const documentHTML = await response.text()
	const componentPath = await page.evaluate(
		html =>
			new DOMParser()
				.parseFromString(html, 'text/html')
				.querySelector('#top')
				?.closest('astro-island')
				?.getAttribute('component-url'),
		documentHTML,
	)

	if (!componentPath) {
		throw new Error('Missing actual fixture island module')
	}

	let releaseModule!: () => void
	let held = false
	const released = new Promise<void>(resolve => {
		releaseModule = resolve
	})
	const componentURL = new URL(componentPath, response.url()).href

	await page.route(componentURL, async route => {
		held = true
		await released
		await route.continue()
	})

	try {
		await page.goto(routeURL, { waitUntil: 'commit' })
		await expect.poll(() => held).toBe(true)
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(1)
		const summary = page.locator('.attribute-group section.attribute > details > summary').first()

		await summary.focus()
		await page.keyboard.press('Enter')
		await expect(summary.locator('..')).not.toHaveAttribute('open')
		await page.keyboard.press('Enter')
		await expect(summary.locator('..')).toHaveAttribute('open')
		releaseModule()
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		const picker = page.getByRole('combobox', { name: 'Wallet version', exact: true })

		await expect(picker).toBeVisible()
		await picker.focus()
		await page.keyboard.press('m')
		await page.keyboard.press('Enter')
		await expect
			.poll(() => new URL(page.url()).searchParams.get('variant'))
			.toBe(await picker.inputValue())
	} finally {
		releaseModule()
		await page.unroute(componentURL)
	}
})

for (const route of [
	'/ambire/?variant=BROWSER',
	'/metamask/?variant=MOBILE',
	'/__wallet-page/unknown/',
]) {
	test(`top Stage badge links to its rendered destination: ${route}`, async ({ page }) => {
		await page.goto(route)
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
		const badges = page.locator('#top > .wallet-header-flow a:has(> data[data-badge][value])')

		await expect(badges).toHaveCount(1)
		const badge = badges.first()
		const value = await badge.locator('data').getAttribute('value')

		expect(value).not.toBeNull()
		const expectedHash = value === 'UNRATED' || value === 'NO_STAGES' ? '#stages' : `#${value}`

		await expect(badge).toHaveAttribute('href', expectedHash)
		const destination = page.locator(`[id="${expectedHash.slice(1)}"]`)

		await expect(destination).toHaveCount(1)
		const disclosure = destination.locator(':scope > details')

		if (await disclosure.count()) {
			await disclosure.evaluate(element => {
				if (!(element instanceof HTMLDetailsElement)) {
					throw new Error('Expected native Stage disclosure')
				}

				element.open = false
			})
		}

		const originalUrl = new URL(page.url())

		await badge.click()
		await expect.poll(() => decodeURIComponent(new URL(page.url()).hash)).toBe(expectedHash)
		const currentUrl = new URL(page.url())

		expect(currentUrl.pathname).toBe(originalUrl.pathname)
		expect(currentUrl.search).toBe(originalUrl.search)

		if (await disclosure.count()) {
			await expect(disclosure).toHaveAttribute('open')
		}
	})
}

test('rendered top-level H2 sections retain one separator across conditional content', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 768, height: 900 })

	for (const { fixture, ...expected } of [
		{ fixture: 'software', stage: true, news: true, credits: false },
		{ fixture: 'embedded', stage: false, news: false, credits: false },
		{ fixture: 'short', stage: false, news: false, credits: false },
		{ fixture: 'credits', stage: true, news: true, credits: true },
	]) {
		await page.goto(`/__wallet-page/${fixture}/`, { waitUntil: 'domcontentloaded' })
		await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0, { timeout: 180_000 })
		await expect(page.locator('#top > article')).toHaveCount(1)
		const observation = await page.locator('#top > article').evaluate(article => {
			const headings = [...article.querySelectorAll('h2')]
			const regions = new Map<Element, { id: string; title: string }>()

			for (const heading of headings) {
				const section = heading.closest('section, aside')

				if (!section || !article.contains(section) || regions.has(section)) {
					throw new Error('Each top-level H2 requires one distinct semantic section')
				}

				regions.set(section, {
					id: section.id || section.className,
					title: heading.textContent?.trim() ?? '',
				})
			}
			const sequence: {
				kind: 'separator' | 'section'
				id?: string
				title?: string
				width?: number
				height?: number
			}[] = []
			const walk = (parent: Element) => {
				for (const child of parent.children) {
					const region = regions.get(child)

					if (region) {
						sequence.push({ kind: 'section', ...region })
					} else if (child.tagName === 'HR') {
						const box = child.getBoundingClientRect()

						sequence.push({ kind: 'separator', width: box.width, height: box.height })
					} else {
						walk(child)
					}
				}
			}

			walk(article)

			return {
				sequence,
				sections: [...regions.values()],
				stage: regions.has(article.querySelector('#stages')!),
				news: regions.has(article.querySelector('#security-news')!),
				credits: Boolean(article.querySelector('.data-credits h2')),
			}
		})

		for (const field of ['stage', 'news', 'credits'] as const) {
			expect(observation[field], `${fixture}: ${field} presence follows the fixture contract`).toBe(
				expected[field],
			)
		}

		await info.attach(`section-separators-${fixture}`, {
			body: JSON.stringify(observation),
			contentType: 'application/json',
		})
		expect(observation.sequence.length, `${fixture}: no orphan or missing section separator`).toBe(
			observation.sections.length * 2,
		)

		for (const [index, section] of observation.sections.entries()) {
			expect(section.title, `${fixture}: nonempty section title`).not.toBe('')
			const separator = observation.sequence[index * 2]

			expect(separator.kind, `${fixture}: one leading separator for ${section.title}`).toBe(
				'separator',
			)
			expect(separator.width, `${fixture}: visible separator width`).toBeGreaterThan(0)
			expect(separator.height, `${fixture}: visible separator height`).toBeGreaterThan(0)
			expect(observation.sequence[index * 2 + 1]).toEqual({ kind: 'section', ...section })
		}
	}
})

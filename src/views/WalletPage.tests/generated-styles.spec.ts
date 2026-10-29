import type { Page } from '@playwright/test'
import postcss from 'postcss'

import { expect, test } from '../../../tests/browser/verified-test'

test.use({ viewport: { width: 1440, height: 900 } })
test.setTimeout(90000)

async function generatedStyles(page: Page) {
	const styles = await page.locator('style').allTextContents()

	for (const [index, css] of styles.entries()) {
		expect(() => postcss.parse(css, { from: `${page.url()}#inline-style-${index}` })).not.toThrow()
	}

	return page.locator('[data-wallet-peer-fallback]').evaluateHandle(element => {
		const pie = element.previousElementSibling

		if (
			!(pie instanceof HTMLStyleElement) ||
			!pie.sheet ||
			!pie.textContent?.trim() ||
			!pie.sheet.cssRules.length
		) {
			throw new Error('The generated pie stylesheet must have real CSS before the fallback')
		}

		return { pie, sheet: pie.sheet, program: [...pie.sheet.cssRules].map(rule => rule.cssText) }
	})
}

async function peerDomain(page: Page) {
	await test.info().attach('font-state', {
		body: JSON.stringify(
			await page.evaluate(() => ({
				status: document.fonts.status,
				faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })),
			})),
		),
		contentType: 'application/json',
	})
	await test.step(
		'font readiness',
		() => expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded'),
		{
			timeout: 15000,
		},
	)
	const domain = await page.locator('#top').evaluate(root => {
		const toc = root.querySelector('#wallet-toc')
		const source = [
			...(toc?.querySelectorAll<HTMLAnchorElement>('a[data-pressable-name]') ?? []),
		].find(link => {
			const name = link.getAttribute('data-pressable-name')

			return (
				name &&
				link.closest('summary') &&
				root.querySelector(`.pie-navigation a[data-pressable-name=${CSS.escape(name)}]`)
			)
		})
		const name = source?.getAttribute('data-pressable-name')

		if (!source || !name || !source.textContent?.trim()) {
			throw new Error('Real TOC group source required')
		}

		const target = document.getElementById(decodeURIComponent(new URL(source.href).hash.slice(1)))
		const peers = [
			...root.querySelectorAll<HTMLAnchorElement>(`a[data-pressable-name=${CSS.escape(name)}]`),
		]
		const pie = peers.find(link => link.closest('.pie-navigation'))
		const heading = peers.find(link => link.closest('h2,h3') || link.querySelector('h2,h3'))

		if (!target || !pie || !heading || peers.length < 3) {
			throw new Error('TOC, pie, heading and destination must share a real identity')
		}

		const shapeSupported = CSS.supports('clip-path', 'shape(from 0 0, line to 1px 1px, close)')
		const cs = getComputedStyle(pie),
			box = pie.getBoundingClientRect()
		const visiblePie =
			box.width > 0 &&
			box.height > 0 &&
			box.bottom > 0 &&
			box.top < innerHeight &&
			cs.display !== 'none' &&
			cs.visibility === 'visible' &&
			Number(cs.opacity) > 0 &&
			(cs.backgroundImage !== 'none' ||
				!['transparent', 'rgba(0, 0, 0, 0)'].includes(cs.backgroundColor))

		return {
			name,
			shapeSupported,
			visiblePie,
			sourceText: source.textContent.trim(),
			peerCount: peers.length,
		}
	})

	expect(
		domain.shapeSupported ? domain.visiblePie : true,
		'Supported pie has visible nontransparent paint',
	).toBe(true)

	return domain
}

async function exercisePeers(
	page: Page,
	name: string,
	browserName: string,
	javaScriptEnabled: boolean,
) {
	const history: { phase: string; state: string; detail?: unknown }[] = []

	async function bounded<T>(
		phase: string,
		action: () => Promise<T>,
		milliseconds = 5000,
	): Promise<T> {
		history.push({ phase, state: 'started' })
		let timer: ReturnType<typeof setTimeout> | undefined

		try {
			const value = await Promise.race([
				action(),
				new Promise<never>((_, reject) => {
					timer = setTimeout(
						() => reject(new Error(`${phase} did not complete within ${milliseconds}ms`)),
						milliseconds,
					)
				}),
			])

			history.push({ phase, state: 'completed' })

			return value
		} finally {
			clearTimeout(timer)
		}
	}
	const selector = `a[data-pressable-name=${JSON.stringify(name)}]`
	const source = page.locator(`#wallet-toc ${selector}`)

	await expect(source).toHaveCount(1)
	await bounded('reveal source', () => source.scrollIntoViewIfNeeded())
	const neutral = await bounded('neutral hit', () =>
		page.evaluate(() => {
			for (const [x, y] of [
				[4, innerHeight - 4],
				[innerWidth / 2, innerHeight - 4],
				[innerWidth / 2, innerHeight / 2],
			]) {
				const hit = document.elementFromPoint(x, y)

				if (
					hit &&
					!hit.closest('a,button,summary,select,input,label,[role="button"],[data-pressable]')
				) {
					return { x, y }
				}
			}
			throw new Error('A neutral native pointer location is required')
		}),
	)
	const cdp =
		browserName === 'chromium' && javaScriptEnabled === false
			? await bounded('open native input session', () => page.context().newCDPSession(page))
			: null
	let pressed = false
	let sourcePoint: { x: number; y: number } | undefined
	const releasePoint = neutral
	const selectLinkText = browserName === 'firefox'
	let modifierHeld = false
	const move = async (x: number, y: number): Promise<void> => {
		if (cdp) {
			await cdp.send('Input.dispatchMouseEvent', {
				type: 'mouseMoved',
				x,
				y,
				button: pressed ? 'left' : 'none',
				buttons: pressed ? 1 : 0,
				pointerType: 'mouse',
			})
		} else {
			await page.mouse.move(x, y)
		}
	}
	const down = async (): Promise<void> => {
		if (!cdp) {
			await page.mouse.down()

			return
		}

		if (!sourcePoint) {
			throw new Error('Owned native source point must precede the press')
		}

		await cdp.send('Input.dispatchMouseEvent', {
			type: 'mousePressed',
			...sourcePoint,
			button: 'left',
			buttons: 1,
			clickCount: 1,
			pointerType: 'mouse',
		})
	}
	const up = async (): Promise<void> => {
		if (cdp) {
			await cdp.send('Input.dispatchMouseEvent', {
				type: 'mouseReleased',
				...neutral,
				button: 'left',
				buttons: 0,
				clickCount: 1,
				pointerType: 'mouse',
			})
		} else {
			await page.mouse.up()
		}
	}

	const read = () =>
		bounded(
			'peer style observation',
			() =>
				page.locator(`#top ${selector}`).evaluateAll(links => {
					if (links.length < 3) {
						throw new Error('The complete canonical peer domain must remain present')
					}

					return links.map(link => {
						const cs = getComputedStyle(link)

						return {
							interacting: cs.getPropertyValue('---link-interacting').trim(),
							opacity: Number(cs.opacity),
							scale: cs.scale === 'none' ? 1 : Number(cs.scale.split(/\s+/)[0]),
							rawScale: cs.scale,
							pressedOpacity: Number(cs.getPropertyValue('--pressable-pressed-opacity')),
							pressedScale: Number(cs.getPropertyValue('--pressable-pressed-scale')),
						}
					})
				}),
			3000,
		)

	type Peer = Awaited<ReturnType<typeof read>>[number]
	const poll = (phase: string, accepts: (peers: Peer[]) => boolean) =>
		bounded(
			phase,
			() =>
				expect
					.poll(
						async () => {
							const peers = await read()

							history.push({ phase, state: 'observed', detail: peers })

							return accepts(peers)
						},
						{ timeout: 8000 },
					)
					.toBe(true),
			10000,
		)
	const neutralize = async () => {
		await bounded('neutral pointer move', () => move(neutral.x, neutral.y))
		await bounded('clear focus', () =>
			page.evaluate(() => {
				if (document.activeElement instanceof HTMLElement) {
					document.activeElement.blur()
				}
			}),
		)
		await poll('neutral feedback', peers => peers.every(peer => peer.interacting === '0'))
	}
	const admitSource = (phase: string, expected: { active: boolean; hover: boolean }) =>
		bounded(phase, () =>
			expect
				.poll(
					async () => {
						const actual = await bounded('source pseudo-state observation', () =>
							source.evaluate(link => ({
								active: link.matches(':active'),
								hover: link.matches(':hover'),
								focus: link.matches(':focus'),
								focusVisible: link.matches(':focus-visible'),
								ownerActive: link.closest('summary')?.matches(':active') ?? false,
								scrollX,
								scrollY,
							})),
						)

						history.push({ phase, state: 'observed', detail: actual })

						return actual
					},
					{ timeout: 3000 },
				)
				.toMatchObject(expected),
		)
	let primary: Error | undefined
	const cleanupErrors: string[] = []

	try {
		await neutralize()

		if (selectLinkText) {
			expect(
				await bounded('native selection admission', () =>
					page.evaluate(() => getSelection()?.isCollapsed ?? true),
				),
			).toBe(true)
		}

		const url = page.url()

		await bounded('native source hover', () => source.hover())
		await poll('hover propagation', peers => peers.every(peer => peer.interacting === '1'))

		if (cdp || selectLinkText) {
			sourcePoint = await bounded('owned source hit', () =>
				source.evaluate(link => {
					const rect = link.getBoundingClientRect()

					if (!(rect.width > 0 && rect.height > 0)) {
						throw new Error('Native source has no positive box')
					}

					for (const fy of [0.5, 0.2, 0.8]) {
						for (const fx of [0.5, 0.2, 0.8]) {
							const x = rect.left + rect.width * fx,
								y = rect.top + rect.height * fy

							if (
								x > 0 &&
								x < innerWidth &&
								y > 0 &&
								y < innerHeight &&
								link.contains(document.elementFromPoint(x, y))
							) {
								return { x, y }
							}
						}
					}
					throw new Error('Native source requires an actual owned hit')
				}),
			)
			await bounded('native source point', () => move(sourcePoint!.x, sourcePoint!.y))
		}

		if (selectLinkText) {
			const geometry = await bounded('activation owner geometry', () =>
				source.evaluate((link, endpoint) => {
					const owner = link.closest('summary') ?? link
					const hit = document.elementFromPoint(endpoint.x, endpoint.y)

					if (!hit || owner.contains(hit)) {
						throw new Error('Release endpoint must be outside the native activation owner')
					}

					const rect = (element: Element) => {
						const box = element.getBoundingClientRect()

						return { left: box.left, top: box.top, width: box.width, height: box.height }
					}

					return {
						source: rect(link),
						owner: rect(owner),
						endpoint: { ...endpoint, tag: hit.tagName },
						scrollX,
						scrollY,
					}
				}, releasePoint),
			)

			history.push({ phase: 'activation owner geometry', state: 'observed', detail: geometry })
			// Native Option-drag selects link text instead of starting a URL drag.
			await bounded('native link selection modifier', () => page.keyboard.down('Alt'))
			modifierHeld = true
		}

		const disclosures = () =>
			page.locator('#wallet-toc details').evaluateAll(nodes =>
				nodes.map(node => {
					if (!(node instanceof HTMLDetailsElement)) {
						throw new Error('TOC disclosure owner must be a native details')
					}

					return { id: node.id, open: node.open }
				}),
			)
		const beforeDisclosures = await bounded('disclosure admission', disclosures)

		pressed = true
		await bounded('native press', down)
		await admitSource('native active admission', { active: true, hover: true })
		await poll('held peer paint', peers =>
			peers.every(
				peer =>
					Number.isFinite(peer.pressedOpacity) &&
					Number.isFinite(peer.pressedScale) &&
					Math.abs(peer.opacity - peer.pressedOpacity) < 0.01 &&
					Math.abs(peer.scale - peer.pressedScale) < 0.01,
			),
		)
		await bounded('release location', () => move(releasePoint.x, releasePoint.y))

		if (selectLinkText) {
			await admitSource('outside held admission', { active: true, hover: false })
		}

		await bounded('native release', up)
		pressed = false
		await admitSource('released admission', { active: false, hover: false })
		expect(
			await bounded('released disclosures', disclosures),
			'Release outside does not activate an enclosing summary',
		).toEqual(beforeDisclosures)

		if (modifierHeld) {
			await bounded('release native selection modifier', () => page.keyboard.up('Alt'))
			modifierHeld = false
		}

		await neutralize()
		const settledAt = Date.now() + 500

		await bounded('settled no-navigation', () =>
			expect
				.poll(
					() => {
						expect(page.url(), 'Releasing outside the native link does not navigate').toBe(url)

						return Date.now() >= settledAt
					},
					{ intervals: [100] },
				)
				.toBe(true),
		)

		if (selectLinkText) {
			const neutralStillOwned = await bounded('native selection cleanup hit', () =>
				page.evaluate(point => {
					const hit = document.elementFromPoint(point.x, point.y)

					return (
						hit !== null &&
						!hit.closest('a,button,summary,select,input,label,[role="button"],[data-pressable]')
					)
				}, neutral),
			)

			expect(neutralStillOwned).toBe(true)
			await bounded('native selection cleanup', () => page.mouse.click(neutral.x, neutral.y))
			await bounded('native selection cleared', () =>
				expect.poll(() => page.evaluate(() => getSelection()?.isCollapsed ?? true)).toBe(true),
			)
			expect(await bounded('cleanup disclosure stability', disclosures)).toEqual(beforeDisclosures)
			expect(page.url()).toBe(url)
		}
	} catch (error) {
		primary =
			error instanceof Error ? error : new Error('Native peer exercise failed', { cause: error })
	}

	// Closing the owned failed page terminates pending input without overlapping another gesture.
	if (primary) {
		try {
			await bounded('close failed input page', () => page.close(), 2000)
		} catch (error) {
			cleanupErrors.push(String(error))
		}
	}

	if (cdp && !page.isClosed()) {
		try {
			await bounded('detach native input session', () => cdp.detach(), 2000)
		} catch (error) {
			cleanupErrors.push(String(error))
		}
	}

	try {
		await test.info().attach('peer-observations', {
			body: JSON.stringify({
				name,
				actuator: cdp
					? 'chromium-public-cdp-js-disabled'
					: selectLinkText
						? 'firefox-native-alt-cancellation'
						: 'playwright',
				sourcePoint,
				releasePoint,
				selectLinkText,
				modifierHeld,
				pressed,
				history,
				primary: primary?.stack ?? null,
				cleanupErrors,
			}),
			contentType: 'application/json',
		})
	} catch (error) {
		cleanupErrors.push(
			error instanceof Error ? error.message : 'Failed to attach peer observations',
		)
	}

	if (primary) {
		throw primary
	}

	if (cleanupErrors.length) {
		throw new Error(cleanupErrors.join('\n'))
	}
}

for (const fixture of ['software', 'hardware', 'embedded']) {
	test.describe(`${fixture} generated SSR styles`, () => {
		test.describe('without JavaScript', () => {
			test.use({ javaScriptEnabled: false })
			test('native no-JS peers consume the emitted CSS', async ({
				page,
				browserName,
				javaScriptEnabled,
			}) => {
				await page.goto(`/__wallet-page/${fixture}/`)
				const fallback = page.locator('[data-wallet-peer-fallback]')

				await expect
					.poll(async () => (await fallback.textContent())?.trim().length)
					.toBeGreaterThan(0)
				const original = await test.step('read generated CSS', () => generatedStyles(page), {
					timeout: 15000,
				})
				const domain = await test.step('admit peer domain', () => peerDomain(page), {
					timeout: 20000,
				})

				await test.step(
					'native peer hover and press',
					() => exercisePeers(page, domain.name, browserName, javaScriptEnabled),
					{ timeout: 60000 },
				)
				await original.dispose()
			})
		})

		test('the actual island handoff retains the pie CSS program and peer paint', async ({
			page,
			browserName,
			javaScriptEnabled,
		}) => {
			const warnings: string[] = []

			page.on('console', message => {
				if (/hydration/i.test(message.text())) {
					warnings.push(message.text())
				}
			})
			const routeURL = `/__wallet-page/${fixture}/`
			const response = await page.request.get(routeURL)

			expect(response.ok()).toBe(true)
			const component = await page.evaluate(
				html =>
					new DOMParser()
						.parseFromString(html, 'text/html')
						.querySelector('astro-island:has(#top)')
						?.getAttribute('component-url'),
				await response.text(),
			)

			if (!component) {
				throw new Error('The actual WalletFixture island component URL is required')
			}

			const expectedURL = new URL(component, response.url()).href

			expect(new URL(expectedURL).pathname).toMatch(/\/WalletFixture\.[^/]+\.js$/)
			let release = () => {}
			const released = new Promise<void>(resolve => {
				release = resolve
			})
			const held: string[] = []

			await page.route('**/WalletFixture.*.js', async route => {
				held.push(new URL(route.request().url()).href)
				await released
				await route.continue()
			})

			try {
				await page.goto(routeURL, { waitUntil: 'domcontentloaded' })
				await expect.poll(() => held.includes(expectedURL)).toBe(true)
				expect(held.every(url => url === expectedURL)).toBe(true)
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(1)
				const fallback = page.locator('[data-wallet-peer-fallback]')

				await expect
					.poll(async () => (await fallback.textContent())?.trim().length)
					.toBeGreaterThan(0)
				const original = await test.step('read generated CSS', () => generatedStyles(page), {
					timeout: 15000,
				})
				const before = await test.step('admit pending peer domain', () => peerDomain(page), {
					timeout: 20000,
				})

				await test.step(
					'pending native peer feedback',
					() => exercisePeers(page, before.name, browserName, javaScriptEnabled),
					{ timeout: 60000 },
				)
				release()
				await expect(page.locator('astro-island[ssr]:has(#top)')).toHaveCount(0)
				await expect.poll(() => fallback.textContent()).toBe('')
				expect(
					await original.evaluate(
						({ pie, sheet, program }) =>
							pie.isConnected &&
							pie.sheet === sheet &&
							JSON.stringify([...sheet.cssRules].map(rule => rule.cssText)) ===
								JSON.stringify(program),
					),
				).toBe(true)
				const after = await test.step('admit hydrated peer domain', () => peerDomain(page), {
					timeout: 20000,
				})

				expect(after).toEqual(before)
				await test.step(
					'hydrated native peer feedback',
					() => exercisePeers(page, after.name, browserName, javaScriptEnabled),
					{ timeout: 60000 },
				)
				await generatedStyles(page).then(handle => handle.dispose())
				expect(warnings).toEqual([])
				await original.dispose()
			} finally {
				release()
			}
		})
	})
}

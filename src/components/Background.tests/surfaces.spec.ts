import { expect, test } from '@playwright/test'
import sharp from 'sharp'

for (const colorScheme of ['light', 'dark'] as const) {
	test(`relative card roles preserve nested distinction across hues in ${colorScheme}`, async ({
		page,
	}, testInfo) => {
		await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
		await page.goto('/bitget/')
		const samples = await page.evaluate(scheme => {
			const root = document.createElement('div')
			const samples = []
			const canvas = document.createElement('canvas')

			canvas.width = canvas.height = 1
			const context = canvas.getContext('2d')

			if (context === null) {
				throw new Error('Missing color context')
			}

			const rgba = (value: string) => {
				context.clearRect(0, 0, 1, 1)
				context.fillStyle = value
				context.fillRect(0, 0, 1, 1)

				return [...context.getImageData(0, 0, 1, 1).data]
			}
			const paint = (element: HTMLElement) => {
				const probe = document.createElement('span')

				probe.style.color = 'var(--card-backgroundColor)'
				element.append(probe)
				const fill = rgba(getComputedStyle(probe).color)

				probe.style.color = 'var(--accent-textColor)'
				const foreground = rgba(getComputedStyle(probe).color)

				probe.remove()

				return { fill, foreground, backing: rgba(getComputedStyle(element).backgroundColor) }
			}

			root.id = 'relative-surface-test'
			root.style.cssText = 'position:fixed;inset:100px;z-index:10000;display:flex;gap:8px'
			document.body.append(root)
			const rect = (element: HTMLElement) => {
				const { x, y, width, height } = element.getBoundingClientRect()

				return { x, y, width, height }
			}

			for (const hue of [0, 45, 90, 135, 180, 225, 270, 315]) {
				const backdrop = document.createElement('div')
				const raised = document.createElement('div')
				const nested = document.createElement('div')
				const primary = document.createElement('div')
				const repeated = document.createElement('div')
				const tertiary = document.createElement('div')

				backdrop.style.cssText = `position:relative;flex:none;width:80px;height:112px;padding:8px;background:hsl(${hue} 65% ${scheme === 'light' ? 85 : 20}%)`
				raised.setAttribute('data-card', 'secondary')
				nested.setAttribute('data-card', '')
				raised.style.cssText =
					'position:relative;width:64px;height:64px;--card-padding:0;--card-radius:0'
				nested.style.cssText =
					'position:absolute;left:16px;top:16px;width:32px;height:32px;--card-padding:0;--card-radius:0'
				primary.setAttribute('data-card', '')
				primary.style.setProperty('--accent', 'var(--rating-unrated)')
				primary.style.cssText =
					'position:absolute;left:8px;top:80px;width:64px;height:24px;--card-padding:0;--card-radius:0;--accent:var(--rating-unrated)'
				repeated.setAttribute('data-card', 'secondary')
				repeated.style.cssText =
					'position:absolute;left:48px;top:48px;width:16px;height:16px;--card-padding:0;--card-radius:0'
				tertiary.style.cssText =
					'position:absolute;left:4px;top:4px;width:8px;height:8px;background-color:var(--background-tertiary)'
				repeated.append(tertiary)
				raised.append(nested, repeated)
				backdrop.append(raised, primary)
				root.append(backdrop)
				samples.push({
					hue,
					backdrop: rect(backdrop),
					raised: rect(raised),
					nested: rect(nested),
					primary: rect(primary),
					primaryPaint: paint(primary),
					nestedPaint: paint(nested),
					repeatedPaint: paint(repeated),
					repeated: rect(repeated),
					tertiary: rect(tertiary),
				})
			}

			return {
				samples,
				text: getComputedStyle(root).color,
				nestedBacking: [...root.querySelectorAll('[data-card] [data-card]')].map(
					card => getComputedStyle(card).backgroundColor,
				),
			}
		}, colorScheme)
		const screenshot = await page.screenshot({ scale: 'css' })
		const { data, info } = await sharp(screenshot)
			.removeAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true })
		const pixel = (x: number, y: number) => {
			const offset = (Math.floor(y) * info.width + Math.floor(x)) * info.channels

			return [data[offset], data[offset + 1], data[offset + 2]]
		}
		const luminance = (rgb: number[]) =>
			rgb
				.map(channel => {
					const value = channel / 255

					return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
				})
				.reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
		const text = luminance((samples.text.match(/\d+/g) ?? []).slice(0, 3).map(Number))
		const rendered = samples.samples.map(sample => {
			const backdrop = pixel(sample.backdrop.x + 2, sample.backdrop.y + 2)
			const raised = pixel(sample.raised.x + 2, sample.raised.y + 2)
			const nested = pixel(
				sample.nested.x + sample.nested.width / 2,
				sample.nested.y + sample.nested.height / 2,
			)
			const primary = pixel(sample.primary.x + 2, sample.primary.y + 2)
			const repeated = pixel(sample.repeated.x + 1, sample.repeated.y + 1)
			const tertiary = pixel(sample.tertiary.x + 4, sample.tertiary.y + 4)
			const over = (source: number[], background: number[]) =>
				background.map(
					(channel, index) => (source[index] * source[3]) / 255 + channel * (1 - source[3] / 255),
				)
			const expected = over(sample.primaryPaint.fill, over(sample.primaryPaint.backing, backdrop))
			const expectedNested = over(sample.nestedPaint.fill, raised)

			const expectedRepeated = over(sample.repeatedPaint.fill, raised)

			return {
				hue: sample.hue,
				backdrop,
				raised,
				nested,
				primary,
				expected,
				expectedNested,
				expectedRepeated,
				repeated,
				tertiary,
				geometry: sample,
				primaryPaint: sample.primaryPaint,
				nestedPaint: sample.nestedPaint,
			}
		})

		await testInfo.attach('hue-transmission', {
			body: Buffer.from(JSON.stringify(rendered)),
			contentType: 'application/json',
		})
		await testInfo.attach('hue-matrix', { body: screenshot, contentType: 'image/png' })

		for (const sample of rendered) {
			for (let channel = 0; channel < 3; channel++) {
				expect(Math.abs(sample.primary[channel] - sample.expected[channel])).toBeLessThanOrEqual(2)
				expect(
					Math.abs(sample.nested[channel] - sample.expectedNested[channel]),
				).toBeLessThanOrEqual(2)
				expect(
					Math.abs(sample.repeated[channel] - sample.expectedRepeated[channel]),
					`repeat at hue ${sample.hue}`,
				).toBeLessThanOrEqual(2)
			}
			const { raised, nested, primary, repeated, tertiary } = sample
			const raisedY = luminance(raised)
			const nestedY = luminance(nested)

			expect(sample.primaryPaint.foreground[3]).toBe(255)
			const linkY = luminance(sample.primaryPaint.foreground.slice(0, 3)),
				primaryY = luminance(primary)

			expect(
				(Math.max(linkY, primaryY) + 0.05) / (Math.min(linkY, primaryY) + 0.05),
			).toBeGreaterThanOrEqual(4.5)

			expect(raisedY, `raised role at hue ${sample.hue}`).toBeGreaterThan(luminance(primary))
			expect(nestedY, `nested role at hue ${sample.hue}`).toBeLessThan(raisedY)

			// Repetition follows the actual alpha composition; an opaque same-tone role may remain equal.

			if (colorScheme === 'light') {
				expect(luminance(tertiary)).toBeLessThan(luminance(repeated))
			} else {
				expect(luminance(tertiary)).toBeGreaterThan(luminance(repeated))
			}

			for (const background of [
				raisedY,
				nestedY,
				luminance(primary),
				luminance(repeated),
				luminance(tertiary),
			]) {
				expect(
					(Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05),
				).toBeGreaterThanOrEqual(4.5)
			}
		}
		expect(new Set(rendered.map(sample => sample.raised.join(','))).size).toBe(8)
		expect(samples.nestedBacking).toEqual(Array(16).fill('rgba(0, 0, 0, 0)'))

		await page.locator('#relative-surface-test').evaluate(element => element.remove())
	})

	test(`popup descendants retain canonical surfaces in ${colorScheme}`, async ({ page }) => {
		await page.emulateMedia({ colorScheme })
		await page.goto('/bitget/')
		const result = await page.evaluate(() => {
			const parent = document.createElement('div')
			const popup = document.createElement('dialog')
			const child = document.createElement('div')
			const reference = document.createElement('div')

			parent.setAttribute('data-card', '')
			child.setAttribute('data-card', 'secondary')
			reference.style.backgroundColor = 'var(--background-secondary)'
			popup.append(child)
			parent.append(popup)
			document.body.append(parent, reference)
			popup.showModal()
			const result = {
				actual: getComputedStyle(child).backgroundColor,
				expected: getComputedStyle(reference).backgroundColor,
				image: getComputedStyle(child).backgroundImage,
			}

			popup.close()
			parent.remove()
			reference.remove()

			return result
		})

		expect(result.actual).toBe(result.expected)
		expect(result.image).toBe('none')
	})

	test(`ordinary page cards retain their original fill in ${colorScheme}`, async ({ page }) => {
		await page.emulateMedia({ colorScheme })
		await page.goto('/')
		const colors = await page.evaluate(() => {
			const card = document.createElement('div')
			const reference = document.createElement('div')

			card.setAttribute('data-card', 'secondary')
			reference.style.backgroundColor = 'var(--background-secondary)'
			document.body.append(card, reference)
			const result = [
				getComputedStyle(card).backgroundColor,
				getComputedStyle(reference).backgroundColor,
			]

			card.remove()
			reference.remove()

			return result
		})

		expect(colors[0]).toBe(colors[1])
	})
}

test('authored surfaces with equal lightness retain their independent hue', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'dark' })
	await page.goto('/bitget/')
	const colors = await page.evaluate(() =>
		[30, 150, 270].map(hue => {
			const card = document.createElement('div')

			card.setAttribute('data-card', '')
			card.style.setProperty('--card-backgroundColor', `oklch(0.6 0.06 ${hue})`)
			document.body.append(card)
			const probe = document.createElement('span')

			probe.style.color = 'var(--card-backgroundColor)'
			card.append(probe)
			const color = getComputedStyle(probe).color
			const reference = document.createElement('div')

			reference.style.backgroundColor = `oklch(0.6 0.06 ${hue})`
			document.body.append(reference)
			const expected = getComputedStyle(reference).backgroundColor

			card.remove()
			reference.remove()

			return { color, expected }
		}),
	)

	expect(new Set(colors.map(entry => entry.color)).size).toBe(3)

	for (const entry of colors) {
		expect(entry.color).toBe(entry.expected)
	}
})

test('touch layouts without blobs retain their canonical card surfaces', async ({
	browser,
	baseURL,
}) => {
	const context = await browser.newContext({
		baseURL,
		viewport: { width: 390, height: 844 },
		hasTouch: true,
	})

	try {
		const page = await context.newPage()

		await page.goto('/metamask/')
		await expect(page.locator('#stages details[data-card]').first()).toHaveCSS(
			'--card-primaryOpacity',
			'0.5',
		)
		const colors = await page.evaluate(() => {
			const card = document.createElement('div')
			const reference = document.createElement('div')

			card.setAttribute('data-card', 'secondary')
			reference.style.backgroundColor = 'var(---secondary-reference)'
			document.body.append(card, reference)
			const colors = [
				getComputedStyle(card).backgroundColor,
				getComputedStyle(reference).backgroundColor,
			]

			card.remove()
			reference.remove()

			return colors
		})

		expect(colors[0]).toBe(colors[1])
	} finally {
		await context.close()
	}
})

test('stage accent mixes retain their authored color while their base surface becomes relative', async ({
	page,
}) => {
	await page.emulateMedia({ colorScheme: 'dark' })
	await page.goto('/bitget/')
	await page.waitForFunction(
		() =>
			!document.querySelector(
				'astro-island[ssr][client="load"], astro-island[ssr][component-url*="WalletPageContext"]',
			),
	)
	const result = await page
		.locator('[data-card][style*="--stage-background"]')
		.first()
		.evaluate(card => {
			const probe = document.createElement('span')
			const canvas = document.createElement('canvas')
			const context = canvas.getContext('2d')

			if (context === null) {
				throw new Error('Missing color conversion context')
			}

			canvas.width = canvas.height = 1
			card.append(probe)
			probe.style.color = 'var(--card-backgroundColor)'
			const fill = getComputedStyle(probe).color
			const sample = (color: string) => {
				probe.style.color = color
				context.clearRect(0, 0, 1, 1)
				context.fillStyle = getComputedStyle(probe).color
				context.fillRect(0, 0, 1, 1)

				return [...context.getImageData(0, 0, 1, 1).data]
			}
			const source = sample(`color(from ${fill} srgb r g b / 1)`)
			const accent = sample('var(--accent)')
			const base = sample('var(--background-primary)')
			const authored = card.style.getPropertyValue('--stage-background')
			const percent = /var\(--accent\) ([\d.]+)%/.exec(authored)

			if (percent === null) {
				throw new Error('Missing authored accent weight')
			}

			const weight = Number(percent[1]) / 100
			const mixed = sample(fill)

			probe.remove()

			return { fill, source, accent, base, weight, mixed }
		})

	expect(result.fill).toContain('/')

	const alpha =
		(result.weight * result.accent[3]) / 255 + ((1 - result.weight) * result.base[3]) / 255

	for (let channel = 0; channel < 3; channel++) {
		const expected =
			((result.accent[channel] * result.weight * result.accent[3]) / 255 +
				(result.base[channel] * (1 - result.weight) * result.base[3]) / 255) /
			alpha

		expect(Math.abs(result.mixed[channel] - expected)).toBeLessThanOrEqual(2)
	}
	expect(Math.abs(result.mixed[3] / 255 - alpha)).toBeLessThanOrEqual(1 / 255)
})

for (const colorScheme of ['light', 'dark'] as const) {
	for (const wallet of ['metamask', 'bitget']) {
		test(`actual wallet surface samples ${wallet} ${colorScheme}`, async ({
			page,
			browserName,
		}, testInfo) => {
			test.skip(
				browserName !== 'chromium',
				'Consumer captures supplement the cross-engine role matrix',
			)
			await page.setViewportSize({ width: 1280, height: 900 })
			await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
			await page.goto(`/${wallet}/`)
			await page.waitForFunction(
				() =>
					!document.querySelector(
						'astro-island[ssr][client="load"], astro-island[ssr][component-url*="WalletPageContext"]',
					),
			)
			const card = page.locator('main [data-card]').first()

			const details = card.locator(':scope > details')

			if (
				(await details.count()) > 0 &&
				(await details.evaluate(element => element.hasAttribute('open')))
			) {
				await details.locator(':scope > summary').click()
			}

			await card.scrollIntoViewIfNeeded()
			const measurements = []

			for (const time of [0, 20000, 40000]) {
				await page.locator('.background-blobs').evaluate(
					(background, time) =>
						background.getAnimations({ subtree: true }).forEach(animation => {
							animation.pause()
							animation.currentTime = time
						}),
					time,
				)
				const original = await card.evaluate(element =>
					['background-color', 'background-image'].map(property => ({
						property,
						value: element.style.getPropertyValue(property),
						priority: element.style.getPropertyPriority(property),
					})),
				)
				const before = await card.screenshot({ scale: 'css' })

				await card.evaluate(element => {
					element.style.backgroundColor = 'transparent'
					element.style.backgroundImage = 'none'
				})
				const backdrop = await card.screenshot({ scale: 'css' })

				await card.evaluate((element, style) => {
					for (const saved of style) {
						if (saved.value === '') {
							element.style.removeProperty(saved.property)
						} else {
							element.style.setProperty(saved.property, saved.value, saved.priority)
						}
					}
				}, original)
				const restored = await card.screenshot({ scale: 'css' })

				const sample = async (image: Buffer) => {
					const { data, info } = await sharp(image)
						.removeAlpha()
						.raw()
						.toBuffer({ resolveWithObject: true })
					const values = []

					for (const fraction of [0.1, 0.5, 0.9]) {
						const x = Math.floor((info.width - 8) * fraction)
						const channels = [0, 1, 2].map(channel => {
							const pixels = []

							for (let y = 12; y < 20; y++) {
								for (let column = x; column < x + 8; column++) {
									pixels.push(data[(y * info.width + column) * info.channels + channel])
								}
							}
							pixels.sort((a, b) => a - b)

							return (pixels[31] + pixels[32]) / 2
						})

						values.push({ x, y: 12, channels })
					}

					return values
				}

				const foreground = await card.evaluate(element => {
					const canvas = document.createElement('canvas')

					canvas.width = canvas.height = 1
					const context = canvas.getContext('2d')

					if (context === null) {
						throw new Error('Missing color context')
					}

					context.fillStyle = getComputedStyle(element).color
					context.fillRect(0, 0, 1, 1)

					return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
				})
				const luminance = (rgb: number[]) =>
					rgb.reduce((sum, channel, index) => {
						const value = channel / 255

						return (
							sum +
							(value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) *
								[0.2126, 0.7152, 0.0722][index]
						)
					}, 0)
				const painted = await sample(before)
				const repeated = await sample(restored)
				const contrasts = painted.map(patch => {
					const background = luminance(patch.channels)
					const text = luminance(foreground)

					return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05)
				})

				for (const ratio of contrasts) {
					expect(ratio).toBeGreaterThanOrEqual(4.5)
				}

				await testInfo.attach(`restored-${time}`, { body: restored, contentType: 'image/png' })
				expect(repeated).toEqual(painted)
				measurements.push({
					time,
					card: painted,
					foreground,
					contrasts,
					backdrop: await sample(backdrop),
					restored: repeated,
				})
				await testInfo.attach(`surface-${time}`, { body: before, contentType: 'image/png' })
				await testInfo.attach(`backdrop-${time}`, { body: backdrop, contentType: 'image/png' })
			}
			await testInfo.attach('surface-measurements', {
				body: Buffer.from(JSON.stringify(measurements)),
				contentType: 'application/json',
			})
		})
	}
}

for (const colorScheme of ['light', 'dark'] as const) {
	test(`logo peak preserves readable text roles in ${colorScheme}`, async ({
		page,
		browserName,
	}, testInfo) => {
		test.skip(
			browserName !== 'chromium',
			'Palette peak supplements the cross-engine compositing matrix',
		)
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
		await page.goto('/nufi/')
		const sample = await page.evaluate(() => {
			const layout = document.getElementById('layout')

			if (layout !== null) {
				layout.style.visibility = 'hidden'
			}

			const background = document.querySelector('.background-blobs')

			if (background === null) {
				throw new Error('Missing background')
			}

			background.getAnimations({ subtree: true }).forEach(animation => {
				animation.pause()
				animation.currentTime = 20000
			})
			const blob = background.querySelector('.blob')

			if (blob === null) {
				throw new Error('Missing chromatic palette')
			}

			const rect = blob.getBoundingClientRect()
			const card = document.createElement('div')

			card.setAttribute('data-card', 'secondary')
			card.id = 'palette-peak-test'
			card.style.cssText = `position:fixed;left:${rect.x + rect.width / 2 - 32}px;top:${rect.y + rect.height / 2 - 32}px;width:64px;height:64px;z-index:10000;--card-padding:0;--card-radius:0`
			document.body.append(card)
			const canvas = document.createElement('canvas')

			canvas.width = canvas.height = 1
			const context = canvas.getContext('2d')

			if (context === null) {
				throw new Error('Missing color context')
			}

			const probe = document.createElement('span')

			card.append(probe)
			const foregrounds = [
				'--text-primary',
				'--text-secondary',
				'--rating-pass-text',
				'--rating-partial-text',
				'--rating-fail-text',
				'--rating-neutral-text',
			].map(role => {
				probe.style.color = `var(${role})`
				context.clearRect(0, 0, 1, 1)
				context.fillStyle = getComputedStyle(probe).color
				context.fillRect(0, 0, 1, 1)

				return { role, rgb: [...context.getImageData(0, 0, 1, 1).data].slice(0, 3) }
			})

			probe.remove()

			return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, foregrounds }
		})
		const { data, info } = await sharp(
			await page.screenshot({
				scale: 'css',
				clip: { x: Math.floor(sample.x) - 4, y: Math.floor(sample.y) - 4, width: 8, height: 8 },
			}),
		)
			.removeAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true })
		const offset = (4 * info.width + 4) * info.channels
		const painted = [data[offset], data[offset + 1], data[offset + 2]]
		const luminance = (rgb: number[]) =>
			rgb
				.map(channel => {
					const value = channel / 255

					return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
				})
				.reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
		const background = luminance(painted)

		const contrasts = sample.foregrounds.map(foreground => {
			const text = luminance(foreground.rgb)

			return {
				...foreground,
				ratio: (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05),
			}
		})

		await testInfo.attach('peak-contrast', {
			body: Buffer.from(JSON.stringify({ painted, contrasts })),
			contentType: 'application/json',
		})

		for (const foreground of contrasts) {
			const text = luminance(foreground.rgb)

			expect(
				(Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05),
				foreground.role,
			).toBeGreaterThanOrEqual(4.5)
		}
		await page.locator('#palette-peak-test').evaluate(element => element.remove())
		await page.locator('#layout').evaluate(element => element.style.removeProperty('visibility'))
	})
}

for (const scenario of [
	'light-primary',
	'light-secondary',
	'dark-primary',
	'dark-secondary',
] as const) {
	const colorScheme = scenario.startsWith('light') ? 'light' : 'dark'
	const secondary = scenario.endsWith('secondary')

	test(`actual wallet nested surfaces preserve hierarchy in ${scenario}`, async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
		await page.goto('/metamask/')
		await page.waitForFunction(
			() =>
				!document.querySelector(
					'astro-island[ssr][client="load"], astro-island[ssr][component-url*="WalletPageContext"]',
				),
		)
		await page.evaluate(() => document.fonts.ready)
		await page.addStyleTag({
			content:
				'* { scroll-behavior: auto !important; } #layout { scroll-snap-type: none !important; }',
		})
		const allPairs = await page.locator('main [data-card]').evaluateAll(cards => {
			const result = []

			for (const secondary of [false, true]) {
				const card = cards.find(element => {
					const parent = element.parentElement?.closest('[data-card]')

					return (
						element.matches('[data-card~="secondary"]') === secondary &&
						parent !== null &&
						parent !== undefined &&
						parent.matches('[data-card~="secondary"]') !== secondary &&
						element.checkVisibility()
					)
				})

				if (card === undefined) {
					continue
				}

				let node = card
				const path = []

				while (node.id === '' && node.parentElement !== null) {
					path.unshift(
						`${node.tagName.toLowerCase()}:nth-child(${[...node.parentElement.children].indexOf(node) + 1})`,
					)
					node = node.parentElement
				}

				if (node.id === '') {
					throw new Error('Missing stable consumer ancestor')
				}

				result.push({
					selector: `#${CSS.escape(node.id)}${path.length === 0 ? '' : ` > ${path.join(' > ')}`}`,
					secondary,
				})
			}

			return result
		})

		expect(allPairs).toHaveLength(2)
		const pairs = allPairs.filter(pair => pair.secondary === secondary)

		expect(pairs).toHaveLength(1)
		type Pair = (typeof pairs)[number]
		const measure = async (pair: Pair, pose: { top: number; left: number } | null = null) => {
			const card = page.locator(pair.selector)

			if (pose === null) {
				await card.scrollIntoViewIfNeeded()
			} else {
				await page.locator('#layout').evaluate((element, pose) => {
					if (!(element instanceof HTMLElement)) {
						throw new Error('Missing scroll owner')
					}

					element.scrollTop = pose.top
					element.scrollLeft = pose.left
				}, pose)
			}

			await page.evaluate(
				() =>
					new Promise<void>(resolve =>
						requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
					),
			)
			const scroll = await page
				.locator('#layout')
				.evaluate(element => ({ top: element.scrollTop, left: element.scrollLeft }))
			const geometry = () =>
				card.evaluate(element => {
					const { x, y, width, height } = element.getBoundingClientRect()

					return { x, y, width, height }
				})
			const rect = await geometry()
			const viewport = page.viewportSize()

			if (viewport === null) {
				throw new Error('Missing viewport')
			}

			const left = Math.max(0, rect.x),
				right = Math.min(viewport.width, rect.x + rect.width)
			const top = Math.max(0, rect.y),
				bottom = Math.min(viewport.height, rect.y + rect.height)

			expect(right - left).toBeGreaterThanOrEqual(8)
			expect(bottom - top).toBeGreaterThanOrEqual(8)
			const clip = {
				x: Math.floor((left + right) / 2) - 4,
				y: Math.floor((top + bottom) / 2) - 4,
				width: 8,
				height: 8,
			}

			expect(clip.x).toBeGreaterThanOrEqual(rect.x)
			expect(clip.y).toBeGreaterThanOrEqual(rect.y)
			expect(clip.x + 8).toBeLessThanOrEqual(rect.x + rect.width)
			expect(clip.y + 8).toBeLessThanOrEqual(rect.y + rect.height)
			const metadata = await card.evaluate(element => {
				if (!(element instanceof HTMLElement)) {
					throw new Error('Missing HTML surface')
				}

				const style = getComputedStyle(element),
					parent = element.parentElement?.closest('[data-card]')
				const canvas = document.createElement('canvas')

				canvas.width = canvas.height = 1
				const context = canvas.getContext('2d')

				if (context === null) {
					throw new Error('Missing color context')
				}

				context.fillStyle = style.color
				context.fillRect(0, 0, 1, 1)
				const foreground = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
				const children = [...element.children].map((child, index) => {
					if (!(child instanceof HTMLElement || child instanceof SVGElement)) {
						throw new Error('Unsupported paint child')
					}

					const saved = {
						index,
						value: child.style.getPropertyValue('opacity'),
						priority: child.style.getPropertyPriority('opacity'),
					}

					child.style.setProperty('opacity', '0', 'important')

					return saved
				})

				return {
					foreground,
					children,
					own: {
						value: element.style.getPropertyValue('opacity'),
						priority: element.style.getPropertyPriority('opacity'),
					},
					role: element.getAttribute('data-card'),
					background: style.backgroundColor,
					image: style.backgroundImage,
					primary: style.getPropertyValue('--background-primary'),
					primaryOpacity: style.getPropertyValue('--card-primaryOpacity'),
					stageBackground: style.getPropertyValue('--stage-background'),
					parentRole: parent?.getAttribute('data-card'),
				}
			})
			const sample = async () => {
				const { data } = await sharp(await page.screenshot({ clip, scale: 'css' }))
					.removeAlpha()
					.raw()
					.toBuffer({ resolveWithObject: true })

				return [...data.subarray(4 * 8 * 3 + 4 * 3, 4 * 8 * 3 + 4 * 3 + 3)]
			}
			const painted = await sample()

			expect(await geometry()).toEqual(rect)
			await card.evaluate(element => {
				if (!(element instanceof HTMLElement)) {
					throw new Error('Missing surface')
				}

				element.style.setProperty('opacity', '0', 'important')
			})
			expect(await card.evaluate(element => getComputedStyle(element).opacity)).toBe('0')
			const backdrop = await sample()

			expect(await geometry()).toEqual(rect)
			await card.evaluate((element, saved) => {
				if (!(element instanceof HTMLElement)) {
					throw new Error('Missing surface')
				}

				if (saved.own.value === '') {
					element.style.removeProperty('opacity')
				} else {
					element.style.setProperty('opacity', saved.own.value, saved.own.priority)
				}

				for (const original of saved.children) {
					const child = element.children[original.index]

					if (!(child instanceof HTMLElement || child instanceof SVGElement)) {
						throw new Error('Changed paint child')
					}

					if (original.value === '') {
						child.style.removeProperty('opacity')
					} else {
						child.style.setProperty('opacity', original.value, original.priority)
					}
				}
			}, metadata)

			return { ...pair, painted, backdrop, rect, clip, pose: scroll, metadata }
		}

		type Measurement = Awaited<ReturnType<typeof measure>>
		const candidates: Measurement[] = []

		for (const pair of pairs) {
			candidates.push(
				await test.step(`colored ${pair.secondary ? 'secondary' : 'primary'}`, () => measure(pair)),
			)
		}
		await page.locator('.background-blobs > [id^="logo-"]').evaluateAll(blobs =>
			blobs.forEach(blob => {
				blob.setAttribute('data-original-logo-id', blob.id)
				blob.id = `reference-${blob.id}`
			}),
		)
		const references: Measurement[] = []

		for (const candidate of candidates) {
			references.push(
				await test.step(`regular ${candidate.secondary ? 'secondary' : 'primary'}`, () =>
					measure(candidate, candidate.pose)),
			)
		}
		await page.locator('[data-original-logo-id]').evaluateAll(blobs =>
			blobs.forEach(blob => {
				blob.id = blob.getAttribute('data-original-logo-id') ?? ''
				blob.removeAttribute('data-original-logo-id')
			}),
		)
		const luminance = (rgb: number[]) =>
			rgb.reduce((sum, channel, index) => {
				const value = channel / 255

				return (
					sum +
					(value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) *
						[0.2126, 0.7152, 0.0722][index]
				)
			}, 0)
		const observations = candidates.map((candidate, index) => {
			const reference = references[index]
			const background = luminance(candidate.painted),
				parent = luminance(candidate.backdrop),
				text = luminance(candidate.metadata.foreground)

			return {
				candidate,
				reference,
				delta: background - parent,
				referenceDelta: luminance(reference.painted) - luminance(reference.backdrop),
				contrast: (Math.max(background, text) + 0.05) / (Math.min(background, text) + 0.05),
			}
		})

		await testInfo.attach('actual-hierarchy', {
			body: Buffer.from(JSON.stringify(observations)),
			contentType: 'application/json',
		})

		for (const observation of observations) {
			expect(observation.candidate.rect).toEqual(observation.reference.rect)
			expect(Math.sign(observation.delta)).toBe(Math.sign(observation.referenceDelta))
			expect(observation.contrast).toBeGreaterThanOrEqual(4.5)
		}
	})
}

for (const colorScheme of ['light', 'dark'] as const) {
	test(`Stage custom fill preserves canonical boundaries in ${colorScheme}`, async ({
		page,
	}, testInfo) => {
		await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
		await page.goto('/metamask/')
		await page.waitForFunction(
			() => !document.querySelector('astro-island[ssr][component-url*="WalletPageContext"]'),
		)
		const active = await page
			.locator('#stages ul[data-card]')
			.first()
			.evaluate(host => {
				const wrapper = document.createElement('li'),
					canonical = document.createElement('div'),
					nested = document.createElement('div')

				wrapper.id = 'stage-boundary-fixture'
				wrapper.style.cssText =
					'position:fixed;top:100px;left:100px;width:100px;height:100px;z-index:10000'
				canonical.setAttribute('data-card', 'secondary')
				nested.setAttribute('data-card', '')
				canonical.append(nested)
				wrapper.append(canonical)
				host.append(wrapper)
				const color = (element: Element, value: string) => {
					const probe = document.createElement('span')

					probe.style.color = value
					element.append(probe)
					const result = getComputedStyle(probe).color

					probe.remove()

					return result
				}
				const parent = host.closest('details[data-card]')

				if (parent === null) {
					throw new Error('Missing custom Stage owner')
				}

				const result = {
					immediatePrimary: color(host, 'var(--background-primary)'),
					parentPrimary: color(parent, 'var(--background-primary)'),
					ordinaryPrimary: color(
						host,
						'oklch(var(---canvas-neutral-lightness) 0 0 / var(--card-primaryOpacity))',
					),
					ownerOpacity: getComputedStyle(parent).getPropertyValue('--card-primaryOpacity').trim(),
					canonicalOpacity: getComputedStyle(canonical)
						.getPropertyValue('--card-primaryOpacity')
						.trim(),
					nestedOpacity: getComputedStyle(nested).getPropertyValue('--card-primaryOpacity').trim(),
					actual: color(nested, 'var(--background-primary)'),
					expected: color(
						nested,
						'oklch(from var(--background-canvas) calc(l * var(---surface-retention)) calc(c * var(---surface-retention)) h / var(---nested-primary-opacity))',
					),
				}
				const popupResults = []

				for (const modal of [true, false]) {
					const popup = modal ? document.createElement('dialog') : document.createElement('div')
					const child = document.createElement('div')

					child.setAttribute('data-card', 'secondary')
					popup.append(child)
					wrapper.append(popup)

					if (popup instanceof HTMLDialogElement) {
						popup.showModal()
					} else {
						popup.setAttribute('popover', 'auto')
						popup.showPopover()
					}

					const reference = document.createElement('div')

					reference.style.backgroundColor = 'var(---secondary-reference)'
					document.body.append(reference)
					popupResults.push({
						modal,
						actual: getComputedStyle(child).backgroundColor,
						expected: getComputedStyle(reference).backgroundColor,
						image: getComputedStyle(child).backgroundImage,
					})

					if (popup instanceof HTMLDialogElement) {
						popup.close()
					} else {
						popup.hidePopover()
					}

					popup.remove()
					reference.remove()
				}

				return { ...result, popupResults }
			})

		await testInfo.attach('stage-boundaries', {
			body: Buffer.from(JSON.stringify(active)),
			contentType: 'application/json',
		})
		expect(active.immediatePrimary).toBe(active.parentPrimary)
		expect(active.immediatePrimary).not.toBe(active.ordinaryPrimary)
		expect(active.ownerOpacity).toBe('0.6')
		expect(active.canonicalOpacity).toBe('0.5')
		expect(active.nestedOpacity).toBe('0.5')
		expect(active.actual).toBe(active.expected)

		for (const popup of active.popupResults) {
			expect(popup.actual).toBe(popup.expected)
			expect(popup.image).toBe('none')
		}
		await page.locator('.background-blobs > [id^="logo-"]').evaluateAll(blobs =>
			blobs.forEach(blob => {
				blob.setAttribute('data-original-logo-id', blob.id)
				blob.id = `reference-${blob.id}`
			}),
		)
		const ordinary = await page.locator('#stage-boundary-fixture').evaluate(wrapper => {
			const card = wrapper.querySelector('[data-card]'),
				parent = wrapper.closest('details[data-card]')

			if (card === null || parent === null) {
				throw new Error('Missing ordinary controls')
			}

			const nested = card.querySelector('[data-card]')

			if (nested === null) {
				throw new Error('Missing nested control')
			}

			const probe = document.createElement('span')

			probe.style.color = 'var(--background-canvas)'
			document.body.append(probe)
			const expected = getComputedStyle(probe).color

			probe.style.color = 'var(--background-primary)'
			nested.append(probe)
			const actual = getComputedStyle(probe).color

			probe.remove()

			return {
				opacity: getComputedStyle(parent).getPropertyValue('--card-primaryOpacity').trim(),
				actual,
				expected,
			}
		})

		expect(ordinary.opacity).toBe('0.5')
		expect(ordinary.actual).toBe(ordinary.expected)
	})
}

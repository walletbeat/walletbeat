import { execFileSync, spawn } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const playwrightCorePath =
	process.env.PLAYWRIGHT_CORE_PATH ??
	path.join(
		execFileSync('brew', ['--prefix', 'playwright-cli'], { encoding: 'utf8' }).trim(),
		'libexec/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs',
	)
const { chromium, firefox, webkit } = await import(pathToFileURL(playwrightCorePath).href)

const baseUrl = process.env.WALLETBEAT_BASE_URL ?? 'http://localhost:4321/rabby'
const engineName = process.env.WALLETBEAT_ENGINE ?? 'chromium'
const engine = { chromium, firefox, webkit }[engineName]
const width = Number(process.env.WALLETBEAT_WIDTH ?? 390)
const height = Number(process.env.WALLETBEAT_HEIGHT ?? 844)
const tolerance = Number(process.env.WALLETBEAT_TOLERANCE ?? 0.75)
const startServer = process.env.WALLETBEAT_START_SERVER === 'true'
const serverMode = process.env.WALLETBEAT_SERVER_MODE ?? 'dev'
const reducedMotion = process.env.WALLETBEAT_REDUCED_MOTION === 'true'
const reducedTransparency = process.env.WALLETBEAT_REDUCED_TRANSPARENCY === 'true'
const measurePerformance = process.env.WALLETBEAT_PERFORMANCE === 'true'
const measureTransitions = process.env.WALLETBEAT_TRANSITIONS === 'true'
const direction = process.env.WALLETBEAT_DIRECTION ?? 'ltr'
const performanceP95Baseline = Number(process.env.WALLETBEAT_PERFORMANCE_P95_BASELINE)
const resizeWidth = Number(process.env.WALLETBEAT_RESIZE_WIDTH)

if (!engine) {
	throw new Error(`Unknown browser engine: ${engineName}`)
}

if (serverMode !== 'dev' && serverMode !== 'preview') {
	throw new Error(`Unknown Astro server mode: ${serverMode}`)
}

if (direction !== 'ltr' && direction !== 'rtl') {
	throw new Error(`Unknown writing direction: ${direction}`)
}

let server

if (startServer) {
	const serverUrl = new URL(baseUrl)
	server = spawn(
		process.execPath,
		[
			'node_modules/astro/bin/astro.mjs',
			serverMode,
			'--host',
			serverUrl.hostname,
			'--port',
			serverUrl.port || '4321',
		],
		{
			cwd: process.cwd(),
			env: { ...process.env, ASTRO_DEV_BACKGROUND: '0', WALLETBEAT_DEV: 'true' },
			stdio: ['ignore', 'inherit', 'inherit'],
		},
	)

	try {
		const deadline = Date.now() + 300_000
		let listening = false
		while (!listening && Date.now() < deadline) {
			if (server.exitCode !== null) {
				throw new Error(`Astro exited before readiness with code ${server.exitCode}`)
			}
			try {
				const response = await fetch(serverUrl.origin, { signal: AbortSignal.timeout(30_000) })
				listening = response.ok
				await response.body?.cancel()
			} catch {
				await new Promise(resolve => setTimeout(resolve, 250))
			}
		}
		if (!listening) {
			throw new Error(`Astro did not listen at ${serverUrl.origin} within 300s`)
		}

		const response = await fetch(baseUrl, { signal: AbortSignal.timeout(600_000) })
		if (!response.ok) {
			throw new Error(`Astro returned ${response.status} for ${baseUrl}`)
		}
		await response.body?.cancel()
	} catch (error) {
		server.kill('SIGTERM')
		throw error
	}
}

const browser = await engine.launch({ headless: true })
const page = await browser.newPage({
	viewport: { width, height },
	reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
})
if (engineName === 'chromium') {
	const session = await page.context().newCDPSession(page)
	await session.send('Emulation.setEmulatedMedia', {
		features: [
			{
				name: 'prefers-reduced-transparency',
				value: reducedTransparency ? 'reduce' : 'no-preference',
			},
		],
	})
} else if (reducedTransparency) {
	throw new Error('Reduced-transparency emulation is only available in Chromium')
}

const failures = []
const results = []

const check = (condition, name, details = {}) => {
	results.push({ name, pass: condition, ...details })
	if (!condition) {
		failures.push({ name, ...details })
	}
}

const sameBackdrop = (first, second) => {
	if (!first || !second) {
		return first === second
	}
	if (
		first.backgroundColor !== second.backgroundColor ||
		first.inset !== second.inset ||
		first.opacity !== second.opacity
	) {
		return false
	}
	if (first.backdropFilter === second.backdropFilter) {
		return true
	}
	const blur = value => Number(value.match(/[-.\d]+/)?.[0] ?? Number.NaN)
	return Math.abs(blur(first.backdropFilter) - blur(second.backdropFilter)) <= tolerance
}

const settle = async () => {
	await page.evaluate(async () => {
		let previous = []
		let stableFrames = 0

		for (let frame = 0; frame < 180 && stableFrames < 5; frame += 1) {
			await new Promise(requestAnimationFrame)
			const layout = document.querySelector('#layout')
			const current = [layout?.scrollTop ?? 0, layout?.scrollHeight ?? 0]
			stableFrames = previous.every((value, index) => Math.abs(value - current[index]) < 0.1)
				? stableFrames + 1
				: 0
			previous = current
		}

		if ('CSSTransition' in globalThis) {
			await Promise.allSettled(
				document
					.getAnimations({ subtree: true })
					.filter(animation => animation instanceof CSSTransition)
					.map(animation => animation.finished),
			)
		}
	})
}

const inspect = state =>
	page.evaluate(stateName => {
		const rect = element => {
			const { top, right, bottom, left, width, height } = element.getBoundingClientRect()
			return { top, right, bottom, left, width, height, x: left + width / 2, y: top + height / 2 }
		}
		const iconMeasurements = [
			...document.querySelectorAll('.toc-icon, .attribute-group-icon, .attribute-icon'),
		]
			.map(wrapper => {
				const icon = wrapper.matches('.toc-icon')
					? wrapper
					: wrapper.querySelector(':scope > .breadcrumb-icon')
				if (!(icon instanceof HTMLElement) || !(wrapper instanceof HTMLElement)) {
					return null
				}
				const wrapperRect = rect(wrapper)
				const iconRect = wrapper.matches('.toc-icon') ? wrapperRect : rect(icon)
				const iconStyle = getComputedStyle(icon, wrapper.matches('.toc-icon') ? '::before' : null)
				const accent = getComputedStyle(wrapper).getPropertyValue('--accent').trim()
				const accentProbe = document.createElement('span')
				accentProbe.style.color = 'var(--accent)'
				wrapper.append(accentProbe)
				const accentColor = getComputedStyle(accentProbe).color
				accentProbe.remove()
				const expected = {
					x: wrapperRect.left + wrapperRect.width / 2,
					y: wrapperRect.top + wrapperRect.height / 2,
				}
				return {
					kind: wrapper.className,
					section: wrapper.closest('[id]')?.id,
					wrapper: wrapperRect,
					icon: iconRect,
					expected,
					error: Math.hypot(iconRect.x - expected.x, iconRect.y - expected.y),
					opacity: iconStyle.opacity,
					color: iconStyle.color,
					textShadow: iconStyle.textShadow,
					accent,
					accentColor,
					filter: iconStyle.filter,
					emoji: icon.matches('[data-icon~="emoji"]'),
					active: wrapper.closest('a')?.matches(':hover, :focus-visible, :target-current') ?? false,
				}
			})
			.filter(Boolean)
		const pieIconMeasurements = [
			...document.querySelectorAll('.pie-navigation .navigation-items a'),
		]
			.map(link => {
				const icon = link.querySelector(':scope > .pie-navigation-icon')
				const geometry = link.closest('.pie-navigation-geometry')
				if (
					!(icon instanceof HTMLElement) ||
					!(link instanceof HTMLElement) ||
					!(geometry instanceof HTMLElement)
				) {
					return null
				}
				const linkStyle = getComputedStyle(link)
				const transformProbe = document.createElement('span')
				transformProbe.style.cssText = [
					'position:absolute',
					'inset:0',
					'transform-origin:var(---pie-origin) var(---pie-origin)',
					`transform:rotate(${linkStyle.getPropertyValue('---slice-mid-angle')}) scale(${linkStyle.getPropertyValue('---slice-scale')}) translateY(calc(${linkStyle.getPropertyValue('--slice-offset')} * -1px))`,
				].join(';')
				geometry.append(transformProbe)
				const expectedTransform = getComputedStyle(transformProbe).transform
				transformProbe.remove()
				const matrix = value => (value === 'none' ? new DOMMatrix() : new DOMMatrix(value))
				const actualMatrix = matrix(linkStyle.transform).toFloat64Array()
				const expectedMatrix = matrix(expectedTransform).toFloat64Array()
				const transformError = Math.max(
					...actualMatrix.map((value, index) => Math.abs(value - expectedMatrix[index])),
				)
				const marker = document.createElement('span')
				marker.style.cssText = [
					'position:absolute',
					'inset:var(---pie-origin) auto auto var(---pie-origin)',
					'inline-size:0',
					'block-size:0',
					'translate:0 calc(var(--slice-labelR) * -1px)',
				].join(';')
				link.append(marker)
				const expectedRect = marker.getBoundingClientRect()
				marker.remove()
				const iconRect = rect(icon)
				const expected = { x: expectedRect.x, y: expectedRect.y }
				const accentProbe = document.createElement('span')
				accentProbe.style.color = 'var(--accent)'
				link.append(accentProbe)
				const accentColor = getComputedStyle(accentProbe).color
				accentProbe.remove()
				const iconStyle = getComputedStyle(icon, '::before')
				return {
					href: link.getAttribute('href'),
					icon: iconRect,
					expected,
					error: Math.hypot(iconRect.x - expected.x, iconRect.y - expected.y),
					transformError,
					color: iconStyle.color,
					textShadow: iconStyle.textShadow,
					accentColor,
					filter: iconStyle.filter,
					decorative: icon.getAttribute('aria-hidden') === 'true',
					emoji: icon.matches('[data-icon~="emoji"]'),
					active:
						link.matches(':hover, :focus-visible') ||
						(CSS.supports('selector(:interest-source)') && link.matches(':interest-source')) ||
						(CSS.supports('selector(:target-current)') && link.matches(':target-current')),
				}
			})
			.filter(Boolean)
		const companionMeasurements = [
			...document.querySelectorAll('.attribute-summary-companions'),
		].map(cluster => {
			const clusterRect = rect(cluster)
			const summary = cluster.closest('summary')
			const summaryRect = summary ? rect(summary) : null
			const tokens = [...cluster.children].map(rect)
			const rows = [...new Set(tokens.map(token => Math.round(token.top * 2) / 2))]
			const style = getComputedStyle(cluster)
			const owner = cluster.parentElement
			const ownerRect = owner ? rect(owner) : null
			const card = cluster.closest('.attribute > details')
			const cardStyle = card ? getComputedStyle(card) : null
			return {
				section: cluster.closest('.attribute')?.querySelector(':scope > details[id]')?.id,
				cluster: clusterRect,
				owner: ownerRect,
				summary: summaryRect,
				tokens,
				rows,
				position: style.position,
				cardBorderWidth: cardStyle
					? Math.max(
							Number.parseFloat(cardStyle.borderInlineStartWidth),
							Number.parseFloat(cardStyle.borderInlineEndWidth),
						)
					: 0,
				visible:
					clusterRect.bottom >= 0 &&
					clusterRect.top <= innerHeight &&
					clusterRect.right >= 0 &&
					clusterRect.left <= innerWidth,
				insetInlineStart: style.insetInlineStart,
				insetInlineEnd: style.insetInlineEnd,
				ownerOverflow:
					summaryRect && ownerRect
						? Math.max(0, ownerRect.right - summaryRect.right, summaryRect.left - ownerRect.left)
						: null,
				clusterOverflow:
					style.position === 'fixed'
						? Math.max(
								0,
								clusterRect.right - innerWidth,
								-clusterRect.left,
								clusterRect.bottom - innerHeight,
								-clusterRect.top,
							)
						: summaryRect
							? Math.max(
									0,
									clusterRect.right - summaryRect.right,
									summaryRect.left - clusterRect.left,
								)
							: null,
			}
		})
		const h2Measurements = [...document.querySelectorAll('#wallet-page h2')].map(heading => {
			const header = heading.closest('header[data-sticky]')
			const style = header ? getComputedStyle(header, '::before') : null
			return {
				text: heading.textContent?.trim(),
				heading: rect(heading),
				header: header ? rect(header) : null,
				animationName: getComputedStyle(heading).animationName,
				animationTimeline: getComputedStyle(heading).animationTimeline,
				backdrop: style
					? {
							backgroundColor: style.backgroundColor,
							backdropFilter: style.backdropFilter,
							inset: style.inset,
							opacity: style.opacity,
						}
					: null,
			}
		})
		const groupHeader = document.querySelector(
			'.attribute-group > .attribute-group-stack > header[data-sticky]',
		)
		const attributeSummary = document.querySelector(
			'.attribute:has(.attribute-heading) > details > summary',
		)
		const pieNavigation = document.querySelector('.pie-navigation')
		const piePlacement = document.querySelector('.pie-navigation-placement')
		const navigationPanel = document.querySelector('.page-navigation-panel')
		const breadcrumbMeasurements = [
			...document.querySelectorAll('[data-sticky-breadcrumb~="item"]'),
		]
			.map(element => {
				const heading = element.matches('h1,h2,h3,h4')
					? element
					: element.querySelector('h1,h2,h3,h4')
				const style = getComputedStyle(element)
				const markerSource =
					Number(heading?.tagName.slice(1)) === 1
						? heading
						: element.matches('a,h4')
							? element
							: element.querySelector(':scope > a')
				const markerStyle = getComputedStyle(markerSource ?? element, '::before')
				return {
					text: heading?.textContent?.trim(),
					level: Number(heading?.tagName.slice(1)),
					item: rect(element),
					heading: heading ? rect(heading) : null,
					opacity: Number(style.opacity),
					position: style.position,
					separator: markerStyle.content,
					separatorOpacity: Number(markerStyle.opacity),
				}
			})
			.filter(
				item =>
					['fixed', 'sticky'].includes(item.position) &&
					item.item.bottom > 0 &&
					item.item.top < Math.min(200, innerHeight / 3) &&
					item.opacity > 0.5,
			)
		const siteLogo = document.querySelector('.logo-position-area .logo img')
		const topHeader = document.querySelector('#top')
		const componentOverflows = [
			...document.querySelectorAll(
				'.attribute-content, .attribute-rating-details, .attribute-rating-details li, .references, .references-list, .references-list > li, .explanation',
			),
		]
			.filter(element => element instanceof HTMLElement && element.clientWidth > 0)
			.map(element => ({
				section: element.closest('[id]')?.id,
				element: `${element.tagName.toLowerCase()}.${element.className}`,
				overflow: element.scrollWidth - element.clientWidth,
			}))

		return {
			state: stateName,
			url: location.href,
			direction: getComputedStyle(document.documentElement).direction,
			scrollTop: document.querySelector('#layout')?.scrollTop,
			iconMeasurements,
			pieIconMeasurements,
			companionMeasurements,
			h2Measurements,
			enhancedBreadcrumbs:
				!matchMedia('(prefers-reduced-motion: reduce)').matches &&
				CSS.supports('animation-timeline: scroll()') &&
				CSS.supports('animation-range: 0% 100%') &&
				CSS.supports('container-type: scroll-state') &&
				CSS.supports('position-anchor: --wallet-name'),
			fallbackLayering: {
				group: groupHeader ? Number(getComputedStyle(groupHeader).zIndex) : null,
				attribute: attributeSummary ? Number(getComputedStyle(attributeSummary).zIndex) : null,
			},
			desktopRail:
				pieNavigation && navigationPanel
					? {
							pie: rect(pieNavigation),
							panel: rect(navigationPanel),
							panelOverflowBlock: getComputedStyle(navigationPanel).overflowBlock,
						}
					: null,
			piePlacement: piePlacement ? rect(piePlacement) : null,
			pageNavigation: (() => {
				const element = document.querySelector('.page-navigation')
				return element
					? { box: rect(element), zIndex: Number(getComputedStyle(element).zIndex) }
					: null
			})(),
			breadcrumbMeasurements,
			siteLogo: siteLogo ? rect(siteLogo) : null,
			topHeader: topHeader ? rect(topHeader) : null,
			currentPieLinks: CSS.supports('selector(:target-current)')
				? [...document.querySelectorAll('.pie-navigation a:target-current')].map(link =>
						link.getAttribute('href'),
					)
				: [],
			currentNavigationLinks: CSS.supports('selector(:target-current)')
				? [...document.querySelectorAll('.page-navigation a:target-current')].map(link =>
						link.getAttribute('href'),
					)
				: [],
			documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
			layoutOverflow: (() => {
				const layout = document.querySelector('#layout')
				return layout ? layout.scrollWidth - layout.clientWidth : null
			})(),
			componentOverflows,
			shapeLayers: document.querySelectorAll('.breadcrumb-slice-shape-layer').length,
			emojiIcons: document.querySelectorAll(
				':is(.toc-icon, .attribute-group-icon, .attribute-icon) [data-icon~="emoji"], :is(.toc-icon, .attribute-group-icon, .attribute-icon)[data-icon~="emoji"]',
			).length,
			contentIconCount: document.querySelectorAll(
				':is(.toc-icon, .attribute-group-icon > .breadcrumb-icon, .attribute-icon > .breadcrumb-icon)',
			).length,
			pieEmojiIcons: document.querySelectorAll('.pie-navigation-icon[data-icon~="emoji"]').length,
			pieIconCount: document.querySelectorAll('.pie-navigation-icon').length,
		}
	}, state)

try {
	await page.goto(baseUrl, { waitUntil: 'commit', timeout: 120_000 })
	await page.evaluate(() => document.fonts.ready)
	try {
		await page.waitForFunction(() => document.querySelector('#layout #wallet-page') !== null)
	} catch (error) {
		const pageState = await page.evaluate(() => ({
			url: location.href,
			title: document.title,
			body: document.body?.innerText.slice(0, 2_000) ?? null,
		}))

		throw new Error(`Wallet page roots did not render: ${JSON.stringify(pageState)}`, {
			cause: error,
		})
	}
	await page.waitForTimeout(2_000)
	await page.waitForFunction(() => document.querySelector('#layout #wallet-page') !== null)
	await page.evaluate(pageDirection => {
		document.documentElement.dir = pageDirection
	}, direction)
	await settle()

	const diagnostic = await page.evaluate(() => ({
		url: location.href,
		title: document.title,
		readyState: document.readyState,
		reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
		reducedTransparency: matchMedia('(prefers-reduced-transparency: reduce)').matches,
		targetCurrentSupported: CSS.supports('selector(:target-current)'),
		direction: getComputedStyle(document.documentElement).direction,
		layout: document.querySelectorAll('#layout').length,
		walletPage: document.querySelectorAll('#wallet-page').length,
		h1: document.querySelectorAll('#wallet-page h1').length,
		h2: [...document.querySelectorAll('#wallet-page h2')].map(element =>
			element.textContent?.trim(),
		),
		headings: [...document.querySelectorAll('#wallet-page :is(h1, h2, h3, h4)')].map(element => ({
			level: Number(element.tagName.slice(1)),
			id: element.id,
			text: element.textContent?.trim(),
		})),
		ids: [...document.querySelectorAll('#wallet-page [id]')].map(element => element.id),
		groupTarget: document.querySelector('.attribute-group-target[id]')?.id ?? null,
		attributeTarget:
			document.querySelector('.attribute:has(.attribute-heading) > details[id]')?.id ?? null,
		detailsTarget:
			document.querySelector('.attribute:has(.attribute-accordions details) > details[id]')?.id ??
			null,
		detailsHeadingTarget: document.querySelector('.attribute-accordions h4[id]')?.id ?? null,
		shapeLayers: document.querySelectorAll('#wallet-page .breadcrumb-slice-shape-layer').length,
		emojiIcons: document.querySelectorAll(
			'#wallet-page :is(.toc-icon, .attribute-group-icon, .attribute-icon) [data-icon~="emoji"], #wallet-page :is(.toc-icon, .attribute-group-icon, .attribute-icon)[data-icon~="emoji"]',
		).length,
		contentIconCount: document.querySelectorAll(
			'#wallet-page :is(.toc-icon, .attribute-group-icon > .breadcrumb-icon, .attribute-icon > .breadcrumb-icon)',
		).length,
		pieEmojiIcons: document.querySelectorAll(
			'#wallet-page .pie-navigation-icon[data-icon~="emoji"]',
		).length,
		pieIconCount: document.querySelectorAll('#wallet-page .pie-navigation-icon').length,
		documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
		layoutOverflow: (() => {
			const layout = document.querySelector('#layout')
			return layout ? layout.scrollWidth - layout.clientWidth : null
		})(),
		animations: document.getAnimations().reduce((counts, animation) => {
			const key = `${animation.timeline?.constructor.name ?? 'none'}:${animation.playState}`
			counts[key] = (counts[key] ?? 0) + 1
			return counts
		}, {}),
	}))

	check(diagnostic.layout === 1, 'one layout root', { actual: diagnostic.layout })
	check(diagnostic.walletPage === 1, 'one wallet page', { actual: diagnostic.walletPage })
	check(diagnostic.reducedMotion === reducedMotion, 'requested motion preference is active', {
		actual: diagnostic.reducedMotion,
		expected: reducedMotion,
	})
	check(
		diagnostic.reducedTransparency === reducedTransparency,
		'requested transparency preference is active',
		{ actual: diagnostic.reducedTransparency, expected: reducedTransparency },
	)
	check(diagnostic.direction === direction, 'requested writing direction is active', {
		actual: diagnostic.direction,
		expected: direction,
	})
	check(diagnostic.h1 === 1, 'exactly one wallet-page h1', { actual: diagnostic.h1 })
	check(diagnostic.h2[0] === 'Stage Progress', 'Stage Progress is the first h2', {
		actual: diagnostic.h2,
	})
	check(diagnostic.shapeLayers === 0, 'content icons contain no slice-shape layers', {
		actual: diagnostic.shapeLayers,
	})
	check(
		diagnostic.emojiIcons > 0 && diagnostic.emojiIcons === diagnostic.contentIconCount,
		'all content icons use emoji glyph variants',
		{
			actual: diagnostic.emojiIcons,
			expected: diagnostic.contentIconCount,
		},
	)
	check(
		diagnostic.pieEmojiIcons > 0 && diagnostic.pieEmojiIcons === diagnostic.pieIconCount,
		'all pie icons use emoji glyph variants',
		{
			actual: diagnostic.pieEmojiIcons,
			expected: diagnostic.pieIconCount,
		},
	)
	check(
		diagnostic.headings.every(
			(heading, index, headings) => index === 0 || heading.level <= headings[index - 1].level + 1,
		),
		'heading source order has no skipped levels',
		{ actual: diagnostic.headings },
	)
	check(new Set(diagnostic.ids).size === diagnostic.ids.length, 'wallet-page ids are unique', {
		actual: diagnostic.ids.length,
		unique: new Set(diagnostic.ids).size,
	})

	const states = [
		{ name: 'top', selector: '#top' },
		{ name: 'stage', selector: '#stages' },
		{
			name: 'group',
			selector: `#${diagnostic.groupTarget} + .attribute-group`,
		},
		{ name: 'attribute', selector: `#${diagnostic.attributeTarget}` },
	]
	const stateMeasurements = new Map()

	for (const state of states) {
		await page.evaluate(selector => {
			const target = document.querySelector(selector)
			if (!(target instanceof HTMLElement)) {
				throw new Error(`Missing ${selector}`)
			}
			target.scrollIntoView({ block: 'start', behavior: 'instant' })
		}, state.selector)
		await settle()
		const measurement = await inspect(state.name)
		stateMeasurements.set(state.name, measurement)
		check(measurement.documentOverflow <= tolerance, `${state.name}: no document overflow`, {
			actual: measurement.documentOverflow,
		})
		check(measurement.layoutOverflow <= tolerance, `${state.name}: no layout overflow`, {
			actual: measurement.layoutOverflow,
		})
		for (const component of measurement.componentOverflows) {
			check(component.overflow <= tolerance, `${state.name}: component content is contained`, {
				...component,
			})
		}

		if (state.name === 'top') {
			for (const icon of measurement.iconMeasurements) {
				check(icon.error <= tolerance, `flow icon centered: ${icon.section}`, {
					actual: icon.error,
					expected: icon.expected,
					icon: icon.icon,
				})
				check(icon.filter === 'none', `content icon is unfiltered: ${icon.section}`, {
					actual: icon.filter,
				})
				check(
					icon.emoji &&
						(icon.active
							? icon.textShadow === 'none'
							: icon.color === 'rgba(0, 0, 0, 0)' &&
								icon.textShadow.startsWith(`${icon.accentColor} `)),
					`content emoji is monochrome accent-colored: ${icon.section}`,
					{
						color: icon.color,
						textShadow: icon.textShadow,
						active: icon.active,
						accent: icon.accent,
						accentColor: icon.accentColor,
					},
				)
			}
		}
		for (const icon of measurement.pieIconMeasurements) {
			check(
				icon.transformError <= 0.001,
				`${state.name}: pie slice uses canonical transform: ${icon.href}`,
				{
					actual: icon.transformError,
				},
			)
			check(icon.error <= tolerance, `${state.name}: pie icon centered: ${icon.href}`, {
				actual: icon.error,
				expected: icon.expected,
				icon: icon.icon,
			})
			check(icon.filter === 'none', `${state.name}: pie icon is unfiltered: ${icon.href}`, {
				actual: icon.filter,
			})
			check(icon.emoji, `${state.name}: pie icon uses emoji variant: ${icon.href}`)
			check(
				icon.active
					? icon.textShadow === 'none'
					: icon.textShadow.startsWith('rgba(255, 255, 255, 0.7) '),
				`${state.name}: pie emoji has the correct active/base color: ${icon.href}`,
				{ active: icon.active, color: icon.color, textShadow: icon.textShadow },
			)
			check(icon.decorative, `${state.name}: pie icon is decorative: ${icon.href}`)
		}
		const activePieIcon = measurement.pieIconMeasurements.find(icon => icon.active)
		if (activePieIcon && measurement.piePlacement) {
			check(
				activePieIcon.icon.x < measurement.piePlacement.x - tolerance &&
					Math.abs(activePieIcon.icon.y - measurement.piePlacement.y) <= tolerance,
				`${state.name}: active pie item faces west`,
				{ icon: activePieIcon.icon, pie: measurement.piePlacement },
			)
		}
		for (const breadcrumb of measurement.breadcrumbMeasurements) {
			check(
				breadcrumb.heading !== null &&
					breadcrumb.heading.width > tolerance &&
					breadcrumb.heading.left >= -tolerance &&
					breadcrumb.heading.right <= width + tolerance,
				`${state.name}: active breadcrumb heading is visible: h${breadcrumb.level}`,
				breadcrumb,
			)
			if (measurement.enhancedBreadcrumbs) {
				const parent = measurement.breadcrumbMeasurements.find(
					candidate => candidate.level === breadcrumb.level - 1,
				)
				const blockOverlap = parent
					? Math.min(parent.item.bottom, breadcrumb.item.bottom) -
						Math.max(parent.item.top, breadcrumb.item.top)
					: 0
				const sameRow = parent
					? blockOverlap >= Math.min(parent.item.height, breadcrumb.item.height) / 2
					: false
				const visibleSeparator = breadcrumb.separator === '"›"' && breadcrumb.separatorOpacity > 0.5
				const logoBlockOverlap = measurement.siteLogo
					? Math.min(measurement.siteLogo.bottom, breadcrumb.item.bottom) -
						Math.max(measurement.siteLogo.top, breadcrumb.item.top)
					: 0
				const logoInlineGap =
					measurement.siteLogo && breadcrumb.heading
						? Math.max(
								0,
								breadcrumb.heading.left - measurement.siteLogo.right,
								measurement.siteLogo.left - breadcrumb.heading.right,
							)
						: Number.POSITIVE_INFINITY
				const rootAdjacent =
					breadcrumb.level === 1 && logoBlockOverlap > tolerance && logoInlineGap <= 32
				check(
					breadcrumb.level === 1 ? visibleSeparator === rootAdjacent : visibleSeparator === sameRow,
					`${state.name}: h${breadcrumb.level} marker matches visual-row adjacency`,
					{
						breadcrumb,
						parent,
						blockOverlap,
						sameRow,
						logoBlockOverlap,
						logoInlineGap,
						rootAdjacent,
					},
				)
			}
		}
		for (const [index, breadcrumb] of measurement.breadcrumbMeasurements.entries()) {
			for (const other of measurement.breadcrumbMeasurements.slice(index + 1)) {
				const breadcrumbPaint = breadcrumb.level === 1 ? breadcrumb.heading : breadcrumb.item
				const otherPaint = other.level === 1 ? other.heading : other.item
				if (!breadcrumbPaint || !otherPaint) {
					continue
				}
				const inlineOverlap =
					Math.min(breadcrumbPaint.right, otherPaint.right) -
					Math.max(breadcrumbPaint.left, otherPaint.left)
				const blockOverlap =
					Math.min(breadcrumbPaint.bottom, otherPaint.bottom) -
					Math.max(breadcrumbPaint.top, otherPaint.top)
				check(
					inlineOverlap <= tolerance || blockOverlap <= 2,
					`${state.name}: active breadcrumb boxes do not collide: h${breadcrumb.level}/h${other.level}`,
					{ breadcrumb, other, inlineOverlap, blockOverlap },
				)
			}
		}
		const rootBreadcrumb = measurement.breadcrumbMeasurements.find(item => item.level === 1)
		if (rootBreadcrumb?.heading && measurement.siteLogo?.width > tolerance) {
			const inlineOverlap =
				Math.min(rootBreadcrumb.heading.right, measurement.siteLogo.right) -
				Math.max(rootBreadcrumb.heading.left, measurement.siteLogo.left)
			const blockOverlap =
				Math.min(rootBreadcrumb.heading.bottom, measurement.siteLogo.bottom) -
				Math.max(rootBreadcrumb.heading.top, measurement.siteLogo.top)
			check(
				inlineOverlap <= tolerance || blockOverlap <= tolerance,
				`${state.name}: wallet title does not collide with the site logo`,
				{ root: rootBreadcrumb.heading, logo: measurement.siteLogo, inlineOverlap, blockOverlap },
			)
		}
		check(measurement.shapeLayers === 0, `${state.name}: no content icon shape layers`, {
			actual: measurement.shapeLayers,
		})
		check(
			measurement.emojiIcons === measurement.contentIconCount,
			`${state.name}: every content icon uses an emoji variant`,
			{ actual: measurement.emojiIcons, expected: measurement.contentIconCount },
		)
		check(
			measurement.pieEmojiIcons === measurement.pieIconCount,
			`${state.name}: every pie icon uses an emoji variant`,
			{ actual: measurement.pieEmojiIcons, expected: measurement.pieIconCount },
		)

		for (const companions of measurement.companionMeasurements) {
			check(
				companions.position === 'static',
				`${state.name}: companion cluster remains in flow: ${companions.section}`,
				{ actual: companions.position },
			)
			const summaryIsVisible =
				companions.summary && companions.summary.bottom >= 0 && companions.summary.top <= height
			if (!summaryIsVisible) {
				continue
			}
			check(
				companions.ownerOverflow <= companions.cardBorderWidth + tolerance,
				`${state.name}: companion flow reservation contained: ${companions.section}`,
				{
					actual: companions.ownerOverflow,
					owner: companions.owner,
					summary: companions.summary,
				},
			)
			if (companions.visible) {
				check(
					companions.clusterOverflow <= tolerance,
					`${state.name}: companion cluster is visible and contained: ${companions.section}`,
					{
						actual: companions.clusterOverflow,
						cluster: companions.cluster,
						position: companions.position,
						summary: companions.summary,
						insetInlineStart: companions.insetInlineStart,
						insetInlineEnd: companions.insetInlineEnd,
					},
				)
			}
		}

		if (state.name === 'stage') {
			const stage = measurement.h2Measurements[0]
			const group = measurement.h2Measurements[1]
			check(stage.animationName === group.animationName, 'Stage and group h2 share animation', {
				stage: stage.animationName,
				group: group.animationName,
			})
			check(
				stage.animationTimeline === group.animationTimeline,
				'Stage and group h2 share timeline',
				{
					stage: stage.animationTimeline,
					group: group.animationTimeline,
				},
			)
		}
		if (state.name === 'attribute' && !measurement.enhancedBreadcrumbs && !reducedMotion) {
			check(
				measurement.fallbackLayering.group > measurement.fallbackLayering.attribute,
				'fallback group paints over outgoing attribute',
				measurement.fallbackLayering,
			)
		}
		if (state.name === 'attribute' && measurement.enhancedBreadcrumbs) {
			check(
				measurement.currentPieLinks.length === 1 &&
					measurement.currentPieLinks[0] === state.selector,
				'attribute: pie current state converges on the visible target',
				{ actual: measurement.currentPieLinks, expected: state.selector },
			)
			check(
				measurement.currentNavigationLinks.length === 2 &&
					measurement.currentNavigationLinks.every(href => href === state.selector),
				'attribute: pie and TOC share the current target',
				{ actual: measurement.currentNavigationLinks, expected: state.selector },
			)
		}
		if (state.name === 'attribute' && width <= 1024 && measurement.enhancedBreadcrumbs) {
			const pieCenter = measurement.piePlacement?.x
			check(
				pieCenter !== undefined &&
					(direction === 'ltr' ? pieCenter > width / 2 : pieCenter < width / 2),
				'compact pie occupies the logical inline end',
				{ actual: measurement.piePlacement, direction, viewportWidth: width },
			)
		}
		if (state.name === 'top' && width <= 1024) {
			check(
				measurement.pageNavigation &&
					measurement.piePlacement &&
					measurement.topHeader &&
					Math.abs(measurement.pageNavigation.box.x - measurement.piePlacement.x) <= tolerance &&
					Math.abs(measurement.topHeader.bottom - measurement.piePlacement.top) <=
						Math.max(tolerance, 4),
				'mobile pie begins at its inline flow position',
				{ navigation: measurement.pageNavigation, pie: measurement.piePlacement },
			)
			check(
				measurement.pageNavigation.zIndex >
					Math.max(...Object.values(measurement.fallbackLayering).filter(Number.isFinite)),
				'mobile pie paints above sticky breadcrumb layers',
				{ navigation: measurement.pageNavigation, breadcrumbs: measurement.fallbackLayering },
			)
		}
		if (width >= 1025) {
			check(
				measurement.desktopRail.panel.top >= measurement.desktopRail.pie.bottom - tolerance,
				`${state.name}: desktop TOC begins below pie`,
				measurement.desktopRail,
			)
			check(
				['auto', 'scroll'].includes(measurement.desktopRail.panelOverflowBlock),
				`${state.name}: desktop TOC owns its scroll viewport`,
				measurement.desktopRail,
			)
		}
	}

	const stageBackdrop = stateMeasurements.get('stage').h2Measurements[0].backdrop
	const groupBackdrop = stateMeasurements.get('group').h2Measurements[1].backdrop
	if (reducedMotion) {
		check(
			stateMeasurements
				.get('stage')
				.h2Measurements.every(heading => heading.animationName === 'none'),
			'reduced motion disables h2 interpolation',
			{
				actual: stateMeasurements.get('stage').h2Measurements.map(heading => heading.animationName),
			},
		)
	}
	if (reducedTransparency) {
		check(
			[...stateMeasurements.values()].every(measurement =>
				measurement.h2Measurements.every(heading => heading.backdrop?.backdropFilter === 'none'),
			),
			'reduced transparency disables h2 backdrop blur',
		)
	}
	check(sameBackdrop(stageBackdrop, groupBackdrop), 'Active Stage and group h2 share backdrop', {
		stage: stageBackdrop,
		group: groupBackdrop,
	})

	const detailsBehavior = await page.evaluate(detailsTarget => {
		const details = document.querySelector(
			`#${CSS.escape(detailsTarget)} .attribute-accordions details`,
		)
		const summary = details?.querySelector(':scope > summary')
		const heading = summary?.querySelector('h4')

		if (!(details instanceof HTMLDetailsElement) || !(summary instanceof HTMLElement)) {
			return null
		}

		const marker = getComputedStyle(summary, '::marker').content
		details.open = false
		const closed = {
			contentHeight: details.scrollHeight,
			headingPosition: heading ? getComputedStyle(heading).position : null,
			summaryHeight: summary.getBoundingClientRect().height,
		}
		summary.click()
		const reopened = details.open

		return { marker, closed, reopened }
	}, diagnostic.detailsTarget)
	check(detailsBehavior !== null, 'an attribute exposes native details')
	if (detailsBehavior) {
		check(
			detailsBehavior.marker !== 'none',
			'native details chevron remains visible',
			detailsBehavior,
		)
		check(detailsBehavior.reopened, 'native details summary remains clickable', detailsBehavior)
		check(
			detailsBehavior.closed.headingPosition !== 'sticky',
			'closed details heading has no sticky collision box',
			detailsBehavior,
		)
	}

	const directHashSelectors = [
		'stages',
		diagnostic.groupTarget,
		diagnostic.attributeTarget,
		diagnostic.detailsHeadingTarget,
	]
		.filter(Boolean)
		.map(id => `#${id}`)
	for (const selector of directHashSelectors) {
		const targetUrl = new URL(baseUrl)
		targetUrl.hash = selector
		await page.goto(targetUrl.href, { waitUntil: 'commit', timeout: 120_000 })
		await page.waitForFunction(() => document.querySelector('#layout #wallet-page') !== null)
		await page.evaluate(() => document.fonts.ready)
		await page.evaluate(pageDirection => {
			document.documentElement.dir = pageDirection
		}, direction)
		await settle()
		const target = await page.evaluate(targetSelector => {
			const element = document.querySelector(targetSelector)
			const layout = document.querySelector('#layout')
			if (!(element instanceof HTMLElement) || !(layout instanceof HTMLElement)) {
				return null
			}
			const rect = element.getBoundingClientRect()
			const relatedHeading = element.matches('.attribute-group-target')
				? element.nextElementSibling?.querySelector('h2')
				: null
			const relatedHeadingRect = relatedHeading?.getBoundingClientRect()
			const attributeTarget = element.closest('.attribute > details[id]')
			const hasExactNavigationTarget = [
				...document.querySelectorAll('.pie-navigation a[href^="#"]'),
			].some(link => link.getAttribute('href') === targetSelector)
			const expectedCurrent = attributeTarget
				? `#${attributeTarget.id}`
				: hasExactNavigationTarget
					? targetSelector
					: null
			return {
				top: rect.top,
				bottom: rect.bottom,
				viewportHeight: innerHeight,
				relatedHeadingTop: relatedHeadingRect?.top ?? null,
				relatedHeadingBottom: relatedHeadingRect?.bottom ?? null,
				scrollTop: layout.scrollTop,
				expectedCurrent,
				current: [...document.querySelectorAll('.pie-navigation a:target-current[href^="#"]')].map(
					link => link.getAttribute('href'),
				),
			}
		}, selector)
		check(
			target !== null && target.top >= -tolerance && target.top < target.viewportHeight,
			`direct hash target is visible: ${selector}`,
			{ actual: target },
		)
		if (target?.relatedHeadingTop != null) {
			check(
				target.relatedHeadingBottom >= -tolerance &&
					target.relatedHeadingTop < target.viewportHeight,
				`direct group hash heading is visible: ${selector}`,
				{ actual: target },
			)
		}
		if (diagnostic.targetCurrentSupported && target?.expectedCurrent) {
			check(
				target !== null &&
					target.current.length > 0 &&
					target.current.every(href => href === target.expectedCurrent),
				`direct hash current slice converges: ${selector}`,
				{ actual: target },
			)
		}
	}

	let transitions = null
	if (measureTransitions) {
		const transitionTargets = await page.evaluate(() => {
			const attributes = [...document.querySelectorAll('.attribute > details[id]')]
			return [attributes[0]?.id, attributes[Math.min(5, attributes.length - 1)]?.id].filter(Boolean)
		})
		const transitionPositions = []
		for (const target of transitionTargets) {
			await page.evaluate(id => {
				document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' })
			}, target)
			await settle()
			transitionPositions.push(
				await page.evaluate(() => document.querySelector('#layout')?.scrollTop ?? 0),
			)
		}
		transitions = await page.evaluate(
			async ({ targets, positions, measurementTolerance }) => {
				const layout = document.querySelector('#layout')
				if (!(layout instanceof HTMLElement) || targets.length !== 2) {
					return null
				}
				const frames = []
				const snapshot = (phase, step, previousScrollTop) => {
					const laneLimit = Math.min(200, innerHeight / 3)
					const items = [...document.querySelectorAll('[data-sticky-breadcrumb~="item"]')]
						.map((element, index) => {
							const heading = element.matches('h1,h2,h3,h4')
								? element
								: element.querySelector('h1,h2,h3,h4')
							const itemRect = element.getBoundingClientRect()
							const style = getComputedStyle(element)
							return {
								key: `${heading?.tagName}:${heading?.id || heading?.textContent?.trim()}:${index}`,
								level: Number(heading?.tagName.slice(1)),
								left: itemRect.left,
								right: itemRect.right,
								top: itemRect.top,
								bottom: itemRect.bottom,
								opacity: Number(style.opacity),
								position: style.position,
							}
						})
						.filter(
							item =>
								['fixed', 'sticky'].includes(item.position) &&
								item.bottom > 0 &&
								item.top < laneLimit &&
								item.opacity > 0.5,
						)
					const icons = [...document.querySelectorAll('.attribute-group-icon, .attribute-icon')]
						.map(element => {
							const iconRect = element.getBoundingClientRect()
							const style = getComputedStyle(element)
							return {
								kind: element.classList.contains('attribute-group-icon') ? 'group' : 'attribute',
								top: iconRect.top,
								bottom: iconRect.bottom,
								opacity: Number(style.opacity),
								position: style.position,
							}
						})
						.filter(
							icon =>
								['fixed', 'sticky'].includes(icon.position) &&
								icon.bottom > 0 &&
								icon.top < laneLimit &&
								icon.opacity > 0.5,
						)
					frames.push({
						phase,
						step,
						scrollTop: layout.scrollTop,
						scrollDelta: Math.abs(layout.scrollTop - previousScrollTop),
						items,
						icons,
						current: CSS.supports('selector(:target-current)')
							? [...document.querySelectorAll('.page-navigation a:target-current')].map(link =>
									link.getAttribute('href'),
								)
							: [],
					})
				}
				for (const [phase, from, to] of [
					['forward', positions[0], positions[1]],
					['reverse', positions[1], positions[0]],
					['forward-again', positions[0], positions[1]],
				]) {
					let previousScrollTop = layout.scrollTop
					for (let step = 0; step <= 48; step += 1) {
						layout.scrollTop = from + ((to - from) * step) / 48
						await new Promise(requestAnimationFrame)
						await new Promise(resolve => setTimeout(resolve, 0))
						snapshot(phase, step, previousScrollTop)
						previousScrollTop = layout.scrollTop
					}
				}
				const duplicateLanes = frames.filter(
					frame => new Set(frame.items.map(item => item.level)).size !== frame.items.length,
				)
				const duplicateIcons = frames.filter(
					frame => new Set(frame.icons.map(icon => icon.kind)).size !== frame.icons.length,
				)
				const collisions = frames.filter(frame =>
					frame.items.some((item, index) =>
						frame.items.slice(index + 1).some(other => {
							const inlineOverlap =
								Math.min(item.right, other.right) - Math.max(item.left, other.left)
							const blockOverlap =
								Math.min(item.bottom, other.bottom) - Math.max(item.top, other.top)
							return inlineOverlap > measurementTolerance && blockOverlap > 2
						}),
					),
				)
				const jumps = []
				const directions = new Map()
				const reversals = []
				for (let index = 1; index < frames.length; index += 1) {
					const frame = frames[index]
					const previous = frames[index - 1]
					if (frame.phase !== previous.phase) {
						continue
					}
					for (const item of frame.items) {
						const previousItem = previous.items.find(candidate => candidate.key === item.key)
						if (!previousItem) {
							continue
						}
						for (const axis of ['left', 'top']) {
							const delta = item[axis] - previousItem[axis]
							if (Math.abs(delta) > frame.scrollDelta + measurementTolerance) {
								jumps.push({ axis, frame, item, previousItem })
							}
							if (Math.abs(delta) <= measurementTolerance) {
								continue
							}
							const key = `${frame.phase}:${item.key}:${axis}`
							const sign = Math.sign(delta)
							const priorSign = directions.get(key)
							if (priorSign !== undefined && priorSign !== sign) {
								reversals.push({ axis, frame, item, previousItem, priorSign, sign })
							}
							directions.set(key, sign)
						}
					}
				}
				const endpoints = frames.filter(frame => frame.step === 48)
				return {
					frameCount: frames.length,
					duplicateLaneCount: duplicateLanes.length,
					duplicateLaneSamples: duplicateLanes.slice(0, 3),
					duplicateIconCount: duplicateIcons.length,
					collisionCount: collisions.length,
					collisionSamples: collisions.slice(0, 3),
					jumpCount: jumps.length,
					reversalCount: reversals.length,
					reversalSamples: reversals.slice(0, 3),
					endpoints: endpoints.map((frame, index) => ({
						phase: frame.phase,
						expected: `#${index === 1 ? targets[0] : targets[1]}`,
						current: frame.current,
					})),
				}
			},
			{
				targets: transitionTargets,
				positions: transitionPositions,
				measurementTolerance: tolerance,
			},
		)
		check(transitions !== null, 'rapid reversal trace has two attribute targets')
		if (transitions) {
			check(
				transitions.duplicateLaneCount === 0,
				'rapid reversal leaves one heading per active lane',
				transitions,
			)
			check(
				transitions.duplicateIconCount === 0,
				'rapid reversal leaves one icon per active lane',
				transitions,
			)
			check(
				transitions.collisionCount === 0,
				'rapid reversal preserves breadcrumb lane order',
				transitions,
			)
			check(
				transitions.jumpCount === 0,
				'visible breadcrumbs move no faster than the scroll trace',
				transitions,
			)
			check(
				transitions.reversalCount === 0,
				'monotonic scrolling does not reverse a visible breadcrumb axis',
				transitions,
			)
			for (const endpoint of transitions.endpoints) {
				check(
					endpoint.current.length > 0 && endpoint.current.every(href => href === endpoint.expected),
					`rapid reversal current state converges: ${endpoint.phase}`,
					endpoint,
				)
			}
		}
	}

	let resize = null
	if (Number.isFinite(resizeWidth) && resizeWidth > 0 && resizeWidth !== width) {
		/* Let hash arrival leave the browser's scroll-anchoring suppression window
		 * before measuring a user-driven viewport change. */
		await page.waitForTimeout(250)
		const resizeBefore = await page.evaluate(() => {
			window.__walletResizeEvents = 0
			addEventListener('resize', () => (window.__walletResizeEvents += 1))
			const layout = document.querySelector('#layout')
			const target = document.querySelector(location.hash)
			return {
				hash: location.hash,
				scrollTop: layout instanceof HTMLElement ? layout.scrollTop : null,
				targetTop: target instanceof HTMLElement ? target.getBoundingClientRect().top : null,
			}
		})
		await page.setViewportSize({ width: resizeWidth, height })
		await settle()
		const resizeState = await page.evaluate(() => {
			const layout = document.querySelector('#layout')
			const target = document.querySelector(location.hash)
			const attributeTarget = target?.closest('.attribute > details[id]')
			return {
				documentOverflow:
					document.documentElement.scrollWidth - document.documentElement.clientWidth,
				layoutOverflow:
					layout instanceof HTMLElement ? layout.scrollWidth - layout.clientWidth : null,
				targetTop: target instanceof HTMLElement ? target.getBoundingClientRect().top : null,
				targetBottom: target instanceof HTMLElement ? target.getBoundingClientRect().bottom : null,
				scrollTop: layout instanceof HTMLElement ? layout.scrollTop : null,
				resizeEvents: window.__walletResizeEvents,
				expectedCurrent: attributeTarget ? `#${attributeTarget.id}` : location.hash,
				current: [...document.querySelectorAll('.pie-navigation a:target-current[href^="#"]')].map(
					link => link.getAttribute('href'),
				),
			}
		})
		let nativeCorrection = null
		if (resizeState.targetTop !== null && resizeState.targetTop < -tolerance) {
			await page.evaluate(() =>
				document.querySelector(location.hash)?.scrollIntoView({ block: 'start' }),
			)
			await settle()
			nativeCorrection = await page.evaluate(() => {
				const layout = document.querySelector('#layout')
				const target = document.querySelector(location.hash)
				return {
					targetTop: target instanceof HTMLElement ? target.getBoundingClientRect().top : null,
					targetBottom:
						target instanceof HTMLElement ? target.getBoundingClientRect().bottom : null,
					scrollTop: layout instanceof HTMLElement ? layout.scrollTop : null,
				}
			})
		}
		resize = { before: resizeBefore, after: resizeState, nativeCorrection }
		check(resizeState.documentOverflow <= tolerance, 'resize: no document overflow', resizeState)
		check(resizeState.layoutOverflow <= tolerance, 'resize: no layout overflow', resizeState)
		check(
			resizeState.targetTop !== null &&
				resizeState.targetBottom !== null &&
				resizeState.targetBottom >= -tolerance &&
				resizeState.targetTop <= height + tolerance,
			'resize: active hash target remains visible',
			resize,
		)
		if (diagnostic.targetCurrentSupported) {
			check(
				resizeState.current.length > 0 &&
					resizeState.current.every(href => href === resizeState.expectedCurrent),
				'resize: current slice remains in the active target scope',
				resize,
			)
		}
	}

	let performance = null
	if (measurePerformance) {
		await page.evaluate(() => {
			const layout = document.querySelector('#layout')
			if (layout instanceof HTMLElement) {
				layout.scrollTop = layout.scrollHeight
			}
		})
		await settle()
		await page.evaluate(() => {
			const layout = document.querySelector('#layout')
			if (layout instanceof HTMLElement) {
				layout.scrollTop = 0
			}
		})
		await settle()
		const scrollTrace = await page.evaluate(() => {
			const layout = document.querySelector('#layout')
			if (!(layout instanceof HTMLElement)) {
				return null
			}
			layout.scrollTop = 0
			window.__walletPerformanceTrace = {
				frames: [],
				longTasks: [],
				stopped: false,
				observer: new PerformanceObserver(entries => {
					window.__walletPerformanceTrace.longTasks.push(
						...entries.getEntries().map(entry => entry.duration),
					)
				}),
			}
			let previous = performance.now()
			const sample = now => {
				window.__walletPerformanceTrace.frames.push(now - previous)
				previous = now
				if (!window.__walletPerformanceTrace.stopped) {
					requestAnimationFrame(sample)
				}
			}
			window.__walletPerformanceTrace.observer.observe({ type: ['long', 'task'].join('') })
			requestAnimationFrame(sample)
			return {
				distance: Math.max(1, layout.scrollHeight - layout.clientHeight),
				center: {
					x: layout.getBoundingClientRect().left + layout.clientWidth / 2,
					y: layout.getBoundingClientRect().top + layout.clientHeight / 2,
				},
			}
		})
		if (!scrollTrace) {
			throw new Error('Missing scroll container for performance trace')
		}
		await page.mouse.move(scrollTrace.center.x, scrollTrace.center.y)
		for (let step = 0; step < 240; step += 1) {
			await page.mouse.wheel(0, scrollTrace.distance / 240)
			await page.waitForTimeout(8)
		}
		await settle()
		const { frames, longTasks } = await page.evaluate(async () => {
			window.__walletPerformanceTrace.stopped = true
			window.__walletPerformanceTrace.observer.disconnect()
			await new Promise(requestAnimationFrame)
			return window.__walletPerformanceTrace
		})
		const frameTimes = frames.slice(10).sort((first, second) => first - second)
		const percentile = percentileValue =>
			frameTimes[
				Math.min(frameTimes.length - 1, Math.floor(frameTimes.length * percentileValue))
			] ?? Number.POSITIVE_INFINITY
		performance = {
			frames: frameTimes.length,
			p50: percentile(0.5),
			p95: percentile(0.95),
			p99: percentile(0.99),
			max: frameTimes.at(-1),
			over33: frameTimes.filter(duration => duration > 33).length,
			over33Ratio: frameTimes.filter(duration => duration > 33).length / frameTimes.length,
			longTasks,
			baseline: Number.isFinite(performanceP95Baseline) ? performanceP95Baseline : null,
		}
		check(
			!Number.isFinite(performanceP95Baseline) || percentile(0.95) <= performanceP95Baseline,
			'scroll trace p95 does not regress from its baseline',
			performance,
		)
	}

	const { headings, ids, ...diagnosticSummary } = diagnostic

	process.stdout.write(
		`${JSON.stringify(
			{
				diagnostic: {
					...diagnosticSummary,
					headingCount: headings.length,
					idCount: ids.length,
				},
				resize,
				transitions,
				performance,
				failures,
				passed: results.filter(result => result.pass).length,
				failed: failures.length,
			},
			null,
			2,
		)}\n`,
	)
	if (failures.length > 0) {
		process.exitCode = 1
	}
} finally {
	await browser.close()
	server?.kill('SIGTERM')
}

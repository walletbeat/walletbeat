#!/usr/bin/env node
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

class NavigationUnavailableError extends Error {}

const origin = new URL(process.argv[2] ?? 'http://localhost:4321').origin
const checkHeaded = process.argv.includes('--check-headed')
console.log('Walletbeat TV — move the mouse or use the keyboard to take control.')
const importantPages = ['/news/', '/stages/', '/wallet-eips/']
// Native focus and visibility require a default context without Playwright's focus emulation.
const browserServer = await chromium.launchServer({
	host: '127.0.0.1',
	headless: false,
	args: ['--kiosk', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1'],
	ignoreDefaultArgs: ['--enable-automation'],
})
const profileArgument = browserServer
	.process()
	.spawnargs.find(argument => argument.startsWith('--user-data-dir='))
let endpoint
const endpointDeadline = performance.now() + 15_000
while (profileArgument && performance.now() < endpointDeadline) {
	try {
		const [port] = (
			await readFile(
				join(profileArgument.slice('--user-data-dir='.length), 'DevToolsActivePort'),
				'utf8',
			)
		).split('\n')
		if (/^\d+$/.test(port)) {
			endpoint = `http://127.0.0.1:${port}`
			break
		}
	} catch {}
	await new Promise(resolve => setTimeout(resolve, 50))
}
if (!endpoint) {
	await browserServer.close()
	throw new Error('Chromium did not provide its local debugging endpoint.')
}
let browser
try {
	browser = await chromium.connectOverCDP(endpoint, { noDefaults: true, isLocal: true })
} catch (error) {
	await browserServer.close()
	throw error
}
const context = browser.contexts()[0]
const preparePage = async openedPage => {
	const session = await context.newCDPSession(openedPage)
	await session.send('Page.setBypassCSP', { enabled: true })
}
context.setDefaultTimeout(5000)
context.setDefaultNavigationTimeout(30000)
let lastInputTime = 0
let currentInputRevision = 0
const recordInput = () => {
	lastInputTime = Date.now()
	currentInputRevision++
}
let page
let running = true
await context.exposeBinding('walletbeatTVInput', source => {
	page = source.page
	recordInput()
})
await context.addInitScript(origin => {
	if (window !== window.top || location.origin !== origin) {
		return
	}
	let screenWakeLock
	const keepScreenAwake = async () => {
		if (
			document.hidden ||
			location.origin !== origin ||
			!navigator.wakeLock ||
			(screenWakeLock && !screenWakeLock.released)
		) {
			return
		}
		try {
			screenWakeLock = await navigator.wakeLock.request('screen')
		} catch (error) {
			console.warn(`Walletbeat TV could not keep the screen awake: ${error.message}`)
		}
	}
	document.addEventListener('visibilitychange', keepScreenAwake)
	document.addEventListener('DOMContentLoaded', keepScreenAwake, { once: true })
	const cursorStorageKey = 'walletbeat-tv-cursor-position'
	const saveCursor = () => {
		const position = window.walletbeatTVCursorPosition
		if (position) {
			sessionStorage.setItem(cursorStorageKey, `${position.x},${position.y}`)
		}
	}
	let cancelScroll
	const interrupt = () => {
		cancelScroll?.()
		if (location.origin === origin) {
			saveCursor()
			window.walletbeatTVPaused = true
			window.walletbeatTVExpectedMoves = []
			sessionStorage.setItem('walletbeat-tv-last-input', String(Date.now()))
			document.documentElement.removeAttribute('data-walletbeat-tv')
			const cursor = document.getElementById('walletbeat-tv-cursor')
			if (cursor) {
				cursor.style.opacity = '0'
			}
		}
		window.walletbeatTVInput()
	}
	let wasAway = document.hidden
	const activate = event => {
		if (document.hidden) {
			cancelScroll?.()
			wasAway = true
			return
		}
		if ((event.type === 'focus' && event.target !== window) || !wasAway) {
			return
		}
		wasAway = false
		interrupt()
	}
	window.addEventListener('blur', () => {
		wasAway = true
	})
	window.addEventListener('focus', activate)
	document.addEventListener('visibilitychange', activate)
	window.walletbeatTVScrollContainer = (
		element = document.querySelector('main article') ?? document.querySelector('main'),
	) =>
		element?.closest(
			'[data-scroll-container~="block"], [data-scroll-container]:not([data-scroll-container~="inline"])',
		) ?? document.scrollingElement
	window.walletbeatTVScroll = (scroller, target, continuous = false, horizontal = false) =>
		new Promise(resolve => {
			const start = horizontal ? scroller.scrollLeft : scroller.scrollTop
			const maximum = horizontal
				? scroller.scrollWidth - scroller.clientWidth
				: scroller.scrollHeight - scroller.clientHeight
			const travel = Math.max(0, Math.min(maximum, target)) - start
			if (Math.abs(travel) < 2) {
				resolve(!window.walletbeatTVPaused)
				return
			}
			const duration = Math.max(
				220,
				Math.min(8000, (Math.abs(travel) / (continuous ? 850 : 1200)) * 1000),
			)
			let frameId
			const finish = completed => {
				cancelAnimationFrame(frameId)
				cancelScroll = null
				resolve(completed)
			}
			cancelScroll = () => finish(false)
			const ramp = continuous ? 0.12 : 0.3
			const started = performance.now()
			const frame = now => {
				if (window.walletbeatTVPaused) {
					finish(false)
					return
				}
				const elapsed = Math.min(1, (now - started) / duration)
				// Integrate acceleration, a steady cruise, and deceleration into the final content position.
				const progress =
					elapsed < ramp
						? (elapsed * elapsed) / (2 * ramp * (1 - ramp))
						: elapsed > 1 - ramp
							? 1 - (1 - elapsed) ** 2 / (2 * ramp * (1 - ramp))
							: (elapsed - ramp / 2) / (1 - ramp)
				scroller.scrollTo({
					[horizontal ? 'left' : 'top']: start + travel * progress,
					behavior: 'instant',
				})
				if (elapsed < 1) {
					frameId = requestAnimationFrame(frame)
				} else {
					finish(true)
				}
			}
			frameId = requestAnimationFrame(frame)
		})
	let renderCursor
	const attach = () => {
		window.walletbeatTVPaused =
			Date.now() - Number(sessionStorage.getItem('walletbeat-tv-last-input') ?? 0) < 15_000
		const style = document.createElement('style')
		style.textContent = 'html[data-walletbeat-tv] * { cursor: none !important }'
		const playbackStyle = document.createElement('style')
		playbackStyle.textContent =
			'html[data-walletbeat-tv] astro-dev-toolbar { display: none !important } html[data-walletbeat-tv] #layout { scroll-snap-type: none !important; scroll-behavior: auto !important; overflow-anchor: none !important }'
		document.documentElement.append(style, playbackStyle)
		document.documentElement.toggleAttribute('data-walletbeat-tv', !window.walletbeatTVPaused)
		const cursor = document.createElement('div')
		cursor.id = 'walletbeat-tv-cursor'
		cursor.setAttribute('aria-hidden', 'true')
		cursor.setAttribute('popover', 'manual')
		const shapes = {
			arrow:
				'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M2 1 L2 24 L8 18 L13 29 L17 27 L12 16 L21 16 Z" fill="white" stroke="#151515" stroke-width="1.5" stroke-linejoin="round"/></svg>',
			pointer:
				'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M9 15V4a2 2 0 0 1 4 0v9-2a2 2 0 0 1 4 0v2-1a2 2 0 0 1 4 0v3a2 2 0 0 1 3 2v5c0 4-3 6-3 8H10c0-3-5-7-6-10-1-3 2-4 4-1l1 1Z" transform="translate(-1 0)" fill="white" stroke="#151515" stroke-width="1.4" stroke-linejoin="round"/></svg>',
		}
		cursor.style.cssText =
			'position:fixed;inset:auto;margin:0;padding:0;width:24px;height:32px;border:0;background:transparent;overflow:visible;filter:drop-shadow(1px 2px 1px #0005);pointer-events:none;z-index:2147483647'
		renderCursor = (position, settled) => {
			window.walletbeatTVCursorPosition = position
			if (settled) {
				saveCursor()
			}
			cursor.style.left = `${position.x}px`
			cursor.style.top = `${position.y}px`
			let kind = settled === false ? 'arrow' : (cursor.dataset.kind ?? 'arrow')
			if (settled) {
				// Sample the site's cursor at rest without restyling the page on every motion frame.
				style.disabled = true
				const hit = document.elementFromPoint(position.x, position.y)
				kind = hit && getComputedStyle(hit).cursor === 'pointer' ? 'pointer' : 'arrow'
				style.disabled = false
			}
			if (cursor.dataset.kind !== kind) {
				cursor.innerHTML = shapes[kind]
				cursor.dataset.kind = kind
				cursor.style.transform =
					kind === 'pointer' ? 'translate(-9px,-2px)' : 'translate(-2px,-1px)'
			}
			cursor.style.opacity = window.walletbeatTVPaused ? '0' : '1'
		}
		window.walletbeatTVMoveCursor = (position, settled = false) => {
			if (window.walletbeatTVPaused) {
				return false
			}
			renderCursor(position, settled)
			return true
		}
		document.documentElement.append(cursor)
		cursor.showPopover()
		document.addEventListener(
			'toggle',
			event => {
				if (
					event instanceof ToggleEvent &&
					event.newState === 'open' &&
					event.target instanceof HTMLElement &&
					event.target !== cursor &&
					event.target.hasAttribute('popover')
				) {
					cursor.hidePopover()
					cursor.showPopover()
				}
			},
			true,
		)
		const [x, y] = (sessionStorage.getItem(cursorStorageKey) ?? '').split(',').map(Number)
		const saved =
			Number.isFinite(x) && Number.isFinite(y)
				? {
						x: Math.max(1, Math.min(innerWidth - 1, x)),
						y: Math.max(1, Math.min(innerHeight - 1, y)),
					}
				: null
		renderCursor(
			window.walletbeatTVCursorPosition ?? saved ?? { x: innerWidth / 2, y: innerHeight / 2 },
		)
	}
	document.addEventListener('DOMContentLoaded', attach, { once: true })
	document.addEventListener('astro:after-swap', () => {
		document.documentElement.toggleAttribute('data-walletbeat-tv', !window.walletbeatTVPaused)
	})
	for (const type of ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart']) {
		document.addEventListener(
			type,
			event => {
				if (!event.isTrusted) {
					return
				}
				if (
					type === 'pointerdown' &&
					Math.abs(window.walletbeatTVExpectedClick?.x - event.clientX) < 1 &&
					Math.abs(window.walletbeatTVExpectedClick?.y - event.clientY) < 1
				) {
					window.walletbeatTVExpectedClick = null
					return
				}
				if (type === 'pointermove') {
					if (
						Math.abs(window.walletbeatTVExpectedClick?.x - event.clientX) < 1 &&
						Math.abs(window.walletbeatTVExpectedClick?.y - event.clientY) < 1
					) {
						renderCursor?.({ x: event.clientX, y: event.clientY })
						return
					}
					const expected = window.walletbeatTVExpectedMoves ?? []
					const index = expected.findIndex(
						position =>
							Math.abs(position.x - event.clientX) < 1 && Math.abs(position.y - event.clientY) < 1,
					)
					if (index >= 0) {
						expected.splice(0, index + 1)
						renderCursor?.({ x: event.clientX, y: event.clientY }, false)
						return
					}
				}
				if (event instanceof MouseEvent) {
					renderCursor?.({ x: event.clientX, y: event.clientY })
				}
				interrupt()
			},
			{ capture: true, passive: true },
		)
	}
}, origin)
page = await context.newPage()
await preparePage(page)
await page.bringToFront()
const windowSession = await context.newCDPSession(page)
const { windowId } = await windowSession.send('Browser.getWindowForTarget')
await windowSession.send('Browser.setWindowBounds', {
	windowId,
	bounds: { windowState: 'fullscreen' },
})
const fullscreenDeadline = performance.now() + 5000
let windowBounds
do {
	;({ bounds: windowBounds } = await windowSession.send('Browser.getWindowBounds', { windowId }))
	if (windowBounds.windowState === 'fullscreen') {
		break
	}
	await new Promise(resolve => setTimeout(resolve, 50))
} while (performance.now() < fullscreenDeadline)
if (windowBounds.windowState !== 'fullscreen') {
	await browser.close()
	await browserServer.close()
	throw new Error(
		'Walletbeat TV could not open a full-screen window. Unlock the display and try again.',
	)
}
await windowSession.detach()
const observePageClose = trackedPage => {
	trackedPage.on('close', () => {
		recordInput()
		if (page === trackedPage) {
			page = context.pages().find(candidate => !candidate.isClosed()) ?? trackedPage
		}
	})
}
observePageClose(page)
context.on('page', openedPage => {
	recordInput()
	observePageClose(openedPage)
	void preparePage(openedPage).catch(error => {
		if (!openedPage.isClosed()) {
			console.error(error.message)
			process.exitCode = 1
			void browser.close()
		}
	})
})
browser.on('disconnected', () => {
	running = false
	void browserServer.close().catch(error => console.error(error.message))
})
for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => {
		running = false
		void browser.close()
	})
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const interrupted = inputRevision =>
	!running || currentInputRevision !== inputRevision || Date.now() - lastInputTime < 15_000
async function waitUnlessInterrupted(ms, inputRevision) {
	const deadline = performance.now() + ms
	do {
		if (interrupted(inputRevision)) {
			throw new Error('interrupted')
		}
		const remaining = deadline - performance.now()
		if (remaining <= 0) {
			return
		}
		await delay(Math.min(remaining, 40))
	} while (true)
}
const randomBetween = (min, max) => min + Math.random() * (max - min)
const chooseRandom = values => values[Math.floor(Math.random() * values.length)]
async function visibleElements(selector, inViewport = true) {
	const locator = page.locator(selector)
	const indices = await locator.evaluateAll(
		(elements, inViewport) =>
			elements.flatMap((element, index) => {
				const box = element.getBoundingClientRect()
				return element.checkVisibility({ visibilityProperty: true }) &&
					box.width > 0 &&
					box.height > 0 &&
					(!inViewport ||
						(box.x >= 0 && box.y >= 0 && box.right <= innerWidth && box.bottom <= innerHeight)) &&
					!element.matches(':disabled')
					? [index]
					: []
			}),
		inViewport,
	)
	return indices.map(index => locator.nth(index))
}
async function targetPoint(locator, preferred = null) {
	return locator.evaluate(
		(element, { offset, preferred }) => {
			const box = element.getBoundingClientRect()
			const label = element.querySelector(':scope > .slice-shape > .label')?.getBoundingClientRect()
			const bounds = label?.width && label?.height ? label : box
			const aim = preferred ?? {
				x: bounds.x + bounds.width * (0.5 + offset.x),
				y: bounds.y + bounds.height * (0.5 + offset.y),
			}
			const candidates = [aim]
			for (const x of [0.2, 0.35, 0.5, 0.65, 0.8]) {
				for (const y of [0.2, 0.35, 0.5, 0.65, 0.8]) {
					candidates.push({ x: box.x + box.width * x, y: box.y + box.height * y })
				}
			}
			return (
				candidates
					.filter(position => {
						if (
							position.x < 0 ||
							position.y < 0 ||
							position.x >= innerWidth ||
							position.y >= innerHeight
						) {
							return false
						}
						const hit = document.elementFromPoint(position.x, position.y)
						if (element.matches('summary') && hit?.closest('a,button,input,select')) {
							return false
						}
						return (
							hit &&
							(hit === element ||
								element.contains(hit) ||
								hit.closest('label')?.control === element)
						)
					})
					.sort(
						(a, b) => Math.hypot(a.x - aim.x, a.y - aim.y) - Math.hypot(b.x - aim.x, b.y - aim.y),
					)[0] ?? null
			)
		},
		{ offset: { x: randomBetween(-0.08, 0.08), y: randomBetween(-0.08, 0.08) }, preferred },
	)
}
async function moveCursor(target, inputRevision) {
	const { from, width, height } = await page.evaluate(() => ({
		from: window.walletbeatTVCursorPosition ?? { x: innerWidth / 2, y: innerHeight / 2 },
		width: innerWidth,
		height: innerHeight,
	}))
	const dx = target.x - from.x
	const dy = target.y - from.y
	const distance = Math.hypot(dx, dy)
	const duration = randomBetween(90, 130) + Math.min(420, distance * 0.3)
	// Distance sets the travel time; a small bend and gentle endpoints keep the aim readable.
	const bend = Math.min(48, distance * 0.08) * (Math.random() < 0.5 ? -1 : 1)
	const control = {
		x: Math.max(
			1,
			Math.min(width - 1, (from.x + target.x) / 2 - (dy / Math.max(1, distance)) * bend),
		),
		y: Math.max(
			1,
			Math.min(height - 1, (from.y + target.y) / 2 + (dx / Math.max(1, distance)) * bend),
		),
	}
	const steps = Math.max(1, Math.ceil(duration / (1000 / 60)))
	const positions = Array.from({ length: steps }, (_, index) => {
		const progress = (index + 1) / steps
		const eased = progress ** 3 * (10 - 15 * progress + 6 * progress ** 2)
		return {
			x: Math.round(
				(1 - eased) ** 2 * from.x + 2 * (1 - eased) * eased * control.x + eased ** 2 * target.x,
			),
			y: Math.round(
				(1 - eased) ** 2 * from.y + 2 * (1 - eased) * eased * control.y + eased ** 2 * target.y,
			),
		}
	})
	// Authorize the path once; native pointer events render the cursor and reveal real hover states.
	if (
		!(await page.evaluate(positions => {
			if (window.walletbeatTVPaused) {
				return false
			}
			window.walletbeatTVExpectedMoves = positions
			return true
		}, positions))
	) {
		throw new Error('interrupted')
	}
	const started = performance.now()
	let index = 0
	while (index < positions.length) {
		await waitUnlessInterrupted(0, inputRevision)
		index = Math.min(
			positions.length - 1,
			Math.max(index, Math.floor(((performance.now() - started) / duration) * steps)),
		)
		await page.mouse.move(positions[index].x, positions[index].y)
		index++
		await waitUnlessInterrupted(
			Math.max(0, started + (index / steps) * duration - performance.now()),
			inputRevision,
		)
	}
	if (
		!(await page.evaluate(target => window.walletbeatTVMoveCursor(target, true), {
			x: Math.round(target.x),
			y: Math.round(target.y),
		}))
	) {
		throw new Error('interrupted')
	}
}
async function hover(locator, inputRevision, dwell = randomBetween(500, 850)) {
	const target = await targetPoint(locator)
	if (!target) {
		return false
	}
	await moveCursor(target, inputRevision)
	await waitUnlessInterrupted(dwell, inputRevision)
	return target
}
async function click(locator, inputRevision) {
	const hovered = await hover(locator, inputRevision, randomBetween(160, 280))
	if (!hovered) {
		return false
	}
	const target = await targetPoint(locator, hovered)
	if (!target) {
		return false
	}
	if (Math.hypot(target.x - hovered.x, target.y - hovered.y) > 3) {
		await moveCursor(target, inputRevision)
	}
	const active = await page.evaluate(target => {
		if (window.walletbeatTVPaused) {
			return false
		}
		window.walletbeatTVExpectedClick = { x: Math.round(target.x), y: Math.round(target.y) }
		return true
	}, target)
	if (!active) {
		throw new Error('interrupted')
	}
	await page.mouse.click(Math.round(target.x), Math.round(target.y), {
		delay: randomBetween(65, 120),
	})
	await waitUnlessInterrupted(0, inputRevision)
	await waitUnlessInterrupted(randomBetween(120, 180), inputRevision)
	return true
}
async function parkCursor(inputRevision) {
	const position = await page.evaluate(() => {
		const current = window.walletbeatTVCursorPosition ?? { x: innerWidth / 2, y: innerHeight / 2 }
		const box = document.querySelector('main')?.getBoundingClientRect()
		const candidates = [current]
		for (const radius of [32, 64, 112, 192]) {
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
				[1, 1],
				[-1, 1],
				[1, -1],
				[-1, -1],
			]) {
				candidates.push({ x: current.x + dx * radius, y: current.y + dy * radius })
			}
		}
		candidates.push(
			{ x: (box?.left ?? 0) + 8, y: current.y },
			{ x: (box?.right ?? innerWidth) - 8, y: current.y },
		)
		return (
			candidates
				.filter(point => {
					if (
						point.x < 8 ||
						point.y < 8 ||
						point.x > innerWidth - 24 ||
						point.y > innerHeight - 32
					) {
						return false
					}
					const hit = document.elementFromPoint(point.x, point.y)
					return (
						hit &&
						!hit.closest(
							'a,button,input,select,summary,label,nav,[role="button"],[popover],.pie,[data-slice-id],.with-expanded-content,p,li,h1,h2,h3,h4,legend,td,th',
						)
					)
				})
				.sort(
					(a, b) =>
						Math.hypot(a.x - current.x, a.y - current.y) -
						Math.hypot(b.x - current.x, b.y - current.y),
				)[0] ?? { x: Math.max(8, (box?.left ?? 0) + 8), y: innerHeight * 0.72 }
		)
	})
	await moveCursor(position, inputRevision)
}
async function validateNavigation() {
	const navigation = await page.evaluate(() => ({
		global: !!document.querySelector('#nav a[href="/"]'),
		layout: !!document.querySelector('#layout'),
		wallet: !!document.querySelector('.attribute-group[id]'),
		toc: !!document.querySelector('#wallet-toc a[href^="#"]'),
	}))
	if (!navigation.global || !navigation.layout || (navigation.wallet && !navigation.toc)) {
		throw new NavigationUnavailableError(
			`This deployment does not provide Walletbeat TV's navigation. Deploy the matching Walletbeat UI or pass a compatible site URL. Page: ${page.url()}`,
		)
	}
}
async function waitForVisibleContent(inputRevision) {
	await page.waitForFunction(
		() =>
			!document.documentElement.hasAttribute('data-astro-transition') &&
			!!document.querySelector('main') &&
			!Array.from(document.querySelectorAll('main astro-island[ssr]')).some(island =>
				Array.from(island.querySelectorAll('*')).some(element => {
					const box = element.getBoundingClientRect()
					return (
						element.checkVisibility() &&
						box.width > 0 &&
						box.height > 0 &&
						box.bottom > 0 &&
						box.top < innerHeight
					)
				}),
			),
		null,
		{ timeout: 15_000 },
	)
	if (interrupted(inputRevision)) {
		throw new Error('interrupted')
	}
}
async function readingPause(inputRevision) {
	await parkCursor(inputRevision)
	const words = await page.evaluate(() =>
		Array.from(
			document.querySelectorAll('main p, main h2, main h3, main li:not(:has(p,li))'),
		).reduce((total, element) => {
			if (element.closest('nav, .pie, [role="navigation"]')) {
				return total
			}
			const box = element.getBoundingClientRect()
			const visibleHeight = Math.max(0, Math.min(innerHeight, box.bottom) - Math.max(0, box.top))
			if (!box.width || !box.height || !visibleHeight) {
				return total
			}
			return (
				total +
				((element.textContent?.trim().split(/\s+/).length ?? 0) * visibleHeight) / box.height
			)
		}, 0),
	)
	await waitUnlessInterrupted(
		Math.min(1800, Math.max(700, 500 + words * 5)) + randomBetween(0, 150),
		inputRevision,
	)
}
async function scrollPage(inputRevision, endId = null) {
	await waitUnlessInterrupted(0, inputRevision)
	const completed = await page.evaluate(endId => {
		const scroller = window.walletbeatTVScrollContainer(
			endId ? document.getElementById(endId) : undefined,
		)
		const start = scroller.scrollTop
		const viewport = scroller.clientHeight
		const top = Math.max(0, scroller.getBoundingClientRect().top) + 110
		const blocks = Array.from(
			document.querySelectorAll('main p, main h2, main h3, main li:not(:has(p,li))'),
		)
			.filter(
				element =>
					!element.closest('nav, .pie, [role="navigation"]') &&
					element.checkVisibility() &&
					element.getBoundingClientRect().height > 0,
			)
			.map(element => ({ element, rect: element.getBoundingClientRect() }))
			.filter(block => block.rect.bottom > top + 8)
		const first =
			blocks.find(block => block.element.matches('p,li') && block.rect.top < innerHeight) ??
			blocks[0]
		const section = first?.element.closest('.attribute, details, section, article')
		const sectionBottom = section?.getBoundingClientRect().bottom
		const continuous =
			first && (first.rect.height > viewport * 0.8 || sectionBottom - top > viewport * 0.9)
		let distance = viewport * 0.7
		if (first) {
			if (continuous) {
				distance = Math.max(first.rect.bottom, sectionBottom ?? 0) - top
			} else {
				// Advance at least two paragraphs; short copy should not produce tiny repeated stops.
				const next = blocks
					.filter(block => block.element.matches('p,li'))
					.find((block, index) => index >= 2 && block.rect.top - top >= viewport * 0.5)
				if (next) {
					distance = next.rect.top - top
				}
			}
		}
		const boundary = endId ? document.getElementById(endId)?.getBoundingClientRect().bottom : null
		const end =
			boundary == null ? scroller.scrollHeight - viewport : start + boundary - innerHeight * 0.88
		const target = Math.min(end, start + distance)
		return window.walletbeatTVScroll(scroller, target, continuous)
	}, endId)
	if (!completed || interrupted(inputRevision)) {
		throw new Error('interrupted')
	}
}
async function scrollIntoView(locator, inputRevision, alignment = 'nearest') {
	await waitUnlessInterrupted(0, inputRevision)
	const ready = await locator.evaluate(async (element, alignment) => {
		for (const horizontal of [true, false]) {
			for (let owner = element.parentElement; owner; owner = owner.parentElement) {
				if (!horizontal && owner.matches('[data-scroll-container],html,body')) {
					break
				}
				const size = horizontal ? 'Width' : 'Height'
				if (
					owner[`scroll${size}`] <= owner[`client${size}`] + 1 ||
					!['auto', 'scroll'].includes(
						getComputedStyle(owner)[horizontal ? 'overflowX' : 'overflowY'],
					)
				) {
					continue
				}
				const rect = element.getBoundingClientRect()
				const bounds = owner.getBoundingClientRect()
				const start = Math.max(0, horizontal ? bounds.left : bounds.top) + 8
				const end =
					Math.min(
						horizontal ? innerWidth : innerHeight,
						horizontal ? bounds.right : bounds.bottom,
					) - 8
				const leading = horizontal ? rect.left : rect.top
				const trailing = horizontal ? rect.right : rect.bottom
				const delta = leading < start ? leading - start : Math.max(0, trailing - end)
				if (
					!(await window.walletbeatTVScroll(
						owner,
						owner[horizontal ? 'scrollLeft' : 'scrollTop'] + delta,
						false,
						horizontal,
					))
				) {
					return false
				}
			}
		}
		const rect = element.getBoundingClientRect()
		const scroller = window.walletbeatTVScrollContainer(element)
		const bounds = scroller.getBoundingClientRect()
		const navigationControl = !!element.closest(
			'nav, [role="navigation"], #wallet-toc, .filters, .filter-trigger, .sort-label',
		)
		const top = Math.max(0, bounds.top) + (scroller.id === 'layout' && !navigationControl ? 100 : 0)
		const bottom = Math.min(innerHeight, bounds.bottom) - 30
		const height = Math.min(rect.height, (bottom - top) * 0.8)
		const delta =
			alignment === 'start' || rect.top < top
				? rect.top - top
				: Math.max(0, rect.top + height - bottom)
		if (!(await window.walletbeatTVScroll(scroller, scroller.scrollTop + delta))) {
			return false
		}
		const settled = element.getBoundingClientRect()
		return settled.top >= top - 2 && settled.top + height <= bottom + 2
	}, alignment)
	await waitUnlessInterrupted(0, inputRevision)
	return ready
}
async function navigateByLink(href, inputRevision) {
	const local = href.startsWith('#')
	const menu = local ? '#wallet-toc' : '#nav'
	const popover = local ? '#wallet-toc' : '#nav-menu'
	const links = page.locator(`${menu} a[href=${JSON.stringify(href)}]`)
	if (
		!(await targetPoint(links.first())) &&
		!(await page.locator(popover).evaluate(element => element.matches(':popover-open')))
	) {
		const toggle = page.locator(local ? 'button[popovertarget="wallet-toc"]' : '#menu-toggle')
		if (await toggle.isVisible()) {
			await click(toggle, inputRevision)
		}
	}
	for (const candidate of await links.all()) {
		if ((await candidate.isVisible()) && (await scrollIntoView(candidate, inputRevision))) {
			if (await click(candidate, inputRevision)) {
				await page.waitForURL(url => (local ? url.hash === href : url.pathname === href))
				return true
			}
		}
	}
	throw new Error(`No available navigation link: ${href}`)
}
async function compareVariants(inputRevision) {
	const selects = await visibleElements(
		'select[aria-label="Wallet version"], select[aria-label="Wallet model"]',
	)
	if (!selects.length) {
		return
	}
	const select = selects[0]
	const captions = await visibleElements('.variant-caption')
	const attribute = captions.length
		? await captions[0].evaluate(element => element.closest('.attribute')?.id)
		: null
	if (attribute) {
		await navigateByLink(`#${attribute}`, inputRevision)
		await readingPause(inputRevision)
	}
	const original = await select.evaluate(element => element.selectedIndex)
	const count = await select.locator('option').count()
	const choices = Array.from({ length: count - 1 }, (_, index) => index + 1).filter(
		index => index !== original,
	)
	for (const index of choices.slice(0, 1)) {
		await click(select, inputRevision)
		const option = select.locator('option').nth(index)
		if (!(await option.isVisible()) || !(await click(option, inputRevision))) {
			if (interrupted(inputRevision)) {
				throw new Error('interrupted')
			}
			await select.selectOption({ index })
		}
		await waitUnlessInterrupted(450, inputRevision)
		if (attribute && (await page.locator(`[id=${JSON.stringify(attribute)}]`).count())) {
			const inView = await page.locator(`[id=${JSON.stringify(attribute)}]`).evaluate(element => {
				const rect = element.getBoundingClientRect()
				return rect.bottom > 100 && rect.top < innerHeight * 0.8
			})
			if (!inView) {
				await navigateByLink(`#${attribute}`, inputRevision)
			}
		}
		const changedCaptions = await visibleElements('.variant-caption')
		if (changedCaptions.length) {
			await hover(changedCaptions[0], inputRevision, randomBetween(550, 850))
		}
		await readingPause(inputRevision)
	}
}
async function scrollThroughContent(
	inputRevision,
	{ endId = null, shouldCompareVariants = false } = {},
) {
	let compared = false
	const inspectedGroups = new Set()
	while (running) {
		const done = await page.evaluate(endId => {
			const bottom = endId ? document.getElementById(endId)?.getBoundingClientRect().bottom : null
			const scroller = window.walletbeatTVScrollContainer(
				endId ? document.getElementById(endId) : undefined,
			)
			return bottom !== null && bottom !== undefined
				? bottom < innerHeight * 0.9
				: scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4
		}, endId)
		if (done) {
			break
		}
		if (shouldCompareVariants) {
			const headings = await visibleElements('.attribute-group h3 a')
			if (headings.length) {
				const group = await headings[0].evaluate(element => element.closest('.attribute-group').id)
				if (!inspectedGroups.has(group)) {
					await hover(headings[0], inputRevision, randomBetween(600, 950))
					inspectedGroups.add(group)
				}
			}
			if (!compared && (await visibleElements('.variant-caption')).length) {
				await compareVariants(inputRevision)
				compared = true
			}
		}
		await scrollPage(inputRevision, endId)
		await readingPause(inputRevision)
	}
}
async function explorePage(inputRevision) {
	const filters = await visibleElements('main nav[aria-label="Filter EIPs"] button')
	const active = await Promise.all(
		filters.map(button => button.evaluate(element => element.classList.contains('active'))),
	)
	const original = filters[active.indexOf(true)]
	const alternatives = filters.filter((_, index) => !active[index])
	if (original && alternatives.length && (await click(chooseRandom(alternatives), inputRevision))) {
		await readingPause(inputRevision)
		await click(original, inputRevision)
		await readingPause(inputRevision)
	}
	const disclosures = []
	for (const summary of await visibleElements('main details > summary', false)) {
		if (!(await summary.evaluate(element => element.parentElement.open))) {
			disclosures.push(summary)
		}
	}
	if (disclosures.length) {
		const disclosure = chooseRandom(disclosures)
		if (
			!(await scrollIntoView(disclosure, inputRevision)) ||
			!(await click(disclosure, inputRevision))
		) {
			throw new Error('Page disclosure is not reachable')
		}
		const details = disclosure.locator('..')
		if (!(await details.evaluate(element => element.open))) {
			throw new Error('Page disclosure did not open')
		}
		const content = details.locator(':scope > :not(summary)').first()
		await content.waitFor({ state: 'visible' })
		if (!(await scrollIntoView(content, inputRevision, 'start'))) {
			throw new Error('Page disclosure content is not reachable')
		}
		await readingPause(inputRevision)
	}
}
async function filterTriggers(panel) {
	const id = await panel.getAttribute('id')
	const triggers = []
	for (const trigger of await visibleElements('main .filter-trigger[aria-controls]', false)) {
		if ((await trigger.getAttribute('aria-controls')) === id) {
			triggers.push(trigger)
		}
	}
	return triggers
}
async function showFilters(kind, inputRevision, owner = null) {
	const panel = page.locator(`main .filters [data-filter-kind=${JSON.stringify(kind)}]`).first()
	if (!(await panel.count())) {
		return null
	}
	const triggers = owner ? [owner] : await filterTriggers(panel)
	for (const trigger of triggers) {
		if ((await trigger.getAttribute('aria-controls')) !== (await panel.getAttribute('id'))) {
			continue
		}
		if ((await scrollIntoView(trigger, inputRevision)) && (await click(trigger, inputRevision))) {
			await waitUnlessInterrupted(350, inputRevision)
		}
		break
	}
	return panel
}
async function dismissFilters(panel, inputRevision) {
	if (panel && (await panel.evaluate(element => element.matches(':popover-open')))) {
		await click(page.locator('main h2').first(), inputRevision)
	}
}
async function exploreTable(inputRevision) {
	const sortedHeader = page.locator('main th[data-sort]').first()
	const originalSort = (await sortedHeader.count())
		? await sortedHeader.evaluate(element => ({
				name: element.querySelector('button[aria-label^="Sort by"]')?.getAttribute('aria-label'),
				direction: element.getAttribute('data-sort'),
			}))
		: null
	await readingPause(inputRevision)
	const firstFilter = page.locator('main h2').first()
	if (await firstFilter.count()) {
		await scrollIntoView(firstFilter, inputRevision, 'start')
	}

	const panel = page.locator('main .filters [data-filter-kind="wallet"]').first()
	if (await panel.count()) {
		const triggers = await filterTriggers(panel)
		const selected = []
		const groups = new Set()
		for (const owner of triggers.length ? triggers : [null]) {
			await showFilters('wallet', inputRevision, owner)
			const controls = await visibleElements(
				'main .filters [data-filter-set] label:has(input[type="checkbox"]:enabled)',
				false,
			)
			for (const control of controls) {
				const group = await control.evaluate(element =>
					element.closest('[data-filter-set]').getAttribute('data-filter-set'),
				)
				if (groups.has(group) || !(await control.locator('input').isEnabled())) {
					continue
				}
				if (
					!(await scrollIntoView(control, inputRevision)) ||
					!(await click(control, inputRevision))
				) {
					continue
				}
				groups.add(group)
				selected.push({ control, owner })
				await waitUnlessInterrupted(450, inputRevision)
				if (selected.length === 2) {
					break
				}
			}
			await dismissFilters(panel, inputRevision)
			if (selected.length === 2) {
				break
			}
		}
		for (const { control, owner } of selected.reverse()) {
			await showFilters('wallet', inputRevision, owner)
			await scrollIntoView(control, inputRevision)
			await click(control, inputRevision)
			await dismissFilters(panel, inputRevision)
		}
	}
	await readingPause(inputRevision)
	if (originalSort?.name) {
		const sorts = await visibleElements(
			`main th button[aria-label=${JSON.stringify(originalSort.name)}]:enabled`,
		)
		if (!sorts.length) {
			return
		}
		const sort = sorts[0]
		for (let attempt = 0; attempt < 3; attempt++) {
			if (!(await scrollIntoView(sort, inputRevision)) || !(await click(sort, inputRevision))) {
				throw new Error('Sort control is not reachable')
			}
			await readingPause(inputRevision)
			if (
				(await sort.evaluate(element => element.closest('th').getAttribute('data-sort'))) ===
				originalSort.direction
			) {
				break
			}
		}
	}
}
async function exploreWallet(groups, inputRevision) {
	const current = Math.max(
		0,
		groups.findIndex(group => group.bottom > 150),
	)
	const next = groups[Math.min(current + 1, groups.length - 1)]
	const disclosures = await visibleElements('.attribute-group details:not([open]) > summary')
	if (disclosures.length && (await click(disclosures[0], inputRevision))) {
		await readingPause(inputRevision)
	}
	await scrollThroughContent(inputRevision, { endId: next.id, shouldCompareVariants: true })
}
async function inspectWallet(inputRevision) {
	const selector = 'main tr:not([data-disabled]) h3 a[href^="/"]'
	let wallets = await visibleElements(selector, false)
	if (!wallets.length) {
		for (const kind of ['wallet', 'stage']) {
			const panel = page.locator(`main .filters [data-filter-kind=${JSON.stringify(kind)}]`).first()
			if (!(await panel.count())) {
				continue
			}
			const triggers = await filterTriggers(panel)
			for (const owner of triggers.length ? triggers : [null]) {
				await showFilters(kind, inputRevision, owner)
				const reset = panel.locator('button[data-reset]:visible').first()
				if (
					(await reset.isVisible()) &&
					(await scrollIntoView(reset, inputRevision)) &&
					(await click(reset, inputRevision))
				) {
					await readingPause(inputRevision)
				}
				await dismissFilters(panel, inputRevision)
			}
		}

		wallets = await visibleElements(selector, false)
	}
	if (!wallets.length) {
		throw new Error('No wallet links available')
	}
	const nearby = await Promise.all(
		wallets.map(async wallet => ({
			wallet,
			distance: await wallet.evaluate(element => {
				const box = element.getBoundingClientRect()
				return Math.max(0, -box.bottom, box.top - innerHeight)
			}),
		})),
	)
	nearby.sort((a, b) => a.distance - b.distance)
	const wallet = chooseRandom(nearby.slice(0, 4)).wallet
	const href = await wallet.getAttribute('href')
	const row = `main tr:has(h3 a[href=${JSON.stringify(href)}])`
	const rows = await visibleElements(row, false)
	if (!(await scrollIntoView(rows[0] ?? wallet, inputRevision))) {
		throw new Error('Wallet row unavailable')
	}
	await hover(wallet, inputRevision, randomBetween(550, 850))
	const slices = await Promise.all(
		(await visibleElements(`${row} .pie [data-slice-id]`, false)).map(async locator => ({
			locator,
			id: await locator.getAttribute('data-slice-id'),
			label: await locator.getAttribute('aria-label'),
		})),
	)
	const inspect = async (candidates, dwell) => {
		const remaining = [...candidates]
		while (remaining.length) {
			const candidate = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]
			if (await hover(candidate.locator, inputRevision, dwell)) {
				return candidate
			}
		}
		return null
	}
	const groups = slices.filter(group => slices.some(slice => slice.id.startsWith(`${group.id}_`)))
	const group = await inspect(groups, randomBetween(550, 850))
	if (group) {
		const attributes = slices.filter(slice => slice.id.startsWith(`${group.id}_`))
		const notable = attributes.filter(item => /: (FAIL|PARTIAL|UNRATED)$/.test(item.label ?? ''))
		await parkCursor(inputRevision)
		await waitUnlessInterrupted(150, inputRevision)
		await inspect(notable.length ? notable : attributes, randomBetween(1200, 1700))
	}
	return wallet
}
async function visitWallet(wallet, inputRevision) {
	const destination = new URL(await wallet.getAttribute('href'), origin)
	if (!(await click(wallet, inputRevision))) {
		throw new Error('Wallet link unavailable')
	}
	await page.waitForURL(
		url => url.pathname === destination.pathname && url.search === destination.search,
	)
	await waitForVisibleContent(inputRevision)
	await validateNavigation()
	await readingPause(inputRevision)
	const ids = await page.locator('.attribute-group[id]').evaluateAll(elements => {
		const groups = elements.slice(0, Math.max(1, elements.length - 1))
		const varying = groups.filter(element => element.querySelector('.variant-caption'))
		return (varying.length ? varying : groups).map(element => element.id)
	})
	if (ids.length) {
		await navigateByLink(`#${chooseRandom(ids)}`, inputRevision)
	}
}
if (checkHeaded) {
	await page.setContent('<title>Walletbeat TV headed installation check</title>')
	console.log('Walletbeat TV headed installation verified.')
	await browser.close()
}
const startupInputRevision = currentInputRevision
for (let attempt = 1; running && attempt <= 3; attempt++) {
	try {
		const response = await page.goto(origin)
		if (response && response.status() >= 400) {
			throw new Error(`Walletbeat returned HTTP ${response.status()}.`)
		}
		break
	} catch (error) {
		if (interrupted(startupInputRevision)) {
			break
		}
		if (attempt === 3) {
			await browser.close()
			throw new Error(
				`Walletbeat TV could not open ${origin}. Check the connection and rerun the launcher.`,
				{ cause: error },
			)
		}
		await delay(attempt * 1000)
	}
}
let failedAttempts = 0
let recoveredNavigation = false
while (running) {
	try {
		while (running && Date.now() - lastInputTime < 15_000) {
			await delay(100)
		}
		if (!running) {
			break
		}
		if (page.isClosed()) {
			const remainingPages = context.pages().filter(candidate => !candidate.isClosed())
			if (!remainingPages.length) {
				await browser.close()
				break
			}
			page = remainingPages[0]
			continue
		}
		if (context.pages().length > 1) {
			const pages = context.pages()
			const focused = await Promise.all(
				pages.map(candidate =>
					candidate.evaluate(() => document.hasFocus() && !document.hidden).catch(() => false),
				),
			)
			const active = pages[focused.indexOf(true)]
			if (!active) {
				await delay(250)
				continue
			}
			page = active
		}
		const inputRevision = currentInputRevision
		if (new URL(page.url()).origin !== origin) {
			await delay(1000)
			continue
		}
		const resumed = await page.evaluate(() => {
			if (Date.now() - Number(sessionStorage.getItem('walletbeat-tv-last-input') ?? 0) < 15_000) {
				return false
			}
			window.walletbeatTVPaused = false
			document.documentElement.setAttribute('data-walletbeat-tv', '')
			const cursor = document.getElementById('walletbeat-tv-cursor')
			if (cursor) {
				cursor.style.opacity = '1'
			}
			return true
		})
		if (!resumed) {
			await delay(100)
			continue
		}
		await waitForVisibleContent(inputRevision)
		await validateNavigation()
		// Reconcile from the live document after a visitor browses, rather than replaying a stale step.
		const groups = await page.locator('.attribute-group[id]').evaluateAll(elements =>
			elements.map(element => ({
				id: element.id,
				bottom: element.getBoundingClientRect().bottom,
			})),
		)
		const path = new URL(page.url()).pathname
		if (groups.length) {
			await exploreWallet(groups, inputRevision)
			await navigateByLink(chooseRandom(importantPages), inputRevision)
		} else if (path === '/') {
			await exploreTable(inputRevision)
			await visitWallet(await inspectWallet(inputRevision), inputRevision)
		} else {
			await explorePage(inputRevision)
			await scrollThroughContent(inputRevision)
			await navigateByLink(
				importantPages.includes(path) ? chooseRandom(['/about/', '/faq/']) : '/',
				inputRevision,
			)
		}
		failedAttempts = 0
		recoveredNavigation = false
	} catch (error) {
		if (!browser.isConnected()) {
			running = false
			break
		}
		if (page.isClosed()) {
			continue
		}
		if (!running) {
			break
		}
		if (error.message === 'interrupted' || Date.now() - lastInputTime < 15_000) {
			continue
		}
		console.error(error.message)
		failedAttempts++
		if (error instanceof NavigationUnavailableError) {
			if (failedAttempts < 3) {
				try {
					await waitUnlessInterrupted(failedAttempts * 1000, currentInputRevision)
					await page.reload()
				} catch (reloadError) {
					if (reloadError.message !== 'interrupted') {
						console.error(reloadError.message)
					}
				}
				continue
			}
			await browser.close()
			throw new Error(
				'Walletbeat navigation stayed unavailable after retries. Check the connection and deploy the matching Walletbeat UI, or pass a compatible site URL.',
				{ cause: error },
			)
		}
		if (failedAttempts < 3) {
			await delay(failedAttempts * 1000)
			continue
		}
		if (recoveredNavigation) {
			await browser.close()
			throw new Error(
				'Walletbeat TV could not continue after returning home. Check the connection and site version, then rerun the launcher.',
				{ cause: error },
			)
		}
		try {
			console.log('Walletbeat TV: returning home after repeated tour errors.')
			await navigateByLink('/', currentInputRevision)
			await waitForVisibleContent(currentInputRevision)
			failedAttempts = 0
			recoveredNavigation = true
		} catch (recoveryError) {
			if (recoveryError.message === 'interrupted') {
				continue
			}
			await browser.close()
			throw new Error(
				'Walletbeat TV could not return home using the site menu. Check the connection and site version, then rerun the launcher.',
				{ cause: recoveryError },
			)
		}
	}
}

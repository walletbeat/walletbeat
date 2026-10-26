import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { chromium, firefox, webkit } from '@playwright/test'

import { wbIconEmojiSequences } from '@/styles/wbicons'
import { getWalletStageAndLadder } from '@/utils/stage'

import { parseProcedures, parseRequirements } from './contract-evidence.mjs'
import { sourceSnapshot, verifyServerSource } from './fixtures/source-snapshot.mjs'
import {
	isWalletFixture,
	walletFixtureAttributeTree,
	walletFixtures,
} from './fixtures/wallet-fixtures'
import { presentationStyles } from './presentation-styles.mjs'
import { semanticOutline } from './semantic-outline.mjs'

/**
 * @typedef {Pick<DOMRectReadOnly, 'x'|'y'|'top'|'bottom'|'left'|'right'|'width'|'height'>} CaptureBox
 * @typedef {{x: number, y: number}} CapturePoint
 * @typedef {Parameters<import('@playwright/test').Page['getByRole']>[0]} AccessibleRole
 * @typedef {{semanticOutline: ReturnType<typeof semanticOutline>, accessibility: string, accessibleH1: number, repeatedWalletName: number|null, namelessControls: {role: AccessibleRole, count: number}[], tocNames: number, tocDefinitionNames: number, tocTriggerCount: number, pieOutsidePopover: boolean, pieLinkCount: number, tocCycle: {opened: number, nativeOpen: boolean, closed: number}|null}} InitialExtras
 * @typedef {ReturnType<typeof observeInitial> & Partial<InitialExtras>} InitialCapture
 * @typedef {{hash: string, focused: string|undefined}} SkipLanding
 * @typedef {{href: string|null, targetExists: boolean, focused: boolean, box: CaptureBox, landing?: SkipLanding}} SkipCapture
 * @typedef {{icon: string|null, point: CapturePoint, box: CaptureBox, pointInGlyph: boolean, expected: string|null|undefined, actual: string|null, hit: string|null, hitGlyph: boolean}} GlyphCapture
 * @typedef {{before: number, available: number, pointerInHeader: boolean, after: number}} HeaderCapture
 * @typedef {{open: boolean, descendants: {tag: string, boxes: number}[]}} DisclosureCapture
 * @typedef {ReturnType<typeof observeMenuState>} MenuState
 * @typedef {{before: MenuState, open?: MenuState, search?: MenuState, wide?: MenuState, closedWide?: boolean, after?: MenuState}} MenuCapture
 * @typedef {{width: number, initial: InitialCapture, transitions: ReturnType<typeof observeTransition>[], presentation: ReturnType<typeof presentationStyles>[], skipLink?: SkipCapture|null, walletAspect?: {intrinsic: number, rendered: number}, headingGlyphTargets?: GlyphCapture[], headerScroll?: HeaderCapture, disclosure?: DisclosureCapture|null, footerFlow?: ReturnType<typeof observeFooterFlow>, menu?: MenuCapture, complete?: true}} Observation
 * @typedef {Omit<Required<Observation>, 'initial'|'skipLink'|'menu'> & {initial: ReturnType<typeof observeInitial> & InitialExtras, skipLink: (SkipCapture & {landing: SkipLanding})|null, menu?: Required<Omit<MenuCapture, 'search'>> & Pick<MenuCapture, 'search'>}} CompleteObservation
 */

/** @param {Observation} observation @returns {observation is CompleteObservation} */
function isComplete(observation) {
	return observation.complete === true
}

function observeInitial() {
	/** @param {Element | null} element */
	const box = element =>
		element
			? (({ x, y, top, bottom, left, right, width, height }) => ({
					x,
					y,
					top,
					bottom,
					left,
					right,
					width,
					height,
				}))(element.getBoundingClientRect())
			: null
	const root = document.querySelector('#top')
	const ids = [...document.querySelectorAll('[id]')].map(element => element.id)

	return {
		url: location.href,
		headerFirst: root.firstElementChild === root.querySelector(':scope > header'),
		asideCount: root.querySelectorAll(':scope > aside').length,
		articleCount: root.querySelectorAll(':scope > article').length,
		groupRegions: [...root.querySelectorAll('.attribute-group')].map(group => ({
			title: group.querySelector(':scope > header h2')?.textContent.trim(),
			name: group.getAttribute('aria-label'),
		})),
		petalLabels: [...root.querySelectorAll('.pie-navigation a[href]')].map(link => ({
			title: link.getAttribute('title'),
			label: link.textContent.trim(),
			icon: link
				.querySelector('.pie-navigation-icon')
				?.getAttribute('data-icon')
				?.split(/\s+/)
				.at(-1),
		})),
		navDestinations: {
			sections: [
				...root.querySelectorAll('.attribute-group[id], .attribute-group section.attribute[id]'),
			].map(section => ({
				id: section.id,
				permalinks: [
					...section.querySelectorAll(
						':scope > header a[href], :scope > details > summary a[href]',
					),
				].filter(
					link =>
						(link instanceof HTMLAnchorElement ? link.hash : '') === `#${section.id}` &&
						(link.querySelector('h2,h3') || link.closest('h2,h3')),
				).length,
			})),
			pie: [...root.querySelectorAll('.pie-navigation a[href^="#"]')]
				.map(link =>
					decodeURIComponent((link instanceof HTMLAnchorElement ? link.hash : '').slice(1)),
				)
				.sort(),
			toc: [...root.querySelectorAll('#wallet-toc a[href^="#"]')]
				.map(link =>
					decodeURIComponent((link instanceof HTMLAnchorElement ? link.hash : '').slice(1)),
				)
				.sort(),
		},
		reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
		stagePresent: (root.querySelector('#stages')?.getBoundingClientRect().height ?? 0) > 0,
		sourceOutline: [...root.querySelectorAll('.references')].map(section => {
			const heading = section.querySelector('h1,h2,h3,h4,h5,h6')
			let parent = section.parentElement

			while (parent && parent !== root) {
				if (parent.matches('section,details,article')) {
					const title = [...parent.querySelectorAll('h1,h2,h3,h4,h5,h6')].find(
						element => element.closest('section,details,article') === parent,
					)

					if (title) {
						return {
							level: heading?.tagName,
							parentLevel: title.tagName,
							parentTitle: title.textContent.trim(),
						}
					}
				}

				parent = parent.parentElement
			}

			return { level: heading?.tagName, parentLevel: null }
		}),
		outline: {
			groups: [...root.querySelectorAll('.attribute-group')].map(group =>
				[...group.querySelectorAll(':scope > header h1,:scope > header h2,:scope > header h3')].map(
					heading => heading.tagName,
				),
			),
			stages: [...root.querySelectorAll('#stages section[id] > details > summary')].map(summary =>
				[...summary.querySelectorAll('h1,h2,h3,h4')].map(heading => heading.tagName),
			),
			stageProgress: [...root.querySelectorAll('#stages > header :is(h1,h2,h3,h4)')].map(
				heading => heading.tagName,
			),
			attributes: [...root.querySelectorAll('.attribute-group .attribute > details > summary')].map(
				summary => [...summary.querySelectorAll('h1,h2,h3,h4')].map(heading => heading.tagName),
			),
			details: [
				...root.querySelectorAll(
					'.attribute-group .attribute > details > :not(summary) :is(h1,h2,h3,h4,h5,h6)',
				),
			]
				.filter(heading => !heading.closest('.references'))
				.map(heading => heading.tagName),
			criteriaGroups: [
				...root.querySelectorAll('#stages details details > summary :is(h1,h2,h3,h4,h5,h6)'),
			].map(heading => heading.tagName),
			news: [...root.querySelectorAll('#security-news > header :is(h1,h2,h3,h4)')].map(
				heading => heading.tagName,
			),
			newsItems: [
				...root.querySelectorAll(
					'#security-news .news-items > [data-sticky-breadcrumb~="scope"] > details > summary',
				),
			].map(summary =>
				[...summary.querySelectorAll('h1,h2,h3,h4')].map(heading => heading.tagName),
			),
		},
		typeBadges: [
			...root.querySelectorAll(
				':scope > header [data-sticky-breadcrumb~="support"] > span[data-row]',
			),
		].map(element => ({
			type: [...element.childNodes]
				.filter(node => node.nodeType === Node.TEXT_NODE)
				.map(node => node.textContent)
				.join('')
				.trim()
				.toUpperCase(),
			value: element.querySelector(':scope > data[data-badge]')?.getAttribute('value') ?? null,
		})),
		popovers: [...document.querySelectorAll('[popover]:not(#nav)')].map(element => ({
			id: element.id,
			open: element.matches(':popover-open'),
		})),
		frame: (() => {
			const layout = document.querySelector('#layout')
			const main = document.querySelector('main')
			const navigation = document.querySelector('#nav')
			const footer = document.querySelector('#content > footer')

			if (!(main instanceof HTMLElement) || !(footer instanceof HTMLElement)) {
				throw new Error('Footer flow requires native layout owners')
			}

			return {
				mainCount: document.querySelectorAll('main').length,
				main: box(main),
				navigation: box(navigation),
				distinctAreas:
					!!main &&
					!!navigation &&
					layout.contains(main) &&
					layout.contains(navigation) &&
					!main.contains(navigation) &&
					!navigation.contains(main),
				content: box(document.querySelector('#content')),
				footer: box(footer),
				overflow: [document.documentElement, layout, document.querySelector('#content')].map(
					element => ({
						id: element.id || element.tagName,
						clientWidth: element.clientWidth,
						scrollWidth: element.scrollWidth,
					}),
				),
			}
		})(),
		direction: getComputedStyle(document.documentElement).direction,
		chrome: {
			menu: box(document.querySelector('#menu-toggle')),
			theme: box(document.querySelector('#theme-toggle')),
			logo: box(document.querySelector('#nav > header .logo')),
		},
		glyphs: [
			...root.querySelectorAll(
				'h1 [data-icon], h2 [data-icon], h3 [data-icon], h4 [data-icon], [data-sticky-breadcrumb~="source"] > a > [data-icon], .page-navigation [data-icon]',
			),
		].map(element => {
			const style = getComputedStyle(element)

			return {
				icon: element.getAttribute('data-icon'),
				scope: element.closest('section,details,article')?.id,
				href: element.closest('a')?.getAttribute('href'),
				hidden: element.getAttribute('aria-hidden'),
				box: box(element),
				font: style.fontFamily,
				size: style.fontSize,
				filter: style.filter,
				content: getComputedStyle(element, '::before').content,
			}
		}),
		sourceOrder:
			!!root.querySelector('.page-navigation') &&
			!!root.querySelector('#stages') &&
			Boolean(
				root
					.querySelector('.page-navigation')
					.compareDocumentPosition(root.querySelector('#stages')) &
				Node.DOCUMENT_POSITION_FOLLOWING,
			),
		platformCards: [...root.querySelectorAll(':scope > header [data-card]')].filter(
			element =>
				element.textContent.trim().startsWith('Platforms:') &&
				element.getBoundingClientRect().height > 0,
		).length,
		stageDetails: [...root.querySelectorAll('#stages details')]
			.filter(element => element.querySelector(':scope > summary h3'))
			.map(element => ({
				id: element.closest('section[id]')?.id ?? null,
				name: element.getAttribute('name'),
				open: element instanceof HTMLDetailsElement ? element.open : false,
			})),
		snapType: getComputedStyle(document.querySelector('#layout')).scrollSnapType,
		pageTopLinks: [...root.querySelectorAll('a[href^="#top"]')].map(element =>
			element.getAttribute('href'),
		),
		viewportHeight: innerHeight,
		h1: document.querySelectorAll('h1').length,
		h1InHeader: !!root.querySelector(':scope > header h1'),
		duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i),
		headings: [...root.querySelectorAll('h1,h2,h3,h4')].map(element => ({
			text: element.textContent.trim(),
			level: element.tagName,
			box: box(element),
		})),
		details: [...root.querySelectorAll('.attribute-group .attribute > details')].map(element =>
			element instanceof HTMLDetailsElement ? element.open : false,
		),
		links: [...root.querySelectorAll('a[href^="#"]')].map(element => ({
			href: element.getAttribute('href'),
			destination: !!document.getElementById(
				(element instanceof HTMLAnchorElement ? element.hash : '').slice(1),
			),
		})),
		navigation: [...root.querySelectorAll('nav')].map(element => ({
			name: element.getAttribute('aria-label'),
			box: box(element),
		})),
		capabilities: Object.fromEntries(
			[
				'animation-timeline: scroll()',
				'view-timeline-name: --test',
				'timeline-scope: --test',
				'anchor-name: --test',
				'container-type: scroll-state',
			].map(feature => [feature, CSS.supports(feature)]),
		),
		scrollAreas: [...document.querySelectorAll('[data-scroll-container]')].map(element => ({
			id: element.id,
			height: element.clientHeight,
			scrollHeight: element.scrollHeight,
			box: box(element),
		})),
	}
}

/** @param {string} id */
function observeTransition(id) {
	return {
		id,
		target: (({ x, y, top, bottom, left, right, width, height }) => ({
			x,
			y,
			top,
			bottom,
			left,
			right,
			width,
			height,
		}))(document.getElementById(id).getBoundingClientRect()),
		walletScope: (({ x, y, top, bottom, left, right, width, height }) => ({
			x,
			y,
			top,
			bottom,
			left,
			right,
			width,
			height,
		}))(document.querySelector('#top').getBoundingClientRect()),
		walletHeading: (({ x, y, top, bottom, left, right, width, height }) => ({
			x,
			y,
			top,
			bottom,
			left,
			right,
			width,
			height,
		}))(document.querySelector('#top h1').getBoundingClientRect()),
		scroll: document.querySelector('#layout').scrollTop,
		headings: [...document.querySelectorAll('#top h1, #top h2, #top h3')]
			.filter(element => {
				const r = element.getBoundingClientRect()

				return r.bottom > 0 && r.top < 200
			})
			.map(element => ({
				text: element.textContent.trim(),
				top: element.getBoundingClientRect().top,
				bottom: element.getBoundingClientRect().bottom,
			})),
	}
}

function observeFooterFlow() {
	const root = document.querySelector('#layout')
	const main = document.querySelector('main')
	const footer = document.querySelector('#content > footer')

	if (!(main instanceof HTMLElement) || !(footer instanceof HTMLElement)) {
		throw new Error('Footer flow requires native layout owners')
	}

	const parent = footer.offsetParent
	const sample = () => ({
		root: root.scrollTop,
		main: main.scrollTop,
		height: root.scrollHeight,
		mainHeight: main.offsetHeight,
		footerHeight: footer.offsetHeight,
		sameParent: footer.offsetParent === parent,
		footer: (({ x, y, top, bottom, left, right, width, height }) => ({
			x,
			y,
			top,
			bottom,
			left,
			right,
			width,
			height,
		}))(footer.getBoundingClientRect()),
	})

	root.scrollTo({ top: 0, behavior: 'instant' })
	const start = sample()

	root.scrollTo({ top: root.scrollHeight, behavior: 'instant' })
	const end = sample()

	root.scrollTo({ top: 0, behavior: 'instant' })
	const returned = sample()

	return {
		start,
		end,
		returned,
		stable: [end, returned].every(
			state =>
				state.sameParent &&
				state.height === start.height &&
				state.mainHeight === start.mainHeight &&
				state.footerHeight === start.footerHeight,
		),
		mainOverflow: getComputedStyle(main).overflowY,
		mainRange: main.scrollHeight - main.clientHeight,
	}
}

function observeMenuState() {
	const nav = document.querySelector('#nav')
	const header = nav.querySelector('header')
	const content = document.querySelector('#content')
	const footer = content.querySelector(':scope > footer')

	if (!(footer instanceof HTMLElement)) {
		throw new Error('Footer must be a native layout owner')
	}

	const footerParent = footer.offsetParent
	const button = document.querySelector('#menu-toggle')
	const buttonBox = button.getBoundingClientRect()
	const buttonHit = document.elementFromPoint(
		buttonBox.x + buttonBox.width / 2,
		buttonBox.y + buttonBox.height / 2,
	)
	const title = document.querySelector('#top h1').getBoundingClientRect()
	const point = { x: title.x + title.width / 2, y: title.y + title.height / 2 }
	const hit = document.elementFromPoint(point.x, point.y)
	const search = nav.querySelector('input[type="search"]')

	if (search && !(search instanceof HTMLInputElement)) {
		throw new Error('Search must be a native input')
	}

	const searchBox = search?.getBoundingClientRect()
	const searchHit =
		searchBox &&
		document.elementFromPoint(searchBox.x + searchBox.width / 2, searchBox.y + searchBox.height / 2)

	return {
		open: nav.matches(':popover-open'),
		content: {
			transform: getComputedStyle(content).transform,
			translate: getComputedStyle(content).translate,
			box: (({ x, y, top, bottom, left, right, width, height }) => ({
				x,
				y,
				top,
				bottom,
				left,
				right,
				width,
				height,
			}))(content.getBoundingClientRect()),
		},
		footer: {
			top: footer.offsetTop,
			height: footer.offsetHeight,
			parent: footerParent?.id
				? '#' + footerParent.id
				: footerParent === document.body
					? 'document:body'
					: footerParent === document.documentElement
						? 'document:html'
						: null,
		},
		buttonUsable:
			buttonBox.width > 0 && buttonBox.height > 0 && !!buttonHit?.closest('#menu-toggle'),
		titlePoint: point,
		titlePointClear:
			point.x >= 0 &&
			point.x < innerWidth &&
			point.y >= header.getBoundingClientRect().bottom &&
			point.y < innerHeight,
		siteInterceptsTitle: !!hit && nav.contains(hit),
		search: searchBox
			? {
					box: (({ x, y, top, bottom, left, right, width, height }) => ({
						x,
						y,
						top,
						bottom,
						left,
						right,
						width,
						height,
					}))(searchBox),
					focused: search === document.activeElement,
					hit:
						!!searchHit &&
						(searchHit === search ||
							[...(search?.labels ?? [])].some(label => label.contains(searchHit))),
				}
			: null,
		header: {
			background: getComputedStyle(header).backgroundColor,
			backdrop: getComputedStyle(header).backdropFilter,
			shadow: getComputedStyle(header).boxShadow,
		},
		menu: {
			translate: getComputedStyle(document.querySelector('#nav-menu')).translate,
			filter: getComputedStyle(document.querySelector('#nav-menu')).filter,
		},
	}
}

const [contractPath, output, url = 'http://127.0.0.1:4521/ambire/', engine = 'chromium'] =
	process.argv.slice(2)

if (!contractPath || !output) {
	throw new Error(
		'Usage: node --import tsx tests/browser/wallet-page.mjs CONTRACT OUTPUT [URL] [chromium|firefox|webkit]',
	)
}

const contract = await readFile(contractPath, 'utf8')
const procedurePath = new URL('./wallet-page-cases.md', import.meta.url)
const procedureSource = await readFile(procedurePath, 'utf8')
const procedures = parseProcedures(procedureSource)
const requirements = parseRequirements(contract).map(({ id, condition }) => ({
	id,
	condition: condition.replace(/ \[[^\]]+\]\(<[^>]+>\)/g, ''),
}))

if (!requirements.length || new Set(requirements.map(row => row.id)).size !== requirements.length) {
	throw new Error('Contract IDs must be nonempty and unique')
}

if (
	procedures.length !== requirements.length ||
	procedures.some((procedure, index) => procedure.id !== requirements[index].id)
) {
	throw new Error('Acceptance procedures must cover every contract ID exactly once in order')
}

const fixtureName = new URL(url).pathname.match(/^\/__wallet-page\/([^/]+)\/?$/)?.[1]
const fixtureWallet =
	fixtureName && isWalletFixture(fixtureName) ? walletFixtures[fixtureName]() : null
const fixtureLadder = fixtureWallet ? getWalletStageAndLadder(fixtureWallet).ladderEvaluation : null
const nextStageIndex = fixtureLadder?.highestClearedStage
	? fixtureLadder.ladder.stages.findIndex(
			stage => stage.id === fixtureLadder.highestClearedStage.id,
		) + 1
	: 0
const fixture = fixtureWallet
	? {
			name: fixtureName,
			types: Object.keys(fixtureWallet.types),
			expectedGroups: Object.keys(walletFixtureAttributeTree(fixtureName, fixtureWallet)).length,
			expectedStages: fixtureLadder?.ladder.stages.length ?? 0,
			typeStages: Object.keys(fixtureWallet.types).map(type => {
				const { stage, ladderEvaluation } = getWalletStageAndLadder(fixtureWallet, type)

				return {
					type,
					value:
						stage === null || ladderEvaluation === null
							? 'NOT_APPLICABLE'
							: typeof stage === 'string'
								? stage === 'QUALIFIED_FOR_NO_STAGES'
									? 'NO_STAGES'
									: stage
								: stage.id,
				}
			}),
			hasLadder: fixtureLadder !== null,
			nextUnclearedStage: fixtureLadder
				? (fixtureLadder.ladder.stages[nextStageIndex]?.id ?? null)
				: null,
		}
	: null

/** @param {import('@playwright/test').Locator} details */
async function settleDocumentAnimations(details) {
	await details.evaluate(async element => {
		await Promise.allSettled(
			element
				.getAnimations({ subtree: true })
				.filter(
					animation =>
						animation.timeline === document.timeline &&
						Number.isFinite(animation.effect?.getTiming().iterations ?? 0),
				)
				.map(animation => animation.finished),
		)
		await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
	})
}

const requiredWidths = [390, 864, 1024, 1025, 1440]
const sampledWidths = process.env.WALLET_PAGE_WIDTHS?.split(',').map(Number) ?? requiredWidths

if (
	!sampledWidths.length ||
	sampledWidths.some(width => !Number.isInteger(width) || width <= 0) ||
	new Set(sampledWidths).size !== sampledWidths.length
) {
	throw new Error('WALLET_PAGE_WIDTHS must contain distinct positive integer widths')
}

const completeResponsiveCoverage = requiredWidths.every(width => sampledWidths.includes(width))

const javaScriptEnabled = process.env.WALLET_PAGE_NO_SCRIPT !== '1'
const reducedMotion = process.env.WALLET_PAGE_REDUCED_MOTION === '1'

await mkdir(output, { recursive: true })
/** @type {Observation[]} */
const observations = []
/** @type {{width?: number, phase?: string, message: string}[]} */
const errors = []
const warnings = []
const source = await sourceSnapshot()
const revision = source.revision
const collectorHash = createHash('sha256')
	.update(await readFile(new URL(import.meta.url)))
	.digest('hex')
/** @type {import('@playwright/test').Browser | undefined} */
let browser

if (engine !== 'chromium' && engine !== 'firefox' && engine !== 'webkit') {
	throw new Error('Unsupported browser engine: ' + engine)
}

try {
	await verifyServerSource(url, source)
	browser = await { chromium, firefox, webkit }[engine].launch({
		headless: !process.env.HEADED,
	})

	for (const width of sampledWidths) {
		const context = await browser.newContext({
			viewport: { width, height: 900 },
			javaScriptEnabled,
			reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
		})
		const page = await context.newPage()

		page.setDefaultTimeout(15000)

		page.on('pageerror', error =>
			errors.push({ width, message: error instanceof Error ? error.message : String(error) }),
		)
		page.on('console', message => {
			if (message.type() === 'warning') {
				warnings.push({ width, message: message.text() })
			}

			if (message.type() === 'error') {
				errors.push({ width, phase: 'console', message: message.text() })
			}
		})
		const response = await page.goto(url, {
			waitUntil: 'load',
			timeout: 600000,
		})

		if (!response?.ok()) {
			throw new Error(`Page returned HTTP ${response?.status()}`)
		}

		await page.locator('#top h1').waitFor()
		await page.evaluate(() => document.fonts.ready)

		if (javaScriptEnabled) {
			await page.locator('astro-island:has(#top):not([ssr])').waitFor({ state: 'attached' })
		}

		/** @type {InitialCapture} */
		const initial = await page.evaluate(observeInitial)

		if (initial.reducedMotion !== reducedMotion) {
			throw new Error(
				'Native reduced-motion preference differs from requested capture configuration',
			)
		}

		initial.semanticOutline = await page.locator('#top').evaluate(semanticOutline)
		initial.accessibility = await page.locator('#top').ariaSnapshot()
		initial.accessibleH1 = await page.getByRole('heading', { level: 1 }).count()
		const visibleWalletName = initial.headings
			.find(heading => heading.level === 'H1')
			?.text.replace(/\s+/g, ' ')

		initial.repeatedWalletName = visibleWalletName
			? await page
					.getByRole('heading', {
						level: 1,
						name: `${visibleWalletName} ${visibleWalletName}`,
						exact: true,
					})
					.count()
			: null
		initial.namelessControls = []

		/** @type {AccessibleRole[]} */
		const roles = [
			'button',
			'link',
			'combobox',
			'textbox',
			'searchbox',
			'checkbox',
			'radio',
			'slider',
			'spinbutton',
			'switch',
		]

		for (const role of roles) {
			const count = await page.getByRole(role, { name: '', exact: true }).count()

			if (count) {
				initial.namelessControls.push({ role, count })
			}
		}

		initial.tocNames = await page
			.getByRole('navigation', { name: 'Table of contents', exact: true })
			.count()
		initial.tocDefinitionNames = await page
			.getByRole('navigation', { name: 'Table of contents', exact: true, includeHidden: true })
			.count()
		initial.tocTriggerCount = await page.locator('button[popovertarget="wallet-toc"]').count()
		initial.pieOutsidePopover = await page
			.locator('.pie-navigation')
			.evaluate(element => element.closest('[popover]') === null)
		initial.pieLinkCount = await page.locator('.pie-navigation a[href^="#"]').count()
		initial.tocCycle = null

		if (width <= 1024) {
			const panel = page.locator('#wallet-toc')

			await page.getByRole('button', { name: 'Table of contents', exact: true }).click()
			await panel.waitFor({ state: 'visible' })
			const opened = await page
				.getByRole('navigation', { name: 'Table of contents', exact: true })
				.count()
			const nativeOpen = await panel.evaluate(element => element.matches(':popover-open'))

			await page.keyboard.press('Escape')
			await panel.waitFor({ state: 'hidden' })
			initial.tocCycle = {
				opened,
				nativeOpen,
				closed: await page
					.getByRole('navigation', { name: 'Table of contents', exact: true })
					.count(),
			}
		}

		await page.screenshot({ path: path.join(output, `${engine}-${width}-top.png`) })
		const targets = await page
			.locator('#top .attribute-group[id], #stages')
			.evaluateAll(elements => elements.map(element => element.id))
		/** @type {ReturnType<typeof observeTransition>[]} */
		const transitions = []
		/** @type {Observation} */
		const observation = {
			width,
			initial,
			transitions,
			presentation: [await page.locator('#top').evaluate(presentationStyles)],
		}

		observations.push(observation)
		const skipLink = page.locator('.skip-link')
		const originalUrl = page.url()

		if (await skipLink.count()) {
			await skipLink.focus()
			await page.screenshot({ path: path.join(output, `${engine}-${width}-skip-link.png`) })
			observation.skipLink = await skipLink.evaluate(element => ({
				href: element.getAttribute('href'),
				targetExists: !!document.getElementById('content'),
				focused: element === document.activeElement,
				box: (({ x, y, top, bottom, left, right, width, height }) => ({
					x,
					y,
					top,
					bottom,
					left,
					right,
					width,
					height,
				}))(element.getBoundingClientRect()),
			}))
			await page.keyboard.press('Enter')
			await page.screenshot({ path: path.join(output, `${engine}-${width}-skip-landing.png`) })
			observation.skipLink.landing = await page.evaluate(() => ({
				hash: location.hash,
				focused: document.activeElement?.id,
			}))
			await page.evaluate(original => {
				history.replaceState(null, '', original)
				document.querySelector('#layout').scrollTo({ top: 0, behavior: 'instant' })
			}, originalUrl)
		} else {
			observation.skipLink = null
		}

		const walletIcon = page.locator('#top > header img.wallet-icon')
		const originalIcon = await walletIcon.getAttribute('src')

		await walletIcon.evaluate(async image => {
			if (!(image instanceof HTMLImageElement)) {
				throw new Error('Wallet icon must be an image')
			}

			image.src =
				'data:image/svg+xml,' +
				encodeURIComponent(
					'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="teal"/></svg>',
				)
			await image.decode()
		})
		observation.walletAspect = await walletIcon.evaluate(image => {
			if (!(image instanceof HTMLImageElement)) {
				throw new Error('Wallet icon must be an image')
			}

			return {
				intrinsic: image.naturalWidth / image.naturalHeight,
				rendered: image.getBoundingClientRect().width / image.getBoundingClientRect().height,
			}
		})
		await page.screenshot({ path: path.join(output, `${engine}-${width}-wide-wallet-icon.png`) })
		await walletIcon.evaluate(async (image, source) => {
			if (!(image instanceof HTMLImageElement) || source === null) {
				throw new Error('Wallet icon requires its original image source')
			}

			image.src = source
			await image.decode()
		}, originalIcon)

		observation.headingGlyphTargets = []

		for (const [name, selector] of [
			['group', '.attribute-group > header [data-sticky-breadcrumb~="source"] > a > [data-icon]'],
			['attribute', '.attribute-group .attribute h3 > a > [data-icon]'],
		]) {
			const glyph = page.locator('#top ' + selector).first()

			if (!(await glyph.count())) {
				continue
			}

			await glyph.scrollIntoViewIfNeeded()
			const bounds = await glyph.boundingBox()

			if (!bounds) {
				continue
			}

			const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }

			await page.mouse.move(point.x, point.y)
			await page.screenshot({
				path: path.join(output, `${engine}-${width}-${name}-target.png`),
			})
			observation.headingGlyphTargets.push(
				await glyph.evaluate((element, point) => {
					const bounds = element.getBoundingClientRect()
					const hit = document.elementFromPoint(point.x, point.y)

					return {
						icon: element.getAttribute('data-icon'),
						point,
						box: (({ x, y, top, bottom, left, right, width, height }) => ({
							x,
							y,
							top,
							bottom,
							left,
							right,
							width,
							height,
						}))(bounds),
						pointInGlyph:
							point.x >= Math.max(0, bounds.left) &&
							point.x < Math.min(innerWidth, bounds.right) &&
							point.y >= Math.max(0, bounds.top) &&
							point.y < Math.min(innerHeight, bounds.bottom),
						expected: element.closest('a')?.getAttribute('href'),
						actual: hit?.closest('a')?.getAttribute('href') ?? null,
						hit: hit?.tagName ?? null,
						hitGlyph: !!hit && element.contains(hit),
					}
				}, point),
			)
		}

		await page
			.locator('#layout')
			.evaluate(element => element.scrollTo({ top: 0, behavior: 'instant' }))
		const scrollRoot = page.locator('#layout')
		const title = await page.locator('#top h1').boundingBox()

		if (!title) {
			throw new Error('The wallet heading has no pointer target')
		}

		const point = { x: title.x + title.width / 2, y: title.y + title.height / 2 }

		await page.mouse.move(point.x, point.y)
		const headerScroll = await page.evaluate(({ x, y }) => {
			const element = document.querySelector('#layout')

			return {
				before: element.scrollTop,
				available: element.scrollHeight - element.clientHeight - element.scrollTop,
				pointerInHeader: !!document.elementFromPoint(x, y)?.closest('#top > header'),
			}
		}, point)

		await page.mouse.wheel(0, 500)
		await page.screenshot({ path: path.join(output, `${engine}-${width}-header-scroll.png`) })
		observation.headerScroll = {
			...headerScroll,
			after: await scrollRoot.evaluate(element => element.scrollTop),
		}
		await scrollRoot.evaluate(element => element.scrollTo({ top: 0, behavior: 'instant' }))

		for (const id of targets) {
			await page
				.locator(`[id="${id}"]`)
				.first()
				.evaluate(element => {
					element.scrollIntoView({ block: 'start', behavior: 'instant' })
				})
			await page.mouse.wheel(0, 150)
			await page.screenshot({ path: path.join(output, `${engine}-${width}-${id}.png`) })
			transitions.push(await page.evaluate(observeTransition, id))
			observation.presentation.push(await page.locator('#top').evaluate(presentationStyles))
		}
		const details = page.locator('#top .attribute-group .attribute > details').first()

		if (await details.count()) {
			const summary = details.locator(':scope > summary')

			await summary.focus()
			await page.keyboard.press('Space')
			await settleDocumentAnimations(details)
			const disclosure = await details.evaluate(element => ({
				open: element instanceof HTMLDetailsElement ? element.open : false,
				descendants: [...element.querySelectorAll('h1,h2,h3,h4,[data-icon]')]
					.filter(item => !element.querySelector(':scope > summary')?.contains(item))
					.map(item => ({ tag: item.tagName, boxes: item.getClientRects().length })),
			}))

			await page.keyboard.press('Space')
			await settleDocumentAnimations(details)
			observation.disclosure = disclosure
		} else {
			observation.disclosure = null
		}

		observation.footerFlow = await page.evaluate(observeFooterFlow)

		if (width <= 1024 && (await page.locator('#menu-toggle').isVisible())) {
			await scrollRoot.evaluate(element => element.scrollTo({ top: 0, behavior: 'instant' }))
			const menuState = observeMenuState

			await settleDocumentAnimations(page.locator('#layout'))
			await page.screenshot({
				path: path.join(output, `${engine}-${width}-menu-closed.png`),
			})
			/** @type {MenuCapture} */
			const menu = { before: await page.evaluate(menuState) }

			observation.menu = menu
			await page.locator('#menu-toggle').click()
			await settleDocumentAnimations(page.locator('#layout'))
			await page.screenshot({
				path: path.join(output, `${engine}-${width}-menu-open.png`),
			})
			menu.open = await page.evaluate(menuState)
			const search = page.locator('#nav input[type="search"]')

			if (await search.count()) {
				await search.scrollIntoViewIfNeeded()
				await search.focus()
				await page.screenshot({
					path: path.join(output, `${engine}-${width}-menu-search.png`),
				})
				menu.search = await page.evaluate(menuState)
			}

			await page.setViewportSize({ width: 1440, height: 900 })
			await settleDocumentAnimations(page.locator('#layout'))
			await page.screenshot({
				path: path.join(output, `${engine}-${width}-menu-wide.png`),
			})
			menu.wide = await page.evaluate(menuState)

			if (menu.wide.open && menu.wide.buttonUsable) {
				await page.locator('#menu-toggle').click()
			} else {
				await page.keyboard.press('Escape')
			}

			menu.closedWide = await page
				.locator('#nav')
				.evaluate(element => !element.matches(':popover-open'))
			await page.setViewportSize({ width, height: 900 })
			await scrollRoot.evaluate(element => element.scrollTo({ top: 0, behavior: 'instant' }))
			await settleDocumentAnimations(page.locator('#layout'))
			await page.screenshot({
				path: path.join(output, `${engine}-${width}-menu-return.png`),
			})
			menu.after = await page.evaluate(menuState)
		}

		observation.complete = true
		await context.close()
	}
} catch (error) {
	errors.push({ phase: 'capture', message: error instanceof Error ? error.message : String(error) })
} finally {
	await browser?.close()
}

if (
	JSON.stringify(source) !== JSON.stringify(await sourceSnapshot()) ||
	collectorHash !==
		createHash('sha256')
			.update(await readFile(new URL(import.meta.url)))
			.digest('hex') ||
	contract !== (await readFile(contractPath, 'utf8')) ||
	procedureSource !== (await readFile(procedurePath, 'utf8'))
) {
	errors.push({
		phase: 'inputs',
		message: 'Source or contract changed during capture; acceptance evidence is invalidated.',
	})
}

/** @param {(observation: CompleteObservation) => unknown} test */
const all = test =>
	observations.length === sampledWidths.length && observations.every(o => isComplete(o) && test(o))
/** @type {Record<string, [boolean, string, boolean?] | null>} */
const checks = {
	PetalLabels: observations.some(o => o.initial.petalLabels.length)
		? [
				all(
					o =>
						o.initial.petalLabels.length > 0 &&
						o.initial.petalLabels.every(
							petal =>
								wbIconEmojiSequences[petal.icon] &&
								petal.title === `${wbIconEmojiSequences[petal.icon]} ${petal.label}`,
						),
				),
				'Every native petal title contains the exact canonical semantic emoji sequence and human label, including multi-codepoint mappings; internal icon IDs are not exposed as title text.',
			]
		: null,
	RegionNames:
		fixture?.expectedGroups === 0
			? null
			: [
					all(
						o =>
							o.initial.groupRegions.length > 0 &&
							(!fixture || o.initial.groupRegions.length === fixture.expectedGroups) &&
							o.initial.groupRegions.every(
								group => group.title && group.name === `${group.title} attributes`,
							),
					),
					'Every actual group has its contextual native accessible region name; native fixture counts prevent missing-group vacuity.',
				],
	Typography: [
		all(o =>
			o.presentation.every(
				state =>
					state.headings.length > 0 &&
					state.navigation.length > 0 &&
					state.prose.length > 0 &&
					[...state.headings, ...state.badges, ...state.navigation].every(role =>
						/Space Grotesk/.test(role.family),
					) &&
					state.prose.every(role => /Avenir/.test(role.family)),
			),
		),
		'Native computed families are checked for every heading, badge, navigation link and ordinary paragraph at flow and every captured group/stage transition; code/pre descendants retain their independent monospace role.',
	],
	UnmaskedSurfaces: [
		all(o =>
			o.presentation.every(
				state =>
					state.surfaces.length > 0 && state.surfaces.every(surface => surface.mask === 'none'),
			),
		),
		'Every actual before/after/self sticky backdrop slot and breadcrumb row backdrop has computed mask-image:none at flow and all captured group/stage transitions. Disclosure-chevron masks are independent icon slots.',
	],
	FooterStability: observations.some(o => o.menu)
		? [
				all(
					o =>
						!o.menu ||
						(!!o.menu.before.footer.parent &&
							o.menu.before.footer.parent === o.menu.open.footer.parent &&
							Math.abs(o.menu.before.footer.top - o.menu.open.footer.top) <= 1 &&
							Math.abs(o.menu.before.footer.height - o.menu.open.footer.height) <= 1),
				),
				'Native footer flow offsets are compared under one identified offset parent before/after menu opening. Native finite document-timeline transitions settle without altering scroll-driven animations; transformed paint and other scroll positions remain unverified.',
				false,
			]
		: null,
	MenuResize: observations.some(o => o.menu)
		? [
				all(o => !o.menu || !o.menu.wide.open || (o.menu.wide.buttonUsable && o.menu.closedWide)),
				'The open native menu crosses from mobile to 1440px; its real menu control is hit-tested and used to close it. Other widths and transition frames remain unverified.',
				false,
			]
		: null,
	ClosedMenu: observations.some(o => o.menu?.after?.titlePointClear)
		? [
				all(
					o =>
						!o.menu ||
						!o.menu.after.titlePointClear ||
						(!o.menu.after.open && !o.menu.after.siteInterceptsTitle),
				),
				'After native menu closure and returning to mobile, a wallet-title point below the site header is checked for interception by site navigation. Other page targets and closing frames remain unverified.',
				false,
			]
		: null,
	MenuSearch: observations.some(o => o.menu)
		? [
				all(o => !o.menu || (o.menu.search?.search?.focused && o.menu.search.search.hit)),
				'The open native menu search is scrolled into view and focused; its center must hit the search control or an associated native label. Bottom-of-flow placement and continued reachability while scrolling remain unverified.',
				false,
			]
		: null,
	Outline: [
		all(o => {
			const outline = o.initial.outline
			/** @param {string[]} headings @param {string} level */
			const one = (headings, level) => headings.length === 1 && headings[0] === level

			return (
				(!fixture ||
					(outline.groups.length === fixture.expectedGroups &&
						outline.stages.length === fixture.expectedStages)) &&
				outline.groups.every(headings => one(headings, 'H2')) &&
				outline.stages.every(headings => one(headings, 'H3')) &&
				(!o.initial.stagePresent || one(outline.stageProgress, 'H2')) &&
				outline.attributes.every(headings => one(headings, 'H3')) &&
				o.initial.semanticOutline.every(heading => heading.level === heading.expected) &&
				outline.criteriaGroups.every(level => level === 'H4') &&
				(outline.news.length === 0 || (one(outline.news, 'H2') && outline.newsItems.length > 0)) &&
				outline.newsItems.every(headings => one(headings, 'H3')) &&
				o.initial.sourceOutline.every(
					heading =>
						heading.parentLevel &&
						Number(heading.level?.slice(1)) === Number(heading.parentLevel.slice(1)) + 1,
				)
			)
		}),
		'Native semantic owners are checked for H2 group/progress/news, H3 stage/attribute/news-item, H4 nested details/criteria-group and Sources one level below their actual parent; fixture group/stage counts prevent missing-owner vacuity.',
	],
	TypeBadges:
		fixture && fixture.types.length > 1
			? [
					all(
						o =>
							o.initial.typeBadges.length === fixture.typeStages.length &&
							fixture.typeStages.every(expected =>
								o.initial.typeBadges.some(
									actual =>
										actual.type === String(expected.type) &&
										actual.value === String(expected.value),
								),
							),
					),
					'Every assigned type has its own labelled badge, compared against that type’s native applicable ladder evaluation rather than the primary wallet ladder.',
				]
			: null,
	IconInteraction: observations.some(o => o.headingGlyphTargets?.length)
		? [
				all(o =>
					o.headingGlyphTargets
						.filter(target => target.pointInGlyph)
						.every(target => target.expected && target.actual === target.expected),
				),
				'Native hit targets at sampled H2/H3 glyph centers must resolve to the real heading link while the point remains inside its viewport-intersecting box and the hit is the glyph or its descendant. Ancestor/occluding hits, other glyphs, focus feedback and animation phases remain unverified.',
				false,
			]
		: null,
	LadderPresence: fixture
		? [
				all(o => o.initial.stagePresent === fixture.hasLadder),
				'The real rendered Stage Progress section is compared with the fixture’s applicable native ladder evaluation, including unknown criteria.',
			]
		: null,
	StageDefault: fixture?.nextUnclearedStage
		? [
				all(o =>
					o.initial.stageDetails.some(
						stage => stage.id === fixture.nextUnclearedStage && stage.open,
					),
				),
				'The first stage after the native highest cleared stage is initially open, including when no stage has cleared because criteria are unknown. A wholly cleared ladder has no next-stage obligation.',
			]
		: null,
	Skiplink: [
		all(
			o =>
				o.skipLink?.href === '#content' &&
				o.skipLink.targetExists &&
				o.skipLink.focused &&
				o.skipLink.landing.hash === '#content' &&
				o.skipLink.landing.focused === 'content',
		),
		'The identified skip link is focused and activated with Enter against its real content destination. Tab reachability, visual top-center placement, icon and gap remain unverified.',
		false,
	],
	TOCTrigger: [
		all(
			o =>
				o.initial.tocTriggerCount === 1 &&
				o.initial.pieOutsidePopover &&
				o.initial.pieLinkCount > 0 &&
				(o.width > 1024 || o.initial.tocCycle?.nativeOpen),
		),
		'A distinct named native button opens the actual TOC popover on each mobile width; individual pie links remain outside that popover and outside its toggle.',
	],
	Frame: [
		all(
			o =>
				o.initial.frame.mainCount === 1 &&
				o.initial.frame.distinctAreas &&
				o.initial.frame.main?.width > 0 &&
				o.initial.frame.navigation?.width > 0,
		),
		'One real main and site navigation have non-nested DOM ownership and positive widths. Visible separation, including the mobile clipped footprint, remains unverified.',
		false,
	],
	HorizontalOverflow: [
		all(o => o.initial.frame.overflow.every(area => area.scrollWidth <= area.clientWidth + 1)),
		'Root document, layout and content widths are checked for unintended horizontal overflow at natural flow. Local wide-content scrolling and other phases remain unverified.',
		false,
	],
	Footer: [
		all(
			o =>
				o.initial.frame.footer &&
				o.initial.frame.footer.left >= o.initial.frame.content.left - 1 &&
				o.initial.frame.footer.right <= o.initial.frame.content.right + 1 &&
				o.footerFlow.stable &&
				Math.abs(
					o.footerFlow.start.footer.y -
						o.footerFlow.end.footer.y -
						o.footerFlow.end.root +
						o.footerFlow.start.root,
				) <= 1 &&
				Math.abs(
					o.footerFlow.returned.footer.y -
						o.footerFlow.end.footer.y -
						o.footerFlow.end.root +
						o.footerFlow.returned.root,
				) <= 1,
		),
		'The real footer stays in its content column. When native flow geometry remains stable, its block movement must match root-scroll displacement through end and return. Intervening frames and other interaction states remain unverified.',
		false,
	],
	HeaderAncestry: [
		all(o => o.initial.h1InHeader && o.initial.headerFirst),
		'The unique real H1 belongs to the original first wallet-header element at every responsive width.',
	],
	ControlNames: [
		all(o => o.initial.namelessControls.length === 0),
		'Native accessible controls are checked for empty names. A nonempty name alone cannot establish meaningful naming.',
		false,
	],
	DecorativeNames: observations.some(o => o.initial.repeatedWalletName !== null)
		? [
				all(o => o.initial.repeatedWalletName === null || o.initial.repeatedWalletName === 0),
				'The native H1 accessible name is checked for an exact repetition of its visible wallet name. Other decorative glyphs and modes remain unverified.',
				false,
			]
		: null,
	MobileChrome: [
		all(
			o =>
				o.width > 1024 ||
				o.initial.direction !== 'ltr' ||
				(o.initial.chrome.theme &&
					o.initial.chrome.theme.x + o.initial.chrome.theme.width / 2 < o.width / 2),
		),
		'In LTR mobile flow, the theme control belongs left of center. Its placement alone cannot establish the complete logo/menu/theme/TOC arrangement.',
		false,
	],
	WalletAspect: [
		all(o => Math.abs(o.walletAspect.intrinsic - o.walletAspect.rendered) < 0.01),
		'A decoded 2:1 SVG is rendered in the real wallet image element at natural flow. Flow correctness alone cannot establish compact-state aspect preservation.',
		false,
	],
	HeaderScrolling: all(o => o.headerScroll.available > 0 && o.headerScroll.pointerInHeader)
		? [
				all(o => o.headerScroll.after > o.headerScroll.before),
				'Downward native wheel input over H1 has available root scroll range and verified pointer ownership. Upward input and other header regions remain unverified.',
				false,
			]
		: null,
	StickyOrder: [
		all(o =>
			o.transitions
				.filter(t => t.walletScope.bottom > o.initial.viewportHeight)
				.every(t => t.walletHeading.bottom > 0 && t.walletHeading.top < o.initial.viewportHeight),
		),
		'The real H1 must remain visible while more than a viewport of its scope remains below it. Footer departure is excluded. Visibility alone cannot establish full H1–H4 stacking and wrapping.',
		false,
	],
	SourceOrder: observations.some(o => o.initial.stagePresent)
		? [
				all(
					o =>
						o.initial.asideCount === 1 &&
						o.initial.articleCount === 1 &&
						(!o.initial.stagePresent || o.initial.sourceOrder),
				),
				'One logical aside and content article exist at every width; the aside precedes each present native Stage Progress section without a duplicate responsive tree.',
			]
		: null,
	Landmarks: [
		all(
			o =>
				o.initial.tocDefinitionNames === 1 &&
				(o.width > 1024
					? o.initial.tocNames === 1
					: o.initial.tocNames === 0 &&
						o.initial.tocCycle?.opened === 1 &&
						o.initial.tocCycle?.closed === 0 &&
						o.initial.tocCycle?.nativeOpen),
		),
		'The actual native TOC navigation has one contextual name, is present in the desktop accessibility tree, and enters/leaves the mobile accessibility tree through native opening and Escape closure.',
	],
	Platforms: [
		all(o => o.initial.platformCards === 0),
		'Visible separate cards with the Platforms caption are counted as counterexamples. Absence by caption alone still requires visual review for alternate wording.',
		false,
	],
	StageAccordion: observations.some(o => o.initial.stageDetails.length)
		? [
				all(o =>
					o.initial.stageDetails.every(
						stage => stage.name && stage.name === o.initial.stageDetails[0].name,
					),
				),
				'Observed stage disclosures share one nonempty native accordion name. Stage/criterion hierarchy still needs its own observation.',
				false,
			]
		: null,
	Proximity: [
		all(o => /^(block|y)( proximity)?$/.test(o.initial.snapType)),
		'Actual root scroll-snap-type is block-axis proximity.',
	],
	TopTarget: [
		all(
			o =>
				o.initial.pageTopLinks.length > 0 && o.initial.pageTopLinks.every(href => href === '#top'),
		),
		'All observed page-top links use #top; independent control identification and activation remain unverified.',
		false,
	],
	ClosedDescendants: observations.some(o => o.disclosure)
		? [
				all(
					o =>
						!o.disclosure ||
						(!o.disclosure.open && o.disclosure.descendants.every(item => item.boxes === 0)),
				),
				'Native summary keyboard closure removes descendant heading and glyph boxes. Animation, collision reservation and current-state exclusions still require their own observations.',
				false,
			]
		: null,
	Singleton: [
		all(o => o.initial.h1 === 1 && o.initial.accessibleH1 === 1),
		'Exactly one document-wide native and accessible level-one heading at every sampled width.',
	],
	Destinations: [
		all(o => {
			const { sections, pie, toc } = o.initial.navDestinations
			const ids = sections.map(section => section.id).sort()
			const first = observations[0].initial.navDestinations.sections
				.map(section => section.id)
				.sort()

			return (
				!o.initial.duplicateIds.length &&
				o.initial.links.every(link => link.destination) &&
				sections.every(section => section.permalinks === 1) &&
				JSON.stringify(ids) === JSON.stringify(pie) &&
				JSON.stringify(ids) === JSON.stringify(toc) &&
				JSON.stringify(ids) === JSON.stringify(first)
			)
		}),
		'The complete real group/attribute navigation tree has one heading permalink and one shared unique target per owner; pie and TOC enumerate exactly that same tree, and its IDs remain identical across every responsive width. Other local fragments must also resolve.',
	],
	AttributeDefaults: observations.some(o => o.initial.details.length)
		? [all(o => o.initial.details.every(Boolean)), 'All observed attribute details initially open.']
		: null,
}
const results = requirements.map((row, index) => {
	const check =
		observations.length === sampledWidths.length &&
		!errors.some(error => error.phase === 'capture' || error.phase === 'inputs')
			? checks[row.id.split(' ').at(-1) ?? '']
			: null

	return {
		...row,
		procedure: procedures[index].procedure,
		status: check
			? check[0]
				? check[2] === false
					? 'unverified'
					: 'pass'
				: 'fail'
			: 'unverified',
		evidence:
			check?.[1] ??
			(errors.length
				? 'Capture incomplete: ' +
					errors
						.map(error => error.message)
						.join('; ')
						.replaceAll('\n', ' ')
				: 'Section screenshots and geometry were captured; a dedicated oracle or visual review is still required for this condition. No pass is inferred.'),
	}
})
const report = {
	source,
	sampledWidths,
	completeResponsiveCoverage,
	fixture,
	javaScriptEnabled,
	reducedMotion,
	procedureHash: createHash('sha256').update(procedureSource).digest('hex'),
	serverProfile: process.env.WALLET_PAGE_SERVER_PROFILE ?? 'project-default',
	collectorHash,
	contract: path.resolve(contractPath),
	contractHash: createHash('sha256').update(contract).digest('hex'),
	revision,
	build: source.build,
	diffHash: source.diffHash,
	untrackedHash: source.untrackedHash,
	engine,
	url,
	capturedAt: new Date().toISOString(),
	errors,
	warnings,
	observations,
	results,
}

await writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n')
await writeFile(
	path.join(output, 'RESULTS.md'),
	`# WalletPage verification\n\nEngine: ${engine}. Server profile: ${report.serverProfile}. Contract SHA-256: ${report.contractHash}. Revision: ${report.revision}.\n\nThese results cover ${url} at widths ${sampledWidths.join(', ')} only. Complete responsive coverage: ${completeResponsiveCoverage}. Unverified rows are coverage gaps, not product passes or failures.\n\n| Requirement | Result | Evidence / remaining check | Procedure |\n| --- | --- | --- | --- |\n${results.map(row => `| ${row.id} | ${row.status} | ${row.evidence} | ${row.procedure} |`).join('\n')}\n`,
)
process.stdout.write(
	JSON.stringify({
		requirements: results.length,
		counts: Object.fromEntries(
			['pass', 'fail', 'unverified'].map(status => [
				status,
				results.filter(row => row.status === status).length,
			]),
		),
		errors: errors.length,
		warnings: warnings.length,
		output: path.resolve(output),
	}) + '\n',
)

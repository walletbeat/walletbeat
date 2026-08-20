import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { allRatedWalletsBySlug } from '../../data/wallets.ts'

const playwrightCorePath =
	process.env.PLAYWRIGHT_CORE_PATH ??
	path.join(
		execFileSync('brew', ['--prefix', 'playwright-cli'], { encoding: 'utf8' }).trim(),
		'libexec/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs',
	)
const { chromium } = await import(pathToFileURL(playwrightCorePath).href)

const origin = process.env.WALLETBEAT_ORIGIN ?? 'http://localhost:4321'
const viewportSizes = [
	{ width: 390, height: 844 },
	{ width: 1025, height: 900 },
]
const failures = []
let assertions = 0

const check = (condition, slug, viewport, invariant, details) => {
	assertions += 1
	if (!condition) {
		failures.push({ slug, viewport, invariant, details })
	}
}

const browser = await chromium.launch({ headless: true })

for (const slug of Object.keys(allRatedWalletsBySlug).sort()) {
	for (const viewport of viewportSizes) {
		const page = await browser.newPage({ viewport })
		const response = await page.goto(`${origin}/${slug}`, {
			waitUntil: 'load',
			timeout: 120_000,
		})
		await page.waitForSelector('#wallet-page')
		await page.evaluate(() => document.fonts.ready)

		const structure = await page.evaluate(() => {
			const headings = [...document.querySelectorAll('#wallet-page :is(h1, h2, h3, h4)')]
			const ids = [...document.querySelectorAll('#wallet-page [id]')].map(element => element.id)
			const targetHashes = [
				...document.querySelectorAll('.page-navigation .navigation-items a[href^="#"]'),
			].map(link => link.getAttribute('href'))

			return {
				h1Count: headings.filter(heading => heading.tagName === 'H1').length,
				h2: headings
					.filter(heading => heading.tagName === 'H2')
					.map(heading => heading.textContent?.trim()),
				headingLevels: headings.map(heading => Number(heading.tagName.slice(1))),
				idCount: ids.length,
				uniqueIdCount: new Set(ids).size,
				missingTargets: [...new Set(targetHashes)].filter(
					href => !document.querySelector(`#${CSS.escape(href.slice(1))}`),
				),
				groupCount: document.querySelectorAll('.attribute-group[id]').length,
				attributeCount: document.querySelectorAll('.attribute[id]').length,
				documentOverflow:
					document.documentElement.scrollWidth - document.documentElement.clientWidth,
				layoutOverflow: (() => {
					const layout = document.querySelector('#layout')
					return layout ? layout.scrollWidth - layout.clientWidth : null
				})(),
				shapeLayers: document.querySelectorAll('.breadcrumb-slice-shape-layer').length,
				emojiIcons: document.querySelectorAll(
					':is(.toc-icon, .attribute-group-icon, .attribute-icon, .pie-navigation-icon)[data-icon~="emoji"]',
				).length,
			}
		})

		const size = `${viewport.width}x${viewport.height}`
		check(response?.ok(), slug, size, 'page responds successfully', response?.status())
		check(structure.h1Count === 1, slug, size, 'exactly one h1', structure.h1Count)
		check(
			structure.h2[0] === 'Stage Progress',
			slug,
			size,
			'Stage Progress is first h2',
			structure.h2,
		)
		check(
			structure.headingLevels.every(
				(level, index, levels) => index === 0 || level <= levels[index - 1] + 1,
			),
			slug,
			size,
			'heading order skips no levels',
			structure.headingLevels,
		)
		check(structure.idCount === structure.uniqueIdCount, slug, size, 'IDs are unique', structure)
		check(
			structure.missingTargets.length === 0,
			slug,
			size,
			'navigation hashes resolve',
			structure.missingTargets,
		)
		check(structure.groupCount > 0, slug, size, 'attribute groups render', structure.groupCount)
		check(structure.attributeCount > 0, slug, size, 'attributes render', structure.attributeCount)
		check(structure.documentOverflow <= 0.75, slug, size, 'document is contained', structure)
		check(structure.layoutOverflow <= 0.75, slug, size, 'layout is contained', structure)
		check(structure.shapeLayers === 0, slug, size, 'content icons have no shape layers', structure)
		check(
			structure.emojiIcons === 0,
			slug,
			size,
			'navigation icons are monochrome glyphs',
			structure,
		)

		await page.close()
	}
}

await browser.close()

console.log(
	JSON.stringify(
		{ wallets: Object.keys(allRatedWalletsBySlug).length, viewportSizes, assertions, failures },
		null,
		2,
	),
)

if (failures.length > 0) {
	process.exitCode = 1
}

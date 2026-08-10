import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
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
const outputDir = path.resolve(process.argv[2] ?? 'screenshots/wallet-page-matrix')
const widths = process.env.WALLETBEAT_MATRIX_WIDTHS?.split(',').map(Number) ?? [
	390, 864, 865, 1024, 1025, 1280, 1281, 1440,
]
const height = Number(process.env.WALLETBEAT_MATRIX_HEIGHT ?? 900)
const states = [
	{ id: 'top', target: '#top' },
	{ id: 'group', target: '#security' },
	{ id: 'attribute', target: '#scam-prevention' },
	{ id: 'h4-sticky', target: '.attribute-accordions details', offset: 180 },
	{ id: 'bottom' },
]
const availableEngines = { chromium, firefox, webkit }
const engineNames =
	process.env.WALLETBEAT_MATRIX_ENGINES?.split(',') ?? Object.keys(availableEngines)
const screenshotCount = engineNames.length * widths.length * states.length
const screenshots = []

await fs.mkdir(outputDir, { recursive: true })

for (const engineName of engineNames) {
	const engine = availableEngines[engineName]

	if (!engine) {
		throw new Error(`Unknown browser engine: ${engineName}`)
	}

	const browser = await engine.launch({ headless: true })

	for (const width of widths) {
		const page = await browser.newPage({
			viewport: { width, height },
			reducedMotion: 'no-preference',
		})

		await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 })
		await page.waitForSelector('#top', { state: 'attached', timeout: 60_000 })

		for (const state of states) {
			await page.evaluate(async ({ target, offset = 0 }) => {
				const scrollContainer = document.querySelector('#layout')

				if (!(scrollContainer instanceof HTMLElement)) {
					throw new Error('Missing #layout scroll container')
				}

				scrollContainer.style.scrollBehavior = 'auto'
				scrollContainer.style.scrollSnapType = 'none'

				if (!target) {
					scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'instant' })
					return
				}

				const element = document.querySelector(target)

				if (!(element instanceof HTMLElement)) {
					throw new Error(`Missing screenshot target ${target}`)
				}

				element.scrollIntoView({ block: 'start', behavior: 'instant' })
				await new Promise(requestAnimationFrame)
				scrollContainer.scrollTop += offset
			}, state)
			await page.waitForTimeout(900)

			const filename = `${engineName}__${width}x${height}__${state.id}.png`

			await page.screenshot({ path: path.join(outputDir, filename) })
			screenshots.push({ engineName, width, state: state.id, filename })
			process.stdout.write(`${screenshots.length}/${screenshotCount} ${filename}\n`)
		}

		await page.close()
	}

	await browser.close()
}

const rows = widths
	.flatMap(width =>
		states.map(state => {
			const cells = engineNames
				.map(engineName => {
					const screenshot = screenshots.find(
						item =>
							item.engineName === engineName && item.width === width && item.state === state.id,
					)

					return `<td><a href="${screenshot.filename}"><img src="${screenshot.filename}" loading="lazy" alt="${engineName} at ${width}px, ${state.id}"></a></td>`
				})
				.join('')

			return `<tr><th>${width}px<br>${state.id}</th>${cells}</tr>`
		}),
	)
	.join('\n')
const engineHeadings = engineNames
	.map(engineName => `<th>${engineName[0].toUpperCase()}${engineName.slice(1)}</th>`)
	.join('')

await fs.writeFile(
	path.join(outputDir, 'matrix.html'),
	`<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Walletbeat screenshot matrix</title>
<style>
	body { margin: 0; padding: 1rem; color: #eee; background: #16121d; font: 14px system-ui; }
	table { border-collapse: collapse; inline-size: 100%; }
	th, td { padding: .35rem; border: 1px solid #544c62; vertical-align: top; }
	th { position: sticky; inset-block-start: 0; z-index: 1; background: #251e30; }
	td img { display: block; inline-size: 100%; block-size: auto; }
</style>
<h1>Walletbeat screenshot matrix</h1>
<p>${engineNames.join(' · ')}. Viewport height: ${height}px.</p>
<table>
<thead><tr><th>Viewport / state</th>${engineHeadings}</tr></thead>
<tbody>${rows}</tbody>
</table>
</html>`,
)

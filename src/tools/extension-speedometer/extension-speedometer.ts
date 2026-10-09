/**
 * Runs the Speedometer browser benchmark in headless Chromium, once with no
 * extension and once per wallet with only that wallet's browser extension
 * installed, and prints how much each extension lowers the score.
 *
 * Usage: pnpm benchmark:extensions --browser <path> [--id <wallet>[,<wallet>...]] [--runs <n>]
 * Run with --help for all options.
 */
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { parseArgs } from 'node:util'

import { allWallets, assertValidWalletName, type WalletName } from '@/data/wallets'
import { getExtensionId } from '@/schema/extension-url'

import { fetchBrowserExtensionZip } from '../manifest-collector/crx-downloader'
import { extractZip } from '../manifest-collector/zip-reader'
import { HeadlessBrowser } from './headless-browser'

const DEFAULT_SPEEDOMETER_URL = 'https://browserbench.org/Speedometer3.1/'

const usage = `
Usage: pnpm benchmark:extensions --browser <path> [options]

  --browser <path>        Chromium or Chrome for Testing executable. Branded
                          Google Chrome ignores --load-extension.
  --id <ids>              Comma-separated wallet IDs. Default: every wallet
                          with a Chrome Web Store extension URL.
  --runs <n>              Benchmark runs per configuration. Default: 3.
  --iterations <n>        Speedometer iterations per run. Default: 5.
  --settle-seconds <n>    Wait after launch so extensions finish starting
                          up before the benchmark. Default: 5.
  --speedometer-url <url> Default: ${DEFAULT_SPEEDOMETER_URL}

Configurations run round-robin (baseline, wallet A, wallet B, ..., baseline,
...), each in a fresh profile, so drift in machine load spreads evenly.
Scores are only comparable within one invocation on one machine.
`

const { values: args } = parseArgs({
	options: {
		browser: { type: 'string' },
		help: { type: 'boolean' },
		id: { type: 'string' },
		iterations: { type: 'string', default: '5' },
		runs: { type: 'string', default: '3' },
		'settle-seconds': { type: 'string', default: '5' },
		'speedometer-url': { type: 'string', default: DEFAULT_SPEEDOMETER_URL },
	},
})

if (args.help === true || args.browser === undefined) {
	process.stderr.write(usage)
	process.exit(args.help === true ? 0 : 1)
}

const browserPath = args.browser
const runs = Number(args.runs)
const iterations = Number(args.iterations)
const settleMs = Number(args['settle-seconds']) * 1000

interface Configuration {
	name: string
	extensionDir?: string
	scores: number[]
}

function walletsToBenchmark(): Array<{ id: WalletName; extensionId: string }> {
	const ids =
		args.id !== undefined
			? args.id.split(',').map(id => assertValidWalletName(id.trim()))
			: Object.keys(allWallets).map(id => assertValidWalletName(id))

	return ids.flatMap(id => {
		const extensionUrl = allWallets[id].metadata.urls?.extensions?.[0]

		if (extensionUrl === undefined) {
			if (args.id !== undefined) {
				throw new Error(`${id} has no browser extension URL`)
			}

			return []
		}

		return [{ id, extensionId: getExtensionId(extensionUrl) }]
	})
}

async function runSpeedometer(configuration: Configuration): Promise<void> {
	const browser = await HeadlessBrowser.launch(browserPath, configuration.extensionDir)

	try {
		await new Promise(resolve => setTimeout(resolve, settleMs))

		const url = new URL(args['speedometer-url'])

		url.searchParams.set('startAutomatically', 'true')
		url.searchParams.set('iterationCount', iterations.toString())

		const tab = await browser.openTab(url.toString())
		const result = await browser.waitForString(
			tab,
			"document.querySelector('#result-number')?.textContent?.trim()",
			15 * 60_000,
		)

		configuration.scores.push(Number(result))
		process.stderr.write(`  ${configuration.name}: ${result}\n`)
	} finally {
		await browser.close()
	}
}

const median = (values: number[]): number => {
	const sorted = values.toSorted((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)

	return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walletbeat-extensions-'))

try {
	const configurations: Configuration[] = [{ name: 'baseline', scores: [] }]

	for (const { id, extensionId } of walletsToBenchmark()) {
		process.stderr.write(`Downloading ${id} (${extensionId})...\n`)

		const extensionDir = path.join(workDir, id)

		extractZip(await fetchBrowserExtensionZip(extensionId), extensionDir)
		configurations.push({ name: id, extensionDir, scores: [] })
	}

	for (let run = 1; run <= runs; run++) {
		process.stderr.write(`Run ${run.toString()}/${runs.toString()}\n`)

		for (const configuration of configurations) {
			await runSpeedometer(configuration)
		}
	}

	const baseline = median(configurations[0].scores)

	process.stdout.write(
		[
			'| Configuration | Median score | Change vs. baseline | Scores |',
			'| --- | --- | --- | --- |',
			...configurations.map(({ name, scores }) => {
				const score = median(scores)
				const change =
					name === 'baseline' ? '' : `${(((score - baseline) / baseline) * 100).toFixed(1)}%`

				return `| ${name} | ${score.toFixed(2)} | ${change} | ${scores.join(', ')} |`
			}),
		].join('\n') + '\n',
	)
} finally {
	fs.rmSync(workDir, { recursive: true, force: true })
}

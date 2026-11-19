import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test } from '../../../tests/browser/verified-test'
import { type IconPaintReport, observeIconPaint } from './fixtures/icon-paint'

const actors = {
	section: '#security > header [data-icon]',
	attribute: '#scam-prevention > details > summary [data-icon]',
}

const modes = ['baseline', 'frozen-parent', 'frozen-pseudo'] as const
const expectedStatus = (mode: IconPaintReport['mode']) =>
	mode === 'baseline' ? 'observed-correct-at-admitted-poses' : 'negative-control-qualified'
const reportFailed = (report: IconPaintReport) =>
	report.errors.length > 0 || !report.browserClosed || report.status !== expectedStatus(report.mode)

for (const width of [690, 1006]) {
	for (const [name, selector] of Object.entries(actors)) {
		for (const arrivalProgress of [0.35, 0.75] as const) {
			const workload =
				width === 690 && name === 'attribute' && arrivalProgress === 0.75 ? 'reversal' : 'forward'

			test(`${name} icon ${workload} fast-scroll paint matches its slow-scroll pose at ${width}px / arrival ${arrivalProgress}`, async ({
				playwright,
				browserName,
				baseURL,
				source,
			}, info) => {
				test.skip(browserName !== 'chromium', 'Native screencast and wheel injection require CDP')
				expect(baseURL, 'The source-verified browser server must be configured').toBeTruthy()

				if (!baseURL) {
					throw new Error('A source-verified base URL is required')
				}

				const reports: IconPaintReport[] = []
				let completed = false

				try {
					for (const mode of modes) {
						const report = await observeIconPaint({
							browserType: playwright.chromium,
							launchOptions: {
								...info.project.use.launchOptions,
								channel: info.project.use.channel,
								headless: info.project.use.headless,
							},
							baseURL,
							viewport: { width, height: 900 },
							outputDir: info.outputPath('icon-paint'),
							selector,
							source,
							mode,
							arrivalProgress,
							workload,
						})

						reports.push(report)
						expect
							.soft(report.errors, `${mode} must have no browser or instrument errors`)
							.toEqual([])
						expect.soft(report.browserClosed, `${mode} must dispose its browser process`).toBe(true)
						expect.soft(report.status).toBe(expectedStatus(mode))
					}
					expect.soft(reports).toHaveLength(modes.length)
					completed = true
				} finally {
					const failedReports = reports.filter(reportFailed)
					const failed = !completed || reports.length !== modes.length || failedReports.length > 0

					await info.attach('icon-paint-summary', {
						body: JSON.stringify({
							source,
							workload,
							planned: modes,
							attempted: reports.length,
							failed: failedReports.length,
							reports: reports.map(({ mode, status, browserVersion, admitted, staleFrames }) => ({
								mode,
								status,
								browserVersion,
								admitted,
								staleFrames,
							})),
						}),
						contentType: 'application/json',
					})

					if (failed) {
						const root = info.outputPath('icon-paint')

						for (const relative of await readdir(root, { recursive: true }).catch(() => [])) {
							if (relative.endsWith('.png') || relative.endsWith('.json')) {
								await info.attach(`icon-paint/${relative}`, {
									path: join(root, relative),
									contentType: relative.endsWith('.png') ? 'image/png' : 'application/json',
								})
							}
						}
					}
				}
			})
		}
	}
}

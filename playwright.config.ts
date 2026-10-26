import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, type Project } from '@playwright/test'

import matrix from './tests/browser/recording-matrix.json' with { type: 'json' }

const port = Number(process.env.WALLET_PAGE_PORT ?? 4558)
const baseURL = process.env.WALLET_PAGE_URL ?? `http://127.0.0.1:${port}`
const outputDir = process.env.WALLET_PAGE_RESULTS ?? 'test-results/browser'
const webkitLaunchOptions = { executablePath: process.env.WALLET_PAGE_WEBKIT_EXECUTABLE }

export default defineConfig({
	testDir: '.',
	testMatch: ['src/**/*.tests/**/*.spec.ts', 'tests/browser/**/*.spec.ts'],
	workers: 1,
	updateSnapshots: 'none',
	timeout: 600000,
	expect: { timeout: 15000 },
	outputDir,
	snapshotPathTemplate: resolve(
		fileURLToPath(new URL('.', import.meta.url)),
		outputDir,
		'runtime-snapshots/{projectName}/{testFilePath}/{testName}/{arg}{ext}',
	),
	reporter: [['list'], ['json', { outputFile: `${outputDir}/report.json` }]],
	use: {
		baseURL,
		trace: 'off',
		screenshot: 'only-on-failure',
		actionTimeout: 15000,
		navigationTimeout: 60000,
	},
	projects: [
		...(process.env.WALLET_PAGE_REAL_CHROME_PERFORMANCE === '1'
			? [
					{
						name: 'performance-chrome-headed',
						testMatch: '**/performance.spec.ts',
						use: { browserName: 'chromium' as const, channel: 'chrome', headless: false },
					},
				]
			: []),
		...['chromium', 'firefox', 'webkit'].map((browserName): Project => ({
			name: browserName,
			testIgnore: '**/recording.spec.ts',
			use: {
				browserName: browserName as 'chromium' | 'firefox' | 'webkit',
				...(browserName === 'webkit' ? { launchOptions: webkitLaunchOptions } : {}),
			},
		})),
		...matrix.map((cell): Project => ({
			name: `recording-${cell.engine}-${cell.width}-${cell.scenario}`,
			testMatch: '**/recording.spec.ts',
			metadata: { recording: cell },
			use: {
				browserName: cell.engine as 'chromium' | 'firefox' | 'webkit',
				viewport: { width: cell.width, height: cell.height },
				colorScheme: cell.theme as 'light' | 'dark',
				video: { mode: 'on', size: { width: cell.width, height: cell.height } },
				launchOptions:
					cell.engine === 'firefox'
						? {
								firefoxUserPrefs: {
									'ui.prefersReducedTransparency': cell.transparency === 'reduce' ? 1 : 0,
								},
							}
						: cell.engine === 'webkit'
							? webkitLaunchOptions
							: {},
			},
		})),
	],
	webServer: process.env.WALLET_PAGE_URL
		? undefined
		: {
				command: `"${process.execPath}" node_modules/astro/bin/astro.mjs build --config tests/browser/astro.config.mjs --outDir .astro/wallet-page-browser-build && "${process.execPath}" node_modules/astro/bin/astro.mjs preview --host 127.0.0.1 --port ${port} --config tests/browser/astro.config.mjs --outDir .astro/wallet-page-browser-build`,
				url: `${baseURL}/__wallet-page/software/`,
				timeout: 1800000,
				reuseExistingServer: !process.env.CI,
				env: { ASTRO_TELEMETRY_DISABLED: '1' },
			},
})

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.ts',
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4321',
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer:
		process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1'
			? undefined
			: {
					command: 'pnpm run dev -- --host ::1 --port 4321',
					reuseExistingServer: true,
					timeout: 120_000,
					url: 'http://localhost:4321/test/',
				},
})

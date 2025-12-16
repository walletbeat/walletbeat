// @ts-check
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import sitemap from '@astrojs/sitemap'
import svelte from '@astrojs/svelte'
import { shield } from '@kindspells/astro-shield'
import { defineConfig } from 'astro/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const generatedDir = resolve(rootDir, 'src', 'generated')
const moduleFilePath = resolve(generatedDir, 'sriHashes.mjs')

// Ensure the generated directory exists
await mkdir(generatedDir, { recursive: true })

// Create a placeholder file if it doesn't exist (for dev mode)
// The actual file will be generated during build
try {
	await writeFile(moduleFilePath, 'export default {};\n', { flag: 'wx' })
} catch {
	// File already exists, ignore
}

// Convert to URL - the middleware expects a file:// URL for ESM imports
// Use pathToFileURL to ensure proper Windows path handling
const modulePath = pathToFileURL(moduleFilePath).href

// Check if we're in dev mode (middleware has a bug with directory creation in dev)
const isDev = process.env.NODE_ENV !== 'production' && !process.env.ASTRO_BUILD

// https://astro.build/config
export default defineConfig({
	base: process.env.BASE_URL ?? '/',
	site: process.env.SITE_URL ?? 'https://wallet.page', // Set your production site URL here
	output: 'static',
	integrations: [
		svelte(),
		sitemap(),
		shield({
			sri: {
				// Disable middleware in dev mode due to directory creation bug
				// The middleware tries to create directories incorrectly when given a URL
				enableMiddleware: !isDev,
				hashesModule: modulePath,
			},
		}),
	],
	vite: {
		build: {
			// Improve chunking strategy
			chunkSizeWarningLimit: 1000,
		},
	},
})

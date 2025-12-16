// @ts-check
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import sitemap from '@astrojs/sitemap'
import svelte from '@astrojs/svelte'
import { shield } from '@kindspells/astro-shield'
import { defineConfig } from 'astro/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const modulePath = pathToFileURL(resolve(rootDir, 'src', 'generated', 'sriHashes.mjs')).href

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
				enableMiddleware: true,
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

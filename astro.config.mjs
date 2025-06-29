// @ts-check
import { resolve } from 'node:path'

import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import { shield } from '@kindspells/astro-shield'
import { defineConfig } from 'astro/config'

const rootDir = new URL('.', import.meta.url).pathname
const modulePath = resolve(rootDir, 'src', 'generated', 'sriHashes.mjs')

// https://astro.build/config
export default defineConfig({
	base: process.env.BASE_URL ?? '/',
	site: process.env.SITE_URL ?? 'https://wallet.page', // Set your production site URL here
	output: 'static',
	integrations: [
		react(),
		sitemap(),
		shield({
			sri: {
				enableMiddleware: true,
				hashesModule: modulePath,
			},
		}),
	],
	vite: {
		optimizeDeps: {
			exclude: ['@mui/x-internals'],
		},
		build: {
			// Improve chunking strategy
			chunkSizeWarningLimit: 1000,
			rollupOptions: {
				output: {
					manualChunks: {
						react: ['react', 'react-dom'],
						mui: ['@mui/material', '@mui/icons-material'],
						reactIcons: ['react-icons'],
					},
				},
			},
		},
		ssr: {
			noExternal: ['@mui/*'],
			external: ['@mui/x-internals'],
		},
	},
})

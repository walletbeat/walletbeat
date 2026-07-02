// @ts-check
import { resolve } from 'node:path'

import sitemap from '@astrojs/sitemap'
import svelte from '@astrojs/svelte'
import { shield } from '@kindspells/astro-shield'
import { defineConfig, fontProviders } from 'astro/config'

const rootDir = new URL('.', import.meta.url).pathname
const modulePath = resolve(rootDir, 'src', 'generated', 'sriHashes.mjs')

// https://astro.build/config
export default defineConfig({
	base: process.env.BASE_URL ?? '/',
	site: process.env.SITE_URL ?? 'https://wallet.page', // Set your production site URL here
	output: 'static',
	integrations: [svelte()].concat(
		process.env.WALLETBEAT_DEV === 'true'
			? []
			: [
					sitemap(),
					shield({
						sri: {
							enableMiddleware: false,
							hashesModule: modulePath,
						},
					}),
				],
	),
	vite: {
		build: {
			// Improve chunking strategy
			chunkSizeWarningLimit: 1000,
		},
	},
	fonts: [
		{
			name: 'Avenir LT Std',
			cssVariable: '--fontFamily-avenir',
			provider: fontProviders.local(),
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/avenir-lt-std-roman.otf'],
						weight: '400',
						style: 'normal',
					},
					{
						src: ['./src/assets/fonts/avenir-lt-std-heavy.otf'],
						weight: '700',
						style: 'normal',
					},
				],
			},
		},
		{
			name: 'Space Grotesk',
			cssVariable: '--fontFamily-spaceGrotesk',
			provider: fontProviders.fontsource(),
			weights: [400, 500, 600, 700],
			styles: ['normal'],
		},
		{
			name: 'SP Monorium',
			cssVariable: '--fontFamily-spMonorium',
			provider: fontProviders.local(),
			fallbacks: ['monospace'],
			options: {
				variants: [
					{
						src: [
							'./src/assets/fonts/sp-monorium-regular.woff2',
							'./src/assets/fonts/sp-monorium-regular.woff',
							'./src/assets/fonts/sp-monorium-regular.ttf',
						],
						weight: '400',
						style: 'normal',
					},
				],
			},
		},
		{
			name: 'wbicons',
			cssVariable: '--fontFamily-wbicons',
			provider: fontProviders.local(),
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/wbicons/wbicons.woff2'],
						weight: '400',
						style: 'normal',
					},
				],
			},
		},
	],
})

/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config'

export default getViteConfig({
	cacheDir: '.cache', // Vitest will append `/vitest` to this path already.
	test: {
		environment: 'node',
		typecheck: {
			enabled: true,
		},
		include: ['**/*.test.ts'],
	},
})

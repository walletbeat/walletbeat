import { getViteConfig } from 'astro/config'
import { defaultExclude } from 'vitest/config'

export default getViteConfig({
	cacheDir: '.cache', // Vitest will append `/vitest` to this path already.
	test: {
		environment: 'node',
		testTimeout: 60000, // 60s
		typecheck: {
			enabled: true,
		},
		include: ['**/*.test.ts'],
		exclude: [...defaultExclude, 'tests/postbuild/**'],
	},
	json: {
		stringify: false,
	},
})

import { getViteConfig } from 'astro/config'

export default getViteConfig({
	cacheDir: '.cache', // Vitest will append `/vitest` to this path already.
	// @ts-expect-error - Astro's getViteConfig doesn't expose test config typing
	test: {
		environment: 'node',
		testTimeout: 60000, // 60s
		typecheck: {
			enabled: true,
		},
		include: ['**/*.test.ts'],
	},
	json: {
		stringify: false,
	},
})

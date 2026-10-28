// @ts-check
import config from '../../astro.config.mjs'

/** @type {import('astro').AstroIntegration} */
const fixtures = {
	name: 'wallet-page-fixtures',
	hooks: {
		'astro:config:setup': ({ injectRoute }) => {
			injectRoute({
				pattern: '/__wallet-page/[fixture]',
				entrypoint: './tests/browser/fixtures/fixture.astro',
			})
			injectRoute({ pattern: '/__pie-geometry', entrypoint: './tests/browser/fixtures/pie.astro' })
			injectRoute({
				pattern: '/__wallet-page/series.json',
				entrypoint: './tests/browser/fixtures/wallet-series.ts',
			})
			injectRoute({
				pattern: '/__wallet-page/source.json',
				entrypoint: './tests/browser/fixtures/source.ts',
			})
		},
	},
}

export default {
	...config,
	integrations: [...(config.integrations ?? []), fixtures],
}

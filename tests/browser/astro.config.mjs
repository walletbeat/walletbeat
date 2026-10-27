// @ts-check
import config from '../../astro.config.mjs'

/** @type {import('astro').AstroIntegration} */
const fixtures = {
	name: 'wallet-page-fixtures',
	hooks: {
		'astro:config:setup': ({ injectRoute }) => {
			injectRoute({
				pattern: '/__reorder-focus',
				entrypoint: './tests/browser/fixtures/reorder-focus.astro',
			})
			injectRoute({
				pattern: '/__table-sort-state',
				entrypoint: './tests/browser/fixtures/table-sort-state.astro',
			})
			injectRoute({
				pattern: '/__tooltip-hydration',
				entrypoint: './tests/browser/fixtures/tooltip-hydration.astro',
			})
			injectRoute({
				pattern: '/__native-tabs',
				entrypoint: './tests/browser/fixtures/native-tabs.astro',
			})
			injectRoute({
				pattern: '/__table-header-controls',
				entrypoint: './tests/browser/fixtures/table-header-controls.astro',
			})
			injectRoute({
				pattern: '/__table-sticky-size',
				entrypoint: './tests/browser/fixtures/table-sticky-size.astro',
			})
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
				pattern: '/__wallet-page/attribute-notes.json',
				entrypoint: './tests/browser/fixtures/attribute-notes.ts',
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
	devToolbar: { enabled: false },
	integrations: [...(config.integrations ?? []), fixtures],
}

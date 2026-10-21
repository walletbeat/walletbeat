import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { transform } from 'lightningcss'
import postcss from 'postcss'

import { getAstroBuildTimeRepositoryRoot } from '@/utils/codebase.astro'

/** Custom properties declared in the site's global stylesheet, by name. */
const globalCustomProperties: ReadonlyMap<string, string> = (() => {
	const properties = new Map<string, string>()
	const globalCss = readFileSync(
		join(getAstroBuildTimeRepositoryRoot(), 'src', 'styles', 'global.css'),
		'utf8',
	)

	postcss.parse(globalCss).walkDecls(/^--/, decl => {
		properties.set(decl.prop, decl.value)
	})

	return properties
})()

/** Recursively replace `var(--name)` references with their global values. */
const substituteCustomProperties = (value: string): string =>
	value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, name: string) => {
		const propertyValue = globalCustomProperties.get(name)

		if (propertyValue === undefined) {
			throw new Error(`Custom property ${name} is not declared in global.css`)
		}

		return substituteCustomProperties(propertyValue)
	})

/**
 * Resolve a CSS color, as used in the site's styles (custom properties,
 * `light-dark()`, `color-mix()`, relative `oklch()` colors...), to a static
 * sRGB color in the light color scheme.
 *
 * This is for renderers outside the browser, such as the SVG rasterizer used
 * for social media preview images, which support neither custom properties
 * nor CSS Color 4 and 5 syntax.
 */
export function resolveCssColor(color: string): string {
	const { code } = transform({
		filename: 'color.css',
		code: new TextEncoder().encode(`a{color:${substituteCustomProperties(color)}}`),
		minify: true,
		// Lightning CSS emits an sRGB fallback first for browsers that predate
		// CSS Color 4.
		targets: { chrome: 60 << 16 },
		visitor: {
			Color: cssColor =>
				typeof cssColor === 'object' && cssColor.type === 'light-dark' ? cssColor.light : cssColor,
		},
	})
	const resolved = /^a\{color:([^;}]+)/.exec(new TextDecoder().decode(code))?.[1]

	if (resolved === undefined) {
		throw new Error(`Could not resolve CSS color: ${color}`)
	}

	return resolved
}

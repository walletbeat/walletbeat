import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import postcss from 'postcss'
import { parse } from 'svelte/compiler'
import { expect, it } from 'vitest'

import { getRepositoryRoot } from '@/utils/codebase'

const root = getRepositoryRoot()
const stylesheets = globSync('src/**/*.{svelte,css}', { cwd: root }).filter(
	file => file.endsWith('.css') || readFileSync(join(root, file), 'utf8').includes('<style'),
)

// PostCSS validates authored stylesheet syntax, including conditional values that
// the CSS language-service parser does not support. Svelte owns component syntax.
it.each(stylesheets)('%s has valid stylesheet syntax', file => {
	const source = readFileSync(join(root, file), 'utf8')
	const css = file.endsWith('.svelte')
		? parse(source, { modern: true }).css?.content.styles
		: source

	expect(css).toBeDefined()
	expect(() => postcss.parse(css ?? '', { from: file })).not.toThrow()
})

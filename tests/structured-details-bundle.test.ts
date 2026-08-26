import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { getRepositoryRoot } from './utils/codebase'

/**
 * The three adapter registries are deliberately bundled apart.
 *
 * The web registry must not reach the Markdown or JSON adapters, or every
 * wallet page would ship the export machinery to the browser. This walks the
 * import graph from the web entry point rather than trusting review.
 */

const root = getRepositoryRoot()

const serverOnlyModules = [
	'src/utils/structured-details/markdown.ts',
	'src/utils/structured-details/json.ts',
	'src/utils/wallet-page-markdown.ts',
	'src/utils/wallet-json-export.ts',
]

function resolveImport(specifier: string, fromFile: string): string | null {
	const relative = specifier.startsWith('@/data/')
		? specifier.replace('@/data/', 'data/')
		: specifier.startsWith('@/')
			? specifier.replace('@/', 'src/')
			: specifier.startsWith('.')
				? path.join(path.dirname(fromFile), specifier)
				: null

	if (relative === null) {
		return null
	}

	for (const candidate of [relative, `${relative}.ts`, `${relative}/index.ts`]) {
		const absolute = path.join(root, candidate)

		if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
			return candidate
		}
	}

	return null
}

function reachableModules(entry: string): Set<string> {
	const seen = new Set<string>()
	const queue = [entry]

	while (queue.length > 0) {
		const current = queue.pop()

		if (current === undefined || seen.has(current)) {
			continue
		}

		seen.add(current)

		const source = fs.readFileSync(path.join(root, current), { encoding: 'utf-8' })

		for (const match of source.matchAll(/^\s*import\s+(?!type\s)([\s\S]*?)from\s+'([^']+)'/gmu)) {
			// `import { type Foo }` still emits nothing at runtime, but a mixed
			// import does, so only whole type-only imports are skipped above.
			const resolved = resolveImport(match[2], current)

			if (resolved !== null) {
				queue.push(resolved)
			}
		}
	}

	return seen
}

describe('structured details bundling', () => {
	const webModules = reachableModules('src/views/attributes/structured-details-registry.ts')

	it('reaches every web view, so the walk is meaningful', () => {
		expect(webModules.size).toBeGreaterThan(5)
	})

	for (const serverModule of serverOnlyModules) {
		it(`keeps ${serverModule} out of the web adapter's import graph`, () => {
			expect([...webModules].filter(module => module === serverModule)).toEqual([])
		})
	}
})

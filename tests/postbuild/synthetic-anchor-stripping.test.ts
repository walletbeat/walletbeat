import * as fs from 'node:fs'
import * as path from 'node:path'

import { type HastNode, htmlToHast } from 'satteri'
import { describe, expect, it } from 'vitest'

import { CodebaseEntryType, crawlCodebase, getRepositoryRoot } from '@/utils/codebase'

const distDir = path.join(getRepositoryRoot(), 'dist')

/**
 * GitHub URL fragments that Walletbeat uses as integrity-check markers and
 * that must never reach the rendered site (they do not exist on GitHub).
 */
const SYNTHETIC_ANCHORS = ['not-line-specific', 'binary-file']

const syntheticAnchorPattern = new RegExp(
	`https://github\\.com/[^\\s"'<>\\\\]*/blob/[^\\s"'<>\\\\]*#(?:${SYNTHETIC_ANCHORS.join('|')})`,
	'g',
)

/** Inspect HTML's rendered values while preserving integrity metadata in Astro transport props. */
function syntheticAnchorUrls(content: string, extension: string): string[] {
	const matches = (value: string) => value.match(syntheticAnchorPattern) ?? []

	if (extension !== '.html') {
		return matches(content)
	}

	const urls: string[] = []
	const visit = (node: HastNode): void => {
		if (node.type === 'text') {
			urls.push(...matches(node.value))
		}

		if (node.type === 'element') {
			for (const [name, value] of Object.entries(node.properties)) {
				if (node.tagName !== 'astro-island' || name !== 'props') {
					urls.push(...matches(String(value)))
				}
			}
		}

		if (node.type === 'element' || node.type === 'root') {
			node.children.forEach(visit)
		}
	}

	visit(htmlToHast(content))

	return urls
}

/**
 * File types to scan. The rendered site's HTML pages, the markdown exports
 * (`.md`) and the structured data exports (`.json`) all carry the same URLs,
 * so a synthetic anchor leaking into any of them would reach visitors.
 */
const SCANNED_EXTENSIONS = ['.html', '.md', '.json']

describe('rendered site strips synthetic GitHub anchors', () => {
	for (const anchor of SYNTHETIC_ANCHORS) {
		const url = `https://github.com/example/repo/blob/commit/file#${anchor}`

		it(`distinguishes transport metadata from rendered ${anchor} URLs`, () => {
			const props = JSON.stringify({ reference: url }).replaceAll('"', '&quot;')
			const island = `<astro-island props="${props}"><a href="${url}">Reference</a></astro-island>`

			expect(syntheticAnchorUrls(island, '.html')).toEqual([url])
			expect(
				syntheticAnchorUrls(`<astro-island props="${props}"></astro-island>`, '.html'),
			).toEqual([])
			expect(syntheticAnchorUrls(`<div props="${url}">${url}</div>`, '.html')).toEqual([url, url])
			expect(syntheticAnchorUrls(`[Reference](${url})`, '.md')).toEqual([url])
			expect(syntheticAnchorUrls(JSON.stringify({ url }), '.json')).toEqual([url])
		})
	}

	it('no scanned file carries a synthetic GitHub anchor', async () => {
		const files: string[] = []

		await crawlCodebase({
			root: distDir,
			ignore: [],
			baseTraversalFn: entry => {
				if (
					entry.type === CodebaseEntryType.FILE &&
					SCANNED_EXTENSIONS.some(extension => entry.path.endsWith(extension))
				) {
					files.push(entry.path)
				}
			},
		})

		expect(
			files.length,
			`No scanned files found under ${distDir}. Did the build run?`,
		).toBeGreaterThan(0)

		const violations: string[] = []

		for (const relativePath of files) {
			const content = fs.readFileSync(path.join(distDir, relativePath), 'utf8')
			const matches = syntheticAnchorUrls(content, path.extname(relativePath))

			for (const match of matches) {
				violations.push(`${relativePath}: ${match}`)
			}
		}

		expect(
			violations,
			[
				`Found ${violations.length} rendered URL(s) still carrying a synthetic GitHub anchor:`,
				...violations,
				'',
				`Synthetic anchors (${SYNTHETIC_ANCHORS.join(', ')}) exist only for Walletbeat's`,
				'integrity checks and are not valid on GitHub. They must be stripped from every',
				'rendered URL (see stripSyntheticAnchor in src/schema/url.ts).',
			].join('\n'),
		).toEqual([])
	})
})

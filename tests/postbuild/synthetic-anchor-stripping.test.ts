import * as fs from 'node:fs'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import { CodebaseEntryType, crawlCodebase, getRepositoryRoot } from '@/utils/codebase'

const distDir = path.join(getRepositoryRoot(), 'dist')

/**
 * GitHub URL fragments that Walletbeat uses as integrity-check markers and
 * that must never reach the rendered site (they do not exist on GitHub).
 */
const SYNTHETIC_ANCHORS = ['not-line-specific', 'binary-file']

const syntheticAnchorPattern = new RegExp(
	`https://github\\.com/[^"']*/blob/[^"']*#(?:${SYNTHETIC_ANCHORS.join('|')})`,
	'g',
)

/**
 * File types to scan. The rendered site's HTML pages, the markdown exports
 * (`.md`) and the structured data exports (`.json`) all carry the same URLs,
 * so a synthetic anchor leaking into any of them would reach visitors.
 */
const SCANNED_EXTENSIONS = ['.html', '.md', '.json']

describe('rendered site strips synthetic GitHub anchors', () => {
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
			const matches = content.match(syntheticAnchorPattern) ?? []

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

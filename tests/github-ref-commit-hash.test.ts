import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..')

const DATA_DIR = path.join(REPO_ROOT, 'data')

const GITHUB_BLOB_URL_RE =
	/https:\/\/github\.com\/[^/"'\s]+\/[^/"'\s]+\/blob\/([^/"'\s]+)\/[^"'\s]*/

const COMMIT_HASH_RE = /^[0-9a-f]{40}$/

// Helpers
function collectTsFiles(dir: string): string[] {
	const results: string[] = []

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			results.push(...collectTsFiles(fullPath))
		} else if (entry.isFile() && entry.name.endsWith('.ts')) {
			results.push(fullPath)
		}
	}

	return results
}

interface OffendingLink {
	url: string
	ref: string
	line: number
}

function findOffendingLinks(filePath: string): OffendingLink[] {
	const source = fs.readFileSync(filePath, 'utf8')
	const offending: OffendingLink[] = []

	source.split('\n').forEach((lineText, lineIndex) => {
		const lineRe = new RegExp(GITHUB_BLOB_URL_RE.source, 'g')
		let match: RegExpExecArray | null

		while ((match = lineRe.exec(lineText)) !== null) {
			const fullUrl = match[0]
			const refSegment = match[1]

			if (!COMMIT_HASH_RE.test(refSegment)) {
				offending.push({
					url: fullUrl,
					ref: refSegment,
					line: lineIndex + 1,
				})
			}
		}
	})

	return offending
}

// Test suite
describe('GitHub ref URLs in wallet data must use 40-char commit hashes', () => {
	it('data/ directory exists', () => {
		expect(
			fs.existsSync(DATA_DIR),
			`Expected to find a data/ directory at ${DATA_DIR}. ` +
				'Make sure this test is located at tests/github-ref-commit-hash.test.ts ' +
				'inside the repository root.',
		).toBe(true)
	})

	const dataFiles = fs.existsSync(DATA_DIR) ? collectTsFiles(DATA_DIR) : []

	if (dataFiles.length === 0) {
		it.todo('no TypeScript files found in data/ — nothing to check')
	}

	for (const filePath of dataFiles) {
		const relPath = path.relative(REPO_ROOT, filePath)
		const offending = findOffendingLinks(filePath)

		if (offending.length === 0) {
			continue
		}

		describe(relPath, () => {
			for (const { url, ref, line } of offending) {
				it(`line ${line}: ref must be a commit hash, not branch "${ref}"`, () => {
					expect.fail(
						[
							'',
							'Found a GitHub blob URL that uses a branch name instead of a commit hash.',
							'',
							`  File : ${relPath}`,
							`  Line : ${line}`,
							`  URL  : ${url}`,
							`  Ref  : "${ref}" — this is a branch name, not a 40-char commit hash.`,
							'',
							'Branch-based links are fragile: the target file can be renamed, deleted,',
							'or have its line numbers shift without any warning. A commit hash permanently',
							'anchors the link to the exact version of the file that was reviewed.',
							'',
							'How to get the correct commit hash:',
							'  Option 1 – GitHub UI : Open the file on GitHub, press "y" to get the',
							'             permanent permalink, then copy the 40-char hash from the URL.',
							"  Option 2 – CLI       : git log --format='%H' -n 1 -- <path/to/file>",
							'  Option 3 – CLI       : git rev-parse HEAD   (hash of the current commit)',
							'',
							'Replace the branch name in the URL with that hash:',
							'  Before: https://github.com/<owner>/<repo>/blob/main/<path>',
							'  After : https://github.com/<owner>/<repo>/blob/<40-char-hash>/<path>',
							'',
						].join('\n'),
					)
				})
			}
		})
	}
})


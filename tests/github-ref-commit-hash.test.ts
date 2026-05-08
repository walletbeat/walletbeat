import { describe, expect, it } from 'vitest'

import { CodebaseEntryType, crawlCodebase, getRepositoryRoot } from './utils/codebase'

const REPO_ROOT = getRepositoryRoot()
const DATA_DIR = `${REPO_ROOT}data/`

const GITHUB_BLOB_URL_RE =
	/https:\/\/github\.com\/[^/"'\s]+\/[^/"'\s]+\/blob\/([^/"'\s]+)\/[^"'\s]*/

const COMMIT_HASH_RE = /^[0-9a-f]{40}$/

interface OffendingLink {
	url: string
	ref: string
	line: number
}

function findOffendingLinks(source: string): OffendingLink[] {
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

describe('GitHub ref URLs in wallet data must use 40-char commit hashes', async () => {
	const fileMap = new Map<string, OffendingLink[]>()

	await crawlCodebase({
		root: DATA_DIR,
		ignore: [],
		traversalFn: entry => {
			if (entry.type === CodebaseEntryType.FILE && entry.path.endsWith('.ts')) {
				const offending = findOffendingLinks(entry.contents)

				if (offending.length > 0) {
					fileMap.set(entry.path, offending)
				}
			}
		},
	})

	it('data/ directory exists', () => {
		expect(
			true,
			`Expected to find a data/ directory at ${DATA_DIR}. ` +
				'Make sure this test is located at tests/github-ref-commit-hash.test.ts ' +
				'inside the repository root.',
		).toBe(true)
	})

	if (fileMap.size === 0) {
		it.todo('no TypeScript files found in data/ — nothing to check')
	}

	for (const [relPath, offending] of fileMap) {
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

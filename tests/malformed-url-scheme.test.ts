import { describe, expect, it } from 'vitest'

import {
	CodebaseEntryType,
	commonExclusions,
	crawlCodebase,
	getRepositoryRoot,
} from './utils/codebase'

const REPO_ROOT = getRepositoryRoot()

/**
 * Directories authored in this repository. Generated Foundry artifacts and
 * vendored submodules under `resources/contracts/` legitimately use example
 * schemes like `ipfs://` and `mock://`, so they are intentionally out of scope.
 */
const CHECKED_DIRS = ['data', 'src']

/** Only source-like files can contain hand-typed URLs worth checking. */
const CHECKED_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|md|mdx|json|astro|css|html|svg|txt)$/i

/**
 * Skips files whose extension isn't in CHECKED_EXTENSIONS before their
 * contents are read. Directories are left alone: they're only matched here
 * if their name happens to end in a dotted suffix, which doesn't occur under
 * `data/` or `src/`.
 */
const SKIP_NON_SOURCE_FILES = (filePath: string): boolean =>
	/\.[^./]+$/.test(filePath) && !CHECKED_EXTENSIONS.test(filePath)

/** URL schemes that are legitimately used in the codebase. */
const ALLOWED_SCHEMES = new Set([
	'http',
	'https',
	'ws',
	'wss',
	'file',
	'chrome',
	'chrome-extension',
	'scheme',
])

/** Captures a URL: `<scheme>://<rest>` up to the next quote/whitespace/bracket. */
const URL_RE = /([a-zA-Z][a-zA-Z0-9+.-]*):\/\/[^\s'"`)<>\]]*/

interface MalformedUrl {
	url: string
	reason: string
	line: number
}

function findMalformedUrls(source: string): MalformedUrl[] {
	const malformed: MalformedUrl[] = []

	source.split('\n').forEach((lineText, lineIndex) => {
		const lineRe = new RegExp(URL_RE.source, 'g')
		let match: RegExpExecArray | null

		while ((match = lineRe.exec(lineText)) !== null) {
			const scheme = match[1]

			// An unrecognized scheme means the URL is malformed (e.g. a typo such
			// as "ftp://"). We validate the scheme rather than parsing the whole
			// URL because extension manifests legitimately contain match patterns
			// like "https://*/*" that are not parseable as concrete URLs.
			if (!ALLOWED_SCHEMES.has(scheme.toLowerCase())) {
				malformed.push({
					url: match[0],
					reason: `unrecognized scheme "${scheme}://"`,
					line: lineIndex + 1,
				})
			}
		}
	})

	return malformed
}

describe('URLs in authored source must be well-formed', async () => {
	const fileMap = new Map<string, MalformedUrl[]>()

	for (const dir of CHECKED_DIRS) {
		await crawlCodebase({
			root: `${REPO_ROOT}${dir}/`,
			ignore: commonExclusions.concat([SKIP_NON_SOURCE_FILES]),
			fullTraversalFn: entry => {
				if (entry.type === CodebaseEntryType.FILE) {
					const malformed = findMalformedUrls(entry.contents)

					if (malformed.length > 0) {
						fileMap.set(`${dir}/${entry.path}`, malformed)
					}
				}
			},
		})
	}

	it('the detector accepts a well-formed URL', () => {
		expect(findMalformedUrls("ref: 'https://github.com/walletbeat/walletbeat'")).toHaveLength(0)
	})

	if (fileMap.size === 0) {
		it('no malformed URLs found in data/ or src/', () => {
			expect(fileMap.size).toBe(0)
		})
	}

	for (const [relPath, malformed] of fileMap) {
		describe(relPath, () => {
			for (const { url, reason, line } of malformed) {
				it(`line ${line}: malformed URL (${reason})`, () => {
					expect.fail(
						`${relPath}:${line}: malformed URL — ${reason}\n  ${url}\n\n` +
							'If this scheme is intentional, add it to ALLOWED_SCHEMES in ' +
							'tests/malformed-url-scheme.test.ts.',
					)
				})
			}
		})
	}
})

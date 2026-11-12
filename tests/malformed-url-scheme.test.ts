import { describe, expect, it } from 'vitest'

import {
	CodebaseEntryType,
	commonExclusions,
	crawlCodebase,
	getRepositoryRoot,
} from '@/utils/codebase'

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

/** Locate delimiters before matching so long non-URL spans are scanned only once. */
function* findLineUrls(lineText: string) {
	const lineRe = new RegExp(URL_RE.source, 'y')
	const schemeCharacter = /[a-zA-Z0-9+.-]/
	const schemeInitial = /[a-zA-Z]/
	let cursor = 0
	let delimiter: number

	while ((delimiter = lineText.indexOf('://', cursor)) !== -1) {
		let start = delimiter

		while (start > 0 && schemeCharacter.test(lineText[start - 1])) {
			start--
		}
		while (start < delimiter && !schemeInitial.test(lineText[start])) {
			start++
		}
		lineRe.lastIndex = start
		const match = start < delimiter ? lineRe.exec(lineText) : null

		if (match) {
			yield match
			cursor = lineRe.lastIndex
		} else {
			cursor = delimiter + 3
		}
	}
}

function findMalformedUrls(source: string): MalformedUrl[] {
	const malformed: MalformedUrl[] = []

	source.split('\n').forEach((lineText, lineIndex) => {
		for (const match of findLineUrls(lineText)) {
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

describe('source URL recognition', () => {
	it('preserves global URL recognition and line indices across delimiters and scheme boundaries', () => {
		const spans = ['', '0', '+.-123', 'abc', 'a-b.C+0', '_', 'é', 'a/b', 'a:b', '\t']
		const suffixes = ['', 'host', 'a://nested', 'host/path', 'host]tail', 'host"tail', 'host\nnext']
		const sources = spans.flatMap(prefix =>
			suffixes.map(suffix => `${prefix}://${suffix} bad://tail`),
		)

		for (const source of sources) {
			const actual = source.split('\n').flatMap((line, index) =>
				[...findLineUrls(line)].map(match => ({
					url: match[0],
					scheme: match[1],
					index: match.index,
					line: index + 1,
				})),
			)
			const expected = source.split('\n').flatMap((line, index) =>
				[...line.matchAll(new RegExp(URL_RE.source, 'g'))].map(match => ({
					url: match[0],
					scheme: match[1],
					index: match.index,
					line: index + 1,
				})),
			)

			expect(actual).toEqual(expected)
		}
	})

	it('handles long scheme-free spans after an earlier URL and around later URLs', () => {
		const payload = 'a'.repeat(1_000_000)
		const source = `<svg xmlns="http://www.w3.org/2000/svg" data="${payload}"/>\n${payload}\n"ftp://later" ${payload}`

		expect(findMalformedUrls(source)).toEqual([
			{ url: 'ftp://later', reason: 'unrecognized scheme "ftp://"', line: 3 },
		])
	})

	it('validates recognized schemes without reinterpreting nested URL delimiters', () => {
		expect(
			findMalformedUrls(
				'HTTPS://*/* ws://socket\n123ftp://host "https://outer/ftp://nested" ftp://last',
			),
		).toEqual([
			{ url: 'ftp://host', reason: 'unrecognized scheme "ftp://"', line: 2 },
			{ url: 'ftp://last', reason: 'unrecognized scheme "ftp://"', line: 2 },
		])
	})
})

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

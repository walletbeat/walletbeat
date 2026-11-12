import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import { collectAllRawRefs, type RawCollectedRef } from '@/schema/reference'
import { lineFragmentRegExp } from '@/schema/url'

const GITHUB_BLOB_URL_RE =
	/https:\/\/github\.com\/[^/"'\s]+\/[^/"'\s]+\/blob\/([^/"'\s]+)\/[^"'\s]*/

const COMMIT_HASH_RE = /^[0-9a-f]{40}$/

/** Synthetic anchor marking a commit-pinned blob URL as pointing to a binary file. */
const BINARY_FILE_ANCHOR = 'binary-file'

/** Synthetic anchor marking a commit-pinned blob URL to a text file with no line range. */
const NOT_LINE_SPECIFIC_ANCHOR = 'not-line-specific'

interface OffendingLink {
	url: string
	ref: string
	fieldPath: string
}

interface AnchorOffense {
	url: string
	ref: string
	fieldPath: string
}

/** Extract every GitHub blob URL (with its ref segment) from a raw `ref` value. */
function blobUrlsInRef(rawRef: RawCollectedRef['rawRef']): { url: string; ref: string }[] {
	const found: { url: string; ref: string }[] = []

	const visit = (value: unknown): void => {
		if (typeof value === 'string') {
			for (const match of value.matchAll(new RegExp(GITHUB_BLOB_URL_RE.source, 'g'))) {
				const refSegment = match[1]

				if (refSegment !== undefined) {
					found.push({ url: match[0], ref: refSegment })
				}
			}

			return
		}

		if (Array.isArray(value)) {
			value.forEach(visit)

			return
		}

		if (value === null || typeof value !== 'object') {
			return
		}

		Object.values(value).forEach(visit)
	}

	visit(rawRef)

	return found
}

/** Push an entry into a map keyed by wallet name, appending to any existing list. */
function pushByWallet<K extends string, V>(map: Map<string, V[]>, key: K, value: V): void {
	const existing = map.get(key)

	if (existing === undefined) {
		map.set(key, [value])
	} else {
		existing.push(value)
	}
}

const hashOffenses = new Map<string, OffendingLink[]>()
const anchorOffenses = new Map<string, AnchorOffense[]>()

for (const raw of collectAllRawRefs(allWallets)) {
	for (const { url, ref } of blobUrlsInRef(raw.rawRef)) {
		if (!COMMIT_HASH_RE.test(ref)) {
			pushByWallet(hashOffenses, raw.walletName, { url, ref, fieldPath: raw.fieldPath })
		}

		let fragment: string

		try {
			fragment = new URL(url).hash.replace(/^#/, '')
		} catch {
			// Malformed URLs are surfaced by other checks; skip here.
			continue
		}

		if (
			COMMIT_HASH_RE.test(ref) &&
			fragment !== BINARY_FILE_ANCHOR &&
			fragment !== NOT_LINE_SPECIFIC_ANCHOR &&
			!lineFragmentRegExp.test(fragment)
		) {
			pushByWallet(anchorOffenses, raw.walletName, { url, ref, fieldPath: raw.fieldPath })
		}
	}
}

describe('GitHub ref URLs in wallet data must use 40-char commit hashes', () => {
	it('finds at least one reference in wallet data', () => {
		expect(collectAllRawRefs(allWallets).length).toBeGreaterThan(0)
	})

	if (hashOffenses.size === 0) {
		it.todo('no GitHub blob URL uses a branch name — nothing to check')
	}

	for (const [walletName, offenses] of hashOffenses) {
		describe(walletName, () => {
			for (const { url, ref, fieldPath } of offenses) {
				it(`ref must be a commit hash, not branch "${ref}"`, () => {
					expect.fail(
						[
							'',
							'Found a GitHub blob URL that uses a branch name instead of a commit hash.',
							'',
							`  Wallet    : ${walletName}`,
							`  Ref field : ${fieldPath}`,
							`  URL       : '${url}'`,
							`  Ref       : "${ref}" (this is a branch name, not a 40-char commit hash)`,
							'',
							'Branch-based links are fragile: the target file can be renamed, deleted,',
							'or have its line numbers shift without any warning. A commit hash permanently',
							'anchors the link to the exact version of the file that was reviewed.',
							'',
							'How to get the correct commit hash:',
							'  Option 1: GitHub UI : Open the file on GitHub, press "y" to get the',
							'            permanent permalink, then copy the 40-char hash from the URL.',
							"  Option 2: CLI       : git log --format='%H' -n 1 -- <path/to/file>",
							'  Option 3: CLI       : git rev-parse HEAD   (hash of the current commit)',
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

describe('GitHub ref URLs in wallet data must carry a line anchor or a synthetic anchor', () => {
	it('finds at least one reference in wallet data', () => {
		expect(collectAllRawRefs(allWallets).length).toBeGreaterThan(0)
	})

	if (anchorOffenses.size === 0) {
		it.todo('no commit-pinned GitHub blob URL is missing an anchor — nothing to check')
	}

	for (const [walletName, offenses] of anchorOffenses) {
		describe(walletName, () => {
			for (const { url, ref, fieldPath } of offenses) {
				it(`missing allowed anchor on "${url}"`, () => {
					expect.fail(
						[
							'',
							'Found a commit-pinned GitHub blob URL that is not properly anchored.',
							'',
							`  Wallet    : ${walletName}`,
							`  Ref field : ${fieldPath}`,
							`  URL       : '${url}'`,
							`  Ref       : ${ref}`,
							'',
							'Every commit-pinned GitHub blob URL must carry exactly one of these suffixes:',
							'  - a #L<first>[-L<last>][,...] line range anchor (preferred),',
							`  - the ${BINARY_FILE_ANCHOR} anchor when the file is binary, or`,
							`  - the ${NOT_LINE_SPECIFIC_ANCHOR} anchor when the file is text but no line`,
							'    range is appropriate.',
							'',
						].join('\n'),
					)
				})
			}
		})
	}
})

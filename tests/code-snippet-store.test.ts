import { describe, expect, it } from 'vitest'

import { snippetFileName } from '@/schema/code-snippets'
import { findSnippetOccurrences } from '@/tools/code-snippet-collector/code-snippet-collector-lib'
import { resolveCodeSnippet } from '@/utils/code-snippet-index'
import { codeSnippetsReferencedBy } from '@/utils/code-snippet-store'
import { getRepositoryRoot } from '@/utils/codebase'

const occurrences = findSnippetOccurrences(getRepositoryRoot())

describe('codeSnippetsReferencedBy', () => {
	it('finds snippet URLs nested anywhere in a value', () => {
		const [occurrence] = occurrences
		const cyclic: Record<string, unknown> = { label: 'Not a snippet #L1' }

		cyclic.self = cyclic

		const index = codeSnippetsReferencedBy(
			cyclic,
			new Map([['refs', [{ urls: new Set([occurrence.url]) }]]]),
		)

		expect(Object.keys(index)).toEqual([snippetFileName(occurrence.source)])
		expect(resolveCodeSnippet(index, occurrence.url)?.rows.length).toBeGreaterThan(0)
	})

	it('returns nothing for values without snippet URLs', () => {
		expect(
			codeSnippetsReferencedBy('https://example.com/#L1', {
				url: 'https://github.com/org/repo/blob/main/file.ts',
			}),
		).toEqual({})
	})
})

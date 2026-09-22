import { describe, expect, it } from 'vitest'

import {
	checkSnippets,
	SnippetProblemKind,
} from '@/tools/code-snippet-collector/code-snippet-collector-lib'
import { getRepositoryRoot } from '@/utils/codebase'

describe('code snippets', () => {
	it('has stored snippet files in sync with wallet data references', async () => {
		const problems = await checkSnippets(getRepositoryRoot())

		if (problems.length > 0) {
			throw new Error(
				`Stored code snippet files are out of sync with wallet data references:
				Run pnpm fix to sync code snippets`,
			)
		}

		expect(problems).toHaveLength(0)
	})
})

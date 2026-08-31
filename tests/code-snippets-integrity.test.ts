import { describe, expect, it } from 'vitest'

import {
	checkSnippets,
	SnippetProblemKind,
} from '@/tools/code-snippet-collector/code-snippet-collector-lib'

import { getRepositoryRoot } from './utils/codebase'

describe('code snippets', () => {
	it('has stored snippet files in sync with wallet data references', () => {
		const problems = checkSnippets(getRepositoryRoot())

		if (problems.length > 0) {
			const details = problems.map(p => `  [${p.kind}] ${p.snippetPath}: ${p.issue}`).join('\n')
			const needsFetch = problems.some(
				p =>
					p.kind === SnippetProblemKind.MISSING_SNIPPET ||
					p.kind === SnippetProblemKind.LINE_COUNT_MISMATCH,
			)
			const needsPrune = problems.some(p => p.kind === SnippetProblemKind.ORPHAN_SNIPPET)
			const fixInstructions = [
				needsFetch
					? 'Run `pnpm collect:snippets -- --all` to fetch missing snippets ' +
						'and refetch any with a line count mismatch.'
					: null,
				needsPrune
					? 'Run `pnpm collect:snippets -- --prune` to delete orphaned snippet files.'
					: null,
			]
				.filter(instruction => instruction !== null)
				.join('\n')

			throw new Error(
				`Stored code snippet files are out of sync with wallet data references:\n${details}\n${fixInstructions}`,
			)
		}

		expect(problems).toHaveLength(0)
	})
})

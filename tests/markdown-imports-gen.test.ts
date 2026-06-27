import * as path from 'path'
import { describe, expect, it } from 'vitest'

import { getRepositoryRoot } from '@/tests/utils/codebase'
import { MarkdownImportsGenerator } from '@/tools/markdown-imports-autogen/markdown-import-autogen-lib'

const repoRoot = getRepositoryRoot()

describe('markdown-imports-autogen', () => {
	const gen = new MarkdownImportsGenerator({
		genFilePath: path.join(repoRoot, 'src/autogen/docs.gen.ts'),
		sourceDirs: [path.join(repoRoot, 'resources/docs')],
	})

	it('passes validation', () => {
		const errors = gen.validate()

		expect(errors.length, `Validation errors:\n${errors.join('\n')}`).toBe(0)
	})

	it('is up-to-date', async () => {
		expect(
			await gen.isUpToDate(),
			`docs.gen.ts is out of date; run the following command to fix:\n\n  ${gen.writeCommand()}\n`,
		).toBe(true)
	})
})

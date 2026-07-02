import * as path from 'path'
import { describe, expect, it } from 'vitest'

import { getRepositoryRoot } from '@/tests/utils/codebase'
import {
	MarkdownImportsGenerator,
	SERVED_DIRS,
} from '@/tools/markdown-imports-autogen/markdown-import-autogen-lib'

const repoRoot = getRepositoryRoot()

describe('markdown-imports-autogen', () => {
	for (const served of SERVED_DIRS) {
		const gen = new MarkdownImportsGenerator({
			genFilePath: path.join(repoRoot, served.genFile.slice(1)),
			sourceDirs: [path.join(repoRoot, served.sourceDir.slice(1))],
		})

		describe(served.genFile, () => {
			it('passes validation', () => {
				const errors = gen.validate()

				expect(errors.length, `Validation errors:\n${errors.join('\n')}`).toBe(0)
			})

			it('is up-to-date', async () => {
				expect(
					await gen.isUpToDate(),
					`${served.genFile} is out of date; run the following command to fix:\n\n  ${gen.writeCommand()}\n`,
				).toBe(true)
			})

			it('has image endpoints for all image extensions on disk', () => {
				const errors = gen.validateImageEndpoints(served.endpointDir)

				expect(errors.length, `Image endpoint errors:\n${errors.join('\n')}`).toBe(0)
			})
		})
	}
})

import * as path from 'path'
import { describe, expect, it } from 'vitest'

import { assertValidMarkdown } from '@/tests/utils/assert-valid-markdown'
import { getRepositoryRoot } from '@/tests/utils/codebase'
import {
	featuresMarkdownUpdate,
	generateMarkdown,
} from '@/tools/features-markdown-generator/features-markdown-generator-lib'
import { trimWhitespacePrefix } from '@/types/utils/text'

const repoRoot = getRepositoryRoot()

const config = {
	featuresSrcFile: path.join(repoRoot, 'src', 'schema', 'features.ts'),
	featuresDir: path.join(repoRoot, 'src', 'schema', 'features'),
	outputPath: path.join(repoRoot, 'resources', 'docs', 'features', 'features.md'),
	srcRoot: repoRoot,
	quiet: true,
	test: true,
}

describe('features documentation', () => {
	describe('markdown docs', () => {
		it('is in sync with the TypeScript source', async () => {
			try {
				await featuresMarkdownUpdate(config)
			} catch (e) {
				expect(e).toSatisfy(
					e => e === undefined,
					trimWhitespacePrefix(`
						${config.outputPath} is out of sync with the TypeScript source. Run \`pnpm fix\` to regenerate.
					`),
				)
			}
		})

		it('is valid Markdown', async () => {
			const content = await generateMarkdown(config)

			await assertValidMarkdown(content)
		}, 15_000)
	})
})

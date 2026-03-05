import * as path from 'path'
import { describe, expect, it } from 'vitest'

import { assertValidMarkdown } from '@/tests/utils/assert-valid-markdown'
import { grammarLint } from '@/tests/utils/grammar'
import {
	featuresMarkdownUpdate,
	generateMarkdown,
} from '@/tools/features-markdown-generator/features-markdown-generator-lib'
import { trimWhitespacePrefix } from '@/types/utils/text'

const config = {
	featuresSrcFile: path.join(__dirname, '..', 'src', 'schema', 'features.ts'),
	featuresDir: path.join(__dirname, '..', 'src', 'schema', 'features'),
	outputPath: path.join(__dirname, '..', 'docs', 'features.md'),
	srcRoot: path.join(__dirname, '..'),
	quiet: true,
	test: true,
}

describe('features documentation', () => {
	describe('markdown docs', () => {
		it('is in sync with the TypeScript source', () => {
			try {
				featuresMarkdownUpdate(config)
			} catch (e) {
				expect(e).toSatisfy(
					e => e === undefined,
					trimWhitespacePrefix(`
						docs/features.md is out of sync with the TypeScript source. Run \`pnpm fix\` to regenerate.
					`),
				)
			}
		})

		it('is valid Markdown', async () => {
			const content = generateMarkdown(config)

			await assertValidMarkdown(content)
		})

		it('has correct grammar', async () => {
			const content = generateMarkdown(config)

			await grammarLint(content, { language: 'markdown' })
		})
	})
})

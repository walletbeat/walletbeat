import { describe, expect, it } from 'vitest'

import { renderedHtmlToMarkdown } from './utils/evaluation-details'
import { grammarLintMessages, warmupHarperLinter } from './utils/grammar'

await warmupHarperLinter()

describe('grammarLintMessages', () => {
	it('ignores inline code in rendered details', async () => {
		expect(
			await grammarLintMessages(
				renderedHtmlToMarkdown(
					'<p>The wallet truncates <code>uint160</code> values in <code>getOriginIsScam</code>.</p>',
				),
				{ language: 'markdown' },
			),
		).toEqual([])
	})

	it('lints struck-through text in rendered details', async () => {
		expect(
			await grammarLintMessages(renderedHtmlToMarkdown('<p><s>Fixed flaw text.</s></p>'), {
				language: 'markdown',
			}),
		).toEqual([])
		expect(
			await grammarLintMessages(renderedHtmlToMarkdown('<p><s>The the flaw is fixed.</s></p>'), {
				language: 'markdown',
			}),
		).not.toEqual([])
	})
})

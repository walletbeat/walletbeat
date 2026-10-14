import { describe, expect, it } from 'vitest'

import { renderedHtmlToMarkdown } from './utils/evaluation-details'
import { grammarLintMessages, warmupHarperLinter } from './utils/grammar'

await warmupHarperLinter()

describe('grammarLintMessages', () => {
	it('flags "backup" used as a verb', async () => {
		expect(
			await grammarLintMessages('You should backup your wallet.', { language: 'markdown' }),
		).not.toEqual([])
	})

	it('allows "backup" in a compound noun', async () => {
		expect(
			await grammarLintMessages('Backup password prompt bypassable', { language: 'markdown' }),
		).toEqual([])
	})

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

import { describe, expect, it } from 'vitest'

import { renderedHtmlToMarkdown } from './utils/evaluation-details'
import { grammarLintMessages, warmupHarperLinter } from './utils/grammar'

await warmupHarperLinter()

describe('grammarLintMessages', () => {
	it.each(['You should backup your wallet.', 'You should backup password files.'])(
		'flags "backup" used as a verb in %j',
		async text => {
			expect(await grammarLintMessages(text, { language: 'markdown' })).not.toEqual([])
		},
	)

	it('ignores verbatim audit finding titles', async () => {
		expect(
			await grammarLintMessages('Medium: RBY-01-014 WP1-WP2: Backup password prompt bypassable', {
				language: 'markdown',
			}),
		).toEqual([])
	})

	it.each([
		'Use the value:String parameter.',
		'It depends on The user who holds the key.',
		'Open the dapp settings.',
		'The on-chain registry is public.',
	])('applies site-convention rules to %j outside Markdown code only', async text => {
		expect(await grammarLintMessages(text, { language: 'markdown' })).not.toEqual([])
		expect(await grammarLintMessages(`Run \`${text}\` once.`, { language: 'markdown' })).toEqual([])
		expect(
			await grammarLintMessages(`Run this once:\n\n\`\`\`\n${text}\n\`\`\`\n`, {
				language: 'markdown',
			}),
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

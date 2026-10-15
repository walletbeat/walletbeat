import { describe, expect, it, vi } from 'vitest'

import { aiTellsLinter } from './utils/ai-tells'
import { grammarLintMessages, harperGrammarLinter } from './utils/grammar'
import { GrammarTextKind, type Lint } from './utils/linter'

function aiProseMessages(messages: string[]): string[] {
	return messages.filter(message => message.includes(': AI prose:'))
}

describe('AI prose linter', () => {
	it.each(Object.values(GrammarTextKind))(
		'scopes punctuation to references and word frequency to all text for %s',
		async kind => {
			const lints = await aiTellsLinter.lint('gate; gated — gating', { language: 'markdown' }, kind)

			expect(lints.map(lint => lint.get_problem_text())).toEqual(
				kind === GrammarTextKind.GENERAL
					? ['gate', 'gated', 'gating']
					: [';', '—', 'gate', 'gated', 'gating'],
			)
		},
	)

	it.each([
		[2, 2, 0],
		[3, 2999, 3],
		[3, 3000, 0],
		[4, 3000, 4],
	])('checks %i occurrences in %i words', async (count, totalWords, expectedLints) => {
		const text = [
			...Array<string>(count).fill('ship'),
			...Array<string>(totalWords - count).fill('wallet'),
		].join(' ')
		const lints = await aiTellsLinter.lint(text, { language: 'plaintext' })

		expect(lints).toHaveLength(expectedLints)
	})

	it('matches word families case-insensitively without matching other words', async () => {
		const lints = await aiTellsLinter.lint(
			'Gate gates GATED gating ship Ships SHIPPED shipping gateway shipment',
			{ language: 'plaintext' },
		)

		expect(lints.map(lint => lint.get_problem_text())).toEqual([
			'Gate',
			'gates',
			'GATED',
			'gating',
			'ship',
			'Ships',
			'SHIPPED',
			'shipping',
		])
	})

	it('excludes code from the word-frequency denominator', async () => {
		const code = 'wallet '.repeat(3000)
		const text = ['gate gated gating', '```', code, '```'].join('\n')

		const lints = await aiTellsLinter.lint(text, { language: 'markdown' })

		expect(lints.map(lint => lint.get_problem_text())).toEqual(['gate', 'gated', 'gating'])
	})

	it('uses the declared language for code exclusions', async () => {
		const text = '`gate gated gating`'

		expect(await aiTellsLinter.lint(text)).toEqual([])
		expect(await aiTellsLinter.lint(text, { language: 'plaintext' })).toHaveLength(3)
	})
})

describe('grammar pipeline prose exclusions', () => {
	it('keeps diagnostics that start in prose and span non-prose', async () => {
		const text = 'Wallet details include `details` for users.'
		const codeStart = text.indexOf('`')
		const codeEnd = text.lastIndexOf('`') + 1
		const harperLint = (start: number, end: number, message: string): Lint => ({
			get_problem_text: () => text.slice(start, end),
			lint_kind_pretty: () => 'Sentence structure',
			suggestions: () => [],
			span: () => ({ start, end }),
			message: () => message,
		})
		const lint = vi
			.spyOn(harperGrammarLinter, 'lint')
			.mockResolvedValue([
				harperLint(0, text.length, 'Sentence diagnostic.'),
				harperLint(codeStart, codeEnd, 'Non-prose diagnostic.'),
			])

		try {
			expect(await grammarLintMessages(text, { language: 'markdown' })).toEqual([
				expect.stringContaining('Sentence diagnostic.'),
			])
		} finally {
			lint.mockRestore()
		}
	})

	it.each(['`on-chain gate gated gating;—`', 'https://example.com/on-chain/gate/gated/gating;—'])(
		'shares non-prose exclusions across diagnostic categories: %s',
		async text => {
			const messages = await grammarLintMessages(
				text,
				{ language: 'markdown' },
				GrammarTextKind.REFERENCE_EXPLANATION,
			)

			expect(messages).toEqual([])
		},
	)

	it('keeps visible link labels subject to grammar and AI prose rules', async () => {
		const messages = await grammarLintMessages(
			'[on-chain gate gated gating;—](/wallet)',
			{ language: 'markdown' },
			GrammarTextKind.REFERENCE_LABEL,
		)

		expect(messages.filter(message => message.includes(': Site convention:'))).toHaveLength(1)
		expect(aiProseMessages(messages)).toHaveLength(5)
	})

	it('does not exempt AI prose via cspell patterns or GitHub labels', async () => {
		const cspellPatternMessages = await grammarLintMessages(
			'tl;dr',
			{ language: 'markdown' },
			GrammarTextKind.REFERENCE_LABEL,
		)
		const githubLabelMessages = await grammarLintMessages(
			'[gate.ts @abc1234](/one) [gated.ts @abc1234](/two) [gating.ts @abc1234](/three)',
			{ language: 'markdown' },
		)

		expect(aiProseMessages(cspellPatternMessages)).toHaveLength(1)
		expect(aiProseMessages(githubLabelMessages)).toHaveLength(3)
	})
})

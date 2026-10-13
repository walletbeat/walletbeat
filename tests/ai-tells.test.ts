import { describe, expect, it, vi } from 'vitest'

import { aiTellsLinter } from './utils/ai-tells'
import { grammarLintMessages, harperGrammarLinter } from './utils/grammar'
import { formatLintMessages, GrammarTextKind, type Lint } from './utils/linter'

function aiProseMessages(messages: string[]): string[] {
	return messages.filter(message => message.includes(': AI prose:'))
}

describe('AI prose linter', () => {
	it.each(Object.values(GrammarTextKind))('scopes punctuation for %s', async kind => {
		const text = 'One clause; another clause — with detail.'
		const lints = await aiTellsLinter.lint(text, { language: 'markdown' }, kind)

		expect(lints.map(lint => lint.get_problem_text())).toEqual(
			kind === GrammarTextKind.GENERAL ? [] : [';', '—'],
		)
	})

	it.each(Object.values(GrammarTextKind))('checks relative frequency for %s', async kind => {
		const lints = await aiTellsLinter.lint('gate gated gating', { language: 'markdown' }, kind)

		expect(lints.map(lint => lint.get_problem_text())).toEqual(['gate', 'gated', 'gating'])
	})

	it.each([
		[0, 0, 0],
		[1, 1, 0],
		[2, 2, 0],
		[3, 2999, 3],
		[3, 3000, 0],
		[4, 3000, 4],
		[4, 4000, 0],
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

	it('excludes non-prose from both occurrence and word counts while preserving diagnostics', async () => {
		const code = Array<string>(3000).fill('wallet gate ship;—').join(' ')
		const text = `🔒 [gate](/ship "gate") \`\`${code}\`\` [gated](https://example.com/ship) gating;—`
		const lints = await aiTellsLinter.lint(
			text,
			{ language: 'markdown' },
			GrammarTextKind.REFERENCE_EXPLANATION,
		)

		expect(lints.map(lint => lint.get_problem_text())).toEqual([
			';',
			'—',
			'gate',
			'gated',
			'gating',
		])

		for (const lint of lints) {
			const { start, end } = lint.span()

			expect(text.slice(start, end)).toBe(lint.get_problem_text())
		}
		expect(lints.filter(lint => lint.get_problem_text() === 'gate')[0].message()).toContain(
			'3 times in 3 words',
		)
		expect(formatLintMessages(text, lints).join('\n')).toContain('𜱭gating𜱫')
	})

	it('uses the declared language for code exclusions', async () => {
		const text = '`gate gated gating`'

		expect(await aiTellsLinter.lint(text)).toEqual([])
		expect(await aiTellsLinter.lint(text, { language: 'markdown' })).toEqual([])
		expect(await aiTellsLinter.lint(text, { language: 'plaintext' })).toHaveLength(3)
	})

	it.each(['`details`', 'https://wallet.invalid/details'])(
		'preserves diagnostics starting in prose and spanning %s',
		async nonProse => {
			const text = `Wallet details include ${nonProse} for users.`
			const start = text.indexOf(nonProse)
			const end = start + nonProse.length
			const sentenceLint: Lint = {
				get_problem_text: () => text,
				lint_kind_pretty: () => 'Sentence structure',
				suggestions: () => [],
				span: () => ({ start: 0, end: text.length }),
				message: () => 'Sentence diagnostic.',
			}
			const nonProseLint: Lint = {
				get_problem_text: () => text.slice(start, end),
				lint_kind_pretty: () => 'Sentence structure',
				suggestions: () => [],
				span: () => ({ start, end }),
				message: () => 'Non-prose diagnostic.',
			}
			const lint = vi
				.spyOn(harperGrammarLinter, 'lint')
				.mockResolvedValue([sentenceLint, nonProseLint])

			try {
				const messages = await grammarLintMessages(text, { language: 'markdown' })

				expect(messages.filter(message => message.includes(': Sentence structure:'))).toHaveLength(
					1,
				)
				expect(messages.join('\n')).toContain('Sentence diagnostic.')
			} finally {
				lint.mockRestore()
			}
		},
	)

	it.each([
		'`on-chain gate gated gating;—`',
		'``on-chain ` gate gated gating;—``',
		'~~~\non-chain gate gated gating;—\n~~~',
		'Wallet details.\n\n    on-chain gate gated gating;—',
		'[Wallet](/on-chain/gate/gated/gating;—)',
		'[Wallet](/path_(on-chain)/gate/gated/gating;—)',
		'[Wallet](/path "on-chain gate gated gating;—")',
		'[Wallet][on-chain]\n\n[on-chain]: /gate/gated/gating;—',
		'https://example.com/on-chain/gate/gated/gating;—',
	])('shares non-prose exclusions across diagnostic categories: %s', async text => {
		const messages = await grammarLintMessages(
			text,
			{ language: 'markdown' },
			GrammarTextKind.REFERENCE_EXPLANATION,
		)

		expect(messages).toEqual([])
	})

	it('keeps visible link labels subject to grammar and AI prose rules', async () => {
		const messages = await grammarLintMessages(
			'[on-chain gate gated gating;—](/wallet)',
			{ language: 'markdown' },
			GrammarTextKind.REFERENCE_LABEL,
		)

		expect(messages.filter(message => message.includes(': Site convention:'))).toHaveLength(1)
		expect(aiProseMessages(messages)).toHaveLength(5)
	})

	it('integrates with grammar checks without inheriting spelling exemptions', async () => {
		const referenceMessages = await grammarLintMessages(
			'tl;dr',
			{ language: 'markdown' },
			GrammarTextKind.REFERENCE_LABEL,
		)
		const labelMessages = await grammarLintMessages(
			'[gate.ts @abc1234](/one) [gated.ts @abc1234](/two) [gating.ts @abc1234](/three)',
			{ language: 'markdown' },
		)

		expect(aiProseMessages(referenceMessages)).toHaveLength(1)
		expect(aiProseMessages(labelMessages)).toHaveLength(3)
		expect(await grammarLintMessages('tl;dr', { language: 'markdown' })).toEqual([])
	})
})

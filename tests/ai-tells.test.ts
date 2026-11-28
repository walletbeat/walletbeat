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
		const lints = await aiTellsLinter.lint(text, { language: 'plaintext' }, GrammarTextKind.GENERAL)

		expect(lints).toHaveLength(expectedLints)
	})

	it('matches word families case-insensitively without matching other words', async () => {
		const lints = await aiTellsLinter.lint(
			'Gate gates GATED gating ship Ships SHIPPED shipping gateway shipment',
			{ language: 'plaintext' },
			GrammarTextKind.GENERAL,
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

	it('flags the verb "names" and adjective "named", but not the noun "name"/"names"', async () => {
		const lints = await aiTellsLinter.lint(
			'the protocol names the wallet. it names this feature. a wallet named MetaMask. the named entity.',
			{ language: 'plaintext' },
			GrammarTextKind.GENERAL,
		)

		expect(lints.map(lint => lint.get_problem_text())).toEqual(['names', 'names', 'named', 'named'])
	})

	it('flags a single verb "names" or adjective "named"', async () => {
		const verbLints = await aiTellsLinter.lint(
			'the protocol names the wallet',
			{ language: 'plaintext' },
			GrammarTextKind.GENERAL,
		)
		const adjectiveLints = await aiTellsLinter.lint(
			'Parses the named wallet',
			{ language: 'plaintext' },
			GrammarTextKind.GENERAL,
		)

		expect(verbLints.map(lint => lint.get_problem_text())).toEqual(['names'])
		expect(adjectiveLints.map(lint => lint.get_problem_text())).toEqual(['named'])
	})

	it('flags the attributive adjective "named" and reports correct character spans', async () => {
		const lints = await aiTellsLinter.lint(
			'the named wallet',
			{ language: 'plaintext' },
			GrammarTextKind.GENERAL,
		)

		expect(lints).toHaveLength(1)
		expect(lints[0].get_problem_text()).toBe('named')
		expect(lints[0].span()).toEqual({ start: 4, end: 9 })
	})

	it('does not flag noun uses of "name"/"names"', async () => {
		const lints = await aiTellsLinter.lint(
			'ENS names resolve onchain. domain names are used. wallet names are displayed. the attribute name. human-readable names. full names.',
			{ language: 'plaintext' },
			GrammarTextKind.GENERAL,
		)

		expect(lints).toEqual([])
	})

	it('does not flag passive "is named", idiomatic "named after", or past-tense verb objects', async () => {
		const lints = await aiTellsLinter.lint(
			'The landmark is named Table of contents. It is named after the founder. they named the product. they named us.',
			{ language: 'plaintext' },
			GrammarTextKind.GENERAL,
		)

		expect(lints).toEqual([])
	})

	it('excludes code from the word-frequency denominator', async () => {
		const code = 'wallet '.repeat(3000)
		const text = ['gate gated gating', '```', code, '```'].join('\n')

		const lints = await aiTellsLinter.lint(text, { language: 'markdown' }, GrammarTextKind.GENERAL)

		expect(lints.map(lint => lint.get_problem_text())).toEqual(['gate', 'gated', 'gating'])
	})

	it('uses the declared language for code exclusions', async () => {
		const text = '`gate gated gating`'

		expect(await aiTellsLinter.lint(text, undefined, GrammarTextKind.GENERAL)).toEqual([])
		expect(
			await aiTellsLinter.lint(text, { language: 'plaintext' }, GrammarTextKind.GENERAL),
		).toHaveLength(3)
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

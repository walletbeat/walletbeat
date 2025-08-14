import * as harper from 'harper.js'
import { expect } from 'vitest'

import { allWallets } from '@/data/wallets'
import { getCSpellWords } from '@/tests/utils/cspell'
import { ContentType, type TypographicContent } from '@/types/content'
import { trimWhitespacePrefix } from '@/types/utils/text'

let vocabulary: string[] | null = null

function getVocabulary(): string[] {
	if (vocabulary === null) {
		const cSpellWords = getCSpellWords()
		const walletNames: string[] = Object.values(allWallets).map(
			wallet => wallet.metadata.displayName,
		)

		vocabulary = cSpellWords
			.concat(walletNames)
			.reduce<string[]>((prev, cur) => {
				if (cur.toLowerCase() === cur) {
					return prev.concat([cur])
				}

				return prev.concat([cur, `${cur}'s`])
			}, [])
			.sort()
			.reduce<string[]>((prev, cur) => (prev.includes(cur) ? prev : prev.concat([cur])), [])
	}

	return vocabulary
}

async function prepareLinter(linter: harper.LocalLinter) {
	await linter.setDialect(harper.Dialect.American)
	await linter.importWords(getVocabulary())
	await linter.setup()
}

let linter: harper.LocalLinter | null = null

async function getLinter(): Promise<harper.LocalLinter> {
	if (linter === null) {
		linter = new harper.LocalLinter({
			binary: harper.binary,
		})
		await prepareLinter(linter)
	}

	return linter
}

/** Warm up grammar linter if not already initialized. */
export async function warmupGrammarLinter() {
	await getLinter()
}

/** Lint a string for grammar errors. */
export async function grammarLint(text: string, lintOptions?: harper.LintOptions) {
	const linter = await getLinter()

	const lints = await linter.lint(trimWhitespacePrefix(text), lintOptions)

	const message: string[] = []

	for (const lint of lints) {
		message.push(`- ${lint.span().start}:${lint.span().end}: ${lint.message()}`)

		if (lint.suggestion_count() !== 0) {
			message.push('  Consider:')

			for (const sug of lint.suggestions()) {
				switch (sug.kind()) {
					case harper.SuggestionKind.Remove:
						message.push(`   - Remove: "${lint.get_problem_text()}"`)
						break
					case harper.SuggestionKind.InsertAfter:
						message.push(
							`   - After "${lint.get_problem_text()}", insert "${sug.get_replacement_text()}"`,
						)
						break
					case harper.SuggestionKind.Replace:
						message.push(
							`   - Replace: "${lint.get_problem_text()}" with "${sug.get_replacement_text()}"`,
						)
						break
				}
			}
		}
	}

	if (message.length > 0) {
		// This assertion will never match and makes no sense on its own.
		// However it is what looks the best in Vitest output.
		expect(
			['Grammar check:']
				.concat(text.split('\n').map(line => `  ${line}`))
				.concat(message)
				.join('\n'),
		).toBe('free of grammatical errors')
	}
}

/** Lints typographic content. */
export async function contentGrammarLint(content: TypographicContent) {
	switch (content.contentType) {
		case ContentType.MARKDOWN:
			return await grammarLint(content.markdown, { language: 'markdown' })
		case ContentType.TEXT:
			return await grammarLint(content.text, { language: 'plaintext' })
	}
}

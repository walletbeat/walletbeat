import * as harper from 'harper.js'
import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import { getCSpellWords } from '@/tests/utils/cspell'
import {
	ContentType,
	prerenderTypographicContent,
	type TypographicContent,
	typographicContentWithExtraOptionalStrings,
} from '@/types/content'
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

async function prepareHarperLinter(linter: harper.LocalLinter) {
	await linter.setDialect(harper.Dialect.American)
	await linter.setLintConfig({
		RoadMap: false, // This otherwise corrects "roadmap" to "road map".
	})
	await linter.importWords(getVocabulary())
	await linter.setup()
}

let harperLinter: harper.LocalLinter | null = null

async function getHarperLinter(): Promise<harper.LocalLinter> {
	if (harperLinter === null) {
		harperLinter = new harper.LocalLinter({
			binary: harper.binary,
		})
		await prepareHarperLinter(harperLinter)
	}

	return harperLinter
}

/** Warm up grammar linter if not already initialized. */
export async function warmupHarperLinter() {
	await getHarperLinter()
}

interface Suggestion {
	get_replacement_text(): string
	kind(): harper.SuggestionKind
}

interface Span {
	start: number
	end: number
}

interface Lint {
	/**
	 * Get the content of the source material pointed to by [`Self::span`]
	 */
	get_problem_text(): string
	/**
	 * Get a string representing the general category of the lint.
	 */
	lint_kind_pretty(): string
	/**
	 * Get an array of any suggestions that may resolve the issue.
	 */
	suggestions(): Suggestion[]
	/**
	 * Get the location of the problematic text.
	 */
	span(): Span
	/**
	 * Get a description of the error.
	 */
	message(): string
}

interface AbstractLinter {
	lint(text: string, lintOptions?: harper.LintOptions): Promise<Lint[]>
}

const specificWordingLinters: Map<string, AbstractLinter> = new Map()

function getRegexpLinter({
	name,
	regExp,
	replace,
}: {
	name: string
	regExp: RegExp
	replace: (substring: string) => string
}): () => Promise<AbstractLinter> {
	return (): Promise<AbstractLinter> => {
		let linter = specificWordingLinters.get(name)

		if (linter === undefined) {
			linter = {
				lint(text: string, _lintOptions?: harper.LintOptions): Promise<Lint[]> {
					const lints: Lint[] = []

					for (const match of text.matchAll(regExp)) {
						const matchedText = match[0]
						const replacement = replace(matchedText)
						const start = match.index
						const end = start + matchedText.length
						const suggestion: Suggestion = {
							get_replacement_text(): string {
								return replacement
							},
							kind(): harper.SuggestionKind {
								return harper.SuggestionKind.Replace
							},
						}
						const lint: Lint = {
							get_problem_text(): string {
								return matchedText
							},
							lint_kind_pretty(): string {
								return 'Site convention'
							},
							suggestions(): Suggestion[] {
								return [suggestion]
							},
							span(): Span {
								return { start, end }
							},
							message(): string {
								return `The term "${matchedText}" is deprecated across the site. Use "${replacement}" instead.`
							},
						}

						lints.push(lint)
					}

					return Promise.resolve(lints)
				},
			}
			specificWordingLinters.set(name, linter)
		}

		return Promise.resolve(linter)
	}
}

const grammarLinters: (() => Promise<AbstractLinter>)[] = [
	getHarperLinter,
	getRegexpLinter({
		name: 'dApp', // Replace dApp and dApps
		regExp: /\bdapps?\b/gi,
		replace: (substring: string) => (substring.endsWith('s') ? 'apps' : 'app'),
	}),
]

/** Lint a string for grammar errors. */
export async function grammarLint(text: string, lintOptions?: harper.LintOptions) {
	const trimmedText = trimWhitespacePrefix(text)
	let lints: Lint[] = []

	for (const grammarLinterFn of grammarLinters) {
		const linter = await grammarLinterFn()

		lints = lints.concat(await linter.lint(trimmedText, lintOptions))
	}
	const message: string[] = []

	for (const lint of lints) {
		message.push(
			`- ${lint.span().start}:${lint.span().end}: ${lint.lint_kind_pretty()}: ${lint.message()}`,
		)

		if (lint.suggestions().length !== 0) {
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

/** Lints wallet-related typographic content with wallet data. */
export function walletContentGrammarLint(
	name: string,
	content:
		| string
		| TypographicContent<
				| null
				| { WALLET_NAME: string }
				| {
						WALLET_NAME: string
						WALLET_PSEUDONYM_SINGULAR: string | null
						WALLET_PSEUDONYM_PLURAL: string | null
				  }
		  >,
) {
	describe(name, () => {
		it('has correct grammar', async () => {
			if (typeof content === 'string') {
				await grammarLint(content, { language: 'plaintext' })
			} else {
				const rendered = prerenderTypographicContent<{
					WALLET_NAME: string
					WALLET_PSEUDONYM_SINGULAR: string | null
					WALLET_PSEUDONYM_PLURAL: string | null
				}>(typographicContentWithExtraOptionalStrings(content), {
					WALLET_NAME: 'Example Wallet',
					WALLET_PSEUDONYM_SINGULAR: 'Example Wallet Username',
					WALLET_PSEUDONYM_PLURAL: 'Example Wallet Usernames',
				})

				await contentGrammarLint(rendered)
			}
		})
	})
}

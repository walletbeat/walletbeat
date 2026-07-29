import * as harper from 'harper.js'
import { describe, expect, it } from 'vitest'

import { allWallets } from '@/data/wallets'
import { gitCommitRefPinRegExp } from '@/schema/url'
import { getCSpellPatterns, getCSpellWords } from '@/tests/utils/cspell'
import {
	ContentType,
	prerenderTypographicContent,
	type TypographicContent,
	typographicContentWithExtraOptionalStrings,
} from '@/types/content'
import { trimWhitespacePrefix } from '@/types/utils/text'

/**
 * Proper nouns that are spelled with a leading lowercase letter (e.g. imKey).
 * We ignore Capitalization lints for these so the grammar rule does not force "ImKey" etc.
 */
const PROPER_NOUNS_LOWERCASE_FIRST = new Set(['imKey', 'imToken', 'polymutex'])

let vocabulary: string[] | null = null

function getVocabulary(): string[] {
	if (vocabulary === null) {
		const cSpellWords = getCSpellWords()
		const walletNames: string[] = Object.values(allWallets).map(
			wallet => wallet.metadata.displayName,
		)
		// Wallet IDs (URL slugs) are not fully in cspell; add them so Harper accepts them in generated markdown URLs (e.g. .../trezor#maintenance).
		const walletIds: string[] = Object.values(allWallets).map(wallet => wallet.metadata.id)

		vocabulary = cSpellWords
			.concat(walletNames)
			.concat(walletIds)
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

let vocabularySet: Set<string> | null = null

export function isInVocabulary(word: string): boolean {
	if (vocabularySet === null) {
		const s = new Set<string>()

		for (const word of getVocabulary()) {
			s.add(word.toLowerCase())
		}
		vocabularySet = s
	}

	return vocabularySet.has(word.toLowerCase())
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
			binary: harper.binaryInlined,
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

function isInsideMarkdownLinkUrl(text: string, start: number): boolean {
	const before = text.substring(0, start)
	const lastLinkStart = before.lastIndexOf('](')

	if (lastLinkStart === -1) {
		return false
	}

	const urlStart = lastLinkStart + 2
	const afterLinkStart = text.substring(urlStart)
	const closeParen = afterLinkStart.indexOf(')')

	if (closeParen === -1) {
		return true
	}

	const urlEnd = urlStart + closeParen

	return start >= urlStart && start < urlEnd
}

/**
 * Check if a given position falls inside a standalone URL (e.g. `https://example.com/path`).
 */
function isInsideUrl(text: string, start: number): boolean {
	const urlRegex = /\bhttps?:\/\/[^\s,)'"\]]+/gi

	for (const match of text.matchAll(urlRegex)) {
		const urlStart = match.index ?? 0
		const urlEnd = urlStart + match[0].length

		if (start >= urlStart && start < urlEnd) {
			return true
		}
	}

	return false
}

function getRegexpLinter({
	name,
	regExp,
	replace,
}: {
	name: string
	regExp: RegExp
	replace: ((substring: string) => string) | null
}): () => Promise<AbstractLinter> {
	return (): Promise<AbstractLinter> => {
		let linter = specificWordingLinters.get(name)

		if (linter === undefined) {
			linter = {
				lint(text: string, _lintOptions?: harper.LintOptions): Promise<Lint[]> {
					const lints: Lint[] = []

					for (const match of text.matchAll(regExp)) {
						const matchedText = match[0]
						const start = match.index ?? 0

						if (isInsideMarkdownLinkUrl(text, start)) {
							continue
						}

						if (isInsideUrl(text, start)) {
							continue
						}

						const replacement = replace === null ? null : replace(matchedText)
						const end = start + matchedText.length
						const suggestion: Suggestion | null =
							replacement === null
								? null
								: {
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
								return suggestion === null ? [] : [suggestion]
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
	getRegexpLinter({
		name: 'L2BEAT', // Always uppercase
		regExp: /\bL2B(?!EAT\b)[Ee][Aa][Tt]\b/g,
		replace: () => 'L2BEAT',
	}),
	getRegexpLinter({
		name: 'onchain', // Use onchain not on-chain
		regExp: /\bon-chain\b/g,
		replace: () => 'onchain',
	}),
]

/**
 * Return all character ranges in `text` that belong to auto-generated
 * GitHub labels (e.g. "dapp.ts L48-65 @5caa9e2").
 *
 * These labels are produced by `getGitHubUrlLabel()` in `src/schema/url.ts`
 * and contain filenames, line ranges, commit hashes, etc. that come from
 * the referenced repository's source, not from Walletbeat's own text.
 */
function collectGitHubLabelRanges(text: string): { start: number; end: number }[] {
	const ranges: { start: number; end: number }[] = []

	// First, find all commit hash pins to anchor which parts of the text
	// are part of GitHub labels.
	const hashSpans: { start: number; end: number }[] = []

	for (const m of text.matchAll(gitCommitRefPinRegExp)) {
		hashSpans.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length })
	}

	// For each hash pin, expand backward to cover the full label:
	// filename, optional line range ("L123-456"), spaces.
	for (const hash of hashSpans) {
		const labelEnd = hash.end

		// Walk backward from the hash to find the start of the label.
		// Include filename chars, line ranges, spaces, trailing slashes (tree labels),
		// and slashes in org/repo paths.
		let pos = hash.start - 1

		while (pos >= 0) {
			const ch = text[pos]
			// Filename chars: alphanumeric, dot, hyphen, underscore
			// Line-range chars: "L" followed by digits/dashes
			// Path separators and trailing slashes
			// Spaces between parts

			if (/[\w.\-\s]/.test(ch)) {
				pos--
			} else {
				break
			}
		}

		ranges.push({ start: pos + 1, end: labelEnd })
	}

	return ranges
}

/**
 * Return all character ranges in `text` matched by any active cspell pattern.
 */
function collectCspellPatternRanges(text: string): { start: number; end: number }[] {
	const ranges: { start: number; end: number }[] = []
	const patterns = getCSpellPatterns()

	for (const regex of patterns) {
		for (const m of text.matchAll(regex)) {
			const start = m.index ?? 0

			ranges.push({ start, end: start + m[0].length })
		}
	}

	return ranges
}

/** Return true if `[spanStart, spanEnd)` overlaps any entry in `ranges`. */
function overlapsAnyRange(
	spanStart: number,
	spanEnd: number,
	ranges: { start: number; end: number }[],
): boolean {
	for (const r of ranges) {
		if (spanStart < r.end && spanEnd > r.start) {
			return true
		}
	}

	return false
}

let cspellWordsSet: Set<string> | null = null

function getCspellWordsSet(): Set<string> {
	if (cspellWordsSet === null) {
		const s = new Set<string>()

		for (const word of getCSpellWords()) {
			s.add(word.toLowerCase())
		}
		cspellWordsSet = s
	}

	return cspellWordsSet
}

/** Return true if `word` appears in .cspell.json's `words` list (case-insensitive). */
function isInCspellWords(word: string): boolean {
	return getCspellWordsSet().has(word.toLowerCase())
}

/** Lint a string for grammar errors; return raw error messages. */
export async function grammarLintMessages(
	text: string,
	lintOptions?: harper.LintOptions,
): Promise<string[]> {
	const trimmedText = trimWhitespacePrefix(text)

	// Precompute ranges covered by cspell "patterns" so we can suppress lints inside them.
	const cspellRanges = collectCspellPatternRanges(trimmedText)
	// Same for GitHub labels
	const githubLabelRanges = collectGitHubLabelRanges(trimmedText)

	let lints: Lint[] = []

	for (const grammarLinterFn of grammarLinters) {
		const linter = await grammarLinterFn()

		lints = lints.concat(await linter.lint(trimmedText, lintOptions))
	}

	// Ignore lints inside markdown link URLs (e.g. wallet slugs in /wallet-id paths).
	lints = lints.filter(lint => !isInsideMarkdownLinkUrl(trimmedText, lint.span().start))

	// Ignore lints that fall inside text that is part of an ignored text range.
	lints = lints.filter(lint => !overlapsAnyRange(lint.span().start, lint.span().end, cspellRanges))
	lints = lints.filter(
		lint => !overlapsAnyRange(lint.span().start, lint.span().end, githubLabelRanges),
	)

	// Ignore Capitalization lints for brand names that are spelled with leading lowercase.
	lints = lints.filter(
		lint =>
			lint.lint_kind_pretty() !== 'Capitalization' ||
			!PROPER_NOUNS_LOWERCASE_FIRST.has(lint.get_problem_text()),
	)

	// Ignore Spelling lints for standalone "s" (false positive from markdown/punctuation tokenization).
	lints = lints.filter(
		lint => lint.lint_kind_pretty() !== 'Spelling' || lint.get_problem_text() !== 's',
	)

	// Ignore Spelling lints for possessive proper nouns whose base word is in the cspell
	// vocabulary (e.g. "Gnosis's": "Gnosis" is in .cspell.json so it is a valid proper noun).
	lints = lints.filter(lint => {
		if (lint.lint_kind_pretty() !== 'Spelling') {
			return true
		}

		const text = lint.get_problem_text()
		const firstChar = text[0]

		if (!text.endsWith("'s") || !firstChar) {
			return true
		}

		const baseWord = text.slice(0, -2)

		if (firstChar.toUpperCase() !== firstChar && !PROPER_NOUNS_LOWERCASE_FIRST.has(baseWord)) {
			return true
		}

		return !isInCspellWords(baseWord)
	})

	// Ignore Word Choice lints for "lockdown" — used intentionally as a compound noun (e.g. "onchain lockdown").
	lints = lints.filter(
		lint => lint.lint_kind_pretty() !== 'Word Choice' || lint.get_problem_text() !== 'lockdown',
	)

	// Ignore hyphenization for known words.
	lints = lints.filter(
		lint =>
			lint.lint_kind_pretty() !== 'Miscellaneous' ||
			!lint.message().includes('Hyphenate') ||
			!isInCspellWords(lint.get_problem_text()),
	)

	// Ignore Readability (sentence too long) lints when "etc." appears inside the span
	// followed by a non-uppercase letter, since Harper does not recognize "etc." as a
	// sentence terminator and merges what should be separate sentences into one span.
	lints = lints.filter(lint => {
		if (lint.lint_kind_pretty() !== 'Readability') {
			return true
		}

		const spanText = trimmedText.substring(lint.span().start, lint.span().end)
		const etcIdx = spanText.indexOf('etc.')

		if (etcIdx === -1 || etcIdx + 4 >= spanText.length) {
			return true
		}

		const charAfterEtc = spanText[etcIdx + 4]

		// "etc." followed by a non-uppercase letter (e.g. "etc. they", "etc. however")
		// means Harper merged sentences Harper should have split at "etc."
		return charAfterEtc.toUpperCase() !== charAfterEtc
	})

	const message: string[] = []

	for (const lint of lints) {
		const before = trimmedText.substring(Math.max(0, lint.span().start - 16), lint.span().start)
		const after = trimmedText.substring(
			lint.span().end,
			Math.min(trimmedText.length, lint.span().end + 16),
		)
		const badText = trimmedText.substring(lint.span().start, lint.span().end)
		const span = `…${before}𜱭${badText}𜱫${after}…`

		message.push(
			`- ${lint.span().start}:${lint.span().end} (${JSON.stringify(span)}): ${lint.lint_kind_pretty()}: ${lint.message()}`,
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

	return message
}

/** Lint a string for grammar errors. */
export async function grammarLint(text: string, lintOptions?: harper.LintOptions) {
	const message = await grammarLintMessages(text, lintOptions)

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

/**
 * @returns Whether the given text is likely to be english.
 */
export async function isLikelyEnglish(str: string): Promise<boolean> {
	const linter = await getHarperLinter()

	return await linter.isLikelyEnglish(str)
}

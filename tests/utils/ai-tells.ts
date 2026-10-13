/*
 * Writing patterns that make prose read as AI-generated. Once such prose makes
 * up most of the site, the repeated sentence structure makes the whole site
 * sound generated, and untrustworthy as a consequence.
 */

import { extractProse } from '@/utils/markdown-utils'

import { type AbstractLinter, GrammarTextKind, type Lint } from './linter'

/** Punctuation banned in reference `explanation` and `label` fields. */
const refPunctuationTells = [
	{
		name: 'semicolon',
		regExp: /;/g,
		advice: 'Split the clauses into separate sentences.',
	},
	{
		name: 'em dash',
		regExp: /—/g,
		advice: 'Use a period, comma, colon, or parentheses instead.',
	},
]

/** Words that read as AI-generated when repeated within a body of text. */
const aiWordFamilies = [
	{ name: 'gate', regExp: /\bgat(?:e|es|ed|ing)\b/gi },
	{ name: 'ship', regExp: /\bship(?:s|ped|ping)?\b/gi },
]

/** A word family may occur this many times, however short the text. */
const maxOccurrencesBeforeDensityCheck = 2

/** Above the floor, the limit is this many occurrences per 1000 prose words. */
const maxOccurrencesPer1000Words = 1

function aiProseLint(match: RegExpMatchArray, message: string): Lint {
	const start = match.index ?? 0

	return {
		get_problem_text: () => match[0],
		lint_kind_pretty: () => 'AI prose',
		suggestions: () => [],
		span: () => ({ start, end: start + match[0].length }),
		message: () => message,
	}
}

/** Apply reference punctuation rules and contextual word-frequency rules. */
export const aiTellsLinter: AbstractLinter = {
	lint(text, lintOptions, kind = GrammarTextKind.GENERAL): Promise<Lint[]> {
		const { prose } = extractProse(text, lintOptions?.language)
		const lints: Lint[] = []

		if (
			kind === GrammarTextKind.REFERENCE_LABEL ||
			kind === GrammarTextKind.REFERENCE_EXPLANATION
		) {
			for (const tell of refPunctuationTells) {
				for (const match of prose.matchAll(tell.regExp)) {
					lints.push(aiProseLint(match, `Avoid ${tell.name} in reference prose. ${tell.advice}`))
				}
			}
		}

		const wordCount = (prose.match(/\b[a-z][a-z'-]*\b/gi) ?? []).length

		for (const family of aiWordFamilies) {
			const matches = Array.from(prose.matchAll(family.regExp))
			const per1000Words = (matches.length * 1000) / wordCount

			if (
				matches.length > maxOccurrencesBeforeDensityCheck &&
				per1000Words > maxOccurrencesPer1000Words
			) {
				const message =
					`"${family.name}" occurs ${matches.length} times in ${wordCount} words ` +
					`(${per1000Words.toFixed(2)} per 1000 words, above the limit of ` +
					`${maxOccurrencesPer1000Words} once past ${maxOccurrencesBeforeDensityCheck} occurrences). ` +
					'Reword some of these occurrences.'

				lints.push(...matches.map(match => aiProseLint(match, message)))
			}
		}

		return Promise.resolve(lints)
	},
}

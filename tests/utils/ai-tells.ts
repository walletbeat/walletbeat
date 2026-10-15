/*
 * Repeated wording across wallet reports can make the site sound AI-generated.
 * Check reference punctuation and flag words that appear too often.
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

interface AiWordFamily {
	name: string
	regExp: RegExp

	/** Allow this many uses regardless of text length. */
	maxOccurrencesBeforeDensityCheck: number

	/** After the allowed count, limit uses per 1000 prose words. */
	maxOccurrencesPer1000Words: number
}

/** Words that read as AI-generated when repeated within a body of text. */
const aiWordFamilies: AiWordFamily[] = [
	{
		name: 'gate',
		regExp: /\bgat(?:e|es|ed|ing)\b/gi,
		maxOccurrencesBeforeDensityCheck: 2,
		maxOccurrencesPer1000Words: 1,
	},
	{
		name: 'ship',
		regExp: /\bship(?:s|ped|ping)?\b/gi,
		maxOccurrencesBeforeDensityCheck: 2,
		maxOccurrencesPer1000Words: 1,
	},
]

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

/** Check reference punctuation and word frequency in prose. */
export const aiTellsLinter: AbstractLinter = {
	lint(text, lintOptions, kind): Promise<Lint[]> {
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
				matches.length > family.maxOccurrencesBeforeDensityCheck &&
				per1000Words > family.maxOccurrencesPer1000Words
			) {
				const message =
					`"${family.name}" occurs ${matches.length} times in ${wordCount} words ` +
					`(${per1000Words.toFixed(2)} per 1000 words, above the limit of ` +
					`${family.maxOccurrencesPer1000Words} once past ${family.maxOccurrencesBeforeDensityCheck} occurrences). ` +
					'Reword some of these occurrences.'

				lints.push(...matches.map(match => aiProseLint(match, message)))
			}
		}

		return Promise.resolve(lints)
	},
}

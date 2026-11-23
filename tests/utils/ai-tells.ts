/*
 * Repeated wording across wallet reports can make the site sound AI-generated.
 * Check reference punctuation and flag words that appear too often.
 */

import nlp from 'compromise'

import { extractProse } from '@/utils/markdown-utils'

import { type AbstractLinter, GrammarTextKind, type Lint } from './linter'

/** A single flagged occurrence with its character span in the source prose. */
interface WordMatch {
	text: string
	start: number
	end: number
}

/** A term as parsed by compromise's `json()` output. */
interface ParsedTerm {
	text: string
	tags: string[]
	/** Whitespace/punctuation following this term (e.g. `", "` after a list item). */
	post: string
	/** Character offset within the source text, from compromise's `offset` field. */
	start: number
	length: number
}

interface ParsedSentence {
	terms: ParsedTerm[]
}

/**
 * Extract the parsed sentences from compromise's `json({ offset: true })` output,
 * validating each against `isParsedSentence`.
 */
function parseSentences(json: unknown): ParsedSentence[] {
	return Array.isArray(json) ? json.filter(isParsedSentence) : []
}

/**
 * Narrow compromise's untyped `json({ offset: true })` output to the term fields
 * we consume.
 */
function isParsedSentence(value: unknown): value is ParsedSentence {
	if (typeof value !== 'object' || value === null) {
		return false
	}

	if (!('terms' in value) || !Array.isArray(value.terms)) {
		return false
	}

	return value.terms.every((term: unknown) => {
		if (typeof term !== 'object' || term === null) {
			return false
		}

		return (
			'text' in term &&
			typeof term.text === 'string' &&
			'tags' in term &&
			Array.isArray(term.tags) &&
			'post' in term &&
			typeof term.post === 'string' &&
			'offset' in term &&
			typeof term.offset === 'object' &&
			term.offset !== null &&
			'start' in term.offset &&
			typeof term.offset.start === 'number' &&
			'length' in term.offset &&
			typeof term.offset.length === 'number'
		)
	})
}

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

	/** Return the occurrences of this word family in `prose`. */
	match: (prose: string) => WordMatch[]

	/** Allow this many uses regardless of text length. */
	maxOccurrencesBeforeDensityCheck: number

	/** After the allowed count, limit uses per 1000 prose words. */
	maxOccurrencesPer1000Words: number
}

/** Match a word family with a case-insensitive regular expression. */
function regexpMatcher(regExp: RegExp): (prose: string) => WordMatch[] {
	return (prose: string) =>
		Array.from(prose.matchAll(regExp)).map(match => ({
			text: match[0],
			start: match.index ?? 0,
			end: (match.index ?? 0) + match[0].length,
		}))
}

/**
 * Nouns/adjectives that can immediately precede "name"/"names" in a noun phrase.
 *
 * compromise sometimes mis-tags the noun "names" as a verb when it follows one
 * of these modifiers (e.g. "domain names only", "wallet names are displayed").
 * Expand this list as needed, for noun-phrases only.
 */
const nameNounModifiers =
	'accessible|attribute|branch|control|cookie|dns|domain|ens|entry-derived|erc-7828|erc-7831|evaluation|file|font|full|function|group|header|heading/link|human-friendly|human-readable|local|long|option|parameter|property|region|suite|timeline|variant|wallet'

/** True if `prev` is a noun-modifier that makes "names" a noun (e.g. "domain names"). */
function isNameNounModifier(prev: ParsedTerm | undefined): boolean {
	return prev !== undefined && new RegExp(`^(?:${nameNounModifiers})$`, 'i').test(prev.text)
}

/**
 * Flag the verb "names" and the adjective "named".
 *
 * The AI-ism is describing a thing by the name it was given, e.g. "the protocol
 * names the wallet" or "Parses the named wallet".
 */
function nameMatcher(prose: string): WordMatch[] {
	const doc = nlp(prose)
	const matches: WordMatch[] = []
	const terms: ParsedTerm[] = []

	for (const sentence of parseSentences(doc.json({ offset: true }))) {
		terms.push(...sentence.terms)
	}

	for (let i = 0; i < terms.length; i++) {
		const term = terms[i]
		const next = terms[i + 1]
		const prev = terms[i - 1]

		if (/^names$/i.test(term.text) && term.tags.includes('Verb')) {
			// compromise occasionally tags the noun "names" as a verb inside a
			// comma-separated noun list (e.g. "email addresses, names, bank
			// account numbers") or after a noun-modifier (e.g. "domain names
			// only"). Skip.
			if (isNounListItem(prev) || isNameNounModifier(prev)) {
				continue
			}

			matches.push({ text: term.text, start: term.start, end: term.start + term.length })
		} else if (
			/^named$/i.test(term.text) &&
			term.tags.includes('Verb') &&
			term.tags.includes('PastTense') &&
			// Passive voice (e.g. "the landmark is named Table of contents") is not
			// the AI-ism "named X".
			!term.tags.includes('Passive') &&
			next !== undefined &&
			// The adjective "named" modifies a following noun ("the named
			// wallet") or a following name ("a wallet named MetaMask"). A pronoun
			// after "named" is a true past-tense verb object ("named us"), not
			// the AI-ism.
			next.tags.includes('Noun') &&
			!next.tags.includes('Pronoun')
		) {
			matches.push({ text: term.text, start: term.start, end: term.start + term.length })
		}
	}

	return matches
}

/** True if `prev` is the tail of a comma-separated list item preceding "names". */
function isNounListItem(prev: ParsedTerm | undefined): boolean {
	if (prev === undefined) {
		return false
	}

	return prev.post.trimEnd().endsWith(',') || /^(?:and|or)$/i.test(prev.text)
}

/** Words that read as AI-generated when repeated within a body of text. */
const aiWordFamilies: AiWordFamily[] = [
	{
		name: 'gate',
		match: regexpMatcher(/\bgat(?:e|es|ed|ing)\b/gi),
		maxOccurrencesBeforeDensityCheck: 2,
		maxOccurrencesPer1000Words: 1,
	},
	{
		name: 'ship',
		match: regexpMatcher(/\bship(?:s|ped|ping)?\b/gi),
		maxOccurrencesBeforeDensityCheck: 2,
		maxOccurrencesPer1000Words: 1,
	},
	{
		name: 'name',
		match: nameMatcher,
		maxOccurrencesBeforeDensityCheck: 0,
		maxOccurrencesPer1000Words: 0,
	},
]

function aiProseLint(match: WordMatch, message: string): Lint {
	return {
		get_problem_text: () => match.text,
		lint_kind_pretty: () => 'AI prose',
		suggestions: () => [],
		span: () => ({ start: match.start, end: match.end }),
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
					const start = match.index ?? 0
					const wordMatch: WordMatch = {
						text: match[0],
						start,
						end: start + match[0].length,
					}

					lints.push(
						aiProseLint(wordMatch, `Avoid ${tell.name} in reference prose. ${tell.advice}`),
					)
				}
			}
		}

		const wordCount = (prose.match(/\b[a-z][a-z'-]*\b/gi) ?? []).length

		for (const family of aiWordFamilies) {
			const matches = family.match(prose)
			const per1000Words = (matches.length * 1000) / wordCount

			if (
				matches.length > family.maxOccurrencesBeforeDensityCheck &&
				per1000Words > family.maxOccurrencesPer1000Words
			) {
				const zeroTolerance = family.maxOccurrencesBeforeDensityCheck === 0
				const message =
					`"${family.name}" occurs ${matches.length} times in ${wordCount} words ` +
					(zeroTolerance
						? '(and must not be used as a verb or adjective at all). '
						: `(${per1000Words.toFixed(2)} per 1000 words, above the limit of ` +
							`${family.maxOccurrencesPer1000Words} once past ` +
							`${family.maxOccurrencesBeforeDensityCheck} occurrences). `) +
					'Reword this to avoid the AI-ism.'

				lints.push(...matches.map(match => aiProseLint(match, message)))
			}
		}

		return Promise.resolve(lints)
	},
}

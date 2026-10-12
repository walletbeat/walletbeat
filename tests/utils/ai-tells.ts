/*
 * Writing patterns that make prose read as AI-generated. Once such prose makes
 * up most of the site, the repeated sentence structure makes the whole site
 * sound generated, and untrustworthy as a consequence.
 */

import type { FullyQualifiedReference } from '@/schema/reference'

import { isInsideMarkdownLinkUrl, isInsideUrl } from './grammar'

interface PunctuationTell {
	name: string
	regExp: RegExp
	advice: string
}

/** Punctuation banned in reference `explanation` and `label` fields. */
const refPunctuationTells: PunctuationTell[] = [
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

function isInsideInlineCode(text: string, start: number): boolean {
	for (const match of text.matchAll(/`[^`]*`/g)) {
		const codeStart = match.index ?? 0

		if (start > codeStart && start < codeStart + match[0].length) {
			return true
		}
	}

	return false
}

/** Return a human-readable message for each banned punctuation mark in `text`. */
export function refPunctuationTellViolations(text: string): string[] {
	const violations: string[] = []

	for (const tell of refPunctuationTells) {
		for (const match of text.matchAll(tell.regExp)) {
			const start = match.index ?? 0

			if (
				isInsideUrl(text, start) ||
				isInsideMarkdownLinkUrl(text, start) ||
				isInsideInlineCode(text, start)
			) {
				continue
			}

			violations.push(`${tell.name} in "${text}". ${tell.advice}`)
		}
	}

	return violations
}

/** Check every explanation and URL label in fully qualified references. */
export function referencePunctuationTellViolations(refs: FullyQualifiedReference[]): string[] {
	return refs.flatMap(ref => [
		...(ref.explanation ? refPunctuationTellViolations(ref.explanation) : []),
		...ref.urls.flatMap(url => (url.label ? refPunctuationTellViolations(url.label) : [])),
	])
}

interface WordFamily {
	name: string
	regExp: RegExp
}

/** Words that read as AI-generated when repeated across a page. */
const aiWordFamilies: WordFamily[] = [
	{ name: 'gate', regExp: /\bgat(?:e|es|ed|ing)\b/gi },
	{ name: 'ship', regExp: /\bship(?:s|ped|ping)?\b/gi },
]

/** A word family may occur this many times on any page, however short. */
const maxOccurrencesBeforeDensityCheck = 2

/** Above the floor, a word family may not exceed this many occurrences per 1000 words. */
const maxOccurrencesPer1000Words = 1

/** Remove the parts of Markdown that are not prose: URLs, link targets, and inline code contents. */
function markdownProse(markdown: string): string {
	return markdown
		.replace(/\]\([^)]*\)/g, ']')
		.replace(/https?:\/\/\S+/g, '')
		.replace(/`[^`]*`/g, '`…`')
}

function snippetAround(text: string, start: number, length: number): string {
	const snippetRadius = 40

	return text
		.slice(Math.max(0, start - snippetRadius), start + length + snippetRadius)
		.replace(/\s+/g, ' ')
		.trim()
}

/** Return a human-readable message for each word family overused in `markdown`. */
export function aiWordDensityViolations(markdown: string): string[] {
	const prose = markdownProse(markdown)
	const wordCount = (prose.match(/\b[a-z][a-z'-]*\b/gi) ?? []).length
	const violations: string[] = []

	for (const family of aiWordFamilies) {
		const matches = Array.from(prose.matchAll(family.regExp))
		const per1000Words = (matches.length * 1000) / wordCount

		if (
			matches.length > maxOccurrencesBeforeDensityCheck &&
			per1000Words > maxOccurrencesPer1000Words
		) {
			const snippets = matches.map(
				match => `  - "...${snippetAround(prose, match.index, match[0].length)}..."`,
			)

			violations.push(
				`"${family.name}" occurs ${matches.length} times in ${wordCount} words ` +
					`(${per1000Words.toFixed(2)} per 1000 words, above the limit of ` +
					`${maxOccurrencesPer1000Words} once past ${maxOccurrencesBeforeDensityCheck} occurrences). ` +
					`Reword some of these:\n${snippets.join('\n')}`,
			)
		}
	}

	return violations
}

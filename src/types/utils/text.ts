// Text manipulation utility functions.
import { isNonEmptyArray } from './non-empty'
import type { Strings } from './string-templates'

/**
 * Recursively replaces `{{KEY}}` in the text with values from the given `strings` object.
 *
 * @param text - The text to interpolate.
 * @param strings - The strings to use. Some keys may map to null, but if the template contains this key, this function will fail.
 *
 * @returns The interpolated text.
 *
 * @example
 * ```ts
 * renderStrings('Hello {{NAME}}!'', { NAME: "John Doe" })
 * // -> "Hello John Doe!"
 * ```
 */
export function renderStrings(text: string, strings: Strings): string {
	return text.replaceAll(/\{\{(?<key>[^|{}]+)\}\}/g, (_, key: string) => {
		if (strings === null) {
			throw new Error(`Tried to render template with unknown key ${key} (no replacements expected)`)
		}

		if (key in strings && strings[key] !== null) {
			return renderStrings(strings[key], strings)
		}

		if (key in strings) {
			throw new Error(`Tried to render template with key ${key} which was null`)
		}

		throw new Error(`Tried to render template with unknown key ${key}`)
	})
}

/**
 * Slugify a camelCaseString into a-slug-like-this.
 */
export function slugifyCamelCase(camelCaseString: string): string {
	return camelCaseString
		.replaceAll('_', '-')
		.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
}

/**
 * Return the prefix to use before a list item in a comma-separated list.
 * For example, ["a", "b", "c", "d"] would be written as "a, b, c and d".
 * @param index The index of the element being rendered.
 * @param listSize The total size of the list.
 * @returns The prefix to use before the element.
 */
export function commaListPrefix(index: number, listSize: number, and?: string): string {
	if (index === 0) {
		return ''
	}

	return index < listSize - 1 ? ', ' : ` ${and ?? 'and'} `
}

/**
 * Format a list of strings into a comma-separated list.
 * Falsy values are ignored.
 */
export function commaListFormat(
	items: Array<string | false | null | undefined>,
	and?: string,
): string {
	const filtered = items.filter(item => typeof item === 'string' && item !== '')

	return filtered.map((item, i) => `${commaListPrefix(i, filtered.length, and)}${item}`).join('')
}

/**
 * Format a set of items as either an inline sentence (if there is only one item)
 * or as a markdown list if there are more than one.
 *
 * @param items The set of items. Leading and trailing whitespace will be removed. First letter should be lowercase if meant to be part of a sentence.
 * @param settings: Set of settings for formatting. `singleItemTemplate` and `listItemTemplate` must each contain the substring "ITEM".
 * @returns
 */
export function markdownListFormat(
	items: Array<string | null | undefined>,
	settings: {
		uppercaseFirstCharacterOfListItems: boolean
		singleItemTemplate: string
		multiItemPrefix?: string
		multiItemTemplate: string
		multiItemSuffix?: string
		ifEmpty?: string | { behavior: 'THROW_ERROR' }
	},
): string {
	const filtered = items.filter(
		(item): item is string => typeof item === 'string' && item.trim() !== '',
	)
	const trimmed = filtered.map(item => item.trim())

	if (!isNonEmptyArray(trimmed)) {
		if (settings.ifEmpty === undefined) {
			return ''
		}

		if (typeof settings.ifEmpty === 'string') {
			return settings.ifEmpty
		}

		throw new Error('Tried to format a markdown list of zero items')
	}

	if (trimmed.length === 1) {
		return settings.singleItemTemplate.replace('ITEM', trimmed[0])
	}

	return (
		(settings.multiItemPrefix ?? '') +
		trimmed
			.map(item => {
				if (item !== '' && settings.uppercaseFirstCharacterOfListItems) {
					item = item.charAt(0).toUpperCase() + item.slice(1)
				}

				return settings.multiItemTemplate.replace('ITEM', item)
			})
			.join('') +
		(settings.multiItemSuffix ?? '')
	)
}

/**
 * Trim longest shared whitespace prefix in all non-whitespace-only lines.
 *
 * Useful to make Markdown text properly indented in source code, yet
 * rendered correctly when passed to the Markdown renderer which assumes
 * no indentation in its input.
 */
export function trimWhitespacePrefix(str: string): string {
	const lines = str.split('\n')
	let longestCommonPrefix: string | null = null

	for (const line of lines) {
		if (line.trim() === '') {
			continue // Ignore whitespace-only lines.
		}

		const whitespacePrefixReg = /^\s+/.exec(line)

		if (whitespacePrefixReg === null) {
			return str // No common whitespace prefix. Short circuit.
		}

		let whitespacePrefix = whitespacePrefixReg[0]

		if (longestCommonPrefix === null) {
			// First non-whitespace-only line.
			// Set the common prefix to the current one.
			longestCommonPrefix = whitespacePrefix
			continue
		}

		if (whitespacePrefix.length > longestCommonPrefix.length) {
			// Trim to match length of common prefix.
			whitespacePrefix = whitespacePrefix.substring(0, longestCommonPrefix.length)
		} else if (whitespacePrefix.length < longestCommonPrefix.length) {
			// Trim to match length of current line prefix.
			longestCommonPrefix = longestCommonPrefix.substring(0, whitespacePrefix.length)
		}

		if (whitespacePrefix !== longestCommonPrefix) {
			return str // No common whitespace prefix. Short circuit.
		}
	}

	if (longestCommonPrefix === null || longestCommonPrefix === '') {
		return str
	}

	return lines
		.map(line =>
			line.startsWith(longestCommonPrefix)
				? line.substring(longestCommonPrefix.length)
				: line.trim() === ''
					? ''
					: line,
		)
		.join('\n')
}

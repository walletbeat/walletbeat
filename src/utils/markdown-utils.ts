/**
 * Collapse runs of 3+ newlines to exactly two (one blank line).
 */
export function normalizeMarkdownBlankLines(content: string): string {
	return content.replace(/\n{3,}/g, '\n\n')
}

/**
 * Convert text into markdown blockquote lines, handling multi-line input.
 */
export function markdownBlockquote(text: string): string[] {
	return text
		.trim()
		.split('\n')
		.map(line => (line === '' ? '>' : `> ${line}`))
}

/**
 * Collapse a possibly multi-line string into a single trimmed line.
 * Intended for short inline text only (e.g. blurbs, reference explanations).
 * Throws if the input contains multiline-only markdown (triple-backtick code
 * blocks or blockquote lines), since flattening those would produce invalid output.
 */
export function collapseToSingleLine(text: string): string {
	const trimmed = text.trim()

	if (trimmed.includes('```')) {
		throw new Error(
			'collapseToSingleLine does not support triple-backtick code blocks; input must be inline-only text',
		)
	}

	if (/^\s*>/m.test(trimmed)) {
		throw new Error(
			'collapseToSingleLine does not support blockquote lines; input must be inline-only text',
		)
	}

	return trimmed.replace(/\s+/g, ' ')
}

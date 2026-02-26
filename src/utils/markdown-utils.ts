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
 */
export function collapseToSingleLine(text: string): string {
	return text.trim().replace(/\s+/g, ' ')
}

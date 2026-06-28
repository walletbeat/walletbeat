import { stringHasPrefix } from '@/types/utils/text'

import {
	ContentType,
	type Frontmatter,
	type MarkdownContent,
	type MarkdownContentWithFrontmatter,
} from '../types/content'
import type { Strings } from '../types/utils/string-templates'

/**
 * Extract all markdown-style links from a document.
 * Returns an array of { text, url, line, isImage } objects.
 * Skips links inside code blocks and inline code.
 */
export interface ExtractedLink {
	/** The display text of the link (or alt text for images). */
	text: string
	/** The URL of the link. */
	url: string
	/** The 1-based line number where the link appears. */
	line: number
	/** Whether this link is an image (`![alt](url)`). */
	isImage: boolean
}

/**
 * Extract all links from a Markdown document.
 * Skips links inside code blocks (fenced and indented) and inline code.
 * Handles both standard links `[text](url)` and images `![alt](url)`.
 */
export function extractMarkdownLinks(content: string): ExtractedLink[] {
	const links: ExtractedLink[] = []
	const lines = content.split('\n')
	let inCodeBlock = false
	let codeBlockFenceLength = 0

	for (let lineNum = 0; lineNum < lines.length; lineNum++) {
		const line = lines[lineNum]
		const lineNum1 = lineNum + 1 // 1-based

		// Track fenced code blocks
		const trimmedLine = line.trimStart()
		const backtickMatch = trimmedLine.match(/`+/)
		const backtickLength = backtickMatch ? backtickMatch[0].length : 0

		// Opening fence: 3+ backticks, optionally followed by a language specifier.
		// Closing fence: 3+ backticks followed by only whitespace.
		// Per CommonMark, the info string after opening backticks cannot contain backticks.
		const hasFenceBackticks = backtickLength >= 3
		const isOpeningFence = hasFenceBackticks && !inCodeBlock
		const isClosingFence =
			hasFenceBackticks &&
			inCodeBlock &&
			backtickLength >= codeBlockFenceLength &&
			trimmedLine.slice(backtickLength).match(/^\s*$/)

		if (isOpeningFence) {
			inCodeBlock = true
			codeBlockFenceLength = backtickLength
			continue
		}

		if (isClosingFence) {
			inCodeBlock = false
			codeBlockFenceLength = 0
			continue
		}

		if (inCodeBlock) {
			continue
		}

		// Track indented code blocks (4+ spaces)
		if (/^ {4,}/.test(line) && !line.trim().startsWith('[')) {
			continue
		}

		// Remove inline code from the line before searching for links
		const lineWithoutInlineCode = line.replace(/`[^`]+`/g, match => {
			// Replace with same-length spaces to preserve positions
			return ' '.repeat(match.length)
		})

		// Match standard links and images:
		// - [text](url) or [text](url "title")
		// - [text](<url>) for URLs with special chars like parentheses
		const linkRegex = /(!?)\[([^\]]*)]\((?:<([^>]+)>|([^)\s]+))(?:\s+\S*)?\)/g

		let match: RegExpExecArray | null

		while ((match = linkRegex.exec(lineWithoutInlineCode)) !== null) {
			const isImage = match[1] === '!'
			const text = match[2]
			const url = match[3] ?? match[4] // bracket-style or plain

			links.push({ text, url, line: lineNum1, isImage })
		}

		// Match reference link definitions: [ref]: url or [ref]: <url>
		const refRegex = /^\s*\[[^\]]+\]:\s+(<[^>]+>|\S+)/gm

		let refMatch: RegExpExecArray | null

		while ((refMatch = refRegex.exec(lineWithoutInlineCode)) !== null) {
			let url = refMatch[1]

			// Strip angle brackets from bracket-style URLs
			if (url.startsWith('<') && url.endsWith('>')) {
				url = url.slice(1, -1)
			}

			links.push({
				text: refMatch[0].slice(0, refMatch[0].indexOf(':')),
				url,
				line: lineNum1,
				isImage: false,
			})
		}
	}

	return links
}

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

/**
 * Un-escape the inner content of a YAML-quoted string.
 * - Single-quoted: '' → '
 * - Double-quoted: \\" → ", \\\\ → \
 */
function unescapeYamlString(content: string, quote: '"' | "'"): string {
	if (quote === "'") {
		// Single-quoted: only '' needs un-escaping.
		return content.replace(/''/g, "'")
	}

	// Double-quoted: \\" → " and \\\\ → \
	let result = ''
	let i = 0

	while (i < content.length) {
		if (content[i] === '\\' && i + 1 < content.length) {
			const next = content[i + 1]

			if (next === '"') {
				result += '"'
			} else if (next === '\\') {
				result += '\\'
			} else {
				// Unknown escape — keep as-is (pass through backslash + char).
				result += content[i]
			}

			i += 2
		} else {
			result += content[i]
			i++
		}
	}

	return result
}

/**
 * Strip YAML-like block scalars from Frontmatter lines.
 * Handles `>` (folded) and `|` (literal) block indicators.
 * Returns { key, value, isBlockStart } where isBlockStart indicates
 * the value is empty and subsequent indented lines belong to this block.
 */
function parseFrontmatterLine(line: string): { key: string; value: string; isBlockStart: boolean } {
	const match = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line)

	if (!match) {
		throw new Error(`Invalid frontmatter line: ${line}`)
	}

	const key = match[1]
	const rawValue = match[2].trim()

	if (rawValue === '>' || rawValue === '|') {
		return { key, value: '', isBlockStart: true }
	}

	// Strip surrounding YAML string quotes (single or double) and un-escape.
	// In YAML, single-quoted strings use '' for a literal ', and double-quoted
	// strings use \" for a literal " (and \\ for a literal \).
	const strippedValue =
		(rawValue[0] === '"' && rawValue[rawValue.length - 1] === '"') ||
		(rawValue[0] === "'" && rawValue[rawValue.length - 1] === "'")
			? unescapeYamlString(rawValue.slice(1, -1), rawValue[0])
			: rawValue

	return { key, value: strippedValue, isBlockStart: false }
}

export function assertIsFrontmatter<_Frontmatter extends Frontmatter>(
	obj: Record<string, string | string[]>,
	expected: { [_ in keyof _Frontmatter]: unknown },
): asserts obj is _Frontmatter {
	for (const key of Object.keys(expected)) {
		const keyStr = String(key)

		if (!(keyStr in obj)) {
			throw new Error(`Missing required frontmatter key: ${keyStr}`)
		}
	}
}

/**
 * Parse Frontmatter text into a typed record.
 * Supports inline values, folded blocks (>), and literal blocks (|).
 *
 * @param frontmatterText The raw Frontmatter text (between the --- delimiters).
 * @param expected Record from expected Frontmatter keys to `true`.
 * @throws Error if any of the expected Frontmatter keys is not found.
 */
function parseFrontmatter<_Frontmatter extends Frontmatter = {}>(
	frontmatterText: string,
	expected: { [K in keyof _Frontmatter]: true },
): _Frontmatter {
	const lines = frontmatterText.split('\n')
	const result: Record<string, string> = {}
	let i = 0

	while (i < lines.length) {
		const line = lines[i]

		if (line.trim() === '') {
			i++
			continue
		}

		// Check if this line is a continuation of a block scalar (indented)
		if (line.startsWith('  ') || line.startsWith('\t')) {
			// This should be handled by the block scalar logic below
			// If we reach here without a pending block, it's an error
			throw new Error(`Unexpected indented line in frontmatter without block scalar: ${line}`)
		}

		const parsed = parseFrontmatterLine(line)
		const { key, value, isBlockStart } = parsed

		if (isBlockStart) {
			const blockLines: string[] = []

			i++
			while (i < lines.length) {
				const blockLine = lines[i]

				// Empty lines within block scalars are allowed
				if (blockLine === '') {
					i++
					// An empty line might signal the end of the block if the next non-empty line is not indented
					let peek = i

					while (peek < lines.length && lines[peek] === '') {
						peek++
					}

					if (
						peek < lines.length &&
						!(lines[peek].startsWith('  ') || lines[peek].startsWith('\t'))
					) {
						// End of block
						break
					}

					// Otherwise, keep the empty line and continue
					blockLines.push('')
					continue
				}

				if (blockLine.startsWith('  ') || blockLine.startsWith('\t')) {
					// Strip common indentation (2 spaces or 1 tab)
					blockLines.push(blockLine.replace(/^[ \t]+/, ''))
					i++
				} else {
					// Non-indented line ends the block
					break
				}
			}

			while (blockLines.length > 0 && blockLines[blockLines.length - 1] === '') {
				blockLines.pop()
			}

			if (value === '') {
				const headerMatch = /^([A-Za-z_][\w-]*)\s*:\s*(>||)$/.exec(lines[i - blockLines.length - 1])
				const indicator = headerMatch ? headerMatch[2] : '|'

				if (indicator === '>') {
					result[key] = blockLines.join(' ')
				} else {
					result[key] = blockLines.join('\n')
				}
			}
		} else {
			result[key] = value
			i++
		}
	}

	assertIsFrontmatter<_Frontmatter>(result, expected)

	return result
}

/**
 * Parse Markdown document that is expected to have Frontmatter.
 * Strips blank lines before Frontmatter and at the end of the document.
 *
 * @param markdown The raw Markdown document.
 * @param frontmatter Record from expected Frontmatter keys to `true`.
 * @throws Error if any of the expected Frontmatter keys is not found.
 */
export function parseMarkdownWithFrontmatter<_Frontmatter extends Frontmatter = {}>(
	markdown: string,
	frontmatter: { [K in keyof _Frontmatter]: true },
): MarkdownContentWithFrontmatter<null, _Frontmatter> {
	// Strip leading blank lines
	const doc = markdown.replace(/^\s+/, '')

	// Must start with ---
	if (!doc.startsWith('---')) {
		throw new Error('Markdown document does not start with frontmatter delimiter (---)')
	}

	// Split on the first --- to get past the opening delimiter
	const afterOpening = doc.slice(3) // Remove the leading ---

	// Find the closing ---
	const closingIndex = afterOpening.indexOf('\n---')

	if (closingIndex === -1) {
		throw new Error('Missing closing frontmatter delimiter (---)')
	}

	const frontmatterText = afterOpening.slice(0, closingIndex)
	const bodyAfterFrontmatter = afterOpening.slice(closingIndex + '\n---'.length)
	const parsedFrontmatter = parseFrontmatter<_Frontmatter>(frontmatterText, frontmatter)
	const body = bodyAfterFrontmatter.replace(/^\s+/, '').replace(/\s+$/, '')

	return {
		contentType: ContentType.MARKDOWN,
		markdown: body,
		strings: null,
		frontmatter: parsedFrontmatter,
	}
}

/**
 * Strip the single H1 title from a MarkdownContent body.
 * Validates that there is exactly one H1 heading and it is the first non-empty line.
 * Also strips blank lines between the H1 and the next content.
 *
 * @param content The Markdown content.
 * @throws Error if there is no H1, multiple H1s, or if the H1 is not the first non-empty line.
 * @returns MarkdownContent with the H1 and surrounding blank lines removed.
 */
export function stripMarkdownTitle<_Strings extends Strings = null>(
	content: MarkdownContent<_Strings>,
): MarkdownContent<_Strings> {
	const lines = content.markdown.split('\n')
	const h1Indices: number[] = []
	let inCodeBlock = false

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]

		// Track triple-backtick code blocks
		if (line.trim().startsWith('```')) {
			inCodeBlock = !inCodeBlock
			continue
		}

		// Only look for H1 headings outside code blocks
		if (!inCodeBlock && /^# /.test(line)) {
			h1Indices.push(i)
		}
	}

	// Validate exactly one H1
	if (h1Indices.length === 0) {
		throw new Error('Markdown body must contain exactly one H1 heading, but found none')
	}

	if (h1Indices.length > 1) {
		throw new Error(
			`Markdown body must contain exactly one H1 heading, but found ${h1Indices.length}. Found at indices: ${h1Indices.join(', ')}`,
		)
	}

	const h1Index = h1Indices[0]

	// Validate it's the first non-empty line
	for (let i = 0; i < h1Index; i++) {
		if (lines[i].trim() !== '') {
			throw new Error(
				`The H1 heading must be the first non-empty line, but found content at line ${i + 1}: ${lines[i]}`,
			)
		}
	}

	// Remove the H1 and any blank lines before and after it
	const resultLines: string[] = []

	// Keep blank lines before H1 (there shouldn't be any non-empty lines, validated above)
	// Actually, we strip leading blank lines too since they come from the frontmatter separation
	// Find the first non-empty line (which should be the H1)
	let start = 0

	while (start < lines.length && lines[start].trim() === '') {
		start++
	}

	// Skip the H1 line
	start++

	// Skip blank lines immediately after the H1
	while (start < lines.length && lines[start].trim() === '') {
		start++
	}

	// Copy the rest
	for (let i = start; i < lines.length; i++) {
		resultLines.push(lines[i])
	}

	// Strip trailing blank lines from the result
	while (resultLines.length > 0 && resultLines[resultLines.length - 1].trim() === '') {
		resultLines.pop()
	}

	return {
		contentType: ContentType.MARKDOWN,
		markdown: resultLines.join('\n'),
		strings: content.strings,
	}
}

/**
 * Convert URLs (links, embedded images) in a Markdown document for
 * presentation on an HTML page at a different URL.
 * Does not touch URLs that contain `https://`; only affects
 * URLs that are absolute (`/foo/bar`) or relative (`./foo/bar`).
 *
 * @param content The Markdown document.
 * @param options Options for rewriting.
 */
export function rewriteMarkdownURLs<_Strings extends Strings = null>(
	content: MarkdownContent<_Strings>,
	options: {
		/**
		 * Repo-root-relative path of the Markdown file that `content` is from.
		 * Must start with `/` (representing the repository root) and end with `.md`.
		 * Used for resolving relative URLs.
		 */
		repoRootRelativePath: `/${string}.md`

		/**
		 * Repo-root-relative path to a subtree where all Markdown files are
		 * assumed to be unique to their specific subdirectory, and that there
		 * exists an `index.astro` file next to them.
		 * When a Markdown document links to a `.md` file that is found to be
		 * somewhere under `repoRootPagesDir`, the last component of the URL is
		 * removed (e.g. `/foo/bar/baz.md` becomes `/foo/bar/` with the trailing
		 * slash), such that the URL will resolve to the `index.astro` page at
		 * this directory. This transformation happens before the
		 * `repoRootRelativePaths` transformation.
		 */
		repoRootPagesDir: `/${string}/`

		/**
		 * Set of known repo-root-relative paths and corresponding URLs they should map to.
		 * For example, if a link in the Markdown document links to `/foo/bar.html`
		 * (or, equivalently, if the Markdown document is at `/foo/bar/baz.md` and links
		 * to `../bar.html`), and `repoRootRelativePaths` contains `{"/foo": "/quux"}`,
		 * then the URL will be rewritten to `/quux/bar.html`.
		 *
		 * This transformation must be applied exactly once per link found in the Markdown
		 * document (other than links starting with `https://`). If a link does not
		 * correspond to any of these prefixes, then an error is thrown.
		 */
		repoRootRelativePaths: Record<`/${string}`, `/${string}` | `https://${string}`>

		/**
		 * Set of URL prefixes that should never be present in the Markdown file, otherwise
		 * this function will throw an error.
		 * Useful to prevent Markdown files from containing links to GitHub that could be
		 * links to the website's own pages.
		 */
		forbiddenURLPrefixes?: `https://${string}`[]

		/**
		 * Set of full URLs that are allowed to exist in the Markdown document even if
		 * they are in `forbiddenURLPrefixes`.
		 */
		whitelistURLs?: `https://${string}`[]
	},
): MarkdownContent<_Strings> {
	const markdown = content.markdown
	const {
		repoRootRelativePath,
		repoRootRelativePaths,
		repoRootPagesDir,
		forbiddenURLPrefixes,
		whitelistURLs,
	} = options

	// Resolve the directory of the source markdown file
	const sourceDir = repoRootRelativePath.replace(/[^/]*$/, '') // removes filename, keeps trailing /

	/**
	 * Resolve a relative path against the source file's directory.
	 * E.g., if source is /src/pages/docs/file.md and url is ../other.html,
	 * this returns /src/pages/other.html
	 */
	function resolveRelativeUrl(url: string): string {
		if (url.startsWith('/')) {
			return url
		} // already absolute

		const basePath = sourceDir
		const urlParts = url.split('/')
		const baseParts = basePath.split('/').filter(Boolean)

		const resultParts = [...baseParts]
		const hasTrailingSlash = url.endsWith('/')

		for (let i = 0; i < urlParts.length; i++) {
			const part = urlParts[i]

			if (part === '') {
				// Allow empty segments from leading or trailing slashes (e.g. `./foo/` → ['', 'foo', ''])
				// but reject mid-path double slashes (e.g. `foo//bar` → ['foo', '', 'bar'])
				if (i > 0 && i < urlParts.length - 1) {
					throw new Error(
						`Invalid URL segment in path resolution: '${url}'. Empty segments are not allowed (e.g. double slashes).`,
					)
				}

				continue
			}

			if (part === '.') {
				continue
			}

			if (part === '..') {
				if (resultParts.length === 0) {
					throw new Error(
						`Relative path '${url}' tries to go outside the repository root. Cannot navigate above the source file's topmost ancestor.`,
					)
				}

				resultParts.pop()
				continue
			}

			resultParts.push(part)
		}

		let result = '/' + resultParts.join('/')

		if (hasTrailingSlash && !result.endsWith('/')) {
			result += '/'
		}

		return result
	}

	/**
	 * Find the longest matching prefix from repoRootRelativePaths.
	 * Returns null if no prefix matches.
	 */
	function findMatchingPrefix(url: string): { prefix: string; replacement: string } | null {
		// Sort prefixes by length (descending) to get longest match first
		const sortedPrefixes = Object.entries(repoRootRelativePaths).sort(
			([a], [b]) => b.length - a.length,
		)

		for (const [prefix, replacement] of sortedPrefixes) {
			if (url === prefix) {
				return { prefix, replacement }
			}

			// Special case: root prefix `/` matches any absolute URL
			if (prefix === '/' && url.startsWith('/')) {
				return { prefix, replacement }
			}

			if (url.startsWith(prefix + '/') || url.startsWith(prefix + '?')) {
				return { prefix, replacement }
			}
		}

		return null
	}

	/**
	 * Rewrite a single URL based on the mapping rules.
	 * Returns the rewritten URL or the original if it should not be rewritten.
	 * Throws for invalid URLs.
	 */
	function rewriteUrl(url: string): string {
		// Skip external URLs, mailto, tel, anchor-only, and protocol-relative
		if (
			url.startsWith('http://') ||
			url.startsWith('mailto:') ||
			url.startsWith('tel:') ||
			url.startsWith('#') ||
			url.startsWith('//')
		) {
			return url
		}

		// Handle https:// URLs - check forbidden prefixes
		if (stringHasPrefix(url, 'https://')) {
			if (forbiddenURLPrefixes) {
				const isWhitelisted = whitelistURLs?.includes(url)

				for (const forbiddenPrefix of forbiddenURLPrefixes) {
					if (url.startsWith(forbiddenPrefix)) {
						if (!isWhitelisted) {
							throw new Error(`Forbidden URL prefix found: ${forbiddenPrefix}. URL: ${url}`)
						}
					}
				}
			}

			return url
		}

		// For absolute and relative paths, resolve and rewrite
		let resolvedUrl = url.startsWith('/') ? url : resolveRelativeUrl(url)

		// Handle repoRootPagesDir: if URL is under the pages dir, remove the last path component
		// (assumes an index.astro file exists at that directory)
		if (resolvedUrl.startsWith(repoRootPagesDir)) {
			// Remove the last path component (e.g., /foo/bar/baz.md -> /foo/bar/)
			const lastSlashIndex = resolvedUrl.lastIndexOf('/')

			if (lastSlashIndex > repoRootPagesDir.length - 1) {
				resolvedUrl = resolvedUrl.slice(0, lastSlashIndex + 1)
			}
		}

		const match = findMatchingPrefix(resolvedUrl)

		if (!match) {
			throw new Error(
				`URL does not match any known prefix: ${url} (resolved: ${resolvedUrl}). Known prefixes: ${Object.keys(repoRootRelativePaths).join(', ')}. Please either add a prefix and the absolute URL it maps to, or move the file being linked to somewhere else.`,
			)
		}

		const suffix = resolvedUrl.slice(match.prefix.length)

		// Avoid double slashes: if replacement ends with / and suffix starts with /
		const suffixToUse =
			match.replacement.endsWith('/') && suffix.startsWith('/') ? suffix.slice(1) : suffix

		return match.replacement + suffixToUse
	}

	/**
	 * Split markdown into segments, tracking which parts are inside code blocks.
	 * Returns array of { text: string, inCode: boolean }.
	 * Handles fenced code blocks with varying fence lengths per CommonMark spec:
	 * a closing fence must have at least as many backticks as the opening fence.
	 */
	function splitIntoCodeSegments(text: string): Array<{ text: string; inCode: boolean }> {
		const segments: Array<{ text: string; inCode: boolean }> = []
		let currentInCode = false
		let currentText = ''
		let currentFenceLength = 0
		const lines = text.split('\n')

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]
			const isLastLine = i === lines.length - 1

			// Count leading backticks in the trimmed line
			const trimmedLine = line.trimStart()
			const backtickMatch = trimmedLine.match(/`+/)
			const backtickLength = backtickMatch ? backtickMatch[0].length : 0
			const isFenceLine = backtickLength >= 3 && trimmedLine.slice(backtickLength).match(/^\s*$/)

			// Check for fenced code blocks
			if (isFenceLine) {
				if (!currentInCode && backtickLength >= 3) {
					// Opening a new code block
					if (currentText) {
						segments.push({ text: currentText, inCode: currentInCode })
						currentText = ''
					}

					currentInCode = true
					currentFenceLength = backtickLength
					segments.push({
						text: line + (isLastLine ? '' : '\n'),
						inCode: currentInCode,
					})
				} else if (currentInCode && backtickLength === currentFenceLength) {
					// Closing the code block (must match exactly the opening fence length)
					if (currentText) {
						segments.push({ text: currentText, inCode: currentInCode })
						currentText = ''
					}

					currentInCode = false
					currentFenceLength = 0
					segments.push({
						text: line + (isLastLine ? '' : '\n'),
						inCode: currentInCode,
					})
				} else if (currentInCode) {
					// Not enough backticks to close, treat as content
					currentText += line + (isLastLine ? '' : '\n')
				} else {
					// Not in code and not a valid opening (shouldn't happen given check above)
					currentText += line + (isLastLine ? '' : '\n')
				}
			} else if (currentInCode) {
				currentText += line + (isLastLine ? '' : '\n')
			} else if (/^ {4,}/.test(line)) {
				// Indented code block (4+ spaces)
				if (currentText) {
					segments.push({ text: currentText, inCode: currentInCode })
					currentText = ''
				}

				segments.push({ text: line + (isLastLine ? '' : '\n'), inCode: true })
			} else {
				currentText += line + (isLastLine ? '' : '\n')
			}
		}

		if (currentText) {
			segments.push({ text: currentText, inCode: currentInCode })
		}

		return segments
	}

	/**
	 * Process a single line/segment for URL rewriting, excluding inline code.
	 */
	function processTextForUrls(text: string): string {
		// First, handle inline code by temporarily replacing it
		const inlineCodeParts: string[] = []
		const placeholder = 'MARKDOWN_INLINE_CODE{{n}}MARKDOWN_INLINE_CODE'
		let processed = text.replace(/`([^`]+)`/g, (_match: string, code: string) => {
			const idx = inlineCodeParts.length

			// Store WITH backticks to preserve them on restore
			inlineCodeParts.push('`' + code + '`')

			return placeholder.replace('{{n}}', String(idx))
		})

		// Pattern to match markdown links and images:
		// - Images: ![alt](url) or ![alt](url "title")
		// - Links: [text](url) or [text](url 'title')
		// - Bracket-style: [text](<url>) for URLs with special chars like parens
		// We need to handle escaped brackets within the link text

		// First handle links WITH titles (in quotes)
		// Pattern: [text](url "title") or [text](url 'title')
		// Also handle bracket-style: [text](<url> "title")
		processed = processed.replace(
			/(!?\[[^\]]*\])\(([^<\s)]+|<([^>]+)>)\s+((?:"[^"]*"|'[^']*')\s?)\)/g,
			(
				_match: string,
				linkPart: string,
				plainUrl: string,
				bracketUrl: string,
				titlePart: string,
			) => {
				const url = bracketUrl ?? plainUrl
				const rewrittenUrl = rewriteUrl(url)

				// Preserve angle brackets if URL wasn't rewritten (e.g. https URLs with parens)
				if (bracketUrl && rewrittenUrl === url) {
					return `${linkPart}(<${rewrittenUrl}> ${titlePart})`
				}

				return `${linkPart}(${rewrittenUrl} ${titlePart})`
			},
		)

		// Then handle links WITHOUT titles
		// Combined: [text](<url>) and [text](url)
		// Bracket-style URLs use angle brackets for special chars like parens
		processed = processed.replace(
			/(!?\[[^\]]*\])\((?:<([^>]+)>|([^) \t]+))\)/g,
			(_match: string, linkPart: string, bracketUrl: string, plainUrl: string) => {
				const url = bracketUrl ?? plainUrl
				const rewrittenUrl = rewriteUrl(url)

				// Preserve angle brackets if URL wasn't rewritten (e.g. https URLs with parens)
				if (bracketUrl && rewrittenUrl === url) {
					return `${linkPart}(<${rewrittenUrl}>)`
				}

				return `${linkPart}(${rewrittenUrl})`
			},
		)
		// Pattern to match reference link definitions: [ref]: url or [ref]: <url>
		// Bracket-style URLs first: [ref]: <url>
		processed = processed.replace(
			/^(\s*\[[^\]]+\]:\s+)(<([^>]+)>)(.*)$/gm,
			(_match: string, prefix: string, _bracketedUrl: string, url: string, rest: string) => {
				const rewrittenUrl = rewriteUrl(url)

				// Preserve angle brackets if URL wasn't rewritten
				if (rewrittenUrl === url) {
					return `${prefix}<${rewrittenUrl}>${rest}`
				}

				return `${prefix}${rewrittenUrl}${rest}`
			},
		)

		// Plain URLs: [ref]: url
		processed = processed.replace(
			/^(\s*\[[^\]]+\]:\s+)([^\s]+)(.*)$/gm,
			(_match: string, prefix: string, url: string, rest: string) => {
				const rewrittenUrl = rewriteUrl(url)

				return `${prefix}${rewrittenUrl}${rest}`
			},
		)

		// Restore inline code
		const restorePattern = /MARKDOWN_INLINE_CODE(\d+)MARKDOWN_INLINE_CODE/g

		processed = processed.replace(
			restorePattern,
			(_match: string, idx: string) => inlineCodeParts[parseInt(idx, 10)],
		)

		return processed
	}

	// Process the markdown
	const segments = splitIntoCodeSegments(markdown)
	const processedSegments: string[] = []

	for (const segment of segments) {
		if (segment.inCode) {
			processedSegments.push(segment.text)
		} else {
			processedSegments.push(processTextForUrls(segment.text))
		}
	}

	return {
		contentType: ContentType.MARKDOWN,
		markdown: processedSegments.join(''),
		strings: content.strings,
	}
}

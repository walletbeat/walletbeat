import * as fs from 'node:fs'
import * as path from 'node:path'

import { allWallets, assertValidWalletName } from '@/data/wallets'
import {
	type CodeSnippetSource,
	parseGitHubBlobUrl,
	rawGitHubContentUrl,
	snippetRelativePath,
	type StoredSnippetContent,
	type StoredSnippetSegment,
} from '@/schema/code-snippets'
import { collectAllRefs } from '@/schema/reference'
import { commonWhitespacePrefix } from '@/types/utils/text'
import { CodebaseEntryType, crawlCodebase, normalizePath } from '@/utils/codebase'

/** Lines of context stored immediately before/after the referenced range. */
const CONTEXT_LINE_COUNT = 4

/** One line-anchored, commit-pinned GitHub blob URL found in a wallet's ref data. */
export interface SnippetOccurrence {
	walletId: string
	source: CodeSnippetSource
	/** The URL as written in the reference. */
	url: string
	/** Period-delimited field path (from the wallet root) the URL was found under. */
	fieldPath: string
	/** Repository-relative path of the snippet file this URL maps to. */
	snippetPath: string
}

/**
 * Find every line-anchored, commit-pinned GitHub blob URL among wallet data
 * refs, paired with the wallet ID it was found under.
 */
export function findSnippetOccurrences(_repoRoot: string): SnippetOccurrence[] {
	const occurrences: SnippetOccurrence[] = []

	for (const collected of collectAllRefs(allWallets)) {
		const walletName = assertValidWalletName(collected.walletName)
		const walletId = allWallets[walletName].metadata.id

		for (const fq of collected.fullyQualifiedRefs) {
			for (const urlEntry of fq.urls) {
				const source = parseGitHubBlobUrl(urlEntry.url)

				if (typeof source === 'string') {
					continue
				}

				occurrences.push({
					fieldPath: collected.fieldPath,
					snippetPath: snippetRelativePath(walletId, source),
					source,
					url: urlEntry.url,
					walletId,
				})
			}
		}
	}

	return occurrences
}

/** A line's leading whitespace, used as its indentation. */
function indentationOf(line: string): string {
	return /^[ \t]*/.exec(line)?.[0] ?? ''
}

/**
 * Whether `indent` is a shallower indentation that properly encloses
 * `relativeTo`, i.e. `relativeTo`'s indentation actually starts with
 * `indent`'s whitespace rather than merely being numerically shorter (which
 * tabs/spaces mixing could otherwise make misleading).
 */
function isShallowerIndent(indent: string, relativeTo: string): boolean {
	return indent.length < relativeTo.length && commonWhitespacePrefix(indent, relativeTo) === indent
}

/**
 * A trimmed line starting with a closing bracket is almost certainly the
 * tail of a wrapped multi-line statement (e.g. `): ReturnType => {` closing
 * a multi-line parameter list) rather than a meaningful standalone header.
 */
const continuationLineRegExp = /^[)\]}]/

/** The opening bracket matching each closing bracket `continuationLineRegExp` can match. */
const matchingOpenBracket: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

/**
 * Bracket-balance scan backward from `endLine` to the start of the
 * multi-line statement it closes: the nearest line above `endLine` (which is
 * itself included) whose closing brackets of `endLine`'s own kind, counted
 * from `endLine` down to it, are matched by opening brackets of that same
 * kind. Falls back to `endLine` itself if no balancing start is found within
 * the file.
 *
 * Only the bracket kind that triggered the continuation is tracked — e.g. for
 * a line closing with `)`, only `(`/`)` are counted — so an unrelated brace
 * later on the same line (such as a function body's opening `{` right after
 * a wrapped signature's closing `)`) isn't mistaken for this statement's own
 * matching bracket.
 */
function findMultiLineStatementStart(lines: string[], endLine: number): number {
	const closeBracket = lines[endLine - 1].trim()[0]
	const openBracket = matchingOpenBracket[closeBracket]

	if (openBracket === undefined) {
		return endLine
	}

	let depth = 0

	for (let lineNumber = endLine; lineNumber >= 1; lineNumber--) {
		for (const char of lines[lineNumber - 1]) {
			if (char === openBracket) {
				depth--
			} else if (char === closeBracket) {
				depth++
			}
		}

		if (depth <= 0) {
			return lineNumber
		}
	}

	return endLine
}

/**
 * The 1-based line numbers of enclosing scope headers above `belowLine`
 * (exclusive): the nearest line with strictly less indentation than
 * `startIndent`, then the nearest line with strictly less indentation than
 * that, and so on up to the top of the file. Blank lines are skipped. This
 * mirrors one header per enclosing indentation level — typically a function
 * signature, then its containing class, etc. — the same idea as `git diff
 * -p`'s function-context line, generalized to every nesting level.
 *
 * A header that turns out to be the tail of a wrapped multi-line statement
 * (see `continuationLineRegExp`) is expanded to the statement's real start,
 * so e.g. a function's whole wrapped signature is captured, not just its
 * closing `): ReturnType => {` line.
 */
function findScopeHeaderLines(lines: string[], belowLine: number, startIndent: string): number[] {
	const headerLines: number[] = []
	let minIndent = startIndent

	for (let lineNumber = belowLine - 1; lineNumber >= 1 && minIndent !== ''; lineNumber--) {
		const line = lines[lineNumber - 1]
		const trimmed = line.trim()

		if (trimmed === '') {
			continue
		}

		const indent = indentationOf(line)

		if (isShallowerIndent(indent, minIndent)) {
			const start = continuationLineRegExp.test(trimmed)
				? findMultiLineStatementStart(lines, lineNumber)
				: lineNumber

			for (let extendedLine = start; extendedLine <= lineNumber; extendedLine++) {
				headerLines.push(extendedLine)
			}

			minIndent = indent
			lineNumber = start
		}
	}

	return headerLines.sort((a, b) => a - b)
}

/** Group a sorted, deduplicated list of line numbers into contiguous runs. */
function groupIntoSegments(lines: string[], includedLineNumbers: number[]): StoredSnippetSegment[] {
	const segments: StoredSnippetSegment[] = []

	for (const lineNumber of includedLineNumbers) {
		const lastSegment = segments[segments.length - 1]

		if (
			lastSegment !== undefined &&
			lastSegment.startLine + lastSegment.lines.length === lineNumber
		) {
			lastSegment.lines.push(lines[lineNumber - 1])
		} else {
			segments.push({ lines: [lines[lineNumber - 1]], startLine: lineNumber })
		}
	}

	return segments
}

/**
 * Build the JSON content stored for a snippet: the referenced lines, a
 * `CONTEXT_LINE_COUNT`-line window of surrounding context (clamped to file
 * bounds), and the enclosing scope-header lines above that window (see
 * `findScopeHeaderLines`). CRLF line endings are normalized to LF.
 */
export function buildSnippetContent(fileText: string, source: CodeSnippetSource): string {
	const lines = fileText.replaceAll('\r\n', '\n').split('\n')
	const lineCount = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length

	if (source.lastLine > lineCount) {
		throw new Error(
			`Line range ${source.firstLine}-${source.lastLine} is out of bounds: ` +
				`${source.path} @${source.commit.substring(0, 7)} has only ${lineCount} lines.`,
		)
	}

	const contextStart = Math.max(1, source.firstLine - CONTEXT_LINE_COUNT)
	const contextEnd = Math.min(lineCount, source.lastLine + CONTEXT_LINE_COUNT)

	const firstNonBlankLine = lines
		.slice(contextStart - 1, contextEnd)
		.find(line => line.trim() !== '')
	const startIndent = firstNonBlankLine === undefined ? '' : indentationOf(firstNonBlankLine)

	const headerLines = findScopeHeaderLines(lines, contextStart, startIndent)

	const includedLineNumbers = Array.from(
		new Set([
			...headerLines,
			...Array.from({ length: contextEnd - contextStart + 1 }, (_, i) => contextStart + i),
		]),
	).sort((a, b) => a - b)

	const content: StoredSnippetContent = {
		highlightFirstLine: source.firstLine,
		highlightLastLine: source.lastLine,
		segments: groupIntoSegments(lines, includedLineNumbers),
	}

	return JSON.stringify(content, null, '\t') + '\n'
}

/** Type predicate for a single segment's raw JSON shape. */
function isStoredSnippetSegment(segment: unknown): segment is StoredSnippetSegment {
	if (typeof segment !== 'object' || segment === null) {
		return false
	}

	const { startLine, lines } = segment as Partial<StoredSnippetSegment>

	return (
		typeof startLine === 'number' &&
		Array.isArray(lines) &&
		lines.every(line => typeof line === 'string')
	)
}

/**
 * Parse a stored `.snippet` file's contents. Throws when it isn't valid JSON
 * matching `StoredSnippetContent`'s shape (including the old flat-text
 * format this replaces, which fails JSON parsing outright).
 */
export function parseStoredSnippetContent(contents: string): StoredSnippetContent {
	const parsed: unknown = JSON.parse(contents)

	if (typeof parsed !== 'object' || parsed === null) {
		throw new Error('Stored snippet JSON is not an object.')
	}

	const { highlightFirstLine, highlightLastLine, segments } =
		parsed as Partial<StoredSnippetContent>

	if (
		typeof highlightFirstLine !== 'number' ||
		typeof highlightLastLine !== 'number' ||
		!Array.isArray(segments) ||
		!segments.every(isStoredSnippetSegment)
	) {
		throw new Error('Stored snippet JSON does not match the expected shape.')
	}

	return { highlightFirstLine, highlightLastLine, segments }
}

/** Fetch the full source file for a snippet from raw.githubusercontent.com. */
export async function fetchSnippetSourceFile(source: CodeSnippetSource): Promise<string> {
	const rawUrl = rawGitHubContentUrl(source)
	const response = await fetch(rawUrl)

	if (!response.ok) {
		throw new Error(`Failed to fetch ${rawUrl}: HTTP ${response.status}`)
	}

	return await response.text()
}

export enum SnippetProblemKind {
	/** A data file references a snippet URL with no stored snippet file. */
	MISSING_SNIPPET = 'MISSING_SNIPPET',
	/**
	 * A file under a wallet's code/ directory that no data file reference maps
	 * to: either the reference was removed or changed, or the file does not
	 * follow the snippet naming scheme.
	 */
	ORPHAN_SNIPPET = 'ORPHAN_SNIPPET',
	/**
	 * A stored snippet whose content doesn't match what it should be: it isn't
	 * valid `StoredSnippetContent` JSON (including the old flat-text format),
	 * or its highlighted range doesn't match the range in its filename.
	 */
	SNIPPET_CONTENT_MISMATCH = 'SNIPPET_CONTENT_MISMATCH',
}

export interface SnippetProblem {
	kind: SnippetProblemKind
	/** Repository-relative path of the snippet file the problem is about. */
	snippetPath: string
	issue: string
}

const walletsReferencesDir = path.join('public', 'references', 'wallets')

/**
 * Offline consistency check between snippet URLs in wallet data files and
 * stored snippet files. Returns a list of problems; empty means in sync.
 *
 * Content drift is impossible since snippet URLs are commit-pinned (enforced
 * by tests/github-ref-commit-hash.test.ts), so existence plus filename and
 * highlighted-range consistency is a complete synchronization check.
 */
export async function checkSnippets(repoRoot: string): Promise<SnippetProblem[]> {
	const problems: SnippetProblem[] = []
	const occurrences = findSnippetOccurrences(repoRoot)
	const expected = new Map<string, SnippetOccurrence>()

	for (const occurrence of occurrences) {
		if (!expected.has(occurrence.snippetPath)) {
			expected.set(occurrence.snippetPath, occurrence)
		}
	}

	for (const [snippetPath, occurrence] of expected) {
		const absolutePath = path.join(repoRoot, snippetPath)

		if (!fs.existsSync(absolutePath)) {
			problems.push({
				issue:
					`No stored snippet for ${occurrence.url} ` +
					`(referenced from ${occurrence.walletId} at ${occurrence.fieldPath}).`,
				kind: SnippetProblemKind.MISSING_SNIPPET,
				snippetPath,
			})
			continue
		}

		const contents = fs.readFileSync(absolutePath, 'utf8')
		let parsed: StoredSnippetContent

		try {
			parsed = parseStoredSnippetContent(contents)
		} catch (error) {
			problems.push({
				issue: `Snippet is not valid stored-snippet JSON: ${error instanceof Error ? error.message : String(error)}`,
				kind: SnippetProblemKind.SNIPPET_CONTENT_MISMATCH,
				snippetPath,
			})
			continue
		}

		if (
			parsed.highlightFirstLine !== occurrence.source.firstLine ||
			parsed.highlightLastLine !== occurrence.source.lastLine
		) {
			problems.push({
				issue:
					`Snippet highlights lines ${parsed.highlightFirstLine}-${parsed.highlightLastLine} ` +
					`but its filename declares ${occurrence.source.firstLine}-${occurrence.source.lastLine}.`,
				kind: SnippetProblemKind.SNIPPET_CONTENT_MISMATCH,
				snippetPath,
			})
		}
	}

	const walletsDir = path.join(repoRoot, walletsReferencesDir)
	await crawlCodebase({
		root: walletsDir,
		ignore: [],
		baseTraversalFn: entry => {
			// Only files directly under a wallet's own code/ directory (not
			// e.g. its screenshots/ directory).
			if (entry.type !== CodebaseEntryType.FILE || entry.path.split('/')[1] !== 'code') {
				return
			}

			const storedFile = normalizePath(`${walletsReferencesDir}/${entry.path}`)

			if (expected.has(storedFile)) {
				return
			}

			problems.push({
				issue: 'No wallet data file references this snippet (anymore).',
				kind: SnippetProblemKind.ORPHAN_SNIPPET,
				snippetPath: storedFile,
			})
		},
	})

	return problems
}

import * as fs from 'node:fs'
import * as path from 'node:path'

import {
	type CodeSnippetSource,
	parseGitHubBlobUrl,
	rawGitHubContentUrl,
	snippetRelativePath,
	type StoredSnippetContent,
	type StoredSnippetSegment,
} from '@/schema/code-snippets'

/** Lines of context stored immediately before/after the referenced range. */
const CONTEXT_LINE_COUNT = 4

/** One line-anchored, commit-pinned GitHub blob URL found in a wallet data file. */
export interface SnippetOccurrence {
	walletId: string
	source: CodeSnippetSource
	/** The URL as written in the data file. */
	url: string
	/** Repository-relative path of the data file the URL appears in. */
	dataFile: string
	/** 1-based line number of the URL in the data file. */
	line: number
	/** Repository-relative path of the snippet file this URL maps to. */
	snippetPath: string
}

/**
 * Candidate GitHub URL, delimited by characters that cannot appear in one:
 * whitespace, string-literal quotes, backticks, and closing brackets.
 */
const gitHubUrlCandidateRegExp = /https:\/\/(?:www\.)?github\.com\/[^\s"'`<>)\]}]+/g

/**
 * Find every line-anchored, commit-pinned GitHub blob URL in wallet data
 * files (`data/*-wallets/*.ts`, excluding `*.tmpl.ts` templates), paired with
 * the wallet ID derived from the data file name.
 */
export function findSnippetOccurrences(repoRoot: string): SnippetOccurrence[] {
	const dataDir = path.join(repoRoot, 'data')
	const occurrences: SnippetOccurrence[] = []

	const walletDirs = fs
		.readdirSync(dataDir, { withFileTypes: true })
		.filter(entry => entry.isDirectory() && entry.name.endsWith('-wallets'))
		.map(entry => entry.name)

	for (const walletDir of walletDirs) {
		const dirPath = path.join(dataDir, walletDir)
		const walletFiles = fs
			.readdirSync(dirPath, { withFileTypes: true })
			.filter(
				entry => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.tmpl.ts'),
			)
			.map(entry => entry.name)

		for (const walletFile of walletFiles) {
			const walletId = walletFile.slice(0, -'.ts'.length)
			const dataFile = `data/${walletDir}/${walletFile}`
			const contents = fs.readFileSync(path.join(dirPath, walletFile), 'utf8')

			contents.split('\n').forEach((lineText, lineIndex) => {
				for (const match of lineText.matchAll(gitHubUrlCandidateRegExp)) {
					const url = match[0]
					const source = parseGitHubBlobUrl(url)

					if (source === null) {
						continue
					}

					occurrences.push({
						dataFile,
						line: lineIndex + 1,
						snippetPath: snippetRelativePath(walletId, source),
						source,
						url,
						walletId,
					})
				}
			})
		}
	}

	return occurrences
}

/** Length of a line's leading whitespace, used as its indentation. */
function indentationOf(line: string): number {
	return /^[ \t]*/.exec(line)?.[0].length ?? 0
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
function findScopeHeaderLines(lines: string[], belowLine: number, startIndent: number): number[] {
	const headerLines: number[] = []
	let minIndent = startIndent

	for (let lineNumber = belowLine - 1; lineNumber >= 1 && minIndent > 0; lineNumber--) {
		const line = lines[lineNumber - 1]
		const trimmed = line.trim()

		if (trimmed === '') {
			continue
		}

		const indent = indentationOf(line)

		if (indent < minIndent) {
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
	const startIndent = firstNonBlankLine === undefined ? 0 : indentationOf(firstNonBlankLine)

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

/**
 * Parse a stored `.snippet` file's contents, or return null when it isn't
 * valid JSON matching `StoredSnippetContent`'s shape (including the old
 * flat-text format this replaces).
 */
export function parseStoredSnippetContent(contents: string): StoredSnippetContent | null {
	let parsed: unknown

	try {
		parsed = JSON.parse(contents)
	} catch {
		return null
	}

	if (typeof parsed !== 'object' || parsed === null) {
		return null
	}

	const candidate = parsed as Partial<StoredSnippetContent>

	if (
		typeof candidate.highlightFirstLine !== 'number' ||
		typeof candidate.highlightLastLine !== 'number' ||
		!Array.isArray(candidate.segments) ||
		!candidate.segments.every(
			(segment): segment is StoredSnippetSegment =>
				typeof segment === 'object' &&
				segment !== null &&
				typeof segment.startLine === 'number' &&
				Array.isArray(segment.lines) &&
				segment.lines.every((line: unknown) => typeof line === 'string'),
		)
	) {
		return null
	}

	return {
		highlightFirstLine: candidate.highlightFirstLine,
		highlightLastLine: candidate.highlightLastLine,
		segments: candidate.segments,
	}
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
	 * A stored snippet that isn't valid `StoredSnippetContent` JSON (including
	 * the old flat-text format), or whose highlighted range doesn't match the
	 * range in its filename.
	 */
	STALE_CONTENT = 'STALE_CONTENT',
}

export interface SnippetProblem {
	kind: SnippetProblemKind
	/** Repository-relative path of the snippet file the problem is about. */
	snippetPath: string
	issue: string
}

const walletsReferencesDir = path.join('public', 'references', 'wallets')

/** Recursively list all repository-relative file paths under `dir`. */
function listFilesRecursively(repoRoot: string, dir: string): string[] {
	const absoluteDir = path.join(repoRoot, dir)

	if (!fs.existsSync(absoluteDir)) {
		return []
	}

	const files: string[] = []

	for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
		const entryPath = `${dir}/${entry.name}`

		if (entry.isDirectory()) {
			files.push(...listFilesRecursively(repoRoot, entryPath))
		} else if (entry.isFile()) {
			files.push(entryPath)
		}
	}

	return files
}

/** Repository-relative paths of all files under wallets' code snippet directories. */
export function listStoredSnippetFiles(repoRoot: string): string[] {
	const walletsDir = path.join(repoRoot, walletsReferencesDir)

	if (!fs.existsSync(walletsDir)) {
		return []
	}

	const files: string[] = []

	for (const entry of fs.readdirSync(walletsDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue
		}

		files.push(...listFilesRecursively(repoRoot, `public/references/wallets/${entry.name}/code`))
	}

	return files
}

/**
 * Offline consistency check between snippet URLs in wallet data files and
 * stored snippet files. Returns a list of problems; empty means in sync.
 *
 * Content drift is impossible since snippet URLs are commit-pinned (enforced
 * by tests/github-ref-commit-hash.test.ts), so existence plus filename and
 * highlighted-range consistency is a complete synchronization check.
 */
export function checkSnippets(repoRoot: string): SnippetProblem[] {
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
					`(referenced from ${occurrence.dataFile}:${occurrence.line}).`,
				kind: SnippetProblemKind.MISSING_SNIPPET,
				snippetPath,
			})
			continue
		}

		const contents = fs.readFileSync(absolutePath, 'utf8')
		const parsed = parseStoredSnippetContent(contents)

		if (parsed === null) {
			problems.push({
				issue: 'Snippet is not valid stored-snippet JSON (stale/old format).',
				kind: SnippetProblemKind.STALE_CONTENT,
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
				kind: SnippetProblemKind.STALE_CONTENT,
				snippetPath,
			})
		}
	}

	for (const storedFile of listStoredSnippetFiles(repoRoot)) {
		if (expected.has(storedFile)) {
			continue
		}

		problems.push({
			issue: 'No wallet data file references this snippet (anymore).',
			kind: SnippetProblemKind.ORPHAN_SNIPPET,
			snippetPath: storedFile,
		})
	}

	return problems
}

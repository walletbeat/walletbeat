import * as fs from 'node:fs'
import * as path from 'node:path'

import {
	type CodeSnippetSource,
	parseGitHubBlobUrl,
	rawGitHubContentUrl,
	snippetLineCount,
	snippetRelativePath,
} from '@/schema/code-snippets'

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

/**
 * Cut the referenced lines out of a full file's contents.
 * CRLF line endings are normalized to LF; the result always ends with a
 * single trailing newline.
 */
export function extractSnippet(fileText: string, source: CodeSnippetSource): string {
	const lines = fileText.replaceAll('\r\n', '\n').split('\n')
	const lineCount = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length

	if (source.lastLine > lineCount) {
		throw new Error(
			`Line range ${source.firstLine}-${source.lastLine} is out of bounds: ` +
				`${source.path} @${source.commit.substring(0, 7)} has only ${lineCount} lines.`,
		)
	}

	return lines.slice(source.firstLine - 1, source.lastLine).join('\n') + '\n'
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
	/** A stored snippet whose line count doesn't match the range in its filename. */
	LINE_COUNT_MISMATCH = 'LINE_COUNT_MISMATCH',
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
 * line-count consistency is a complete synchronization check.
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
		const lines = contents.split('\n')
		const lineCount = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length
		const expectedLineCount = snippetLineCount(occurrence.source)

		if (lineCount !== expectedLineCount) {
			problems.push({
				issue:
					`Snippet holds ${lineCount} line(s) but its filename declares ` +
					`${expectedLineCount} (lines ${occurrence.source.firstLine}-${occurrence.source.lastLine}).`,
				kind: SnippetProblemKind.LINE_COUNT_MISMATCH,
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

import * as fs from 'node:fs'
import * as path from 'node:path'

import {
	type CodeSnippetSource,
	parseGitHubBlobUrl,
	snippetRelativePath,
} from '@/schema/code-snippets'
import { getRepositoryRoot } from '@/tests/utils/codebase'

import {
	checkSnippets,
	extractSnippet,
	fetchSnippetSourceFile,
	findSnippetOccurrences,
	SnippetProblemKind,
} from './code-snippet-collector-lib'

const REPO_ROOT = getRepositoryRoot()

function usage(): never {
	process.stderr.write(`
Usage: pnpm collect:snippets [options]

Stores local copies of the code snippets that wallet data files reference via
commit-pinned, line-anchored GitHub blob URLs
(https://github.com/<org>/<repo>/blob/<40-char-hash>/<path>#L<first>-L<last>).
Only the referenced lines are stored, never the whole file, to stay within
fair use regardless of the source repository's license.

Modes (pick one):
  --all                  Scan data/*-wallets/*.ts for snippet URLs and fetch
                         every snippet that is not stored yet. Already-stored
                         snippets are skipped: URLs are commit-pinned, so
                         their content never changes.
  --url <blob-url>       Fetch the snippet for a single URL. The wallet it
                         belongs to is inferred from the data files; pass
                         --id <wallet-id> to override or when the URL is not
                         referenced from any data file yet.
  --check                Verify stored snippets are in sync with the URLs in
                         wallet data files. Offline; exits non-zero if any
                         snippet is missing or orphaned.
  --prune                Delete stored snippet files that no wallet data file
                         references anymore.

Data is saved to flat files named after the source location:
  public/references/wallets/<wallet-id>/code/<org>--<repo>--<commit>--<path with '/' as '--'>.L<first>[-L<last>].<ext>.snippet

Examples:
  pnpm collect:snippets -- --all
  pnpm collect:snippets -- --url 'https://github.com/org/repo/blob/<hash>/src/file.ts#L10-L20'
  pnpm collect:snippets -- --check
`)
	process.exit(1)
}

function getArg(name: string): string | undefined {
	const args = process.argv.slice(2)
	const idx = args.indexOf(`--${name}`)

	if (idx < 0 || idx + 1 >= args.length) {
		return undefined
	}

	return args[idx + 1]
}

function hasFlag(name: string): boolean {
	return process.argv.includes(`--${name}`)
}

if (hasFlag('help')) {
	usage()
}

const allMode = hasFlag('all')
const checkMode = hasFlag('check')
const pruneMode = hasFlag('prune')
const urlArg = getArg('url')
const walletIdArg = getArg('id')

const selectedModes = [allMode, checkMode, pruneMode, urlArg !== undefined].filter(
	selected => selected,
).length

if (selectedModes !== 1) {
	process.stderr.write('Error: pick exactly one of --all, --url, --check, or --prune.\n')
	usage()
}

/** Fetched file contents, keyed by org/repo/commit/path, to fetch each file once. */
const sourceFileCache = new Map<string, Promise<string>>()

function fetchSourceFileCached(source: CodeSnippetSource): Promise<string> {
	const cacheKey = `${source.org}/${source.repo}/${source.commit}/${source.path}`
	let cached = sourceFileCache.get(cacheKey)

	if (cached === undefined) {
		cached = fetchSnippetSourceFile(source)
		sourceFileCache.set(cacheKey, cached)
	}

	return cached
}

async function fetchAndStore(walletId: string, source: CodeSnippetSource): Promise<void> {
	const relativePath = snippetRelativePath(walletId, source)
	const absolutePath = path.join(REPO_ROOT, relativePath)

	if (fs.existsSync(absolutePath)) {
		process.stderr.write(`Already stored: ${relativePath}\n`)

		return
	}

	const fileText = await fetchSourceFileCached(source)
	const snippet = extractSnippet(fileText, source)

	fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
	fs.writeFileSync(absolutePath, snippet)
	process.stderr.write(`Saved: ${relativePath}\n`)
}

if (checkMode) {
	const problems = checkSnippets(REPO_ROOT)

	if (problems.length === 0) {
		process.stderr.write('All code snippet files are in sync.\n')
		process.exit(0)
	}

	for (const { kind, snippetPath, issue } of problems) {
		process.stderr.write(`[${kind}] ${snippetPath}: ${issue}\n`)
	}

	process.exit(1)
}

if (pruneMode) {
	const problems = checkSnippets(REPO_ROOT).filter(
		problem => problem.kind === SnippetProblemKind.ORPHAN_SNIPPET,
	)

	if (problems.length === 0) {
		process.stderr.write('No orphaned snippet files to prune.\n')
		process.exit(0)
	}

	for (const { snippetPath } of problems) {
		fs.rmSync(path.join(REPO_ROOT, snippetPath))
		process.stderr.write(`Deleted: ${snippetPath}\n`)

		// Remove directories left empty by the deletion, up to the wallet's
		// code/ directory itself.
		let dir = path.dirname(path.join(REPO_ROOT, snippetPath))

		while (
			path
				.relative(REPO_ROOT, dir)
				.startsWith(path.join('public', 'references', 'wallets') + path.sep) &&
			fs.readdirSync(dir).length === 0
		) {
			fs.rmdirSync(dir)
			dir = path.dirname(dir)
		}
	}

	process.exit(0)
}

if (allMode) {
	const occurrences = findSnippetOccurrences(REPO_ROOT)
	const bySnippetPath = new Map(occurrences.map(occurrence => [occurrence.snippetPath, occurrence]))

	if (bySnippetPath.size === 0) {
		process.stderr.write('No line-anchored commit-pinned GitHub blob URLs found in data/.\n')
		process.exit(0)
	}

	process.stderr.write(`Found ${bySnippetPath.size} unique snippet URL(s) in wallet data.\n`)

	let failures = 0

	for (const occurrence of bySnippetPath.values()) {
		try {
			await fetchAndStore(occurrence.walletId, occurrence.source)
		} catch (error) {
			failures++
			process.stderr.write(
				`Error fetching ${occurrence.url} ` +
					`(referenced from ${occurrence.dataFile}:${occurrence.line}): ` +
					`${error instanceof Error ? error.message : String(error)}\n`,
			)
		}
	}

	process.exit(failures === 0 ? 0 : 1)
}

if (urlArg !== undefined) {
	const source = parseGitHubBlobUrl(urlArg)

	if (source === null) {
		process.stderr.write(
			'Error: not a commit-pinned, line-anchored GitHub blob URL.\n' +
				'Expected: https://github.com/<org>/<repo>/blob/<40-char-hash>/<path>#L<first>[-L<last>]\n',
		)
		process.exit(1)
	}

	let walletId = walletIdArg

	if (walletId === undefined) {
		const occurrence = findSnippetOccurrences(REPO_ROOT).find(
			candidate => candidate.snippetPath === snippetRelativePath(candidate.walletId, source),
		)

		if (occurrence === undefined) {
			process.stderr.write(
				'Error: this URL is not referenced from any wallet data file, so the\n' +
					'wallet it belongs to cannot be inferred. Pass --id <wallet-id>.\n',
			)
			process.exit(1)
		}

		walletId = occurrence.walletId
	}

	await fetchAndStore(walletId, source)
}

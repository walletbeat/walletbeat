import * as fs from 'node:fs'
import * as path from 'node:path'

import cac from 'cac'

import {
	type CodeSnippetSource,
	parseGitHubBlobUrl,
	snippetRelativePath,
} from '@/schema/code-snippets'
import { getRepositoryRoot } from '@/utils/codebase'

import {
	buildSnippetContent,
	checkSnippets,
	fetchSnippetSourceFile,
	findSnippetOccurrences,
	parseStoredSnippetContent,
	SnippetProblemKind,
} from './code-snippet-collector-lib'

const REPO_ROOT = getRepositoryRoot()

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
		const contents = fs.readFileSync(absolutePath, 'utf8')
		let reason = 'mismatched content'

		try {
			const parsed = parseStoredSnippetContent(contents)

			if (
				parsed.highlightFirstLine === source.firstLine &&
				parsed.highlightLastLine === source.lastLine
			) {
				return
			}
		} catch (error) {
			reason = error instanceof Error ? error.message : String(error)
		}

		process.stderr.write(`Refetching (${reason}): ${relativePath}\n`)
	}

	const fileText = await fetchSourceFileCached(source)
	const snippet = buildSnippetContent(fileText, source)

	fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
	fs.writeFileSync(absolutePath, snippet)
	process.stderr.write(`Saved: ${relativePath}\n`)
}

/**
 * CLI for fetching and pruning the local copies of code snippets that wallet
 * data files reference via commit-pinned, line-anchored GitHub blob URLs
 * (https://github.com/<org>/<repo>/blob/<40-char-hash>/<path>#L<first>-L<last>).
 *
 * Data is saved to flat files named after the source location:
 *   public/references/wallets/<wallet-id>/code/<org>--<repo>--<commit>--<path with '/' as '--'>.L<first>[-L<last>].<ext>.snippet
 */
const cli = cac('collect-snippets')

cli
	.command(
		'all',
		'Scan data/*-wallets/*.ts for snippet URLs and fetch every snippet that is not stored yet',
	)
	.action(async () => {
		const failures = await fetchAllMissing()

		process.exit(failures === 0 ? 0 : 1)
	})

cli.command('fix', 'Fetch every missing snippet and prune every orphaned one').action(async () => {
	const failures = await fetchAllMissing()

	await pruneOrphans()

	process.exit(failures === 0 ? 0 : 1)
})

/** Fetch every snippet referenced from wallet data that is not stored yet. Returns the number of failures. */
async function fetchAllMissing(): Promise<number> {
	const occurrences = findSnippetOccurrences(REPO_ROOT)
	const bySnippetPath = new Map(occurrences.map(occurrence => [occurrence.snippetPath, occurrence]))

	if (bySnippetPath.size === 0) {
		process.stderr.write('No line-anchored commit-pinned GitHub blob URLs found in data/.\n')

		return 0
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
					`(referenced from ${occurrence.walletId} at ${occurrence.fieldPath}): ` +
					`${error instanceof Error ? error.message : String(error)}\n`,
			)
		}
	}

	return failures
}

/** Delete stored snippet files that no wallet data file references anymore. */
async function pruneOrphans(): Promise<void> {
	const problems = (await checkSnippets(REPO_ROOT)).filter(
		problem => problem.kind === SnippetProblemKind.ORPHAN_SNIPPET,
	)

	if (problems.length === 0) {
		process.stderr.write('No orphaned snippet files to prune.\n')

		return
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
}



cli
	.command('url <blob-url>', 'Fetch the snippet for a single URL')
	.option('--id <wallet_id>', 'Wallet ID this URL belongs to (inferred from data files if omitted)')
	.action(async (blobUrl: string, options: { id?: string }) => {
		let source: CodeSnippetSource

		try {
			const parsed = parseGitHubBlobUrl(blobUrl)

			if (typeof parsed === 'string') {
				process.stderr.write(
					'Error: not a commit-pinned, line-anchored GitHub blob URL.\n' +
						'Expected: https://github.com/<org>/<repo>/blob/<40-char-hash>/<path>#L<first>[-L<last>]\n',
				)
				process.exit(1)
			}

			source = parsed
		} catch (error) {
			process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
			process.exit(1)
		}

		let walletId = options.id

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
	})

cli
	.command('check', 'Verify stored snippets are in sync with the URLs in wallet data files')
	.action(async () => {
		const problems = await checkSnippets(REPO_ROOT)

		if (problems.length === 0) {
			process.stderr.write('All code snippet files are in sync.\n')
			process.exit(0)
		}

		for (const { kind, snippetPath, issue } of problems) {
			process.stderr.write(`[${kind}] ${snippetPath}: ${issue}\n`)
		}

		process.exit(1)
	})

cli
	.command('prune', 'Delete stored snippet files that no wallet data file references anymore')
	.action(async () => {
		await pruneOrphans()
		process.exit(0)
	})

cli.help()

try {
	cli.parse(process.argv, { run: true })
} catch (error) {
	process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
	process.exit(1)
}

if (!cli.matchedCommand && !cli.options.help) {
	cli.outputHelp()
	process.exit(1)
}

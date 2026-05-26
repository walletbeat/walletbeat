import { execSync } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import pLimit from 'p-limit'
import url from 'url'

/** Get path to repository root. */
export function getRepositoryRoot(): string {
	return path.join(path.dirname(url.fileURLToPath(import.meta.url)), '../../')
}

/** Predicate for a file path. */
export type PathPredicate = RegExp | string | ((path: string) => boolean)

export const commonExclusions: PathPredicate[] = [
	// Exclude .git
	'.git',

	// Exclude entries from .gitignore.
	await GitIgnoredFiles(),

	// Exclude known binary files and macOS metadata files.
	/\.(png|pdf|jpg|jpeg|gif|ico|eot|ttf|woff|woff2)$/i,

	// Helios binary checkpoint file.
	'deploy/helios/data/checkpoint',
]

/** Escape special regex characters in a string. */
function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** PathPredicate that excludes entries listed in .gitignore. */
export async function GitIgnoredFiles(): Promise<PathPredicate> {
	const gitIgnorePath = path.join(getRepositoryRoot(), '.gitignore')
	const gitIgnoreContents = await fs.readFile(gitIgnorePath, { encoding: 'utf-8' })
	const specificFiles = new Set<string>()
	const dirPrefixes: string[] = []
	const regexExclusions: RegExp[] = []

	for (let line of gitIgnoreContents.split('\n')) {
		const hashIndex = line.indexOf('#')

		if (hashIndex !== -1) {
			line = line.substring(0, hashIndex)
		}

		line = line.trim()

		if (line.startsWith('!')) {
			throw new Error('Exclamation points in .gitignore not yet supported by this function')
		}

		while (line.startsWith('/')) {
			line = line.substring(1)
		}

		if (line.length === 0) {
			continue
		}

		if (line.endsWith('/')) {
			while (line.endsWith('/')) {
				line = line.substring(0, line.length - 1)
			}
			dirPrefixes.push(line + '/')
			continue
		}

		if (line.startsWith('**/') && !line.substring(3).includes('*')) {
			regexExclusions.push(new RegExp(`^.*/${escapeRegExp(line.substring(3))}(?:/.*)?$`, ''))
			continue
		}

		if (line.endsWith('*') && !line.endsWith('/*')) {
			regexExclusions.push(
				new RegExp(`^${escapeRegExp(line.substring(0, line.length - 1))}.*$`, ''),
			)
			continue
		}

		if (line.includes('*')) {
			throw new Error(`Glob pattern not yet supported in this function: ${line}`)
		}

		// If the pattern has no slash, it matches the name anywhere in the tree (like **/<pattern>).
		if (!line.includes('/')) {
			regexExclusions.push(new RegExp(`(?:^|/)${escapeRegExp(line)}(?:/.*)?$`, ''))
			continue
		}

		specificFiles.add(line)
	}

	return (path: string): boolean => {
		const normalizedPath = normalizePath(path)

		if (specificFiles.has(normalizedPath)) {
			return true
		}

		for (const dirPrefix of dirPrefixes) {
			const normalizedDirPrefix = normalizePath(dirPrefix)

			if (
				normalizedPath === normalizedDirPrefix ||
				normalizedPath.startsWith(normalizedDirPrefix)
			) {
				return true
			}
		}

		for (const regexp of regexExclusions) {
			if (regexp.exec(normalizedPath)) {
				return true
			}
		}

		return false
	}
}

export function normalizePath(p: string): string {
	return path.normalize(p).replaceAll(path.sep, '/')
}

/**
 * Returns the set of paths (relative to repo root, normalized) that git
 * stores with CRLF line endings in its index, as reported by
 * `git ls-files --eol`. Reading from the index bypasses autocrlf, so this
 * is the authoritative answer for what is actually committed.
 */
export function getCrlfFilesFromGit(root: string): Set<string> {
	try {
		const output = execSync('git ls-files --eol', { cwd: root, encoding: 'utf8' })
		const crlfFiles = new Set<string>()

		for (const line of output.split('\n')) {
			if (line === '') {
				continue
			}

			// Format: "i/<eol>  w/<eol>  attr/<attrs>\t<filepath>"
			const match = /^i\/(crlf|lf|mixed|none)\s+w\/(crlf|lf|mixed|none)\s+attr\/\S*\t(.+)$/.exec(
				line,
			)

			if (match === null) {
				throw new Error(`Unexpected git ls-files --eol output: ${line}`)
			}

			if (match[1] === 'crlf') {
				crlfFiles.add(normalizePath(match[3]))
			}
		}

		return crlfFiles
	} catch {
		return new Set()
	}
}

/**
 * On Windows, git represents symlinks as regular text files containing
 * the symlink target path (when core.symlinks=false). This function returns
 * the set of normalized paths that are stored as symlinks (mode 120000) in git,
 * so they can be reclassified correctly on Windows.
 */
function getGitSymlinkPaths(root: string): Set<string> {
	try {
		const output = execSync('git ls-files -s', { cwd: root, encoding: 'utf8' })
		const symlinks = new Set<string>()

		for (const line of output.split('\n')) {
			const match = /^120000 \S+ \d+\t(.+)$/.exec(line)

			if (match) {
				symlinks.add(normalizePath(match[1]))
			}
		}

		return symlinks
	} catch {
		return new Set()
	}
}

export type IndexedFileData = object

export type IndexedFile<T extends IndexedFileData> = T & {
	filePath: string
}

/** Options for `getCodebaseWordIndex`. */
export interface CodebaseIndexOptions<T extends IndexedFileData> {
	/** Root directory to traverse from. If undefined, use repository root. */
	root?: string

	/** Function to run on each indexed file to index it. */
	indexFn: (filePath: string, fileContents: string) => T

	/** Function to run on successive indexed file data, serially. */
	aggregateFn: (fileData: IndexedFile<T>) => void

	/**
	 * Ignore files matching any of these predicates.
	 * Paths are relative to `root`.
	 */
	ignore: PathPredicate[]

	/** Max number of concurrent I/O operations. */
	concurrency?: number
}

/** Index the codebase. */
export async function getCodebaseIndex<T extends IndexedFileData>(
	options: CodebaseIndexOptions<T>,
): Promise<void> {
	const crawlOptions: CodebaseCrawOptions = {
		root: options.root,
		ignore: options.ignore,
		concurrency: options.concurrency,
		fullTraversalFn: entry => {
			if (entry.type === CodebaseEntryType.FILE) {
				const fileIndex: IndexedFile<T> = {
					filePath: entry.path,
					...options.indexFn(entry.path, entry.contents),
				}

				options.aggregateFn(fileIndex)
			}
		},
	}

	await crawlCodebase(crawlOptions)
}

export enum CodebaseEntryType {
	DIRECTORY = 'DIRECTORY',
	FILE = 'FILE',
	SYMLINK = 'SYMLINK',
	OTHER = 'OTHER',
}

export interface CodebaseEntryBase {
	type: CodebaseEntryType
	path: string
}

export type CodebaseEntry = CodebaseEntryBase &
	(
		| {
				type: CodebaseEntryType.DIRECTORY
		  }
		| {
				type: CodebaseEntryType.FILE
				raw: Buffer
				contents: string
		  }
		| {
				type: CodebaseEntryType.SYMLINK
				rawTarget: string
				selfRelativeTarget: string
				rootRelativeTarget: string
				absoluteTarget: string
		  }
		| {
				type: CodebaseEntryType.OTHER
		  }
	)

export type CodebaseCrawOptions = {
	/** Root directory to traverse from. If undefined, use repository root. */
	root?: string

	/**
	 * Ignore files matching any of these predicates.
	 * Paths are relative to `root`.
	 */
	ignore: PathPredicate[]

	/** Max number of concurrent I/O operations. */
	concurrency?: number
} & (
	| {
			/**
			 * Function to run on each entry that doesn't match any predicate in `ignore`.
			 * Only base entry contents are fetched.
			 * This saves down on I/O for tests that don't need file contents.
			 */
			baseTraversalFn: (entryBase: CodebaseEntryBase) => void
	  }
	| {
			/**
			 * Function to run on each entry that doesn't match any predicate in `ignore`.
			 * Full entry contents are fetched.
			 */
			fullTraversalFn: (entry: CodebaseEntry) => void
	  }
	| {
			/**
			 * Function to run on each entry that doesn't match any predicate in `ignore`.
			 * Full entry contents are fetched by calling the provided callback.
			 */
			complexTraversalFn: (
				baseEntry: CodebaseEntryBase,
				entryFn: () => Promise<CodebaseEntry>,
			) => Promise<void>
	  }
)

/**
 * Crawl the codebase and call traversalFn for each entry.
 * This is the core traversal logic that can be reused by different indexing operations.
 */
export async function crawlCodebase(options: CodebaseCrawOptions): Promise<void> {
	const shouldIgnore = (filePath: string): boolean =>
		options.ignore.some(predicate => {
			if (typeof predicate === 'function') {
				return predicate(filePath)
			}

			if (predicate instanceof RegExp) {
				return predicate.test(normalizePath(filePath))
			}

			return normalizePath(filePath) === normalizePath(predicate)
		})

	const concurrencyLimit = pLimit(Math.max(1, options.concurrency ?? 256))

	const root = options.root ?? getRepositoryRoot()

	// On Windows, git represents symlinks as regular stub files when core.symlinks=false.
	// Pre-load the set of git symlinks so we can reclassify them correctly.
	const gitSymlinks = process.platform === 'win32' ? getGitSymlinkPaths(root) : new Set<string>()

	const processEntry = async (
		baseEntry: CodebaseEntryBase,
		getFullEntry: () => Promise<CodebaseEntry>,
	) => {
		if (Object.hasOwn(options, 'baseTraversalFn')) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We just checked
			const optionsWithFn = options as { baseTraversalFn: (entryBase: CodebaseEntryBase) => void }

			optionsWithFn.baseTraversalFn(baseEntry)
		} else if (Object.hasOwn(options, 'fullTraversalFn')) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We just checked
			const optionsWithFn = options as { fullTraversalFn: (entryBase: CodebaseEntry) => void }

			optionsWithFn.fullTraversalFn(await getFullEntry())
		} else if (Object.hasOwn(options, 'complexTraversalFn')) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We just checked
			const optionsWithFn = options as {
				complexTraversalFn: (
					baseEntry: CodebaseEntryBase,
					entryFn: () => Promise<CodebaseEntry>,
				) => Promise<void>
			}

			await optionsWithFn.complexTraversalFn(baseEntry, getFullEntry)
		} else {
			throw new Error('Invalid options')
		}
	}

	const crawl = async (dir: string): Promise<void> => {
		const dirEntries = await concurrencyLimit(() => fs.readdir(dir, { withFileTypes: true }))

		const perEntryPromises = dirEntries.map(async entry => {
			const fullPath = path.join(dir, entry.name)
			const rootRelativePath = normalizePath(path.relative(root, fullPath))

			if (shouldIgnore(rootRelativePath)) {
				return
			}

			let entryBaseData: CodebaseEntryBase
			let entryDataFn: () => Promise<CodebaseEntry>

			if (entry.isDirectory()) {
				const dirBaseEntry = { type: CodebaseEntryType.DIRECTORY, path: rootRelativePath } as const

				entryBaseData = dirBaseEntry
				entryDataFn = () => Promise.resolve(dirBaseEntry)
			} else if (entry.isSymbolicLink()) {
				entryBaseData = {
					type: CodebaseEntryType.SYMLINK,
					path: rootRelativePath,
				}

				entryDataFn = async () => {
					try {
						const rawTarget = await concurrencyLimit(() => fs.readlink(fullPath))
						const selfRelativeTarget = path.join(path.dirname(rootRelativePath), rawTarget)
						const rootRelativeTarget = path.relative(root, selfRelativeTarget)
						const absoluteTarget = normalizePath(path.resolve(root, rootRelativeTarget))

						return {
							type: CodebaseEntryType.SYMLINK,
							path: rootRelativePath,
							rawTarget,
							selfRelativeTarget,
							rootRelativeTarget,
							absoluteTarget,
						}
					} catch {
						return { type: CodebaseEntryType.OTHER, path: rootRelativePath }
					}
				}
			} else if (entry.isFile()) {
				entryBaseData = {
					type: CodebaseEntryType.FILE,
					path: rootRelativePath,
				}
				entryDataFn = async () => {
					// On Windows, git symlinks are stored as stub text files containing
					// the target path. Reclassify them as SYMLINK entries so they are
					// treated consistently with real symlinks on Unix.
					if (gitSymlinks.has(rootRelativePath)) {
						const stubContent = (await concurrencyLimit(() => fs.readFile(fullPath, 'utf8'))).trim()

						// A valid symlink stub is a single-line relative path.
						// If the content has newlines, the stub was replaced with real file content.
						if (!stubContent.includes('\n')) {
							const rawTarget = stubContent
							const selfRelativeTarget = path.join(path.dirname(rootRelativePath), rawTarget)
							const rootRelativeTarget = path.relative(root, selfRelativeTarget)
							const absoluteTarget = normalizePath(path.resolve(root, rootRelativeTarget))

							return {
								type: CodebaseEntryType.SYMLINK,
								path: rootRelativePath,
								rawTarget,
								selfRelativeTarget,
								rootRelativeTarget,
								absoluteTarget,
							}
						}

						const raw = await concurrencyLimit(() => fs.readFile(fullPath))
						const contents = raw.toString('utf8').replaceAll('\r\n', '\n')

						return { type: CodebaseEntryType.FILE, path: rootRelativePath, raw, contents }
					}

					const raw = await concurrencyLimit(() => fs.readFile(fullPath))

					// Normalize CRLF → LF so that checks like trailing-newline and
					// line-splitting work correctly on Windows (where autocrlf adds \r\n
					// to files that are stored with \n in git). The CRLF-in-git check
					// uses getCrlfFilesFromGit() instead, which reads the index directly.
					const contents = raw.toString('utf8').replaceAll('\r\n', '\n')

					return { type: CodebaseEntryType.FILE, path: rootRelativePath, raw, contents }
				}
			} else {
				const otherEntryData = { type: CodebaseEntryType.OTHER, path: rootRelativePath } as const

				entryBaseData = otherEntryData
				entryDataFn = () => Promise.resolve(otherEntryData)
			}

			await processEntry(entryBaseData, entryDataFn)

			if (entry.isDirectory()) {
				await crawl(fullPath)
			}
		})

		await Promise.all(perEntryPromises)
	}

	await crawl(root)
}

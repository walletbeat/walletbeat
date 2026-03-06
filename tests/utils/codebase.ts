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

	// Exclude PNG and PDF files.
	/\.(png|pdf)$/i,
]

/** PathPredicate that excludes entries listed in .gitignore. */
export async function GitIgnoredFiles(): Promise<PathPredicate> {
	const gitIgnorePath = path.join(getRepositoryRoot(), '.gitignore')
	const gitIgnoreContents = await fs.readFile(gitIgnorePath, { encoding: 'utf-8' })
	const specificFiles = new Set<string>()
	const dirPrefixes: string[] = []

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
		} else {
			specificFiles.add(line)
		}
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

		return false
	}
}

function normalizePath(p: string): string {
	return path.normalize(p).replaceAll(path.sep, '/')
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

	/** Recursively walk one directory (async). */
	const walk = async (dir: string): Promise<Promise<IndexedFile<T>>[]> => {
		const dirEntries = await concurrencyLimit(() => fs.readdir(dir, { withFileTypes: true }))

		const perEntryPromises = dirEntries.map(async (entry): Promise<Promise<IndexedFile<T>>[]> => {
			const fullPath = path.join(dir, entry.name)
			const rootRelativePath = path.relative(root, fullPath)

			if (shouldIgnore(rootRelativePath)) {
				return []
			}

			if (entry.isDirectory()) {
				return walk(fullPath)
			}

			if (entry.isFile()) {
				const fileContents = await concurrencyLimit(() =>
					fs.readFile(fullPath, { encoding: 'utf-8' }),
				)
				const fileIndex: IndexedFile<T> = {
					filePath: rootRelativePath,
					...options.indexFn(rootRelativePath, fileContents),
				}

				return [Promise.resolve(fileIndex)]
			}

			return []
		})

		return (await Promise.all(perEntryPromises)).flat()
	}

	for (const fileWords of await Promise.all(await walk(root))) {
		options.aggregateFn(fileWords)
	}
}

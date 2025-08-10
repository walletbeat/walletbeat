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
		if (specificFiles.has(path)) {
			return true
		}

		for (const dirPrefix of dirPrefixes) {
			if (path === dirPrefix || path.startsWith(dirPrefix)) {
				return true
			}
		}

		return false
	}
}

/**
 * Maps lowercase words to the set of filenames where they show up.
 */
export interface WordIndex {
	commonWords: Map<string, Set<string>>
	properWords: Map<string, Set<string>>
	lowercaseWords: Map<string, Set<string>>
}

/** Options for `getCodebaseWordIndex`. */
export interface CodebaseWordIndexOptions {
	/** Root directory to traverse from. */
	root: string

	/**
	 * Ignore files matching any of these predicates.
	 * Paths are relative to `root`.
	 */
	ignore: PathPredicate[]

	/** Max number of concurrent I/O operations. */
	concurrency?: number
}

/** Index the codebase. */
export async function getCodebaseWordIndex(options: CodebaseWordIndexOptions): Promise<WordIndex> {
	const shouldIgnore = (filePath: string): boolean =>
		options.ignore.some(predicate => {
			if (typeof predicate === 'function') {
				return predicate(filePath)
			}

			if (predicate instanceof RegExp) {
				return predicate.test(filePath)
			}

			return filePath === predicate
		})

	const concurrencyLimit = pLimit(Math.max(1, options.concurrency ?? 256))

	interface FileWords {
		path: string
		commonWords: Set<string>
		properWords: Set<string>
	}

	const getFileWords = async (filePath: string): Promise<FileWords> => {
		const contents = await concurrencyLimit(() => fs.readFile(filePath, { encoding: 'utf-8' }))

		let matches: RegExpMatchArray | string[] | null = contents.match(
			/(\b|(?<=[_]))[\p{Lu}\p{Ll}]([\p{Lu}\p{Ll}\p{Nd}]*[\p{Lu}\p{Ll}])?(\b|(?=[_\p{Nd}]))/gu,
		)

		if (matches === null) {
			matches = []
		}

		const commonWords = new Set<string>()
		const properWords = new Set<string>()

		for (const match of matches) {
			if (match.toLowerCase() === match) {
				commonWords.add(match)
				continue
			}

			if (match.toUpperCase() === match) {
				properWords.add(match)
				continue
			}

			const isCamelCase = match.match(/^[\p{Ll}]*([\p{Lu}\p{Nd}]+[\p{Ll}]+)+$/u)

			if (isCamelCase) {
				const camelCaseWords = match.match(
					/((^|(?<=[\p{Ll}]))[\p{Lu}]+[\p{Ll}]+|^[\p{Ll}]+)($|(?=[\p{Lu}\p{Nd}]))/gu,
				)

				if (camelCaseWords !== null) {
					for (const camelCaseWord of camelCaseWords) {
						properWords.add(camelCaseWord)
					}
				}
			}

			properWords.add(match)
		}

		const numericalConstants = contents.match(/(\b|(?<=[_]))[\p{Lu}]+[\p{Nd}]+(\b|(?=[_\p{Nd}]))/gu)

		if (numericalConstants !== null) {
			for (const numericalConstant of numericalConstants) {
				properWords.add(numericalConstant)
			}
		}

		return {
			path: filePath,
			commonWords,
			properWords,
		}
	}

	/** Recursively walk one directory (async). */
	const walk = async (dir: string): Promise<Promise<FileWords>[]> => {
		const dirEntries = await concurrencyLimit(() => fs.readdir(dir, { withFileTypes: true }))

		const perEntryPromises = dirEntries.map(async (entry): Promise<Promise<FileWords>[]> => {
			const fullPath = path.join(dir, entry.name)
			const rootRelativePath = path.relative(options.root, fullPath)

			if (shouldIgnore(rootRelativePath)) {
				return []
			}

			if (entry.isDirectory()) {
				return walk(fullPath)
			}

			if (entry.isFile()) {
				return [getFileWords(fullPath)]
			}

			return []
		})

		return (await Promise.all(perEntryPromises)).flat()
	}

	const index: WordIndex = {
		commonWords: new Map<string, Set<string>>(),
		properWords: new Map<string, Set<string>>(),
		lowercaseWords: new Map<string, Set<string>>(),
	}

	const addWord = (word: string, map: Map<string, Set<string>>, filePath: string) => {
		let fileSet = map.get(word)

		if (fileSet === undefined) {
			fileSet = new Set<string>()
			map.set(word, fileSet)
		}

		fileSet.add(filePath)
	}

	for (const fileWords of await Promise.all(await walk(options.root))) {
		for (const word of fileWords.commonWords) {
			addWord(word, index.commonWords, fileWords.path)
			addWord(word, index.lowercaseWords, fileWords.path)
		}

		for (const word of fileWords.properWords) {
			addWord(word, index.properWords, fileWords.path)
			addWord(word.toLowerCase(), index.lowercaseWords, fileWords.path)
		}
	}

	return index
}

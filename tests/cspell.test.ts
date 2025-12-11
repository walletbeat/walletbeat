import { describe, expect, it } from 'vitest'

import { trimWhitespacePrefix } from '@/types/utils/text'

import {
	commonExclusions,
	getCodebaseIndex,
	type IndexedFile,
	type IndexedFileData,
} from './utils/codebase'
import { getCSpellWords } from './utils/cspell'

const cSpellWords = getCSpellWords()

/**
 * Maps lowercase words to the set of filenames where they show up.
 */
interface CodebaseWordIndex {
	commonWords: Map<string, Set<string>>
	properWords: Map<string, Set<string>>
	lowercaseWords: Map<string, Set<string>>
}

interface FileWords extends IndexedFileData {
	commonWords: Set<string>
	properWords: Set<string>
}

function getFileWords(_: string, fileContents: string): FileWords {
	let matches: RegExpMatchArray | string[] | null = fileContents.match(
		/(?<!%[0-9A-Fa-f]{2})(\b|(?<=[_]|\b0x))[\p{Lu}\p{Ll}]([\p{Lu}\p{Ll}\p{Nd}]*[\p{Lu}\p{Ll}])?(\b|(?=[_\p{Nd}]))/gu,
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

	const numericalConstants = fileContents.match(
		/(\b|(?<=[_]))([\p{Lu}]+|[\p{Ll}]+)[\p{Nd}]+(\b|(?=[_]))/gu,
	)

	if (numericalConstants !== null) {
		for (const numericalConstant of numericalConstants) {
			properWords.add(numericalConstant)
		}
	}

	return {
		commonWords,
		properWords,
	}
}

async function getCodebaseWordIndex(): Promise<CodebaseWordIndex> {
	const index: CodebaseWordIndex = {
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

	await getCodebaseIndex({
		indexFn: getFileWords,
		aggregateFn: (fileWords: IndexedFile<FileWords>) => {
			for (const word of fileWords.commonWords) {
				addWord(word, index.commonWords, fileWords.filePath)
				addWord(word, index.lowercaseWords, fileWords.filePath)
			}

			for (const word of fileWords.properWords) {
				addWord(word, index.properWords, fileWords.filePath)
				addWord(word.toLowerCase(), index.lowercaseWords, fileWords.filePath)
			}
		},
		ignore: commonExclusions.concat([
			// Exclude the cSpell config file itself.
			'.cspell.json',
		]),
	})

	return Promise.resolve(index)
}

describe('cSpell', async () => {
	const codebaseWordIndex = await getCodebaseWordIndex()

	it('is in sorted order', () => {
		cSpellWords.reduce<string>((prev, cur): string => {
			if (prev.toLowerCase() > cur.toLowerCase()) {
				throw new Error(
					`cSpell words in .cspell.json are not sorted: ${prev} should go after ${cur}. Run \`pnpm fix\` to fix this automatically.`,
				)
			}

			return cur
		}, '')
	})

	it('does not have duplicate words', () => {
		cSpellWords.reduce<string>((prev, cur): string => {
			if (prev === cur) {
				throw new Error(
					`Duplicate word in cSpell configuration: ${prev}. Run \`pnpm fix\` to fix this automatically.`,
				)
			}

			if (prev.toLowerCase() === cur.toLowerCase()) {
				throw new Error(
					`Duplicate word (after adjusting for casing) in cSpell configuration: ${prev} vs ${cur}. For common nouns, use lowercase only. For other words, pick a single consistent casing.`,
				)
			}

			return cur
		}, '')
	})

	it('has no compound words', () => {
		for (const word of cSpellWords) {
			expect(word).toMatch(
				/^[\p{Lu}\p{Ll}]([\p{Lu}\p{Ll}\p{Nd}]*[\p{Lu}\p{Ll}])?$|^([\p{Lu}]+|[\p{Ll}]+)[\p{Nd}]+$/u,
			)
		}
	})

	it('does not have any unused words', () => {
		const allowedUnusedWords: string[] = [
			'rman', // Used in nickname "0xh3rman"
			'xmattmatt', // Used in nickname "Mattmatt"
		]

		cSpellWords.map(word => {
			if (allowedUnusedWords.includes(word)) {
				return
			}

			const isProper = word.toLowerCase() !== word

			if (isProper) {
				expect(word).toSatisfy(
					(word: string) => codebaseWordIndex.properWords.has(word),
					`cSpell proper word "${word}" must be present in at least one source file in the codebase. Case matters; if this word should be treated as valid regardless of casing, make it all-lowercase in the cSpell config.`,
				)
			} else {
				expect(word).toSatisfy(
					(word: string) => codebaseWordIndex.lowercaseWords.has(word.toLowerCase()),
					`cSpell common word "${word}" must be present in at least one source file in the codebase. Casing is ignored; if this is a proper noun, please add it with proper capitalization in the cSpell config.`,
				)
			}
		})
	})

	it('has no exceptions in the codebase', async () => {
		interface FileLines {
			lines: string[]
		}
		const allFilesWithBadLines: IndexedFile<FileLines>[] = []

		await getCodebaseIndex({
			indexFn: (_: string, fileContents: string): FileLines => ({
				lines: fileContents.split('\n').filter(line => line.toLowerCase().includes('// cspell')),
			}),
			aggregateFn: (fileLines: IndexedFile<FileLines>) => {
				if (fileLines.lines.length > 0) {
					allFilesWithBadLines.push(fileLines)
				}
			},
			ignore: commonExclusions.concat([
				// This file itself.
				'tests/cspell.test.ts',
			]),
		})
		expect(allFilesWithBadLines).toSatisfy(
			a => Array.isArray(a) && a.length === 0,
			trimWhitespacePrefix(`
				Found cSpell-related comments (\`// cspell\`) in the following files:

				${allFilesWithBadLines
					.map(
						f => `
					* ${f.filePath}:
					${f.lines
						.map(
							l => `
						- "${l}"
					`,
						)
						.join('')}
				`,
					)
					.join('')}

				This codebase relies on cSpell to enforce spelling, but the cSpell
				word database is also used for grammar checking with Harper.js.
				As a result, cSpell-comment-driven exceptions only apply to cSpell
				checks, not to Harper.js checks, so they do not work at effectively
				modifying spellcheck behavior; they may get cSpell to pass, but
				Harper.js will still complain.

				Please remove these cSpell comments, and instead adjust the cSpell
				config file and/or this unit test. If you need help with any of this,
				feel free to ask.
			`),
		)
	})
})

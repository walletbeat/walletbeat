import { describe, expect, it } from 'vitest'

import { getCodebaseWordIndex, getRepositoryRoot, GitIgnoredFiles } from './utils/codebase'
import { getCSpellWords } from './utils/cspell'

describe('cSpell', () => {
	const cSpellWords = getCSpellWords()

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
				/^[\p{Lu}\p{Ll}]([\p{Lu}\p{Ll}\p{Nd}]*[\p{Lu}\p{Ll}])?$|^[\p{Lu}]+[\p{Nd}]+$/u,
			)
		}
	})

	it('does not have any unused words', async () => {
		const codebaseWordIndex = await getCodebaseWordIndex({
			root: getRepositoryRoot(),
			ignore: [
				// Exclude .git
				'.git',

				// Exclude the cSpell config file itself.
				'.cspell.json',

				// Exclude entries from .gitignore.
				await GitIgnoredFiles(),

				// Exclude PNG and PDF files.
				/\.pdf$/i,
			],
		})

		cSpellWords.map(word => {
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
})

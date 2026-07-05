import fs from 'fs'
import path from 'path'

import { getRepositoryRoot } from './codebase'

/** Type for CSpell configuration file. */
interface CSpellConfig {
	version: string
	language: 'en'
	words: string[]
	flagWords: string[]
	ignorePaths: string[]
	patterns: { name: string; pattern: string }[]
	ignoreRegExpList: string[]
}

function getCSpellConfigPath(): string {
	return path.join(getRepositoryRoot(), '.cspell.json')
}

/** Read cSpell config from filesystem. */
function getCSpellConfig(): CSpellConfig {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Don't want to import the cSpell config type just for this.
	const cSpellConfig: CSpellConfig = JSON.parse(
		fs.readFileSync(getCSpellConfigPath(), { encoding: 'utf-8' }),
	)

	return cSpellConfig
}

/** Read cSpell vocabulary from config. */
export function getCSpellWords(): string[] {
	return getCSpellConfig().words
}

/** Parse a cspell pattern string like "/\\bbtc:[0-9a-z]+/g" into a RegExp. */
function parseCspellPattern(patternStr: string): RegExp {
	const match = patternStr.match(/^\/(.*)\/([gimsuy]*)$/)!

	return new RegExp(match[1], match[2])
}

let cspellPatterns: RegExp[] | null = null

/**
 * Read the cspell "patterns" whose names appear in `ignoreRegExpList` and
 * return them compiled as `RegExp` objects.  Cached so the filesystem is
 * only read once.
 */
export function getCSpellPatterns(): RegExp[] {
	if (cspellPatterns === null) {
		const config = getCSpellConfig()
		const allowedNames = new Set(config.ignoreRegExpList ?? [])

		cspellPatterns = config.patterns
			.filter(p => allowedNames.has(p.name))
			.map(p => parseCspellPattern(p.pattern))
	}

	return cspellPatterns
}

/** Overwrite cSpell vocabulary with new list of words. */
export function writeCSpellWords(words: string[]) {
	const cSpellConfig = getCSpellConfig()

	cSpellConfig.words = words
	const configJSON = JSON.stringify(cSpellConfig)

	fs.writeFileSync(getCSpellConfigPath(), configJSON, { encoding: 'utf-8' })
}

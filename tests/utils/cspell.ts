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

/** Overwrite cSpell vocabulary with new list of words. */
export function writeCSpellWords(words: string[]) {
	const cSpellConfig = getCSpellConfig()

	cSpellConfig.words = words
	const configJSON = JSON.stringify(cSpellConfig)

	fs.writeFileSync(getCSpellConfigPath(), configJSON, { encoding: 'utf-8' })
}

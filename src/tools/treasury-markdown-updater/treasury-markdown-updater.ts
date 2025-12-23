import * as path from 'path'
import { fileURLToPath } from 'url'

import {
	treasuryMarkdownUpdate,
	type TreasuryMarkdownUpdaterConfig,
} from './treasury-markdown-updater-lib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const GOVERNANCE_TREASURY_DIR = path.join(
	path.dirname(path.dirname(path.dirname(__dirname))),
	'governance',
	'treasury',
)
const args = process.argv.slice(2)

const appConfig: TreasuryMarkdownUpdaterConfig = {
	addressesPath: path.join(GOVERNANCE_TREASURY_DIR, 'addresses.tsv'),
	operationsPath: path.join(GOVERNANCE_TREASURY_DIR, 'treasury-operations.tsv'),
	outputPath: path.join(GOVERNANCE_TREASURY_DIR, 'treasury-transparency.md'),
	quiet: args.includes('--quiet'),
	test: args.includes('--test'),
}

try {
	treasuryMarkdownUpdate(appConfig)
} catch (error) {
	process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
	process.exit(1)
}

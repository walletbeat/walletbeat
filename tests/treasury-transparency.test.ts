import * as path from 'path'
import { describe, expect, it } from 'vitest'

import { treasuryMarkdownUpdate } from '@/tools/treasury-markdown-updater/treasury-markdown-updater-lib'
import { trimWhitespacePrefix } from '@/types/utils/text'

const GOVERNANCE_TREASURY_DIR = path.join(path.dirname(__dirname), 'governance', 'treasury')

describe('treasury operations transparency', () => {
	describe('markdown report', () => {
		it('matches TSV contents', async () => {
			try {
				await treasuryMarkdownUpdate({
					addressesPath: path.join(GOVERNANCE_TREASURY_DIR, 'addresses.tsv'),
					chartOutputPath: path.join(GOVERNANCE_TREASURY_DIR, 'treasury-chart.svg'),
					operationsPath: path.join(GOVERNANCE_TREASURY_DIR, 'treasury-operations.tsv'),
					outputPath: path.join(GOVERNANCE_TREASURY_DIR, 'treasury-transparency.md'),
					priceDataPath: path.join(GOVERNANCE_TREASURY_DIR, 'price-data.tsv'),
					quiet: true,
					test: true,
				})
			} catch (e) {
				expect(e).toSatisfy(
					e => e === undefined,
					trimWhitespacePrefix(`
						Markdown-formatted treasury transparency report is out of date relative to TSV data. Run \`pnpm fix\` to automatically fix this.
					`),
				)
			}
		})
	})
})

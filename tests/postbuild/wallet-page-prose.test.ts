import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { allRatedWallets, attributeTreeForWallet } from '@/data/wallets'
import {
	mapNonExemptAttributeGroupsInTree,
	mapNonExemptGroupAttributes,
} from '@/schema/attribute-groups'
import { aiTellsLinter } from '@/tests/utils/ai-tells'
import { formatLintMessages, GrammarTextKind } from '@/tests/utils/linter'
import { walletPageProse } from '@/tests/utils/wallet-page-prose'
import { getRepositoryRoot } from '@/utils/codebase'
import { getWalletUrl } from '@/utils/urls'

const distDir = join(getRepositoryRoot(), 'dist')

/**
 * Lower bound on extracted words per non-exempt attribute. Each attribute
 * section carries several paragraphs, so falling below this means the
 * extractor is missing large parts of the report.
 */
const minProseWordsPerAttribute = 300

describe('rendered wallet page prose', () => {
	for (const wallet of Object.values(allRatedWallets)) {
		it(`${wallet.metadata.displayName} does not overuse AI-ish words`, async () => {
			const html = readFileSync(join(distDir, getWalletUrl(wallet), 'index.html'), 'utf8')
			const prose = walletPageProse(html)
			let attributeCount = 0

			mapNonExemptAttributeGroupsInTree(
				attributeTreeForWallet(wallet),
				wallet.overall,
				(_, evaluations) => {
					mapNonExemptGroupAttributes(evaluations, () => {
						attributeCount++
					})
				},
			)

			const violations = formatLintMessages(
				prose,
				await aiTellsLinter.lint(prose, { language: 'plaintext' }, GrammarTextKind.GENERAL),
			)

			expect(
				prose.split(' ').length,
				'Wallet report prose is too short; is the extractor missing content?',
			).toBeGreaterThanOrEqual(attributeCount * minProseWordsPerAttribute)
			expect(violations, violations.join('\n')).toEqual([])
		})
	}
})

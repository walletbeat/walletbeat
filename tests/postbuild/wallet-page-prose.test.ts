import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { allRatedWallets } from '@/data/wallets'
import { aiWordDensityViolations } from '@/tests/utils/ai-tells'
import { walletPageProse } from '@/tests/utils/wallet-page-prose'
import { getRepositoryRoot } from '@/utils/codebase'
import { getWalletUrl } from '@/utils/urls'

const distDir = join(getRepositoryRoot(), 'dist')

describe('rendered wallet page prose', () => {
	for (const wallet of Object.values(allRatedWallets)) {
		it(`${wallet.metadata.displayName} does not overuse AI-ish words`, () => {
			const html = readFileSync(join(distDir, getWalletUrl(wallet), 'index.html'), 'utf8')
			const prose = walletPageProse(html)
			const violations = aiWordDensityViolations(prose)

			expect(prose.length, 'Wallet report has no prose').toBeGreaterThan(0)
			expect(violations, violations.join('\n')).toEqual([])
		})
	}
})

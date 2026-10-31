import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { nativeWalletRenderer } from '@/tests/utils/native-wallet-content'
import { contentWallets, selectedWalletContent } from '@/tests/utils/wallet-page-content'
import { reportContent } from '@/tests/utils/wallet-report-content'
import { getRepositoryRoot } from '@/utils/codebase'

describe('complete static wallet reports', () => {
	for (const wallet of contentWallets) {
		it(`${wallet.metadata.id} publishes canonical aggregate citations and hardware badges without JavaScript`, () => {
			const emitted = reportContent(
				readFileSync(join(getRepositoryRoot(), 'dist', wallet.metadata.id, 'index.html'), 'utf8'),
			)
			const expected = selectedWalletContent(wallet, null, null)
			const urls = new Set(emitted.links.map(link => link.href))
			const missingCitations = [
				...new Set(expected.attributes.flatMap(attribute => attribute.citations)),
			].filter(url => !urls.has(url))

			expect.soft(missingCitations).toEqual([])
			expect
				.soft(emitted.links.filter(link => /^\/[^/]+\/\?model=/.test(link.href)))
				.toEqual(expected.badges.map(({ href, text }) => ({ href, text })))
		})
		it(`${wallet.metadata.id} preserves the direct canonical report without JavaScript`, async () => {
			const renderNative = await nativeWalletRenderer(wallet)
			const body = renderNative()
			const emitted = readFileSync(
				join(getRepositoryRoot(), 'dist', wallet.metadata.id, 'index.html'),
				'utf8',
			)

			expect(reportContent(emitted)).toEqual(reportContent(body))
		})
	}
})

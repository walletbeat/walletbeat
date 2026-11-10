import { describe, expect, it } from 'vitest'

import { allRatedWallets, isValidWalletName, type WalletName } from '@/data/wallets'
import { evaluatedAttributes, Rating } from '@/schema/attributes'

const expectedFullyRatedWallets: WalletName[] = [
	'ambire',
	'metamask',
	'rabby',
	'rainbow',
	'uniswapWallet',
]

function unratedAttributeIds(walletName: WalletName): string[] {
	return Object.values(allRatedWallets[walletName].overall)
		.flatMap(evaluatedAttributes)
		.filter(({ evaluation }) => evaluation.outcome.rating === Rating.UNRATED)
		.map(({ attribute }) => attribute.id)
}

describe('fully rated wallets', () => {
	for (const walletName of expectedFullyRatedWallets) {
		it(`${walletName} has no unrated attributes`, () => {
			expect(
				unratedAttributeIds(walletName),
				`${walletName} is expected to be fully rated, but these attributes are unrated`,
			).toEqual([])
		})
	}

	it('has no fully rated wallets missing from the expected list', () => {
		const unexpected = Object.keys(allRatedWallets)
			.filter(isValidWalletName)
			.filter(walletName => !expectedFullyRatedWallets.includes(walletName))
			.filter(walletName => unratedAttributeIds(walletName).length === 0)

		expect(
			unexpected,
			'These wallets are fully rated; add them to expectedFullyRatedWallets',
		).toEqual([])
	})
})

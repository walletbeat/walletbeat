import { describe, expect, it } from 'vitest'

import { Rating } from '@/schema/attributes'
import { Variant } from '@/schema/variants'
import {
	finderCriteria,
	type FinderVariant,
	type FinderWallet,
	findWallets,
	initialFinderAnswers,
} from '@/utils/wallet-finder'
import { finderWalletData } from '@/utils/wallet-finder-data'

function variant(platform: FinderVariant['platform'], rating: Rating): FinderVariant {
	const assessment = { rating, explanation: 'Test assessment', url: '/test/' }

	return {
		platform,
		url: '/test/',
		assessments: {
			hardwareWalletSupport: { ...assessment },
			scamPrevention: { ...assessment },
			transactionLegibility: { ...assessment },
			accountRecovery: { ...assessment },
			addressCorrelation: { ...assessment },
			openSource: { ...assessment },
		},
	}
}

function wallet(name: string, variants: FinderVariant[]): FinderWallet {
	return { id: name.toLowerCase(), name, variants }
}

describe('wallet finder matching', () => {
	it('requires every selected assessment to pass on the requested platform', () => {
		const browser = variant(Variant.BROWSER, Rating.PASS)
		const mobile = variant(Variant.MOBILE, Rating.PASS)

		browser.assessments.scamPrevention.rating = Rating.FAIL
		mobile.assessments.hardwareWalletSupport.rating = Rating.FAIL
		const answers = initialFinderAnswers()

		answers.priorities.hardwareWalletSupport = 'require'
		answers.priorities.scamPrevention = 'require'
		expect(findWallets([wallet('Split', [browser, mobile])], answers)).toEqual([])
		mobile.assessments.hardwareWalletSupport.rating = Rating.PASS
		answers.platform = Variant.BROWSER
		expect(findWallets([wallet('Split', [browser, mobile])], answers)).toEqual([])
		answers.platform = Variant.MOBILE
		expect(findWallets([wallet('Split', [browser, mobile])], answers)[0]?.variant.platform).toBe(
			Variant.MOBILE,
		)
	})

	it.each([Rating.PARTIAL, Rating.FAIL, Rating.UNRATED, Rating.EXEMPT])(
		'does not treat %s as satisfying a requirement',
		rating => {
			const answers = initialFinderAnswers()

			answers.priorities.openSource = 'require'
			expect(findWallets([wallet('Example', [variant(Variant.BROWSER, rating)])], answers)).toEqual(
				[],
			)
		},
	)

	it('orders preferences transparently and uses missing evidence and names to break ties', () => {
		const answers = initialFinderAnswers()

		answers.priorities.openSource = 'prefer'
		const wallets = [
			wallet('Unknown', [variant(Variant.BROWSER, Rating.UNRATED)]),
			wallet('Zulu', [variant(Variant.BROWSER, Rating.PASS)]),
			wallet('Alpha', [variant(Variant.BROWSER, Rating.PASS)]),
			wallet('Partial', [variant(Variant.BROWSER, Rating.PARTIAL)]),
			wallet('Fail', [variant(Variant.BROWSER, Rating.FAIL)]),
		]

		expect(findWallets(wallets, answers).map(match => [match.wallet.name, match.points])).toEqual([
			['Alpha', 2],
			['Zulu', 2],
			['Partial', 1],
			['Fail', 0],
			['Unknown', 0],
		])
		expect(wallets[0].name).toBe('Unknown')
	})

	it('returns each wallet once with its best eligible variant', () => {
		const answers = initialFinderAnswers()

		answers.priorities.openSource = 'prefer'
		const matches = findWallets(
			[
				wallet('Example', [
					variant(Variant.BROWSER, Rating.PARTIAL),
					variant(Variant.MOBILE, Rating.PASS),
				]),
			],
			answers,
		)

		expect(matches).toHaveLength(1)
		expect(matches[0].variant.platform).toBe(Variant.MOBILE)
	})

	it('includes unrated wallets without preferences and resets answers independently', () => {
		const answers = initialFinderAnswers()

		answers.priorities.openSource = 'require'
		const reset = initialFinderAnswers()

		expect(reset.priorities.openSource).toBe('ignore')
		expect(
			findWallets([wallet('Unknown', [variant(Variant.BROWSER, Rating.UNRATED)])], reset),
		).toHaveLength(1)
		expect(findWallets([], reset)).toEqual([])
	})
})

it('projects complete, distinct platform assessments from the wallet registry', () => {
	const wallets = finderWalletData()

	expect(wallets.length).toBeGreaterThan(0)

	for (const candidate of wallets) {
		expect(candidate.variants.length).toBeGreaterThan(0)

		for (const platform of candidate.variants) {
			expect(Object.keys(platform.assessments).sort()).toEqual(
				finderCriteria.map(criterion => criterion.id).sort(),
			)
			expect(platform.url).toContain(`?variant=${platform.platform}`)
		}
	}
})

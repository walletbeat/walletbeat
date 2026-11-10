import { describe, expect, it } from 'vitest'

import { embeddedWalletAttributeTree, ratedEmbeddedWallets } from '@/data/embedded-wallets'
import { hardwareWalletAttributeTree, ratedHardwareWallets } from '@/data/hardware-wallets'
import { ratedSoftwareWallets, softwareWalletAttributeTree } from '@/data/software-wallets'
import { allWallets } from '@/data/wallets'
import { Rating } from '@/schema/attributes'
import type { CalendarDate } from '@/types/date'
import { isWalletDisplayable, isWalletUpdatedRecently } from '@/utils/wallet-imprecision-visibility'

import {
	impreciseWalletIds,
	impreciseWalletIdsFromScoreIntervals,
	weightedScoreInterval,
} from './utils/wallet-imprecision'

describe('wallet ranking imprecision', () => {
	it('excludes exempt attributes from the score interval', () => {
		expect(
			weightedScoreInterval([
				{ rating: Rating.EXEMPT, score: null, weight: 1 },
				{ rating: Rating.UNRATED, score: null, weight: 1 },
				{ rating: Rating.FAIL, score: 0, weight: 1 },
			]),
		).toEqual({ min: 0, max: 0.5 })
	})

	it('weights possible unrated outcomes by attribute weight', () => {
		expect(
			weightedScoreInterval([
				{ rating: Rating.UNRATED, score: null, weight: 1 },
				{ rating: Rating.PASS, score: 1, weight: 3 },
			]),
		).toEqual({ min: 0.75, max: 1 })
	})

	it('keeps wallet metadata aligned with the score interval rank calculation', () => {
		const expectedImpreciseWalletIds = new Set([
			...impreciseWalletIds(Object.values(ratedSoftwareWallets), softwareWalletAttributeTree),
			...impreciseWalletIds(Object.values(ratedHardwareWallets), hardwareWalletAttributeTree),
			...impreciseWalletIds(Object.values(ratedEmbeddedWallets), embeddedWalletAttributeTree),
		])
		const markedImpreciseWalletIds = new Set(
			Object.values(allWallets)
				.filter(wallet => wallet.metadata.imprecise)
				.map(wallet => wallet.metadata.id),
		)

		expect(markedImpreciseWalletIds).toEqual(expectedImpreciseWalletIds)
	})

	it('keeps a wallet whose score interval spans three positions', () => {
		const entries = [0, 1, 2, 3].map((sourceIndex, index) => ({
			id: `wallet-${index}`,
			interval:
				sourceIndex === 3 ? { min: 0, max: 1 } : { min: (index + 1) / 5, max: (index + 1) / 5 },
			score: (index + 1) / 5,
			stageIndex: 0,
			sourceIndex,
		}))

		expect(impreciseWalletIdsFromScoreIntervals(entries)).toEqual(new Set())
	})

	it('hides a wallet whose score interval spans four positions', () => {
		const entries = [0, 1, 2, 3, 4].map((sourceIndex, index) => ({
			id: `wallet-${index}`,
			interval:
				sourceIndex === 4 ? { min: 0, max: 1 } : { min: (index + 1) / 6, max: (index + 1) / 6 },
			score: (index + 1) / 6,
			stageIndex: 0,
			sourceIndex,
		}))

		expect(impreciseWalletIdsFromScoreIntervals(entries)).toEqual(new Set(['wallet-4']))
	})

	it('does not count score movement across different stages', () => {
		const entries = [
			{
				id: 'higher-stage',
				interval: { min: 0.8, max: 0.8 },
				score: 0.8,
				stageIndex: 2,
				sourceIndex: 0,
			},
			{
				id: 'uncertain-lower-stage',
				interval: { min: 0, max: 1 },
				score: 0.5,
				stageIndex: 1,
				sourceIndex: 1,
			},
		]

		expect(impreciseWalletIdsFromScoreIntervals(entries)).toEqual(new Set())
	})

	it('uses stable source order when scores tie', () => {
		const entries = [
			{
				id: 'first',
				interval: { min: 0.5, max: 0.5 },
				score: 0.5,
				stageIndex: 0,
				sourceIndex: 0,
			},
			{
				id: 'second',
				interval: { min: 0.5, max: 0.5 },
				score: 0.5,
				stageIndex: 0,
				sourceIndex: 1,
			},
		]

		expect(impreciseWalletIdsFromScoreIntervals(entries)).toEqual(new Set())
	})

	describe('recent-update visibility grace period', () => {
		const today = '2026-11-10' as CalendarDate

		it('includes today and the date seven days before it', () => {
			expect(isWalletUpdatedRecently('2026-11-10', today)).toBe(true)
			expect(isWalletUpdatedRecently('2026-11-03', today)).toBe(true)
		})

		it('excludes updates older than seven days or dated in the future', () => {
			expect(isWalletUpdatedRecently('2026-11-02', today)).toBe(false)
			expect(isWalletUpdatedRecently('2026-11-11', today)).toBe(false)
		})

		it('always shows precise wallets', () => {
			expect(isWalletDisplayable({ imprecise: false, lastUpdated: '2020-01-01' }, today)).toBe(true)
		})

		it('shows imprecise wallets only during the grace period', () => {
			expect(isWalletDisplayable({ imprecise: true, lastUpdated: '2026-11-03' }, today)).toBe(true)
			expect(isWalletDisplayable({ imprecise: true, lastUpdated: '2026-11-02' }, today)).toBe(false)
		})
	})
})

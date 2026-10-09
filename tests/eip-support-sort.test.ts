import { describe, expect, it } from 'vitest'

import { ratedSoftwareWallets, softwareWalletAttributeTree } from '@/data/software-wallets'
import {
	type EipStatusSupportCard,
	EipSupportStatus,
	ratedWalletEipSupportByStatus,
} from '@/schema/eip-support'
import type { FullyQualifiedReference } from '@/schema/reference'
import { Variant } from '@/schema/variants'
import type { CalendarDate } from '@/types/date'
import {
	compareEipSupportCardSortKeys,
	earliestSupportEvidence,
	type EipSupportCardSortKey,
	sortEipSupportCards,
	walletStageIndex,
} from '@/utils/eip-support-sort'

function reference(lastRetrieved?: CalendarDate): FullyQualifiedReference {
	return {
		urls: [{ url: 'https://example.com', label: 'Example' }],
		...(lastRetrieved === undefined ? {} : { lastRetrieved }),
	}
}

function key(
	earliest: CalendarDate | null,
	stageIndex: number,
	score: number | null,
): EipSupportCardSortKey {
	return { earliestSupportEvidence: earliest, stageIndex, score }
}

describe('earliestSupportEvidence', () => {
	it('returns the oldest retrieval date of a supported card', () => {
		expect(
			earliestSupportEvidence({
				status: EipSupportStatus.SUPPORTED,
				references: [reference('2025-03-01'), reference(), reference('2024-11-20')],
			}),
		).toBe('2024-11-20')
	})

	it('returns null when no reference carries a retrieval date', () => {
		expect(
			earliestSupportEvidence({
				status: EipSupportStatus.SUPPORTED,
				references: [reference(), reference()],
			}),
		).toBeNull()
	})

	it('returns null for cards that are not supported', () => {
		expect(
			earliestSupportEvidence({
				status: EipSupportStatus.NOT_SUPPORTED,
				references: [reference('2024-11-20')],
			}),
		).toBeNull()
	})
})

describe('compareEipSupportCardSortKeys', () => {
	it('puts earlier evidence of support first', () => {
		expect(
			compareEipSupportCardSortKeys(key('2024-01-01', 0, 0.1), key('2025-01-01', 2, 0.9)),
		).toBeLessThan(0)
	})

	it('puts dated evidence before undated evidence', () => {
		expect(
			compareEipSupportCardSortKeys(key(null, 2, 0.9), key('2025-01-01', -1, 0)),
		).toBeGreaterThan(0)
	})

	it('falls back to the higher stage, then the higher score', () => {
		expect(compareEipSupportCardSortKeys(key(null, 1, 0.1), key(null, 0, 0.9))).toBeLessThan(0)
		expect(compareEipSupportCardSortKeys(key(null, 1, 0.8), key(null, 1, 0.4))).toBeLessThan(0)
		expect(compareEipSupportCardSortKeys(key(null, 1, 0.4), key(null, 1, 0.4))).toBe(0)
	})
})

describe('sortEipSupportCards', () => {
	const wallets = Object.values(ratedSoftwareWallets)

	function cardsFor(lastRetrieved: (walletId: string) => CalendarDate | undefined): Array<{
		wallet: (typeof wallets)[number]
		card: EipStatusSupportCard
	}> {
		return wallets.flatMap(wallet => {
			const supported = ratedWalletEipSupportByStatus(wallet, '1193')[EipSupportStatus.SUPPORTED]

			if (supported === undefined) {
				return []
			}

			return [
				{
					wallet,
					card: {
						id: wallet.metadata.id,
						displayName: wallet.metadata.displayName,
						iconExtension: wallet.metadata.iconExtension,
						url: `/${wallet.metadata.id}/`,
						status: EipSupportStatus.SUPPORTED,
						variants: [Variant.BROWSER],
						references: [reference(lastRetrieved(wallet.metadata.id))],
					},
				},
			]
		})
	}

	it('follows the homepage order (stage, then score) when no evidence is dated', () => {
		const entries = cardsFor(() => undefined)

		expect(entries.length).toBeGreaterThan(1)

		const sorted = sortEipSupportCards(softwareWalletAttributeTree, entries)
		const stages = sorted.map(card => {
			const wallet = wallets.find(({ metadata }) => metadata.id === card.id)

			if (wallet === undefined) {
				throw new Error(`Unknown wallet ${card.id}`)
			}

			return walletStageIndex(wallet)
		})

		expect(stages).toEqual(stages.toSorted((stageA, stageB) => stageB - stageA))
	})

	it('puts the wallet with the earliest dated evidence first', () => {
		const undated = sortEipSupportCards(
			softwareWalletAttributeTree,
			cardsFor(() => undefined),
		)
		const last = undated.at(-1)

		if (last === undefined) {
			throw new Error('Expected at least one card')
		}

		const sorted = sortEipSupportCards(
			softwareWalletAttributeTree,
			cardsFor(walletId => (walletId === last.id ? '2023-01-01' : undefined)),
		)

		expect(sorted[0].id).toBe(last.id)
		expect(sorted.slice(1).map(({ id }) => id)).toEqual(undated.slice(0, -1).map(({ id }) => id))
	})
})

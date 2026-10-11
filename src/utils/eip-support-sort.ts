import { type AttributeTree, calculateOverallScore } from '@/schema/attribute-groups'
import { type EipStatusSupportCard, EipSupportStatus } from '@/schema/eip-support'
import type { RatedWallet } from '@/schema/wallet'
import type { CalendarDate } from '@/types/date'
import { getWalletStageAndLadder, type RatedWalletStageSlice } from '@/utils/stage'

/** The values EIP support cards are ordered by. */
export interface EipSupportCardSortKey {
	/**
	 * The earliest date on which a reference backing the card's support was
	 * retrieved, or null if the card is not a "supported" card or none of its
	 * references carry a retrieval date.
	 */
	earliestSupportEvidence: CalendarDate | null

	/** Index of the stage the wallet cleared; -1 if it cleared none. */
	stageIndex: number

	/** The wallet's overall score, or null if it has none. */
	score: number | null
}

/**
 * The earliest evidence of a card's EIP support: the oldest `lastRetrieved`
 * date among its references. Only "supported" cards have support evidence.
 */
export function earliestSupportEvidence(
	card: Pick<EipStatusSupportCard, 'status' | 'references'>,
): CalendarDate | null {
	if (card.status !== EipSupportStatus.SUPPORTED) {
		return null
	}

	const dates = card.references
		.map(({ lastRetrieved }) => lastRetrieved)
		.filter((date): date is CalendarDate => date !== undefined)

	return dates.toSorted().at(0) ?? null
}

/**
 * Index of the stage a wallet cleared on its primary ladder, matching the
 * homepage table's ordering: -1 for wallets that cleared no stage (or have no
 * applicable ladder), then 0, 1, 2... for Stage 0, 1, 2...
 */
export function walletStageIndex(wallet: RatedWalletStageSlice): number {
	const { stage, ladderEvaluation } = getWalletStageAndLadder(wallet)

	if (stage === null || typeof stage === 'string' || ladderEvaluation === null) {
		return -1
	}

	return ladderEvaluation.ladder.stages.findIndex(({ id }) => id === stage.id)
}

/**
 * Compare two EIP support card sort keys: cards with earlier evidence of
 * support come first, then cards without any dated evidence. Ties are broken
 * like the homepage table: higher stage first, then higher overall score.
 */
export function compareEipSupportCardSortKeys(
	keyA: EipSupportCardSortKey,
	keyB: EipSupportCardSortKey,
): number {
	const { earliestSupportEvidence: dateA } = keyA
	const { earliestSupportEvidence: dateB } = keyB

	if (dateA !== dateB) {
		if (dateA === null) {
			return 1
		}

		if (dateB === null) {
			return -1
		}

		return dateA < dateB ? -1 : 1
	}

	if (keyA.stageIndex !== keyB.stageIndex) {
		return keyB.stageIndex - keyA.stageIndex
	}

	return (keyB.score ?? 0) - (keyA.score ?? 0)
}

/**
 * Sort EIP support cards by earliest evidence of support, falling back to the
 * homepage order (stage, then overall score) for cards without dated evidence
 * and for cards that are not "supported" cards. The sort is stable, so cards
 * with identical keys keep their input order.
 */
export function sortEipSupportCards<_AttributeGroupId extends string>(
	attributeTree: AttributeTree<_AttributeGroupId>,
	entries: Array<{ wallet: RatedWallet<_AttributeGroupId>; card: EipStatusSupportCard }>,
): EipStatusSupportCard[] {
	return entries
		.map(({ wallet, card }) => ({
			card,
			key: {
				earliestSupportEvidence: earliestSupportEvidence(card),
				stageIndex: walletStageIndex(wallet),
				score: calculateOverallScore(attributeTree, wallet.overall, () => true)?.score ?? null,
			},
		}))
		.toSorted((entryA, entryB) => compareEipSupportCardSortKeys(entryA.key, entryB.key))
		.map(({ card }) => card)
}

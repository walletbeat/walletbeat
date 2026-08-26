import type { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'
import type { ReferenceInput } from '@/schema/reference'

/** How a wallet can broadcast an L1 transaction without an intermediary. */
export type L1BroadcastSupport = 'NO' | 'SELF_GOSSIP' | 'OWN_NODE'

/** What a wallet can force-include on a given L2. */
export type L2ForceInclusionCapability =
	/** Any transaction can be force-included from L1. */
	| 'ARBITRARY_TRANSACTIONS'
	/** Only withdrawals can be force-included from L1. */
	| 'WITHDRAWALS_ONLY'
	/** Nothing can be force-included; withdrawals depend on intermediaries. */
	| 'NONE'

/** Force-inclusion capability for one configured L2. */
export interface TransactionInclusionL2Detail {
	l2: TransactionSubmissionL2Type
	forceInclusion: L2ForceInclusionCapability
}

/**
 * Canonical detail model for transaction inclusion.
 *
 * Each configured L2 appears exactly once with its own capability, so the
 * arbitrary-transactions versus withdrawal-only distinction survives without
 * the overlapping arrays that used to make an L2 render twice.
 */
export interface TransactionInclusionDetails {
	type: 'transactionInclusion'
	l1Broadcast: L1BroadcastSupport
	l2s: TransactionInclusionL2Detail[]

	/** References backing the L1 broadcast claim. */
	l1References?: ReferenceInput

	/** References backing the L2 force-inclusion claims. */
	l2References?: ReferenceInput
}

/** The L2s a wallet can force-include something on, each listed once. */
export function forceInclusionCapableL2s(
	details: TransactionInclusionDetails,
): TransactionSubmissionL2Type[] {
	return details.l2s
		.filter(({ forceInclusion }) => forceInclusion !== 'NONE')
		.map(({ l2 }) => l2)
}

/** The L2s a wallet cannot force-include anything on. */
export function forceInclusionIncapableL2s(
	details: TransactionInclusionDetails,
): TransactionSubmissionL2Type[] {
	return details.l2s
		.filter(({ forceInclusion }) => forceInclusion === 'NONE')
		.map(({ l2 }) => l2)
}

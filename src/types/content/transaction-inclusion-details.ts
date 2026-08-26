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

export interface TransactionInclusionL2Detail {
	l2: TransactionSubmissionL2Type
	forceInclusion: L2ForceInclusionCapability
}

export interface TransactionInclusionDetails {
	type: 'transactionInclusion'
	l1Broadcast: L1BroadcastSupport
	l2s: TransactionInclusionL2Detail[]

	l1References?: ReferenceInput

	l2References?: ReferenceInput
}

export function forceInclusionCapableL2s(
	details: TransactionInclusionDetails,
): TransactionSubmissionL2Type[] {
	return details.l2s.filter(({ forceInclusion }) => forceInclusion !== 'NONE').map(({ l2 }) => l2)
}

export function forceInclusionIncapableL2s(
	details: TransactionInclusionDetails,
): TransactionSubmissionL2Type[] {
	return details.l2s.filter(({ forceInclusion }) => forceInclusion === 'NONE').map(({ l2 }) => l2)
}

import {
	type TransactionSubmissionL2Type,
	transactionSubmissionL2TypeName,
} from '@/schema/features/self-sovereignty/transaction-submission'
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

/**
 * One rendered transaction-inclusion block, tagged with the claim it makes so
 * adapters can attach the right references to it.
 */
export interface TransactionInclusionBlock {
	claim: 'l1' | 'l2'
	text: string
}

export function transactionInclusionProse(
	details: TransactionInclusionDetails,
): TransactionInclusionBlock[] {
	const capable = forceInclusionCapableL2s(details).toSorted()
	const incapable = forceInclusionIncapableL2s(details).toSorted()
	const blocks: TransactionInclusionBlock[] = []

	if (capable.length > 0) {
		blocks.push({
			claim: 'l2',
			text: `**{{WALLET_NAME}}** supports L2 force-inclusion withdrawal transactions on **${capable
				.map(transactionSubmissionL2TypeName)
				.join(
					', ',
				)}** L2s.\n\nThis means users may withdraw funds from these L2s without relying on intermediaries.`,
		})
	}

	if (incapable.length > 0) {
		blocks.push({
			claim: 'l2',
			text: `${capable.length > 0 ? 'However, it' : '**{{WALLET_NAME}}**'} does not support L2 force-inclusion withdrawal transactions on **${incapable
				.map(transactionSubmissionL2TypeName)
				.join(
					' or ',
				)}** L2s.\n\nThis means users rely on intermediaries in order to withdraw their funds from these L2s.`,
		})
	}

	switch (details.l1Broadcast) {
		case 'NO':
			blocks.push({
				claim: 'l1',
				text: "**{{WALLET_NAME}}** does not support Ethereum peer-to-peer gossiping nor connecting to a user's self-hosted Ethereum node.\n\nTherefore, L1 transactions are subject to censorship by intermediaries.",
			})
			break
		case 'OWN_NODE':
			blocks.push({
				claim: 'l1',
				text: "**{{WALLET_NAME}}** supports connecting to a user's self-hosted Ethereum node, which can be used to broadcast L1 transactions without trusting intermediaries.",
			})
			break
		case 'SELF_GOSSIP':
			blocks.push({
				claim: 'l1',
				text: "**{{WALLET_NAME}}** supports directly gossipping over Ethereum's peer-to-peer network, allowing L1 transactions to be reliably included without trusting intermediaries.",
			})
	}

	return blocks
}

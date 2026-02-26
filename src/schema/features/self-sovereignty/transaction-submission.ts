import type { WithRef } from '@/schema/reference'

import type { Support } from '../support'

/**
 * L2 types considered for transaction submission.
 * Each L2 type has its own force-inclusion mechanism documented below.
 */
export enum TransactionSubmissionL2Type {
	/**
	 * Arbitrum chains (Arbitrum One, Arbitrum Nova, etc.).
	 * Force inclusion: users can submit transactions directly to the L1 delayed inbox,
	 * bypassing the sequencer after a delay.
	 * Reference: https://rollup-fortress.github.io/uncensored-book/research/arbitrum-force-inclusion.html
	 */
	arbitrum = 'arbitrum',

	/**
	 * OP Stack chains (Optimism, Base, Mode, etc.).
	 * Force inclusion: users can deposit transactions directly via the L1 bridge contract,
	 * which the sequencer must include.
	 * Reference: https://docs.optimism.io/stack/transactions/forced-transaction
	 */
	opStack = 'opStack',
}

export const transactionSubmissionL2Types: TransactionSubmissionL2Type[] = [
	TransactionSubmissionL2Type.arbitrum,
	TransactionSubmissionL2Type.opStack,
]

/** Human-friendly name for an L2 type. */
export function transactionSubmissionL2TypeName(l2Type: TransactionSubmissionL2Type): string {
	switch (l2Type) {
		case TransactionSubmissionL2Type.arbitrum:
			return 'Arbitrum'
		case TransactionSubmissionL2Type.opStack:
			return 'OP Stack'
	}
}

/**
 * Levels of support for L2 force-inclusion transactions.
 *
 * Force inclusion is an L2 escape hatch: when a sequencer censors or delays a
 * transaction, the user can submit it directly to L1 and force the sequencer
 * to include it. This is a critical self-sovereignty property.
 *
 * To identify: check the wallet's documentation or UI for any "force include",
 * "sequencer bypass", or "L1 submission" feature.
 */
export enum TransactionSubmissionL2Support {
	/**
	 * The wallet does not support this L2 type with its default configuration.
	 * (e.g. The wallet has no Arbitrum or OP Stack network in its default chain list.)
	 * To identify: check the wallet's default network list — if the L2 type is absent,
	 * use this value.
	 */
	NOT_SUPPORTED_BY_WALLET_BY_DEFAULT = 'NOT_SUPPORTED_BY_WALLET_BY_DEFAULT',

	/**
	 * The L2 is supported, but the wallet has no force-inclusion capability.
	 * The user can only submit transactions through the sequencer.
	 * (e.g. The wallet supports Arbitrum but offers no way to submit directly
	 * to the L1 delayed inbox.)
	 * To identify: the wallet supports the L2 but has no force-inclusion UI or
	 * documented escape hatch flow.
	 */
	SUPPORTED_BUT_NO_FORCE_INCLUSION = 'SUPPORTED_BUT_NO_FORCE_INCLUSION',

	/**
	 * The wallet supports force-including withdrawal transactions on this L2.
	 * This covers the case where the user can force-exit funds to L1 even if the
	 * sequencer is censoring them, but cannot force-include arbitrary calls.
	 * (e.g. The wallet has a dedicated "withdraw via L1" flow for moving funds
	 * out of the L2 without relying on the sequencer.)
	 */
	SUPPORTED_WITH_FORCE_INCLUSION_OF_WITHDRAWALS = 'SUPPORTED_WITH_FORCE_INCLUSION_OF_WITHDRAWALS',

	/**
	 * The wallet supports force-including any arbitrary transaction on this L2,
	 * not just withdrawals.
	 * (e.g. The wallet allows submitting any L2 transaction directly to L1 via
	 * the force-inclusion mechanism, bypassing sequencer censorship entirely.)
	 */
	SUPPORTED_WITH_FORCE_INCLUSION_OF_ARBITRARY_TRANSACTIONS = 'SUPPORTED_WITH_FORCE_INCLUSION_OF_ARBITRARY_TRANSACTIONS',
}

/**
 * Support for transaction broadcast and inclusion.
 * L1 broadcast fields require network traffic inspection or source code
 * research to verify — the UI alone does not reveal how transactions are submitted.
 */
export interface TransactionSubmission {
	/**
	 * Options for broadcasting transactions to L1.
	 * The ref must link to documentation or source code evidence for each claim.
	 */
	l1: WithRef<{
		/**
		 * Whether the wallet can broadcast transactions by participating directly
		 * in the Ethereum P2P gossip network, without relying on any RPC endpoint.
		 * To identify: check the wallet's source code for a P2P networking stack
		 * (e.g. devp2p). If absent, set to not supported. Set to null if unknown.
		 */
		selfBroadcastViaDirectGossip: Support | null

		/**
		 * Whether the wallet submits transactions through the user's self-hosted
		 * node when one is configured as the RPC endpoint.
		 * Verify by configuring a local node, sending a transaction,
		 * and confirming via network traffic that the `eth_sendRawTransaction` call goes to your
		 * node and not to any external relay or bundler.
		 */
		selfBroadcastViaSelfHostedNode: Support | null
	}>

	/**
	 * Options for broadcasting transactions to L2 chains.
	 * The ref must link to documentation or source code evidence.
	 * Set a chain's value to null if its support level has not been researched.
	 */
	l2: WithRef<Record<TransactionSubmissionL2Type, TransactionSubmissionL2Support | null>>
}

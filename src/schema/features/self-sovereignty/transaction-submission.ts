import type { Support } from '../support'

/** L2 types considered for transaction submission. */
export type TransactionSubmissionL2Type =
	| 'opStack' // https://docs.optimism.io/stack/transactions/forced-transaction
	| 'arbitrum' // https://github.com/wakeuplabs-io/arbitrum-connect/blob/main/README.md | https://rollup-fortress.github.io/uncensored-book/research/arbitrum-force-inclusion.html

/** Human-friendly name for an L2 type. */
export function transactionSubmissionL2TypeName(l2Type: TransactionSubmissionL2Type): string {
	switch (l2Type) {
		case 'arbitrum':
			return 'Arbitrum'
		case 'opStack':
			return 'OP Stack'
	}
}

/** Levels of support for L2 force-inclusion transactions. */
export enum TransactionSubmissionL2Support {
	/** This type of L2 isn't usable with the wallet's default configuration. */
	NOT_SUPPORTED_BY_WALLET_BY_DEFAULT = 'NOT_SUPPORTED_BY_WALLET_BY_DEFAULT',

	/**
	 * This type of L2 is supported with the wallet's default configuration,
	 * but the wallet does not support any type of force-inclusion transaction
	 * for it.
	 */
	SUPPORTED_BUT_NO_FORCE_INCLUSION = 'SUPPORTED_BUT_NO_FORCE_INCLUSION',

	/**
	 * This type of L2 is supported with the wallet's default configuration,
	 * and the wallet supports force-included withdrawal transactions.
	 */
	SUPPORTED_WITH_FORCE_INCLUSION_OF_WITHDRAWALS = 'SUPPORTED_WITH_FORCE_INCLUSION_OF_WITHDRAWALS',

	/**
	 * This type of L2 is supported with the wallet's default configuration,
	 * and the wallet supports arbitrary force-included transactions.
	 */
	SUPPORTED_WITH_FORCE_INCLUSION_OF_ARBITRARY_TRANSACTIONS = 'SUPPORTED_WITH_FORCE_INCLUSION_OF_ARBITRARY_TRANSACTIONS',
}

/** Support for transaction broadcast and inclusion. */
export interface TransactionSubmission {
	/* Options for broadcasting transactions to L1. */
	l1: {
		/**
		 * Whether the wallet is able to self-broadcast by acting as its own
		 * gossipping node in the Ethereum L1.
		 */
		selfBroadcastViaDirectGossip: Support | null

		/**
		 * Whether the wallet is able to self-broadcast when configured to use
		 * a user's self-hosted node address.
		 * Note that some wallets may use MEV relays for transaction submission,
		 * or always go through ERC-4337 bundlers even when configured to
		 * otherwise use a user's self-hosted node, so this needs explicit
		 * verification.
		 */
		selfBroadcastViaSelfHostedNode: Support | null
	}

	/** Options for broadcasting transactions to L2 chains. */
	l2: Record<TransactionSubmissionL2Type, TransactionSubmissionL2Support | null>
}

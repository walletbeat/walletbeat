import type { Entity } from '@/schema/entity'
import type { WithRef } from '@/schema/reference'
import { Enum } from '@/utils/enum'

import {
	type Endpoint,
	isSecureEnclaveEndpoint,
	type SecureEnclaveEndpoint,
} from '../privacy/data-collection'

export enum OrderflowDisclosureType {
	NOT_DISCLOSED = 'NOT_DISCLOSED',
	DISCLOSED_DURING_TRANSACTION_FLOW = 'DISCLOSED_DURING_TRANSACTION_FLOW',
	DISCLOSED_DURING_USER_ONBOARDING = 'DISCLOSED_DURING_USER_ONBOARDING',
}

export const orderflowDisclosureType = new Enum<OrderflowDisclosureType>({
	[OrderflowDisclosureType.DISCLOSED_DURING_TRANSACTION_FLOW]: true,
	[OrderflowDisclosureType.DISCLOSED_DURING_USER_ONBOARDING]: true,
	[OrderflowDisclosureType.NOT_DISCLOSED]: true,
})

/**
 * Set of entities which learn the user's transaction intent and orderflow.
 */
export type OrderflowDisclosures = WithRef<{
	/**
	 * List of entities which learn the user's transaction data or intent
	 * and which have an adequate disclosure in the transaction flow.
	 */
	[OrderflowDisclosureType.DISCLOSED_DURING_TRANSACTION_FLOW]?: Entity[]

	/**
	 * List of entities which learn the user's transaction data or intent
	 * and which have an adequate disclosure in the user onboarding flow.
	 */
	[OrderflowDisclosureType.DISCLOSED_DURING_USER_ONBOARDING]?: Entity[]

	/**
	 * List of entities which learn the user's transaction data or intent
	 * and which do not have any disclosure.
	 */
	[OrderflowDisclosureType.NOT_DISCLOSED]?: Entity[]

	/**
	 * Whether the wallet only supports one type of transaction, such that
	 * the way orders are handled and the MEV risks of all transactions are
	 * exactly the same across the entire user experience.
	 * Example: A trading-focused wallet that only supports swaps and no
	 * other transaction types.
	 */
	singleTransactionTypeUseCase: boolean

	/**
	 * Whether the wallet works only locally and never contacts other services,
	 * even for transaction submission.
	 */
	localOnly: boolean
}>

/**
 * A server endpoint running in a secure enclave (TEE) and that handles
 * transaction data.
 */
export interface TransactionHandlingSecureEndpoint extends SecureEnclaveEndpoint {
	/**
	 * Does the endpoint ever export transaction data for transactions that have
	 * yet to be included onchain?
	 * Valid block proposals do not count, as they represent the act of
	 * transaction inclusion itself.
	 */
	exportsNonIncludedTransactionData: boolean

	/**
	 * Can the endpoint generate its own transactions (true),
	 * or are all transactions sourced from external clients?
	 */
	canGenerateOwnTransactions: boolean

	/**
	 * When ordering transactions in a block, is the ordering of transactions
	 * provably fair across all transactions known to the endpoint?
	 */
	provablyFairOrdering: boolean
}

/** Type predicate for TransactionHandlingSecureEndpoint. */
export function isTransactionHandlingSecureEndpoint(
	endpoint: Endpoint,
): endpoint is TransactionHandlingSecureEndpoint {
	if (!isSecureEnclaveEndpoint(endpoint)) {
		return false
	}

	return (
		Object.hasOwn(endpoint, 'exportsNonIncludedTransactionData') &&
		Object.hasOwn(endpoint, 'canGenerateOwnTransactions') &&
		Object.hasOwn(endpoint, 'provablyFairOrdering')
	)
}

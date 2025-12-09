import type { WithRef } from '@/schema/reference'

export interface DataDisplaySupport {
	calldataDisplay: WithRef<CallDataDisplay> | null
	transactionDetailsDisplay: WithRef<TransactionDetailsDisplay> | null
}

export interface CallDataDisplay {
	/* Can display the calldata in raw hex format */
	rawHex: boolean

	/* Can the user copy the raw hex code to the clipboard? */
	copyHexToClipboard: boolean

	/* Can display the calldata in some formatted output (e.g. JSON) */
	formatted: boolean
}

/**
 * What essential transaction data does the hardware wallet show? (Or can show via options)
 */
export interface TransactionDetailsDisplay {
	gas: boolean
	nonce: boolean
	from: boolean
	to: boolean
	chain: boolean
	value: boolean
}
export type DataDisplayImplementation = DataDisplaySupport

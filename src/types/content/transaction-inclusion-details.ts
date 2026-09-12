import type { EvaluationData } from '@/schema/attributes'
import type { L1BroadcastSupport } from '@/schema/attributes/self-sovereignty/transaction-inclusion'
import type { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'

import { component, type Content } from '../content'

export interface TransactionInclusionDetailsProps extends EvaluationData {
	supportsL1Broadcast: L1BroadcastSupport
	supportAnyL2Transactions: TransactionSubmissionL2Type[]
	supportForceWithdrawal: TransactionSubmissionL2Type[]
	unsupportedL2s: TransactionSubmissionL2Type[]
}

export type TransactionInclusionDetailsBakedProps = Omit<
	TransactionInclusionDetailsProps,
	keyof EvaluationData
>

export interface TransactionInclusionDetailsContent {
	component: 'TransactionInclusionDetails'
	componentProps: TransactionInclusionDetailsBakedProps
}

export function transactionInclusionDetailsContent(
	bakedProps: TransactionInclusionDetailsBakedProps,
): Content<{ WALLET_NAME: string }> {
	return component('TransactionInclusionDetails', bakedProps)
}

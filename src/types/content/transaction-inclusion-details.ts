import type { EvaluationData } from '@/schema/attributes'
import type {
	L1BroadcastSupport,
	TransactionInclusionValue,
} from '@/schema/attributes/self-sovereignty/transaction-inclusion'
import type { TransactionSubmissionL2Type } from '@/schema/features/self-sovereignty/transaction-submission'

import { component, type Content } from '../content'

export interface TransactionInclusionDetailsProps
	extends EvaluationData<TransactionInclusionValue> {
	supportsL1Broadcast: L1BroadcastSupport
	supportAnyL2Transactions: TransactionSubmissionL2Type[]
	supportForceWithdrawal: TransactionSubmissionL2Type[]
	unsupportedL2s: TransactionSubmissionL2Type[]
}

export interface TransactionInclusionDetailsContent {
	component: 'TransactionInclusionDetails'
	componentProps: TransactionInclusionDetailsProps
}

export function transactionInclusionDetailsContent(
	bakedProps: Omit<
		TransactionInclusionDetailsProps,
		keyof EvaluationData<TransactionInclusionValue>
	>,
): Content<{ WALLET_NAME: string }> {
	return component<TransactionInclusionDetailsContent, keyof typeof bakedProps>(
		'TransactionInclusionDetails',
		bakedProps,
	)
}

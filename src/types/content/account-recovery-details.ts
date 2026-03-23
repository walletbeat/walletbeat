import type { EvaluationData } from '@/schema/attributes'
import type { AccountRecoveryMetadata } from '@/schema/attributes/security/account-recovery'

import { component, type Content } from '../content'

export interface AccountRecoveryDetailsProps extends Omit<
	EvaluationData<AccountRecoveryMetadata>,
	'outcome'
> {
	metadata: AccountRecoveryMetadata
}

export interface AccountRecoveryDetailsContent {
	component: 'AccountRecoveryDetails'
	componentProps: AccountRecoveryDetailsProps
}

export function accountRecoveryDetailsContent(
	bakedProps: Omit<
		AccountRecoveryDetailsProps,
		keyof Omit<EvaluationData<AccountRecoveryMetadata>, 'outcome'> | 'metadata'
	>,
): Content<{ WALLET_NAME: string }> {
	return component<AccountRecoveryDetailsContent, keyof typeof bakedProps>(
		'AccountRecoveryDetails',
		bakedProps,
	)
}

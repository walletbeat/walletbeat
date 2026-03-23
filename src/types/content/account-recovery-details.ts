import type { EvaluationData } from '@/schema/attributes'
import type { AccountRecoveryOutcomeMetadata } from '@/schema/attributes/security/account-recovery'

import { component, type Content } from '../content'

export interface AccountRecoveryDetailsProps extends EvaluationData<AccountRecoveryOutcomeMetadata> {}

export interface AccountRecoveryDetailsContent {
	component: 'AccountRecoveryDetails'
	componentProps: AccountRecoveryDetailsProps
}

export function accountRecoveryDetailsContent(
	bakedProps: Omit<
		AccountRecoveryDetailsProps,
		keyof EvaluationData<AccountRecoveryOutcomeMetadata>
	>,
): Content<{ WALLET_NAME: string }> {
	return component<AccountRecoveryDetailsContent, keyof typeof bakedProps>(
		'AccountRecoveryDetails',
		bakedProps,
	)
}

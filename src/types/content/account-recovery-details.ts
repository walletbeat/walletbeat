import type { EvaluationDetailProps } from '@/schema/attributes'
import type { AccountRecoveryMetadata } from '@/schema/attributes/security/account-recovery'

import { component, type Content } from '../content'

export interface AccountRecoveryDetailsProps extends EvaluationDetailProps<AccountRecoveryMetadata> {}

export interface AccountRecoveryDetailsContent {
	component: 'AccountRecoveryDetails'
	componentProps: AccountRecoveryDetailsProps
}

export function accountRecoveryDetailsContent(
	bakedProps: Omit<
		AccountRecoveryDetailsProps,
		keyof EvaluationDetailProps<AccountRecoveryMetadata>
	>,
): Content<{ WALLET_NAME: string }> {
	return component<AccountRecoveryDetailsContent, keyof typeof bakedProps>(
		'AccountRecoveryDetails',
		bakedProps,
	)
}

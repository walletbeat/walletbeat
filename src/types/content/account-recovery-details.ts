import type { EvaluationDetailProps } from '@/schema/attributes'
import type { AccountRecoveryMetadata } from '@/schema/attributes/security/account-recovery'

import { component, type Content } from '../content'

export interface AccountRecoveryDetailsProps extends EvaluationDetailProps<AccountRecoveryMetadata> {}

export type AccountRecoveryDetailsBakedProps = Omit<
	AccountRecoveryDetailsProps,
	keyof EvaluationDetailProps<AccountRecoveryMetadata>
>

export interface AccountRecoveryDetailsContent {
	component: 'AccountRecoveryDetails'
	componentProps: AccountRecoveryDetailsBakedProps
}

export function accountRecoveryDetailsContent(
	bakedProps: AccountRecoveryDetailsBakedProps,
): Content<{ WALLET_NAME: string }> {
	return component('AccountRecoveryDetails', bakedProps)
}

import type { EvaluationDetailProps } from '@/schema/attributes'
import type { AccountUnruggabilityMetadata } from '@/schema/attributes/self-sovereignty/account-unruggability'

import { component, type Content } from '../content'

export interface AccountUnruggabilityDetailsProps extends EvaluationDetailProps<AccountUnruggabilityMetadata> {}

export type AccountUnruggabilityDetailsBakedProps = Omit<
	AccountUnruggabilityDetailsProps,
	keyof EvaluationDetailProps<AccountUnruggabilityMetadata>
>

export interface AccountUnruggabilityDetailsContent {
	component: 'AccountUnruggabilityDetails'
	componentProps: AccountUnruggabilityDetailsBakedProps
}

export function accountUnruggabilityDetailsContent(
	bakedProps: AccountUnruggabilityDetailsBakedProps,
): Content<{ WALLET_NAME: string }> {
	return component('AccountUnruggabilityDetails', bakedProps)
}

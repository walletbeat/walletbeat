import type { EvaluationData } from '@/schema/attributes'
import type { AccountUnruggabilityValue } from '@/schema/attributes/self-sovereignty/account-unruggability'

import { component, type Content } from '../content'

export interface AccountUnruggabilityDetailsProps
	extends EvaluationData<AccountUnruggabilityValue> {}

export interface AccountUnruggabilityDetailsContent {
	component: 'AccountUnruggabilityDetails'
	componentProps: AccountUnruggabilityDetailsProps
}

export function accountUnruggabilityDetailsContent(
	bakedProps: Omit<
		AccountUnruggabilityDetailsProps,
		keyof EvaluationData<AccountUnruggabilityValue>
	>,
): Content<{ WALLET_NAME: string }> {
	return component<AccountUnruggabilityDetailsContent, keyof typeof bakedProps>(
		'AccountUnruggabilityDetails',
		bakedProps,
	)
}

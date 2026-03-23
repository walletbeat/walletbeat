import type { EvaluationData } from '@/schema/attributes'
import type { AccountUnruggabilityOutcomeMetadata } from '@/schema/attributes/self-sovereignty/account-unruggability'

import { component, type Content } from '../content'

export interface AccountUnruggabilityDetailsProps extends Omit<
	EvaluationData<AccountUnruggabilityOutcomeMetadata>,
	'outcome'
> {
	metadata: AccountUnruggabilityOutcomeMetadata
}

export interface AccountUnruggabilityDetailsContent {
	component: 'AccountUnruggabilityDetails'
	componentProps: AccountUnruggabilityDetailsProps
}

export function accountUnruggabilityDetailsContent(
	bakedProps: Omit<
		AccountUnruggabilityDetailsProps,
		keyof Omit<EvaluationData<AccountUnruggabilityOutcomeMetadata>, 'outcome'> | 'metadata'
	>,
): Content<{ WALLET_NAME: string }> {
	return component<AccountUnruggabilityDetailsContent, keyof typeof bakedProps>(
		'AccountUnruggabilityDetails',
		bakedProps,
	)
}

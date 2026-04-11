import type { EvaluationDetailProps } from '@/schema/attributes'
import type { AccountUnruggabilityMetadata } from '@/schema/attributes/self-sovereignty/account-unruggability'

import { component, type Content } from '../content'

export interface AccountUnruggabilityDetailsProps extends EvaluationDetailProps<AccountUnruggabilityMetadata> {}

export interface AccountUnruggabilityDetailsContent {
	component: 'AccountUnruggabilityDetails'
	componentProps: AccountUnruggabilityDetailsProps
}

export function accountUnruggabilityDetailsContent(
	bakedProps: Omit<
		AccountUnruggabilityDetailsProps,
		keyof EvaluationDetailProps<AccountUnruggabilityMetadata>
	>,
): Content<{ WALLET_NAME: string }> {
	return component<AccountUnruggabilityDetailsContent, keyof typeof bakedProps>(
		'AccountUnruggabilityDetails',
		bakedProps,
	)
}

import type { EvaluationDetailProps } from '@/schema/attributes'
import type { AccountUnruggabilityMetadata } from '@/schema/attributes/self-sovereignty/account-unruggability'

import { component, type Content } from '../content'
import { isRecord } from '../utils/record'

export interface AccountUnruggabilityDetailsProps extends EvaluationDetailProps<AccountUnruggabilityMetadata> {}

export type AccountUnruggabilityDetailsBakedProps = Omit<
	AccountUnruggabilityDetailsProps,
	keyof EvaluationDetailProps<AccountUnruggabilityMetadata>
>

export interface AccountUnruggabilityDetailsContent {
	component: 'AccountUnruggabilityDetails'
	componentProps: AccountUnruggabilityDetailsBakedProps
}

export function isAccountUnruggabilityMetadata(
	value: unknown,
): value is AccountUnruggabilityMetadata {
	return (
		isRecord(value) &&
		Object.hasOwn(value, 'minimumGuardianPolicy') &&
		Object.hasOwn(value, 'outcomes') &&
		(value.minimumGuardianPolicy === null || isRecord(value.minimumGuardianPolicy)) &&
		(value.outcomes === null || Array.isArray(value.outcomes))
	)
}

export function accountUnruggabilityDetailsContent(
	bakedProps: AccountUnruggabilityDetailsBakedProps,
): Content<{ WALLET_NAME: string }> {
	return component('AccountUnruggabilityDetails', bakedProps)
}

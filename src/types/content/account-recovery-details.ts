import type { EvaluationDetailProps } from '@/schema/attributes'
import type { AccountRecoveryMetadata } from '@/schema/attributes/security/account-recovery'

import { component, type Content } from '../content'
import { isRecord } from '../utils/record'

export interface AccountRecoveryDetailsProps extends EvaluationDetailProps<AccountRecoveryMetadata> {}

export type AccountRecoveryDetailsBakedProps = Omit<
	AccountRecoveryDetailsProps,
	keyof EvaluationDetailProps<AccountRecoveryMetadata>
>

export interface AccountRecoveryDetailsContent {
	component: 'AccountRecoveryDetails'
	componentProps: AccountRecoveryDetailsBakedProps
}

export function isAccountRecoveryMetadata(value: unknown): value is AccountRecoveryMetadata {
	if (
		!isRecord(value) ||
		!Object.hasOwn(value, 'minimumGuardianPolicy') ||
		!Object.hasOwn(value, 'outcomes') ||
		!Object.hasOwn(value, 'drills')
	) {
		return false
	}

	const validGuardianPolicy =
		value.minimumGuardianPolicy === null || isRecord(value.minimumGuardianPolicy)
	const validOutcomes = value.outcomes === null || Array.isArray(value.outcomes)
	const validDrills =
		value.drills === null ||
		(isRecord(value.drills) &&
			Array.isArray(value.drills.configured) &&
			Array.isArray(value.drills.missing))

	return validGuardianPolicy && validOutcomes && validDrills
}

export function accountRecoveryDetailsContent(
	bakedProps: AccountRecoveryDetailsBakedProps,
): Content<{ WALLET_NAME: string }> {
	return component('AccountRecoveryDetails', bakedProps)
}

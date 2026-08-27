import {
	type GuardianScenarioOutcome,
	type GuardianScenarioType,
	isAccountRecoverable,
} from '@/schema/features/guardian-scenario/guardian-scenario-common'
import { guardianScenarioId } from '@/schema/features/guardian-scenario/guardian-scenario-expansion'
import type {
	AccountRecoveryDrillType,
	GuardianPolicy,
} from '@/schema/features/security/account-recovery'
import type { FullyQualifiedReference } from '@/schema/reference'
import { typographicSourceText } from '@/types/content'

import { buildGuardianPolicyDetail, type GuardianPolicyDetail } from './guardian-policy'
import type { GuardianScenarioOutcomeDetail } from './guardian-scenarios'

export interface AccountRecoveryDrillDetail {
	type: AccountRecoveryDrillType
	reminderEveryNDays: number

	references: FullyQualifiedReference[]
}

export interface AccountRecoveryDrillsDetail {
	configured: AccountRecoveryDrillDetail[]
	missing: AccountRecoveryDrillType[]
}

export interface AccountRecoveryDetails {
	type: 'accountRecovery'

	/** Absent when the wallet implements no guardian-based recovery at all. */
	guardianPolicy?: GuardianPolicyDetail

	/** Scenarios after which the user can still recover their account. */
	recoverableScenarios: GuardianScenarioOutcomeDetail[]

	/** Scenarios after which recovery is impossible, each with its reason. */
	unrecoverableScenarios: GuardianScenarioOutcomeDetail[]

	/** Absent when drills have not been rated. */
	drills?: AccountRecoveryDrillsDetail
}

export function guardianPolicyDetailOrUndefined(
	policy: GuardianPolicy | null,
): GuardianPolicyDetail | undefined {
	return policy === null ? undefined : buildGuardianPolicyDetail(policy)
}

export function buildAccountRecoveryDetails({
	guardianPolicy,
	outcomes,
	drills,
}: {
	guardianPolicy: GuardianPolicy | null
	outcomes: GuardianScenarioOutcome<GuardianScenarioType>[] | null
	drills: AccountRecoveryDrillsDetail | null
}): AccountRecoveryDetails {
	const scenarios = outcomes ?? []
	const policy = guardianPolicyDetailOrUndefined(guardianPolicy)

	return {
		type: 'accountRecovery',
		...(policy !== undefined && { guardianPolicy: policy }),
		recoverableScenarios: scenarios
			.filter(outcome => isAccountRecoverable(outcome.recovery))
			.map(scenarioDetail),
		unrecoverableScenarios: scenarios
			.filter(outcome => !isAccountRecoverable(outcome.recovery))
			.map(outcome => ({
				...scenarioDetail(outcome),
				...(isAccountRecoverable(outcome.recovery)
					? {}
					: { consequence: typographicSourceText(outcome.recovery.description) }),
			})),
		...(drills !== null && { drills }),
	}
}

function scenarioDetail(
	outcome: GuardianScenarioOutcome<GuardianScenarioType>,
): GuardianScenarioOutcomeDetail {
	return {
		id: `${guardianScenarioId(outcome.scenario)}_${outcome.outcomeId}`,
		scenario: typographicSourceText(outcome.scenario.description),
	}
}

export const accountRecoveryFailureScenariosHeading = 'Account recovery failure scenarios'

export const accountRecoverySuccessScenariosHeading = 'Account recovery success scenarios'

export const accountRecoveryDrillsHeading = 'Account recovery drills'

export const accountRecoveryConfiguredDrillsIntro =
	'{{WALLET_NAME}} periodically runs the following account recovery drills:'

export const accountRecoveryMissingDrillsIntro =
	'{{WALLET_NAME}} does not run the following recommended account recovery drills:'

export function accountRecoverySummary(details: AccountRecoveryDetails): string {
	if (details.guardianPolicy === undefined) {
		return '{{WALLET_NAME}} does not implement guardian-based account recovery. The user will lose access to their account if they lose their seed phrase.'
	}

	const scenarios =
		details.unrecoverableScenarios.length === 0
			? 'passes all the tested scenarios.'
			: details.recoverableScenarios.length === 0
				? 'does not pass any of the tested scenarios.'
				: 'does not pass all the tested scenarios.'

	return `{{WALLET_NAME}} implements a Guardian-based account recovery feature which ${scenarios}`
}

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

/** A drill the wallet runs, and how often it reminds the user. */
export interface AccountRecoveryDrillDetail {
	type: AccountRecoveryDrillType
	reminderEveryNDays: number

	/** References backing this drill's claim. */
	references: FullyQualifiedReference[]
}

/** What the wallet drills its users on, and what it does not. */
export interface AccountRecoveryDrillsDetail {
	configured: AccountRecoveryDrillDetail[]
	missing: AccountRecoveryDrillType[]
}

/**
 * Canonical detail model for guardian-based account recovery.
 *
 * The model reports the recovery dimension only: each scenario says whether
 * the account can still be recovered, never whether it can be taken over.
 * That is the account unruggability attribute's subject.
 */
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

/** Build the guardian policy part of the recovery details, when there is one. */
export function guardianPolicyDetailOrUndefined(
	policy: GuardianPolicy | null,
): GuardianPolicyDetail | undefined {
	return policy === null ? undefined : buildGuardianPolicyDetail(policy)
}

/** Build canonical recovery details once guardian and drill results are merged. */
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

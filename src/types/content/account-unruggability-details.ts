import {
	type GuardianScenarioOutcome,
	type GuardianScenarioType,
	isAccountTakeOverPossible,
} from '@/schema/features/guardian-scenario/guardian-scenario-common'
import { guardianScenarioId } from '@/schema/features/guardian-scenario/guardian-scenario-expansion'
import type { GuardianPolicy } from '@/schema/features/security/account-recovery'
import { typographicSourceText } from '@/types/content'

import { guardianPolicyDetailOrUndefined } from './account-recovery-details'
import type { GuardianPolicyDetail } from './guardian-policy'
import type { GuardianScenarioOutcomeDetail } from './guardian-scenarios'

/**
 * Canonical detail model for account unruggability.
 *
 * The model reports the takeover dimension only: each failing scenario carries
 * the reason the account can be taken over, not the reason recovery failed.
 * Account recovery is the other attribute's subject.
 */
export interface AccountUnruggabilityDetails {
	type: 'accountUnruggability'

	/** Absent when key material never leaves the wallet. */
	guardianPolicy?: GuardianPolicyDetail

	/** Scenarios after which the account cannot be taken over. */
	safeScenarios: GuardianScenarioOutcomeDetail[]

	/** Scenarios that allow a takeover, each with how it happens. */
	takeoverScenarios: GuardianScenarioOutcomeDetail[]
}

/** Build canonical unruggability details from the evaluated scenarios. */
export function buildAccountUnruggabilityDetails({
	guardianPolicy,
	outcomes,
}: {
	guardianPolicy: GuardianPolicy | null
	outcomes: GuardianScenarioOutcome<GuardianScenarioType>[] | null
}): AccountUnruggabilityDetails {
	const scenarios = outcomes ?? []
	const policy = guardianPolicyDetailOrUndefined(guardianPolicy)

	return {
		type: 'accountUnruggability',
		...(policy !== undefined && { guardianPolicy: policy }),
		safeScenarios: scenarios
			.filter(outcome => !isAccountTakeOverPossible(outcome.takeover))
			.map(scenarioDetail),
		// The consequence is how the account can be taken over, which is the
		// dimension this attribute reports on.
		takeoverScenarios: scenarios
			.filter(outcome => isAccountTakeOverPossible(outcome.takeover))
			.map(outcome => ({
				...scenarioDetail(outcome),
				...(isAccountTakeOverPossible(outcome.takeover)
					? { consequence: typographicSourceText(outcome.takeover.description) }
					: {}),
			})),
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

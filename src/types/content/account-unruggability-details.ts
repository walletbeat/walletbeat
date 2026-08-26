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

export interface AccountUnruggabilityDetails {
	type: 'accountUnruggability'

	/** Absent when key material never leaves the wallet. */
	guardianPolicy?: GuardianPolicyDetail

	/** Scenarios after which the account cannot be taken over. */
	safeScenarios: GuardianScenarioOutcomeDetail[]

	/** Scenarios that allow a takeover, each with how it happens. */
	takeoverScenarios: GuardianScenarioOutcomeDetail[]
}

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

export function accountUnruggabilitySummary(details: AccountUnruggabilityDetails): string {
	if (details.guardianPolicy === undefined) {
		return 'Private key material never leaves {{WALLET_NAME}}, so no external entity may take over your account.'
	}

	const scenarios =
		details.takeoverScenarios.length === 0
			? 'passes all the tested scenarios'
			: details.safeScenarios.length === 0
				? 'does not pass any of the tested scenarios'
				: 'does not pass all the tested scenarios'

	return `{{WALLET_NAME}} implements a Guardian-based account recovery feature which ${scenarios} when it comes to anti-ruggability.`
}

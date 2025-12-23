import { guardianId, type GuardianPolicy, GuardianPolicyType } from '../security/account-recovery'
import {
	evaluateGuardianShareLostScenario,
	possibleGuardiansLosingShares,
} from './guardian-data-loss'
import {
	evaluateGuardianPolicyEvilScenario,
	possibleEntitiesTurningEvil,
} from './guardian-entity-turns-evil'
import {
	type GuardianScenario,
	type GuardianScenarioOutcome,
	GuardianScenarioType,
} from './guardian-scenario-common'

type GuardianScenarioEvaluator<S extends GuardianScenarioType> = (
	guardianPolicy: GuardianPolicy,
	scenario: GuardianScenario<S>,
) => GuardianScenarioOutcome<S>

const scenarioEvaluators: { [S in GuardianScenarioType]: GuardianScenarioEvaluator<S> } = {
	[GuardianScenarioType.DATA_LOSS]: evaluateGuardianShareLostScenario,
	[GuardianScenarioType.ENTITY_TURNS_EVIL]: evaluateGuardianPolicyEvilScenario,
}

function evaluateGuardianScenario(
	guardianPolicy: GuardianPolicy,
	scenario: GuardianScenario<GuardianScenarioType>,
): GuardianScenarioOutcome<GuardianScenarioType> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because all evaluators inherit from this.
	const evaluator: GuardianScenarioEvaluator<GuardianScenarioType> = scenarioEvaluators[
		scenario.type
	] as GuardianScenarioEvaluator<GuardianScenarioType>

	return evaluator(guardianPolicy, scenario)
}

type GuardianScenarioExpander = (
	guardianPolicy: GuardianPolicy,
) => GuardianScenario<GuardianScenarioType>[]

function expandGuardianKOfNTimelockScenarios(
	guardianPolicy: GuardianPolicy,
): GuardianScenario<GuardianScenarioType>[] {
	if (guardianPolicy.type !== GuardianPolicyType.K_OF_N_WITH_TIMELOCK) {
		return []
	}

	const scenarios: GuardianScenario<GuardianScenarioType>[] = []

	scenarios.push(...possibleGuardiansLosingShares(guardianPolicy.configuredGuardians))
	scenarios.push(...possibleEntitiesTurningEvil(guardianPolicy.configuredGuardians))

	return scenarios
}

function expandGuardianSecretSplitScenarios(
	guardianPolicy: GuardianPolicy,
): GuardianScenario<GuardianScenarioType>[] {
	if (guardianPolicy.type !== GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS) {
		return []
	}

	const scenarios: GuardianScenario<GuardianScenarioType>[] = []

	scenarios.push(
		...possibleGuardiansLosingShares(
			guardianPolicy.requiredGuardians.concat(guardianPolicy.optionalGuardians),
		),
	)
	scenarios.push(
		...possibleEntitiesTurningEvil(
			guardianPolicy.requiredGuardians.concat(guardianPolicy.optionalGuardians),
		),
	)

	for (const scenario of scenarios) {
		const id = guardianScenarioId(scenario)

		if (scenarios.filter(s => guardianScenarioId(s) === id).length > 1) {
			throw new Error(`Duplicate scenario: ${id}`)
		}
	}

	return scenarios
}

const scenarioExpanders: GuardianScenarioExpander[] = [
	expandGuardianKOfNTimelockScenarios,
	expandGuardianSecretSplitScenarios,
]

export function evaluateAllGuardianScenarios(
	guardianPolicy: GuardianPolicy,
): GuardianScenarioOutcome<GuardianScenarioType>[] {
	const scenarios: GuardianScenario<GuardianScenarioType>[] = scenarioExpanders.flatMap(expander =>
		expander(guardianPolicy),
	)

	return scenarios.map(scenario => {
		return evaluateGuardianScenario(guardianPolicy, scenario)
	})
}

export function guardianScenarioId(scenario: GuardianScenario<GuardianScenarioType>): string {
	switch (scenario.type) {
		case GuardianScenarioType.DATA_LOSS:
			return scenario.guardiansWithDataLoss.map(guardianId).slice().sort().join('&')
		case GuardianScenarioType.ENTITY_TURNS_EVIL:
			return scenario.turnsEvil
				.map(entity => entity.id)
				.slice()
				.sort()
				.join('&')
	}
}

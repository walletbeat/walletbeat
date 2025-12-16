import { type Sentence, sentence } from '@/types/content'
import { isNonEmptyArray, type NonEmptyArray } from '@/types/utils/non-empty'

import {
	type Guardian,
	guardianEntity,
	type GuardianPolicy,
	GuardianPolicyType,
	guardiansInclude,
	guardiansWithEntity,
	GuardianType,
} from '../security/account-recovery'
import {
	accountCanBeRecovered,
	accountCannotBeRecovered,
	accountCannotBeTakenOver,
	type GuardianScenarioOutcome,
	GuardianScenarioType,
} from './guardian-scenario-common'

export interface GuardianScenarioDataLoss {
	type: GuardianScenarioType.DATA_LOSS
	guardiansWithDataLoss: NonEmptyArray<Guardian>
	description: Sentence
}

/**
 * Computes the sets of guardians that may lose shares at the same time.
 */
export function possibleGuardiansLosingShares(guardians: Guardian[]): GuardianScenarioDataLoss[] {
	const scenarios: GuardianScenarioDataLoss[] = []

	for (const guardian of guardians) {
		switch (guardian.type) {
			case GuardianType.PASSKEY:
				scenarios.push({
					type: GuardianScenarioType.DATA_LOSS,
					guardiansWithDataLoss: [guardian],
					description: sentence('User loses access to their Passkey device'),
				})
				break
			case GuardianType.WALLET_PASSWORD:
				scenarios.push({
					type: GuardianScenarioType.DATA_LOSS,
					guardiansWithDataLoss: [guardian],
					description: sentence('User forgets their wallet password'),
				})
				break
			case GuardianType.SELF_CUSTODY:
				scenarios.push({
					type: GuardianScenarioType.DATA_LOSS,
					guardiansWithDataLoss: [guardian],
					description: sentence('User accidentally wipes their device'),
				})
				break
			case GuardianType.USER_EXTERNAL_ACCOUNT:
				scenarios.push({
					type: GuardianScenarioType.DATA_LOSS,
					guardiansWithDataLoss: [guardian],
					description: sentence(`User loses access to their ${guardian.description}`),
				})
				break
			case GuardianType.WALLET_PROVIDER:
				scenarios.push({
					type: GuardianScenarioType.DATA_LOSS,
					guardiansWithDataLoss: [guardian],
					description: sentence(
						`${guardian.description} loses data or ${guardian.entity.name} goes out of business`,
					),
				})
				break
			case GuardianType.ZKID:
				scenarios.push({
					type: GuardianScenarioType.DATA_LOSS,
					guardiansWithDataLoss: [guardian],
					description: sentence(`User loses their ${guardian.description}`),
				})
				break
			default:
				throw new Error('Unreachable')
		}
	}

	const sameDeviceGuardians = guardians.filter(
		guardian =>
			guardian.type === GuardianType.SELF_CUSTODY || guardian.type === GuardianType.PASSKEY,
	)

	if (isNonEmptyArray(sameDeviceGuardians) && sameDeviceGuardians.length > 1) {
		scenarios.push({
			type: GuardianScenarioType.DATA_LOSS,
			guardiansWithDataLoss: sameDeviceGuardians,
			description: sentence('User loses access to their device which also holds their Passkey'),
		})
	}

	for (const guardian of guardians) {
		const entity = guardianEntity(guardian)

		if (entity === null) {
			continue
		}

		const sameEntityGuardians = guardiansWithEntity(entity, guardians)

		if (isNonEmptyArray(sameEntityGuardians) && sameEntityGuardians.length > 1) {
			scenarios.push({
				type: GuardianScenarioType.DATA_LOSS,
				guardiansWithDataLoss: sameEntityGuardians,
				description: sentence(`${entity.name} loses all their data`),
			})
		}
	}

	return scenarios
}

/**
 * What happens if a share is lost?
 */
export function evaluateGuardianShareLostScenario(
	guardianPolicy: GuardianPolicy,
	scenario: GuardianScenarioDataLoss,
): GuardianScenarioOutcome<GuardianScenarioType.DATA_LOSS> {
	switch (guardianPolicy.type) {
		case GuardianPolicyType.K_OF_N_WITH_TIMELOCK:
			return ((): GuardianScenarioOutcome<GuardianScenarioType.DATA_LOSS> => {
				throw new Error('K_OF_N_WITH_TIMELOCK not implemented yet.')
			})()
		case GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS:
			return ((): GuardianScenarioOutcome<GuardianScenarioType.DATA_LOSS> => {
				for (const requiredGuardian of guardianPolicy.requiredGuardians) {
					if (guardiansInclude(requiredGuardian, scenario.guardiansWithDataLoss)) {
						return {
							scenario,
							outcomeId: 'secret_split_required_guardian',
							recovery: accountCannotBeRecovered(sentence('Recovery is no longer possible.')),
							takeover: accountCannotBeTakenOver,
							howToImprove: sentence(`
								{{WALLET_NAME}} should diversify the role of guardians to ensure
								no single guardian is absolutely required to perform account recovery.
							`),
						}
					}
				}

				const lostOptionalGuardians = guardianPolicy.optionalGuardians.filter(optionalGuardian =>
					guardiansInclude(optionalGuardian, scenario.guardiansWithDataLoss),
				)
				const tolerableLostOptionalGuardiansNum =
					guardianPolicy.optionalGuardiansMinimumConfigurable -
					guardianPolicy.optionalGuardiansMinimumNeededForRecovery

				if (lostOptionalGuardians.length > tolerableLostOptionalGuardiansNum) {
					return {
						scenario,
						outcomeId: 'secret_split_not_enough_optional_guardian',
						recovery: accountCannotBeRecovered(
							sentence(`
								Recovery is not possible as not enough recovery shares are left.
							`),
						),
						takeover: accountCannotBeTakenOver,
						howToImprove: sentence(`
							{{WALLET_NAME}} should require the user to configure a
							larger number of guardians to keep the account recoverable
							in this scenario.
						`),
					}
				}

				return {
					scenario,
					outcomeId: 'secret_split_recoverable',
					recovery: accountCanBeRecovered,
					takeover: accountCannotBeTakenOver,
				}
			})()
	}
}

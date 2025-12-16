import type { Entity } from '@/schema/entity'
import { type Sentence, sentence } from '@/types/content'
import type { NonEmptyArray } from '@/types/utils/non-empty'

import {
	type Guardian,
	guardianEntity,
	type GuardianPolicy,
	GuardianPolicyType,
	guardiansWithEntities,
	GuardianType,
} from '../security/account-recovery'
import {
	accountCanBeRecovered,
	accountCanBeTakenOver,
	accountCannotBeRecovered,
	accountCannotBeTakenOver,
	type GuardianScenarioOutcome,
	GuardianScenarioType,
} from './guardian-scenario-common'

export interface GuardianScenarioEntityTurnsEvil {
	type: GuardianScenarioType.ENTITY_TURNS_EVIL
	turnsEvil: NonEmptyArray<Entity>
	description: Sentence
}

export function possibleEntitiesTurningEvil(
	guardians: Guardian[],
): GuardianScenarioEntityTurnsEvil[] {
	const scenarios: GuardianScenarioEntityTurnsEvil[] = []

	for (const guardian of guardians) {
		switch (guardian.type) {
			case GuardianType.USER_EXTERNAL_ACCOUNT:
				scenarios.push({
					type: GuardianScenarioType.ENTITY_TURNS_EVIL,
					turnsEvil: [guardian.entity],
					description: sentence(`${guardian.entity.name} turns evil or is compromised`),
				})
				break
			case GuardianType.WALLET_PROVIDER:
				scenarios.push({
					type: GuardianScenarioType.ENTITY_TURNS_EVIL,
					turnsEvil: [guardian.entity],
					description: sentence(`${guardian.entity.name} turns evil or is compromised`),
				})
				break
			default:
				if (
					!((): boolean => {
						// List of guardian types for which we don't consider the possibility of them
						// turning evil.
						return (
							guardian.type === GuardianType.PASSKEY ||
							guardian.type === GuardianType.WALLET_PASSWORD ||
							guardian.type === GuardianType.SELF_CUSTODY ||
							guardian.type === GuardianType.ZKID
						)
					})()
				) {
					throw new Error(
						`Unimplemented guardian type, not sure if they can turn evil: ${guardian.type}`,
					)
				}
		}
	}

	return scenarios.filter(
		(scenario1, index) =>
			!scenarios
				.slice(index + 1)
				.some(
					scenario2 =>
						scenario1.turnsEvil.length === scenario2.turnsEvil.length &&
						scenario1.turnsEvil.every(entity1 =>
							scenario2.turnsEvil.some(entity2 => entity1.id === entity2.id),
						),
				),
	)
}

/**
 * What happens if a guardian turns evil and/or colludes with others?
 */
export function evaluateGuardianPolicyEvilScenario(
	guardianPolicy: GuardianPolicy,
	scenario: GuardianScenarioEntityTurnsEvil,
): GuardianScenarioOutcome<GuardianScenarioType.ENTITY_TURNS_EVIL> {
	switch (guardianPolicy.type) {
		case GuardianPolicyType.K_OF_N_WITH_TIMELOCK:
			return ((): GuardianScenarioOutcome<GuardianScenarioType.ENTITY_TURNS_EVIL> => {
				throw new Error('K_OF_N_WITH_TIMELOCK not implemented yet')
			})()
		case GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS:
			return ((): GuardianScenarioOutcome<GuardianScenarioType.ENTITY_TURNS_EVIL> => {
				const evilOptionalGuardians = guardiansWithEntities(
					scenario.turnsEvil,
					guardianPolicy.optionalGuardians,
				)
				const nonRecoverableReason = ((): null | string => {
					for (const requiredGuardian of guardianPolicy.requiredGuardians) {
						const entity = guardianEntity(requiredGuardian)

						if (entity === null) {
							continue
						}

						if (!scenario.turnsEvil.some(ent => ent.id === entity.id)) {
							continue
						}

						return `${entity.name} is in a position to block the account recovery process.`
					}

					if (guardianPolicy.secretReconstitution !== 'CLIENT_SIDE') {
						for (const evil of scenario.turnsEvil) {
							if (evil.id === guardianPolicy.secretReconstitution.id) {
								return `${evil.name} is in a position to block the secret reconstitution process.`
							}
						}
					}

					if (
						guardianPolicy.optionalGuardiansMinimumConfigurable - evilOptionalGuardians.length <
						guardianPolicy.optionalGuardiansMinimumNeededForRecovery
					) {
						return 'Not enough honest guardians left to perform account recovery.'
					}

					// All required guardians are honest and there are enough honest optional guardians.
					return null
				})()
				const takeoverableReason = ((): null | string => {
					if (
						guardiansWithEntities(scenario.turnsEvil, guardianPolicy.requiredGuardians).length !==
						guardianPolicy.requiredGuardians.length
					) {
						// There is at least one honest required guardian => cannot take over account.
						return null
					}

					if (
						evilOptionalGuardians.length < guardianPolicy.optionalGuardiansMinimumNeededForRecovery
					) {
						// Not enough evil optional guardians to take over account.
						return null
					}

					// All required guardians are evil and enough optional guardians are evil => can initiate recovery and then take over.
					return 'Account can be unilaterally taken over.'
				})()

				if (takeoverableReason !== null && nonRecoverableReason !== null) {
					return {
						scenario,
						outcomeId: 'secret_split_deniable_and_takeoverable',
						recovery: accountCannotBeRecovered(sentence(nonRecoverableReason)),
						takeover: accountCanBeTakenOver(sentence(takeoverableReason)),
						howToImprove: sentence(`
							{{WALLET_NAME}} should ensure that account recovery cannot be
							leveraged by any single actor to take over the user's account,
							and that account recovery can still be done even in the face
							of one actor being uncooperative.
						`),
					}
				}

				if (takeoverableReason !== null && nonRecoverableReason === null) {
					throw new Error('Unexpected case, this should never happen.')
				}

				if (takeoverableReason === null && nonRecoverableReason !== null) {
					return {
						scenario,
						outcomeId: 'secret_split_deniable',
						recovery: accountCannotBeRecovered(sentence(nonRecoverableReason)),
						takeover: accountCannotBeTakenOver,
						howToImprove: sentence(`
							{{WALLET_NAME}} should ensure account recovery can be done
							even when any single required actor is uncooperative.
						`),
					}
				}

				return {
					scenario,
					outcomeId: 'secret_split_non_deniable_no_takeover',
					recovery: accountCanBeRecovered,
					takeover: accountCannotBeTakenOver,
				}
			})()
	}
}

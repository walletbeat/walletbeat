import type { Sentence } from '@/types/content'
import { Enum } from '@/utils/enum'

import type { GuardianScenarioDataLoss } from './guardian-data-loss'
import type { GuardianScenarioEntityTurnsEvil } from './guardian-entity-turns-evil'

export enum GuardianScenarioType {
	DATA_LOSS = 'DATA_LOSS',
	ENTITY_TURNS_EVIL = 'ENTITY_TURNS_EVIL',
}

export const guardianScenarioType = new Enum<GuardianScenarioType>({
	[GuardianScenarioType.DATA_LOSS]: true,
	[GuardianScenarioType.ENTITY_TURNS_EVIL]: true,
})

export type GuardianScenario<S extends GuardianScenarioType> = (
	| GuardianScenarioDataLoss
	| GuardianScenarioEntityTurnsEvil
) & {
	type: S
}

export type AccountRecoveryOutcomeCanBeRecovered = {
	type: 'CAN_RECOVER'
}

export type AccountRecoveryOutcomeCannotBeRecovered = {
	type: 'CANNOT_RECOVER'
	description: Sentence<{ WALLET_NAME: string }>
}

export type AccountRecoveryOutcome =
	| AccountRecoveryOutcomeCanBeRecovered
	| AccountRecoveryOutcomeCannotBeRecovered

export function isAccountRecoverable(
	recoveryOutcome: AccountRecoveryOutcome,
): recoveryOutcome is AccountRecoveryOutcomeCanBeRecovered {
	return recoveryOutcome.type === 'CAN_RECOVER'
}

export type AccountTakeOverOutcomeCannotBeTakenOver = {
	type: 'CANNOT_BE_TAKEN_OVER'
}

export type AccountTakeOverOutcomeCanBeTakenOver = {
	type: 'CAN_BE_TAKEN_OVER'
	description: Sentence<{ WALLET_NAME: string }>
}

export type AccountTakeOverOutcome =
	| AccountTakeOverOutcomeCannotBeTakenOver
	| AccountTakeOverOutcomeCanBeTakenOver

export function isAccountTakeOverPossible(
	takeOverOutcome: AccountTakeOverOutcome,
): takeOverOutcome is AccountTakeOverOutcomeCanBeTakenOver {
	return takeOverOutcome.type === 'CAN_BE_TAKEN_OVER'
}

export type GuardianScenarioOutcome<S extends GuardianScenarioType> = {
	scenario: GuardianScenario<S>
	outcomeId: string
	recovery: AccountRecoveryOutcome
	takeover: AccountTakeOverOutcome
} & (
	| {
			// Either account can be recovered and not taken over...
			recovery: AccountRecoveryOutcomeCanBeRecovered
			takeover: AccountTakeOverOutcomeCannotBeTakenOver
	  }
	// Or not, but then there must be a sentence explaining how to improve the situation.
	| ((
			| { recovery: AccountRecoveryOutcomeCannotBeRecovered }
			| { takeover: AccountTakeOverOutcomeCanBeTakenOver }
	  ) & {
			howToImprove: Sentence<{ WALLET_NAME: string }>
	  })
)

export const accountCanBeRecovered: AccountRecoveryOutcomeCanBeRecovered = { type: 'CAN_RECOVER' }

export function accountCannotBeRecovered(
	description: Sentence<{ WALLET_NAME: string }>,
): AccountRecoveryOutcomeCannotBeRecovered {
	return { type: 'CANNOT_RECOVER', description }
}

export const accountCannotBeTakenOver: AccountTakeOverOutcomeCannotBeTakenOver = {
	type: 'CANNOT_BE_TAKEN_OVER',
}

export function accountCanBeTakenOver(
	description: Sentence<{ WALLET_NAME: string }>,
): AccountTakeOverOutcomeCanBeTakenOver {
	return { type: 'CAN_BE_TAKEN_OVER', description }
}

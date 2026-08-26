import type { Entity } from '@/schema/entity'
import type { Guardian, GuardianPolicy } from '@/schema/features/security/account-recovery'
import { GuardianPolicyType } from '@/schema/features/security/account-recovery'

/**
 * The semantic facts of a wallet's guardian policy.
 *
 * Both account recovery and account unruggability describe the same policy, so
 * they share this model: whichever dimension an attribute reports on, the
 * policy itself reads the same everywhere.
 */
export type GuardianPolicyFacts =
	| {
			kind: 'secretSplit'
			requiredGuardians: Guardian[]
			optionalGuardians: Guardian[]
			optionalGuardiansMinimumConfigurable: number
			optionalGuardiansMinimumNeededForRecovery: number
			secretReconstitution: 'CLIENT_SIDE' | Entity
	  }
	| {
			kind: 'kOfNWithTimelock'
			configuredGuardians: Guardian[]
			requiredGuardians: Guardian[]
			timelockWarningSentByAllOf: Entity[]
			minimumSignaturesWithTimelock: number
			minimumSignaturesBypassTimelock: number
	  }

export interface GuardianPolicyDetail {
	/** The wallet's authored description, one entry per paragraph, markup-free. */
	description: string[]

	facts: GuardianPolicyFacts
}

export function buildGuardianPolicyDetail(policy: GuardianPolicy): GuardianPolicyDetail {
	return {
		description: policyParagraphs(policy.description),
		facts:
			policy.type === GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS
				? {
						kind: 'secretSplit',
						requiredGuardians: policy.requiredGuardians,
						optionalGuardians: policy.optionalGuardians,
						optionalGuardiansMinimumConfigurable: policy.optionalGuardiansMinimumConfigurable,
						optionalGuardiansMinimumNeededForRecovery:
							policy.optionalGuardiansMinimumNeededForRecovery,
						secretReconstitution: policy.secretReconstitution,
					}
				: {
						kind: 'kOfNWithTimelock',
						configuredGuardians: policy.configuredGuardians,
						requiredGuardians: policy.requiredGuardians,
						timelockWarningSentByAllOf: policy.timelockWarningSentByAllOf,
						minimumSignaturesWithTimelock: policy.minimumSignaturesWithTimelock,
						minimumSignaturesBypassTimelock: policy.minimumSignaturesBypassTimelock,
					},
	}
}

function policyParagraphs(description: string): string[] {
	return description
		.split(/\n\s*\n/u)
		.map(paragraph => paragraph.trim().replaceAll(/\s+/gu, ' '))
		.filter(paragraph => paragraph !== '')
}

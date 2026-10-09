import { describe, expect, it } from 'vitest'

import { exampleCex, exampleWalletDevelopmentCompany } from '@/data/entities/example'
import { isAccountRecoverable } from '@/schema/features/guardian-scenario/guardian-scenario-common'
import { evaluateAllGuardianScenarios } from '@/schema/features/guardian-scenario/guardian-scenario-expansion'
import {
	type Guardian,
	type GuardianPolicySecretSplitAcrossGuardians,
	GuardianPolicyType,
	GuardianType,
	validateGuardianPolicy,
} from '@/schema/features/security/account-recovery'
import { renderTypographicContentToString } from '@/types/content'

const walletProviderGuardian: Guardian = {
	type: GuardianType.WALLET_PROVIDER,
	entity: exampleWalletDevelopmentCompany,
	description: 'Wallet developer storage cloud',
}

const externalAccountGuardian: Guardian = {
	type: GuardianType.USER_EXTERNAL_ACCOUNT,
	entity: exampleCex,
	description: 'exchange account',
}

function secretSplitPolicy(
	requiredGuardians: Guardian[],
	optionalGuardians: Guardian[],
): GuardianPolicySecretSplitAcrossGuardians {
	return {
		type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS,
		descriptionMarkdown: '',
		requiredGuardians,
		optionalGuardians,
		optionalGuardiansMinimumConfigurable: optionalGuardians.length,
		optionalGuardiansMinimumNeededForRecovery: optionalGuardians.length,
		secretReconstitution: 'CLIENT_SIDE',
	}
}

describe('validateGuardianPolicy', () => {
	it('rejects a secret split with no guardians', () => {
		expect(() => {
			validateGuardianPolicy(secretSplitPolicy([], []))
		}).toThrow(/notSupported/)
	})

	it("rejects a secret split whose only guardian is the user's wallet password", () => {
		expect(() => {
			validateGuardianPolicy(secretSplitPolicy([{ type: GuardianType.WALLET_PASSWORD }], []))
		}).toThrow(/notSupported/)
	})

	it("rejects a secret split whose only guardian is the user's passkey", () => {
		expect(() => {
			validateGuardianPolicy(secretSplitPolicy([], [{ type: GuardianType.PASSKEY }]))
		}).toThrow(/notSupported/)
	})

	it('accepts a single guardian held by an external provider', () => {
		expect(() => {
			validateGuardianPolicy(secretSplitPolicy([walletProviderGuardian], []))
		}).not.toThrow()
	})

	it('accepts a secret split across two guardians', () => {
		expect(() => {
			validateGuardianPolicy(
				secretSplitPolicy([{ type: GuardianType.WALLET_PASSWORD }], [externalAccountGuardian]),
			)
		}).not.toThrow()
	})
})

describe('evaluateAllGuardianScenarios', () => {
	it('validates the guardian policy', () => {
		expect(() =>
			evaluateAllGuardianScenarios(secretSplitPolicy([{ type: GuardianType.WALLET_PASSWORD }], [])),
		).toThrow(/notSupported/)
	})

	it('names the lost guardian when a required guardian is lost', () => {
		const outcomes = evaluateAllGuardianScenarios(
			secretSplitPolicy([walletProviderGuardian], [externalAccountGuardian]),
		)
		const outcome = outcomes.find(o => o.outcomeId === 'secret_split_required_guardian')

		expect(outcome).toBeDefined()

		if (outcome === undefined || isAccountRecoverable(outcome.recovery)) {
			throw new Error('Expected a non-recoverable outcome')
		}

		const description = renderTypographicContentToString(outcome.recovery.description, {
			WALLET_NAME: 'Example Wallet',
		}).replace(/\s+/g, ' ')

		expect(description).toBe(
			'Recovery is no longer possible. Wallet developer storage cloud is required for every recovery, and no other guardian can stand in for it.',
		)
	})
})

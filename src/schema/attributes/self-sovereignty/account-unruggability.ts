import {
	exampleCex,
	exampleSecurityAuditor,
	exampleWalletDevelopmentCompany,
} from '@/data/entities/example'
import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { ResolvedFeatures } from '@/schema/features'
import {
	type AccountRecovery,
	type GuardianPolicy,
	GuardianPolicyType,
	GuardianType,
} from '@/schema/features/security/account-recovery'
import {
	KeyGenerationLocation,
	type KeysHandlingSupport,
	MultiPartyKeyReconstruction,
} from '@/schema/features/security/keys-handling'
import { isSupported, notSupported, supported } from '@/schema/features/support'
import { type FullyQualifiedReference, mergeRefs, refNotNecessary } from '@/schema/reference'
import {
	markdown,
	mdSentence,
	paragraph,
	sentence,
	typographicContentWithExtraOptionalStrings,
} from '@/types/content'
import { accountUnruggabilityDetailsContent } from '@/types/content/account-unruggability-details'
import { isNonEmptyArray, type NonEmptyArray } from '@/types/utils/non-empty'

import {
	type AccountTakeOverOutcomeCanBeTakenOver,
	type GuardianScenarioOutcome,
	type GuardianScenarioType,
	isAccountTakeOverPossible,
} from '../../features/guardian-scenario/guardian-scenario-common'
import { evaluateAllGuardianScenarios } from '../../features/guardian-scenario/guardian-scenario-expansion'
import { pickWorstRating, unrated } from '../common'

const brand = 'attributes.security.account_unruggability'

export type AccountUnruggabilityValue = Value & {
	__brand: 'attributes.security.account_unruggability'
	minimumGuardianPolicy: GuardianPolicy | null
	outcomes: NonEmptyArray<GuardianScenarioOutcome<GuardianScenarioType>> | null
}

function evaluateGuardianUnruggabilityPolicy(
	guardianPolicy: GuardianPolicy,
): Evaluation<AccountUnruggabilityValue> {
	const outcomes = evaluateAllGuardianScenarios(guardianPolicy)

	if (!isNonEmptyArray(outcomes)) {
		throw new Error('Got no scenarios for given guardian policy.')
	}

	const takeOverPossibleOutcomes = outcomes.filter(
		(
			outcome,
		): outcome is GuardianScenarioOutcome<GuardianScenarioType> & {
			takeover: AccountTakeOverOutcomeCanBeTakenOver
		} => isAccountTakeOverPossible(outcome.takeover),
	)

	if (!isNonEmptyArray(takeOverPossibleOutcomes)) {
		return {
			value: {
				id: 'guardian_policy_unruggable',
				rating: Rating.PASS,
				displayName: 'Account unruggable in all likely scenarios',
				shortExplanation: sentence(`
					{{WALLET_NAME}} does not allow any external service to take over
					your account.
				`),
				minimumGuardianPolicy: guardianPolicy,
				outcomes,
				__brand: brand,
			},
			details: accountUnruggabilityDetailsContent({}),
		}
	}

	if (takeOverPossibleOutcomes.length === 1) {
		return {
			value: {
				id: 'guardian_policy_ruggable_specific_scenario',
				rating: Rating.FAIL,
				displayName: 'Account may be ruggable',
				shortExplanation: typographicContentWithExtraOptionalStrings(
					takeOverPossibleOutcomes[0].takeover.description,
				),
				minimumGuardianPolicy: guardianPolicy,
				outcomes,
				__brand: brand,
			},
			details: accountUnruggabilityDetailsContent({}),
		}
	}

	return {
		value: {
			id: 'guardian_policy_ruggable_multiple_scenarios',
			rating: Rating.FAIL,
			displayName: 'Account may be ruggable',
			shortExplanation: mdSentence(`
				{{WALLET_NAME}}'s account recovery feature leaves the account
				vulnerable to being rugged in multiple scenarios.
			`),
			minimumGuardianPolicy: guardianPolicy,
			outcomes,
			__brand: brand,
		},
		details: accountUnruggabilityDetailsContent({}),
	}
}

function evaluateAccountUnruggability(
	keysHandling: KeysHandlingSupport,
	accountRecovery: AccountRecovery,
): Evaluation<AccountUnruggabilityValue> {
	switch (keysHandling.keyGeneration) {
		case KeyGenerationLocation.FULLY_ON_USER_DEVICE:
			break // OK
		case KeyGenerationLocation.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE:
			break // OK
		case KeyGenerationLocation.FULLY_OFF_USER_DEVICE:
			return {
				value: {
					id: 'key_off_device',
					displayName: 'Key generated off-device',
					rating: Rating.FAIL,
					shortExplanation: sentence(`
						When generating a key with {{WALLET_NAME}}, the key is generated
						by an external service which can use this to rug your account.
					`),
					minimumGuardianPolicy: null,
					outcomes: null,
					__brand: brand,
				},
				details: markdown(`
					Key generation with {{WALLET_NAME}} occurs off-device. This means
					your private key is not confined to your device, and the service
					that has your private key can take over your account.

					**"Not your keys, not your coins."**
				`),
			}
	}

	switch (keysHandling.multipartyKeyReconstruction) {
		case MultiPartyKeyReconstruction.NON_MULTIPARTY:
			break // OK
		case MultiPartyKeyReconstruction.ON_USER_DEVICE:
			break // OK
		case MultiPartyKeyReconstruction.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE:
			break // OK
		case MultiPartyKeyReconstruction.MULTIPARTY_COMPUTED_WITHOUT_USER_DEVICE:
			return {
				value: {
					id: 'multiparty_reconstructed_without_user_device',
					displayName: 'MPC key reconstructed without user',
					rating: Rating.FAIL,
					shortExplanation: sentence(`
						{{WALLET_NAME}} uses MPC, but the key reconstruction process can
						occur without requiring the user's device.
					`),
					minimumGuardianPolicy: null,
					outcomes: null,
					__brand: brand,
				},
				details: markdown(`
					{{WALLET_NAME}} uses multi-party computation to derive the account's
					private key. However, this key can be reconstructed by external
					services without your device being involved. This allows these
					external services to conspire to reconstruct your private key, and
					take over your account.

					**"Not your keys, not your coins."**
				`),
			}
	}

	if (isSupported(accountRecovery.guardianRecovery)) {
		return evaluateGuardianUnruggabilityPolicy(
			accountRecovery.guardianRecovery.minimumGuardianPolicy,
		)
	}

	return {
		value: {
			id: 'pass_no_guardian_recovery',
			displayName: 'Unruggable account',
			rating: Rating.PASS,
			shortExplanation: sentence(`
				Private key material never leaves {{WALLET_NAME}}, so no external
				entity may take over your account.
			`),
			minimumGuardianPolicy: null,
			outcomes: null,
			__brand: brand,
		},
		details: accountUnruggabilityDetailsContent({}),
	}
}

export const accountUnruggability: Attribute<AccountUnruggabilityValue> = {
	id: 'accountUnruggability',
	icon: '\u{1fa9a}', // Carpentry Saw
	displayName: 'Account unruggability',
	wording: {
		midSentenceName: 'account unruggability',
	},
	question: sentence('Can the wallet developer take over your account without your consent?'),
	why: markdown(`
		The promise of crypto is to make your accounts and your funds truly yours.
		This is what is most commonly referred to when discussing
		"self-sovereignty".

		The underlying property that makes an account truly yours is the inability
		for anyone other than yourself to act on your behalf or to take over your
		account without prior consent.
	`),
	methodology: markdown(`
		Wallets are evaluated based on whether there is any mechanism by which
		any entity other than the user may sign or approve transactions on behalf
		of the user's account, or can transfer ownership of the account away from
		the user. This includes features like seed phrase backups where the wallet
		developer gets to learn the user's seed phrase, or other account recovery
		features that let the wallet developer unilaterally recover the user's
		account.

		Fully-custodial wallets (i.e. wallets where the signing key material
		resides entirely on external services) are also not self-sovereign
		(aka ruggable) by definition.

		Features that allow the user to pre-approve certain types of transactions
		ahead of time are treated as maintaining self-sovereignty, so long as
		the user controls their limits explicitly:
		time-bound, amount-bound, destination/purpose-bound, etc.
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: false,
		fail: [
			exampleRating(
				paragraph(`
					The private key of the user's account resides on an external server.
				`),
				evaluateAccountUnruggability(
					{
						keyGeneration: KeyGenerationLocation.FULLY_OFF_USER_DEVICE,
						multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
					},
					{
						guardianRecovery: notSupported,
					},
				),
			),
			exampleRating(
				paragraph(`
					The wallet uses an MPC key which can be reconstructed by external
					services without the user's involvement.
				`),
				evaluateAccountUnruggability(
					{
						keyGeneration: KeyGenerationLocation.MULTIPARTY_COMPUTED_INCLUDING_USER_DEVICE,
						multipartyKeyReconstruction:
							MultiPartyKeyReconstruction.MULTIPARTY_COMPUTED_WITHOUT_USER_DEVICE,
					},
					{
						guardianRecovery: notSupported,
					},
				),
			),
			exampleRating(
				paragraph(`
					The wallet developer offers to back up the seed phrase onto their
					own platform unencrypted, allowing them to take over the user's account.
				`),
				evaluateAccountUnruggability(
					{
						keyGeneration: KeyGenerationLocation.FULLY_OFF_USER_DEVICE,
						multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
					},
					{
						guardianRecovery: supported({
							ref: refNotNecessary,
							minimumGuardianPolicy: {
								type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS,
								descriptionMarkdown: '',
								requiredGuardians: [
									{
										type: GuardianType.WALLET_PROVIDER,
										entity: exampleWalletDevelopmentCompany,
										description: 'Wallet developer storage cloud',
									},
								],
								optionalGuardians: [],
								optionalGuardiansMinimumConfigurable: 0,
								optionalGuardiansMinimumNeededForRecovery: 0,
								secretReconstitution: exampleWalletDevelopmentCompany,
							},
						}),
					},
				),
			),
			exampleRating(
				paragraph(`
					The wallet splits the recovery secret into two pieces required for
					recovery. However, the secret reconstitution process happens on
					servers owned by the wallet provider, putting them in a position
					to obtain a copy of the recovery secret and take over the account.
				`),
				evaluateAccountUnruggability(
					{
						keyGeneration: KeyGenerationLocation.FULLY_OFF_USER_DEVICE,
						multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
					},
					{
						guardianRecovery: supported({
							ref: refNotNecessary,
							minimumGuardianPolicy: {
								type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS,
								descriptionMarkdown: '',
								requiredGuardians: [],
								optionalGuardians: [
									{ type: GuardianType.USER_EXTERNAL_ACCOUNT, entity: exampleCex, description: '' },
									{
										type: GuardianType.USER_EXTERNAL_ACCOUNT,
										entity: exampleSecurityAuditor,
										description: '',
									},
								],
								optionalGuardiansMinimumConfigurable: 2,
								optionalGuardiansMinimumNeededForRecovery: 2,
								secretReconstitution: exampleWalletDevelopmentCompany,
							},
						}),
					},
				),
			),
		],
		partial: [],
		pass: [
			exampleRating(
				paragraph(`
					The wallet securely distributes a recovery secret across at least 3
					external services, neither of which can recover the account on their
					own, and none of which are critically required to be operating during
					the recovery process.
					The recovery secret is reconstituted on the user's device using
					two or more shares from these external services.
				`),
				evaluateAccountUnruggability(
					{
						keyGeneration: KeyGenerationLocation.FULLY_ON_USER_DEVICE,
						multipartyKeyReconstruction: MultiPartyKeyReconstruction.NON_MULTIPARTY,
					},
					{
						guardianRecovery: supported({
							ref: refNotNecessary,
							minimumGuardianPolicy: {
								type: GuardianPolicyType.SECRET_SPLIT_ACROSS_GUARDIANS,
								descriptionMarkdown: '',
								requiredGuardians: [],
								optionalGuardians: [
									{
										type: GuardianType.WALLET_PROVIDER,
										entity: exampleWalletDevelopmentCompany,
										description: 'Wallet developer storage cloud',
									},
									{ type: GuardianType.USER_EXTERNAL_ACCOUNT, entity: exampleCex, description: '' },
									{
										type: GuardianType.USER_EXTERNAL_ACCOUNT,
										entity: exampleSecurityAuditor,
										description: '',
									},
								],
								optionalGuardiansMinimumConfigurable: 3,
								optionalGuardiansMinimumNeededForRecovery: 2,
								secretReconstitution: 'CLIENT_SIDE',
							},
						}),
					},
				),
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<AccountUnruggabilityValue> => {
		if (features.security.keysHandling === null || features.security.accountRecovery === null) {
			return unrated(accountUnruggability, brand, { minimumGuardianPolicy: null, outcomes: null })
		}

		let references: FullyQualifiedReference[] = []

		// Collect references
		references = mergeRefs(references, features.security.keysHandling.ref)

		if (isSupported(features.security.accountRecovery.guardianRecovery)) {
			references = mergeRefs(references, features.security.accountRecovery.guardianRecovery.ref)
		}

		return {
			...evaluateAccountUnruggability(
				features.security.keysHandling,
				features.security.accountRecovery,
			),
			references,
		}
	},
	aggregate: pickWorstRating<AccountUnruggabilityValue>,
}

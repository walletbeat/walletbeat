import {
	exampleCex,
	exampleSecurityAuditor,
	exampleWalletDevelopmentCompany,
} from '@/data/entities/example'
import {
	type Attribute,
	type Evaluation,
	exampleRating,
	exampleRatingUnimplemented,
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
import { isSupported, notSupported, supported } from '@/schema/features/support'
import { type FullyQualifiedReference, mergeRefs, refNotNecessary } from '@/schema/reference'
import {
	markdown,
	mdSentence,
	paragraph,
	sentence,
	typographicContentWithExtraOptionalStrings,
} from '@/types/content'
import { accountRecoveryDetailsContent } from '@/types/content/account-recovery-details'
import { isNonEmptyArray, type NonEmptyArray } from '@/types/utils/non-empty'

import {
	type AccountRecoveryOutcomeCannotBeRecovered,
	type GuardianScenarioOutcome,
	type GuardianScenarioType,
	isAccountRecoverable,
} from '../../features/guardian-scenario/guardian-scenario-common'
import { evaluateAllGuardianScenarios } from '../../features/guardian-scenario/guardian-scenario-expansion'
import { pickWorstRating, unrated } from '../common'

export type AccountRecoveryValue = Value & {
	minimumGuardianPolicy: GuardianPolicy | null
	outcomes: NonEmptyArray<GuardianScenarioOutcome<GuardianScenarioType>> | null
}

function evaluateGuardianRecoveryPolicy(
	guardianPolicy: GuardianPolicy,
): Evaluation<AccountRecoveryValue> {
	const outcomes = evaluateAllGuardianScenarios(guardianPolicy)

	if (!isNonEmptyArray(outcomes)) {
		throw new Error('Got no scenarios for given guardian policy.')
	}

	const nonRecoverableOutcomes = outcomes.filter(
		(
			outcome,
		): outcome is GuardianScenarioOutcome<GuardianScenarioType> & {
			recovery: AccountRecoveryOutcomeCannotBeRecovered
		} => !isAccountRecoverable(outcome.recovery),
	)

	if (!isNonEmptyArray(nonRecoverableOutcomes)) {
		return {
			value: {
				id: 'guardian_policy_recoverable',
				rating: Rating.PASS,
				displayName: 'Account recoverable in all likely scenarios',
				shortExplanation: sentence(`
					{{WALLET_NAME}} lets the user recover their account in all
					likely catastrophic scenarios.
				`),
				minimumGuardianPolicy: guardianPolicy,
				outcomes,
			},
			details: accountRecoveryDetailsContent({}),
		}
	}

	if (nonRecoverableOutcomes.length === 1) {
		return {
			value: {
				id: 'guardian_policy_nonrecoverable_specific_scenario',
				rating: Rating.FAIL,
				displayName: 'Account may be non-recoverable',
				shortExplanation: typographicContentWithExtraOptionalStrings(
					nonRecoverableOutcomes[0].recovery.description,
				),
				minimumGuardianPolicy: guardianPolicy,
				outcomes,
			},
			details: accountRecoveryDetailsContent({}),
		}
	}

	return {
		value: {
			id: 'guardian_policy_nonrecoverable_multiple_scenarios',
			rating: Rating.FAIL,
			displayName: 'Account may be non-recoverable',
			shortExplanation: mdSentence(`
				{{WALLET_NAME}}'s account recovery feature cannot be
				relied upon in multiple scenarios.
			`),
			minimumGuardianPolicy: guardianPolicy,
			outcomes,
		},
		details: accountRecoveryDetailsContent({}),
	}
}

function evaluateAccountRecovery(
	accountRecovery: AccountRecovery,
): Evaluation<AccountRecoveryValue> {
	if (isSupported(accountRecovery.guardianRecovery)) {
		return evaluateGuardianRecoveryPolicy(accountRecovery.guardianRecovery.minimumGuardianPolicy)
	}

	return {
		value: {
			id: 'no_guardian_recovery',
			displayName: 'No account recovery mechanism',
			rating: Rating.FAIL,
			shortExplanation: sentence(`
				{{WALLET_NAME}} does not implement guardian-based account recovery.
				The user will lose access to their account if they lose their seed phrase.
			`),
			minimumGuardianPolicy: null,
			outcomes: null,
		},
		details: accountRecoveryDetailsContent({}),
	}
}

export const accountRecovery: Attribute<AccountRecoveryValue> = {
	id: 'accountRecovery',
	icon: '\u{1f6df}', // Ring Buoy
	displayName: 'Account recovery',
	wording: {
		midSentenceName: 'account recovery',
	},
	question: sentence('How easy does the wallet make it to recover your account?'),
	why: markdown(`
		What if you forget your seed phrase?

		Self-custody is difficult and complicated for most normal users, relative
		to typical web2 accounts which often feature easy account recovery
		features. Moreover, losing one's seed phrase can be a devastating
		and irrecoverable financial loss. Some users avoid self-custody due to
		this concern.

		[Guardian-based recovery](https://vitalik.eth.limo/general/2021/01/11/recovery.html)
		(also known as "Social recovery") helps make self-custody safe and practical
		for everyday users. Properly implemented, this keeps users safer while still
		providing the self-sovereignty benefits of self-custody in the day-to-day.
	`),
	methodology: markdown(`
		Wallets are evaluated based on their implementation of
		[guardian-based recovery](https://vitalik.eth.limo/general/2021/01/11/recovery.html).

		To qualify, wallets must implement at least one form of guardian-based
		recovery. They must also ensure that whatever option the user picks (as allowed by the
		wallet's onboarding flow), all the following prongs are satisfied:

		- If the user loses access to their device (which can include
		  both their wallet's software and their passkeys), can they still recover their
			account on a separate device?
		- If any single external provider goes out of business, can the user still
		  recover their account?
		- If any single external provider is compromised or turns evil, can the
		  user's account be taken over by that provider?

		This attribute explicitly does **not** consider the scenario of the user's
		own self-custody key being compromised, as defenses against such scenarios
		are covered by a separate attribute in the Self-Sovereignty category.
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: false,
		fail: [
			exampleRating(
				paragraph(`
					The wallet does not implement any account recovery feature.
					If the user forgets or loses to their seed phrase,
					they lose access to their account.
				`),
				evaluateAccountRecovery({
					guardianRecovery: notSupported,
				}),
			),
			exampleRating(
				paragraph(`
					The wallet developer offers to back up the seed phrase onto their
					own platform unencrypted, allowing them to take over the user's account.
				`),
				exampleRatingUnimplemented,
			),
			exampleRating(
				paragraph(`
					The wallet developer offers to back up the seed phrase onto their
					own platform encrypted, with the encryption key stored on another
					service not under wallet developer control. However, the user is
					still unable to restore their account if the wallet developer
					goes out of business.
				`),
				evaluateAccountRecovery({
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
							optionalGuardians: [
								{ type: GuardianType.USER_EXTERNAL_ACCOUNT, entity: exampleCex, description: '' },
							],
							optionalGuardiansMinimumConfigurable: 1,
							optionalGuardiansMinimumNeededForRecovery: 1,
							secretReconstitution: 'CLIENT_SIDE',
						},
					}),
				}),
			),
			exampleRating(
				paragraph(`
					The wallet splits the recovery secret into three pieces with any
					two of them required for recovery. However, the secret reconstitution
					process requires the involvement of the wallet provider, putting
					them in a position to deny access to the recovery feature.
				`),
				evaluateAccountRecovery({
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
							secretReconstitution: exampleWalletDevelopmentCompany,
						},
					}),
				}),
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
					2 or more shares from these external services.
				`),
				evaluateAccountRecovery({
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
				}),
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<AccountRecoveryValue> => {
		if (features.security.accountRecovery === null) {
			return unrated(accountRecovery, { minimumGuardianPolicy: null, outcomes: null })
		}

		let references: FullyQualifiedReference[] = []

		// Collect references
		if (isSupported(features.security.accountRecovery.guardianRecovery)) {
			references = mergeRefs(references, features.security.accountRecovery.guardianRecovery.ref)
		}

		return { ...evaluateAccountRecovery(features.security.accountRecovery), references }
	},
	aggregate: pickWorstRating<AccountRecoveryValue>,
}

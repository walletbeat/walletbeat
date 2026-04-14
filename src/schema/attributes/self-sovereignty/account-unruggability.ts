import {
	exampleCex,
	exampleSecurityAuditor,
	exampleWalletDevelopmentCompany,
} from '@/data/entities/example'
import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
} from '@/schema/attributes'
import {
	type AccountRecovery,
	type GuardianPolicy,
	GuardianPolicyType,
	GuardianType,
} from '@/schema/features/security/account-recovery'
import { isSupported, supported } from '@/schema/features/support'
import { refNotNecessary } from '@/schema/reference'
import { verifiabilityRequiresSourceCodeAccess } from '@/schema/verifiability'
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

export type AccountUnruggabilityMetadata = {
	minimumGuardianPolicy: GuardianPolicy | null
	outcomes: NonEmptyArray<GuardianScenarioOutcome<GuardianScenarioType>> | null
}

function evaluateGuardianUnruggabilityPolicy(
	ctx: EvaluationContext<AccountUnruggabilityMetadata>,
	guardianPolicy: GuardianPolicy,
): Evaluation<AccountUnruggabilityMetadata> {
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
		return ctx.build({
			outcome: {
				id: 'guardian_policy_unruggable',
				rating: Rating.PASS,
				displayName: 'Account unruggable in all likely scenarios',
				shortExplanation: sentence(`
					{{WALLET_NAME}} does not allow any external service to take over
					your account.
				`),
				metadata: {
					minimumGuardianPolicy: guardianPolicy,
					outcomes,
				},
			},
			details: accountUnruggabilityDetailsContent({}),
		})
	}

	if (takeOverPossibleOutcomes.length === 1) {
		return ctx.build({
			outcome: {
				id: 'guardian_policy_ruggable_specific_scenario',
				rating: Rating.FAIL,
				displayName: 'Account may be ruggable',
				shortExplanation: typographicContentWithExtraOptionalStrings(
					takeOverPossibleOutcomes[0].takeover.description,
				),
				metadata: {
					minimumGuardianPolicy: guardianPolicy,
					outcomes,
				},
			},
			details: accountUnruggabilityDetailsContent({}),
		})
	}

	return ctx.build({
		outcome: {
			id: 'guardian_policy_ruggable_multiple_scenarios',
			rating: Rating.FAIL,
			displayName: 'Account may be ruggable',
			shortExplanation: mdSentence(`
				{{WALLET_NAME}}'s account recovery feature leaves the account
				vulnerable to being rugged in multiple scenarios.
			`),
			metadata: {
				minimumGuardianPolicy: guardianPolicy,
				outcomes,
			},
		},
		details: accountUnruggabilityDetailsContent({}),
	})
}

function evaluateAccountUnruggability(
	ctx: EvaluationContext<AccountUnruggabilityMetadata>,
	accountRecovery: AccountRecovery,
): Evaluation<AccountUnruggabilityMetadata> {
	if (isSupported(accountRecovery.guardianRecovery)) {
		return evaluateGuardianUnruggabilityPolicy(
			ctx,
			accountRecovery.guardianRecovery.minimumGuardianPolicy,
		)
	}

	return ctx.build({
		outcome: {
			id: 'pass_no_guardian_recovery',
			displayName: 'Unruggable account',
			rating: Rating.PASS,
			shortExplanation: sentence(`
				Private key material never leaves {{WALLET_NAME}}, so no external
				entity may take over your account.
			`),
			metadata: {
				minimumGuardianPolicy: null,
				outcomes: null,
			},
		},
		details: accountUnruggabilityDetailsContent({}),
	})
}

export const accountUnruggability: Attribute<AccountUnruggabilityMetadata> = {
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
					The wallet developer offers to back up the seed phrase onto their
					own platform unencrypted, allowing them to take over the user's account.
				`),
				evaluateAccountUnruggability(
					EvaluationContext.forTest(() => accountUnruggability),
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
					The wallet provider is listed as an optional guardian, and only
					one guardian is required to initiate recovery. This lets the
					wallet provider trigger recovery on their own and take over the
					account.
				`),
				evaluateAccountUnruggability(
					EvaluationContext.forTest(() => accountUnruggability),
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
								],
								optionalGuardiansMinimumConfigurable: 1,
								optionalGuardiansMinimumNeededForRecovery: 1,
								secretReconstitution: 'CLIENT_SIDE',
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
					EvaluationContext.forTest(() => accountUnruggability),
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
	evaluate: (
		ctx: EvaluationContext<AccountUnruggabilityMetadata>,
	): Evaluation<AccountUnruggabilityMetadata> => {
		ctx.setVerifiability(verifiabilityRequiresSourceCodeAccess({ coreOnlyIsSufficient: false }))

		if (ctx.features.security.accountRecovery === null) {
			return unrated(ctx, { minimumGuardianPolicy: null, outcomes: null })
		}

		ctx.addRef(ctx.features.security.accountRecovery.guardianRecovery)

		return evaluateAccountUnruggability(ctx, ctx.features.security.accountRecovery)
	},
	aggregate: pickWorstRating<AccountUnruggabilityMetadata>,
}

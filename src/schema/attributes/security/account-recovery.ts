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
	exampleRatingUnimplemented,
	Rating,
} from '@/schema/attributes'
import {
	type AccountRecovery,
	type AccountRecoveryDrill,
	accountRecoveryDrillCheckupLabels,
	accountRecoveryDrillNouns,
	AccountRecoveryDrillType,
	type GuardianPolicy,
	GuardianPolicyType,
	GuardianType,
} from '@/schema/features/security/account-recovery'
import { isSupported, notSupported, type Support, supported } from '@/schema/features/support'
import { refNotNecessary, type WithRef } from '@/schema/reference'
import { verifiabilityRequiresSourceCodeAccess } from '@/schema/verifiability'
import {
	markdown,
	mdSentence,
	paragraph,
	sentence,
	typographicContentWithExtraOptionalStrings,
} from '@/types/content'
import { accountRecoveryDetailsContent } from '@/types/content/account-recovery-details'
import { isNonEmptyArray, type NonEmptyArray } from '@/types/utils/non-empty'
import { commaListFormat } from '@/types/utils/text'

import {
	type AccountRecoveryOutcomeCannotBeRecovered,
	type GuardianScenarioOutcome,
	type GuardianScenarioType,
	isAccountRecoverable,
} from '../../features/guardian-scenario/guardian-scenario-common'
import { evaluateAllGuardianScenarios } from '../../features/guardian-scenario/guardian-scenario-expansion'
import { pickWorstRating, unrated } from '../common'

export type AccountRecoveryMetadata = {
	minimumGuardianPolicy: GuardianPolicy | null
	outcomes: NonEmptyArray<GuardianScenarioOutcome<GuardianScenarioType>> | null
}

function evaluateGuardianRecoveryPolicy(
	ctx: EvaluationContext<AccountRecoveryMetadata>,
	guardianPolicy: GuardianPolicy,
): Evaluation<AccountRecoveryMetadata> {
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
		return ctx.build({
			outcome: {
				id: 'guardian_policy_recoverable',
				rating: Rating.PASS,
				displayName: 'Account recoverable in all likely scenarios',
				shortExplanation: sentence(`
					{{WALLET_NAME}} lets the user recover their account in all
					likely catastrophic scenarios.
				`),
				metadata: {
					minimumGuardianPolicy: guardianPolicy,
					outcomes,
				},
			},
			details: accountRecoveryDetailsContent({}),
		})
	}

	if (nonRecoverableOutcomes.length === 1) {
		return ctx.build({
			outcome: {
				id: 'guardian_policy_nonrecoverable_specific_scenario',
				rating: Rating.FAIL,
				displayName: 'Account may be non-recoverable',
				shortExplanation: typographicContentWithExtraOptionalStrings(
					nonRecoverableOutcomes[0].recovery.description,
				),
				metadata: {
					minimumGuardianPolicy: guardianPolicy,
					outcomes,
				},
			},
			details: accountRecoveryDetailsContent({}),
		})
	}

	return ctx.build({
		outcome: {
			id: 'guardian_policy_nonrecoverable_multiple_scenarios',
			rating: Rating.FAIL,
			displayName: 'Account may be non-recoverable',
			shortExplanation: mdSentence(`
				{{WALLET_NAME}}'s account recovery feature cannot be
				relied upon in multiple scenarios.
			`),
			metadata: {
				minimumGuardianPolicy: guardianPolicy,
				outcomes,
			},
		},
		details: accountRecoveryDetailsContent({}),
	})
}

function evaluateAccountRecoveryDrills(
	ctx: EvaluationContext<AccountRecoveryMetadata>,
	drills: Support<{ entries: NonEmptyArray<WithRef<AccountRecoveryDrill>> }>,
	hasGuardianRecovery: boolean,
): Evaluation<AccountRecoveryMetadata> {
	// Guardian account check-ups are only meaningful for wallets that
	// actually implement guardian-based recovery.
	const recommendedDrillTypes: AccountRecoveryDrillType[] = [
		AccountRecoveryDrillType.PRIVATE_KEY_QUIZ,
		AccountRecoveryDrillType.SEED_PHRASE_QUIZ,
		...(hasGuardianRecovery ? [AccountRecoveryDrillType.GUARDIAN_ACCOUNT_CHECK] : []),
	]

	if (isSupported(drills)) {
		const configuredDrillTypes = new Set(drills.entries.map(drill => drill.type))
		const missing = recommendedDrillTypes.filter(type => !configuredDrillTypes.has(type))

		if (!isNonEmptyArray(missing)) {
			return ctx.build({
				outcome: {
					id: 'recovery_drills_supported',
					rating: Rating.PASS,
					displayName: 'Account recovery drills implemented',
					shortExplanation: sentence(`
						{{WALLET_NAME}} periodically asks users to make sure that their private key,
						seed phrase, and guardian accounts are still accessible.
					`),
					metadata: { minimumGuardianPolicy: null, outcomes: null },
				},
				details: accountRecoveryDetailsContent({}),
			})
		}

		return ctx.build({
			outcome: {
				id: 'recovery_drills_incomplete',
				rating: Rating.PARTIAL,
				displayName: 'Incomplete account recovery drills',
				shortExplanation: sentence(`
					{{WALLET_NAME}} does not run all recommended periodic
					account recovery check-ups.
				`),
				metadata: { minimumGuardianPolicy: null, outcomes: null },
			},
			details: accountRecoveryDetailsContent({}),
			howToImprove: sentence(`
				{{WALLET_NAME}} should periodically ask users to complete
				${commaListFormat(missing.map(type => accountRecoveryDrillCheckupLabels[type]))} to ensure they can recover their account when needed.
			`),
		})
	}

	return ctx.build({
		outcome: {
			id: 'no_recovery_drills',
			rating: Rating.PARTIAL,
			displayName: 'No account recovery drills',
			shortExplanation: sentence(`
				{{WALLET_NAME}} does not periodically remind users to verify
				they can still access their account recovery.
			`),
			metadata: { minimumGuardianPolicy: null, outcomes: null },
		},
		details: accountRecoveryDetailsContent({}),
		howToImprove: sentence(`
			{{WALLET_NAME}} should periodically ask users to verify their
			${commaListFormat(recommendedDrillTypes.map(type => accountRecoveryDrillNouns[type]))} are still accessible.
		`),
	})
}

function evaluateAccountRecovery(
	ctx: EvaluationContext<AccountRecoveryMetadata>,
	accountRecovery: AccountRecovery,
): Evaluation<AccountRecoveryMetadata> {
	if (accountRecovery.drills === null) {
		return unrated(ctx, { minimumGuardianPolicy: null, outcomes: null })
	}

	const hasGuardianRecovery = isSupported(accountRecovery.guardianRecovery)
	const drillsEval = evaluateAccountRecoveryDrills(ctx, accountRecovery.drills, hasGuardianRecovery)

	const guardianEval = isSupported(accountRecovery.guardianRecovery)
		? evaluateGuardianRecoveryPolicy(ctx, accountRecovery.guardianRecovery.minimumGuardianPolicy)
		: ctx.build({
				outcome: {
					id: 'no_guardian_recovery',
					displayName: 'No account recovery mechanism',
					rating: Rating.FAIL,
					shortExplanation: sentence(`
						{{WALLET_NAME}} does not implement guardian-based account recovery.
						The user will lose access to their account if they lose their seed phrase.
					`),
					metadata: {
						minimumGuardianPolicy: null,
						outcomes: null,
					},
				},
				details: accountRecoveryDetailsContent({}),
			})

	return pickWorstRating<AccountRecoveryMetadata>([guardianEval, drillsEval])
}

export const accountRecovery: Attribute<AccountRecoveryMetadata> = {
	id: 'accountRecovery',
	icon: 'account_recovery',
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
					If the user forgets or
					they lose access to their account.
				`),
				evaluateAccountRecovery(
					EvaluationContext.forTest(() => accountRecovery),
					{
						guardianRecovery: notSupported,
						drills: notSupported,
					},
				),
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
				evaluateAccountRecovery(
					EvaluationContext.forTest(() => accountRecovery),
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
								optionalGuardians: [
									{ type: GuardianType.USER_EXTERNAL_ACCOUNT, entity: exampleCex, description: '' },
								],
								optionalGuardiansMinimumConfigurable: 1,
								optionalGuardiansMinimumNeededForRecovery: 1,
								secretReconstitution: 'CLIENT_SIDE',
							},
						}),
						drills: notSupported,
					},
				),
			),
			exampleRating(
				paragraph(`
					The wallet splits the recovery secret into three pieces with any
					two of them required for recovery. However, the secret reconstitution
					process requires the involvement of the wallet provider, putting
					them in a position to deny access to the recovery feature.
				`),
				evaluateAccountRecovery(
					EvaluationContext.forTest(() => accountRecovery),
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
								secretReconstitution: exampleWalletDevelopmentCompany,
							},
						}),
						drills: notSupported,
					},
				),
			),
		],
		partial: [
			exampleRating(
				paragraph(`
						The wallet securely distributes a recovery secret across at least 3
						external services with client-side reconstitution, but does not
						periodically remind users to verify they can still access their
						account recovery.
					`),
				evaluateAccountRecovery(
					EvaluationContext.forTest(() => accountRecovery),
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
						drills: notSupported,
					},
				),
			),
			exampleRating(
				paragraph(`
						The wallet securely distributes a recovery secret across at least 3
						external services with client-side reconstitution. It periodically
						reminds users to verify their private key is still accessible, but
						does not run the recommended seed phrase or guardian account
						check-ups.
					`),
				evaluateAccountRecovery(
					EvaluationContext.forTest(() => accountRecovery),
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
						drills: supported({
							entries: [
								{
									type: AccountRecoveryDrillType.PRIVATE_KEY_QUIZ,
									ref: refNotNecessary,
									reminderEveryNDays: 90,
								},
							] satisfies NonEmptyArray<WithRef<AccountRecoveryDrill>>,
						}),
					},
				),
			),
		],
		pass: [
			exampleRating(
				paragraph(`
					The wallet securely distributes a recovery secret across at least 3
					external services, neither of which can recover the account on their
					own, and none of which are critically required to be operating during
					the recovery process.
					The recovery secret is reconstituted on the user's device using
					2 or more shares from these external services.
					The wallet also periodically reminds users to verify their recovery
					setup is intact.
				`),
				evaluateAccountRecovery(
					EvaluationContext.forTest(() => accountRecovery),
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
						drills: supported({
							entries: [
								{
									type: AccountRecoveryDrillType.PRIVATE_KEY_QUIZ,
									ref: refNotNecessary,
									reminderEveryNDays: 90,
								},
								{
									type: AccountRecoveryDrillType.SEED_PHRASE_QUIZ,
									ref: refNotNecessary,
									reminderEveryNDays: 90,
								},
								{
									type: AccountRecoveryDrillType.GUARDIAN_ACCOUNT_CHECK,
									ref: refNotNecessary,
									reminderEveryNDays: 90,
								},
							] satisfies NonEmptyArray<WithRef<AccountRecoveryDrill>>,
						}),
					},
				),
			),
		],
	},
	evaluate: (
		ctx: EvaluationContext<AccountRecoveryMetadata>,
	): Evaluation<AccountRecoveryMetadata> => {
		ctx.setVerifiability(verifiabilityRequiresSourceCodeAccess({ coreOnlyIsSufficient: true }))

		if (ctx.features.security.accountRecovery === null) {
			return unrated(ctx, { minimumGuardianPolicy: null, outcomes: null })
		}

		// Collect references
		if (isSupported(ctx.features.security.accountRecovery.guardianRecovery)) {
			ctx.addRef(ctx.features.security.accountRecovery.guardianRecovery)
		}

		return evaluateAccountRecovery(ctx, ctx.features.security.accountRecovery)
	},
	aggregate: pickWorstRating<AccountRecoveryMetadata>,
}

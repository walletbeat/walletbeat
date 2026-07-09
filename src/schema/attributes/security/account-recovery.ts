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
	type AccountSupport,
	AccountType,
	type AccountTypeEoa,
	isAccountTypeSupported,
} from '@/schema/features/account-support'
import {
	type AccountRecovery,
	type AccountRecoveryDrill,
	AccountRecoveryDrillType,
	accountRecoveryDrillWording,
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
	drills: {
		configured: AccountRecoveryDrill[]
		missing: AccountRecoveryDrillType[]
	} | null
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
					drills: null,
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
					drills: null,
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
				drills: null,
			},
		},
		details: accountRecoveryDetailsContent({}),
	})
}

function drillsHowToImprove(missing: NonEmptyArray<AccountRecoveryDrillType>) {
	if (missing.length === 1) {
		return sentence(`
			{{WALLET_NAME}} should periodically ask users to complete
			${accountRecoveryDrillWording(missing[0]).recommendation} to ensure
			they can recover their account when needed.
		`)
	}

	return markdown(`
		{{WALLET_NAME}} should periodically ask users to complete the following
		check-ups to ensure they can recover their account when needed:

		${missing.map(type => `: ${accountRecoveryDrillWording(type).recommendation}`).join('\n\t\t')}
	`)
}

function evaluateAccountRecoveryDrills(
	ctx: EvaluationContext<AccountRecoveryMetadata>,
	drills: Support<{ entries: NonEmptyArray<WithRef<AccountRecoveryDrill>> }>,
	recommendedDrillTypes: AccountRecoveryDrillType[],
): Evaluation<AccountRecoveryMetadata> {
	if (isSupported(drills)) {
		const configuredDrillTypes = new Set(drills.entries.map(drill => drill.type))
		const missing = recommendedDrillTypes.filter(type => !configuredDrillTypes.has(type))
		const configured = drills.entries.map(({ type, reminderEveryNDays }) => ({
			type,
			reminderEveryNDays,
		}))

		if (!isNonEmptyArray(missing)) {
			return ctx.build({
				outcome: {
					id: 'recovery_drills_supported',
					rating: Rating.PASS,
					displayName: 'Account recovery drills implemented',
					shortExplanation: sentence(`
						{{WALLET_NAME}} periodically asks users to confirm access to their
						${commaListFormat(configured.map(drill => accountRecoveryDrillWording(drill.type).noun))}.
					`),
					metadata: {
						minimumGuardianPolicy: null,
						outcomes: null,
						drills: { configured, missing: [] },
					},
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
				metadata: { minimumGuardianPolicy: null, outcomes: null, drills: { configured, missing } },
			},
			details: accountRecoveryDetailsContent({}),
			howToImprove: drillsHowToImprove(missing),
		})
	}

	// For empty recommended drill types
	if (!isNonEmptyArray(recommendedDrillTypes)) {
		return ctx.build({
			outcome: {
				id: 'no_applicable_recovery_drills',
				rating: Rating.PASS,
				displayName: 'No account recovery drills applicable',
				shortExplanation: sentence(`
					{{WALLET_NAME}}'s account type has no user-held recovery material
					that periodic check-ups could verify.
				`),
				metadata: {
					minimumGuardianPolicy: null,
					outcomes: null,
					drills: { configured: [], missing: [] },
				},
			},
			details: accountRecoveryDetailsContent({}),
		})
	}

	return ctx.build({
		outcome: {
			id: 'no_recovery_drills',
			rating: Rating.PARTIAL,
			displayName: 'No account recovery drills',
			shortExplanation: sentence(`
				{{WALLET_NAME}} does not periodically remind users to verify
				they can still recover their account.
			`),
			metadata: {
				minimumGuardianPolicy: null,
				outcomes: null,
				drills: { configured: [], missing: recommendedDrillTypes },
			},
		},
		details: accountRecoveryDetailsContent({}),
		howToImprove: drillsHowToImprove(recommendedDrillTypes),
	})
}

/**
 * Which account recovery drills the wallet is expected to run.
 * Wallets should only be expected to drill users on recovery material
 * that is necessary to them: a private key check-up only makes sense if the
 * wallet ever exposes a raw private key to the user, and a seed phrase
 * check-up only makes sense if EOA keys are derived from a seed phrase.
 *
 * Wallets without EOA support (MPC, smart contract accounts) have no
 * such user-held key material to quiz the user on. Guardian account
 * check-ups are only meaningful for wallets that actually implement
 * guardian-based recovery.
 */
function getRecommendedDrillTypes(
	accountSupport: AccountSupport,
	hasGuardianRecovery: boolean,
): AccountRecoveryDrillType[] {
	const keyMaterialDrillTypes: AccountRecoveryDrillType[] = isAccountTypeSupported<AccountTypeEoa>(
		accountSupport.eoa,
	)
		? [
				...(accountSupport.eoa.canExportPrivateKey
					? [AccountRecoveryDrillType.PRIVATE_KEY_QUIZ]
					: []),
				...(accountSupport.eoa.keyDerivation.type === 'BIP32'
					? [AccountRecoveryDrillType.SEED_PHRASE_QUIZ]
					: []),
			]
		: []

	return [
		...keyMaterialDrillTypes,
		...(hasGuardianRecovery ? [AccountRecoveryDrillType.GUARDIAN_ACCOUNT_CHECK] : []),
	]
}

function evaluateAccountRecovery(
	ctx: EvaluationContext<AccountRecoveryMetadata>,
	accountRecovery: AccountRecovery,
	accountSupport: AccountSupport,
): Evaluation<AccountRecoveryMetadata> {
	if (accountRecovery.drills === null) {
		return unrated(ctx, { minimumGuardianPolicy: null, outcomes: null, drills: null })
	}

	const hasGuardianRecovery = isSupported(accountRecovery.guardianRecovery)
	const recommendedDrillTypes = getRecommendedDrillTypes(accountSupport, hasGuardianRecovery)
	const drillsEval = evaluateAccountRecoveryDrills(
		ctx,
		accountRecovery.drills,
		recommendedDrillTypes,
	)

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
						drills: null,
					},
				},
				details: accountRecoveryDetailsContent({}),
			})

	// `pickWorstRating` returns one sub-evaluation wholesale, so whichever
	// side "wins" the worst rating would otherwise silently drop the other
	// side's metadata (e.g. a worse drills rating would wipe out the
	// guardian scenario details). Merge both halves into a single metadata
	// object first so the details view always has the full picture.
	const mergedMetadata: AccountRecoveryMetadata = {
		minimumGuardianPolicy: guardianEval.outcome.metadata.minimumGuardianPolicy,
		outcomes: guardianEval.outcome.metadata.outcomes,
		drills: drillsEval.outcome.metadata.drills,
	}

	return pickWorstRating<AccountRecoveryMetadata>([
		{ ...guardianEval, outcome: { ...guardianEval.outcome, metadata: mergedMetadata } },
		{ ...drillsEval, outcome: { ...drillsEval.outcome, metadata: mergedMetadata } },
	])
}

/** A sample seed-phrase-based EOA account support, used by example ratings. */
const exampleEoaAccountSupport: AccountSupport = {
	defaultAccountType: AccountType.eoa,
	eoa: supported({
		ref: refNotNecessary,
		keyDerivation: {
			type: 'BIP32',
			derivationPath: 'BIP44',
			seedPhrase: 'BIP39',
			canExportSeedPhrase: true,
		},
		canExportPrivateKey: true,
	}),
	mpc: notSupported,
	eip7702: notSupported,
	rawErc4337: notSupported,
	safe: notSupported,
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

		However, recovery methods can themselves silently become inaccessible over time.
		For example, a guardian account may get abandoned, or a written-down seed
		phrase may be lost or become unreadable. Users rarely notice this until
		the day they need to recover their account, at which point it is too late.
		Wallets can address this by periodically asking users to verify that their
		recovery methods are still accessible, catching such problems while there
		is still time to fix them.
	`),
	methodology: markdown(`
		Wallets are evaluated based on their implementation of
		[guardian-based recovery](https://vitalik.eth.limo/general/2021/01/11/recovery.html)
		and on whether they periodically verify that users still have access to their
		account recovery methods.

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

		Separately, wallets are evaluated on whether they periodically prompt
		users to demonstrate that their recovery setup still works. Which
		check-ups are expected depends on the wallet's features and on how
		each account was created, since wallets can only drill users on
		recovery material that actually exists:

		- If the wallet supports EOA accounts and lets the user export their
		  private key, a private key check-up for accounts imported from a
		  raw private key, confirming the user still has access to their
		  private key.
		- If the wallet supports EOA accounts derived from a seed phrase, a
		  seed phrase check-up for accounts created from a seed phrase,
		  confirming the user still has access to their seed phrase.
		- Wallets without EOA support (such as MPC-based wallets) have no
		  such user-held key material, so no key material check-ups are
		  expected for them.
		- If the wallet implements guardian-based recovery, a guardian
		  account check-up, confirming the user still has access to each
		  configured guardian account.
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
					exampleEoaAccountSupport,
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
					exampleEoaAccountSupport,
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
					exampleEoaAccountSupport,
				),
			),
		],
		partial: [
			exampleRating(
				paragraph(`
						The wallet securely distributes a recovery secret across at least 3
						external services with client-side reconstitution, but does not
						periodically remind users to verify they can still recover their account.
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
					exampleEoaAccountSupport,
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
					exampleEoaAccountSupport,
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
					setup is functional.
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
					exampleEoaAccountSupport,
				),
			),
		],
	},
	evaluate: (
		ctx: EvaluationContext<AccountRecoveryMetadata>,
	): Evaluation<AccountRecoveryMetadata> => {
		ctx.setVerifiability(verifiabilityRequiresSourceCodeAccess({ coreOnlyIsSufficient: true }))

		// Account support data is also required, to determine which specific
		// account recovery drills are expected of the wallet.
		if (ctx.features.security.accountRecovery === null || ctx.features.accountSupport === null) {
			return unrated(ctx, { minimumGuardianPolicy: null, outcomes: null, drills: null })
		}

		// Collect references
		if (isSupported(ctx.features.security.accountRecovery.guardianRecovery)) {
			ctx.addRef(ctx.features.security.accountRecovery.guardianRecovery)
		}

		return evaluateAccountRecovery(
			ctx,
			ctx.features.security.accountRecovery,
			ctx.features.accountSupport,
		)
	},
	aggregate: pickWorstRating<AccountRecoveryMetadata>,
}

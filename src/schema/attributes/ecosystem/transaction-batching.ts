import { eip5792 } from '@/data/eips/eip-5792'
import { eip7702 } from '@/data/eips/eip-7702'
import { erc4337 } from '@/data/eips/erc-4337'
import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	Verifiability,
} from '@/schema/attributes'
import { eipMarkdownLink, eipMarkdownLinkAndTitle } from '@/schema/eips'
import {
	type AccountSupport,
	AccountType,
	type AccountType4337,
	type AccountType7702,
} from '@/schema/features/account-support'
import type { AppTriggeredDelegationDetails } from '@/schema/features/ecosystem/delegation-handling'
import type { WalletCallIntegration } from '@/schema/features/ecosystem/integration'
import { WalletProfile } from '@/schema/features/profile'
import {
	featureSupported,
	isSupported,
	notSupported,
	notSupportedWithRef,
	type Support,
	supported,
} from '@/schema/features/support'
import { refNotNecessary, type WithRef } from '@/schema/reference'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, mdSentence, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

function evaluateTransactionBatching(
	ctx: EvaluationContext,
	accountSupport: AccountSupport,
	walletCall: Support<WithRef<WalletCallIntegration>>,
): Evaluation {
	if (
		!isSupported<AccountType7702>(accountSupport.eip7702) &&
		!isSupported<AccountType4337>(accountSupport.rawErc4337)
	) {
		ctx.addRef(accountSupport.eip7702, accountSupport.rawErc4337)

		return ctx.build({
			outcome: {
				id: 'no_smart_account_support',
				displayName: 'No transaction batching support',
				rating: Rating.FAIL,
				shortExplanation: sentence(
					'{{WALLET_NAME}} does not support transaction batching, as it does not support any type of smart account.',
				),
			},
			details: paragraph(`
				{{WALLET_NAME}} does not implement any type of smart account.
				This means users cannot benefit from the benefits such accounts
				bring, such as transaction batching. For example, this means
				token approval transactions need to be submitted separately from
				the transactions that spend these tokens.
			`),
			howToImprove: sentence(`
				{{WALLET_NAME}} should support smart accounts, such as
				${eipMarkdownLink(eip7702)} accounts.
			`),
		})
	}

	ctx.addRef(walletCall)

	if (!isSupported<WalletCallIntegration>(walletCall)) {
		return ctx.build({
			outcome: {
				id: 'no_wallet_call_support',
				displayName: 'No transaction batching support',
				rating: Rating.FAIL,
				shortExplanation: sentence('{{WALLET_NAME}} does not support transaction batching.'),
			},
			details: mdParagraph(`
				{{WALLET_NAME}} does not implement ${eipMarkdownLinkAndTitle(eip5792)}.
				This means applications cannot request the wallet to bundle multiple
				transactions into a single operation.
				For example, this means token approval transactions need to be
				submitted separately from the transactions that spend these tokens.
			`),
			howToImprove: sentence(`
				{{WALLET_NAME}} should implement ${eipMarkdownLinkAndTitle(eip5792)}.
			`),
		})
	}

	if (!isSupported<Support>(walletCall.atomicMultiTransactions)) {
		ctx.addRef(walletCall.atomicMultiTransactions)

		return ctx.build({
			outcome: {
				id: 'no_atomic_bundle_support',
				displayName: 'Non-atomic transaction batching support',
				rating: Rating.PARTIAL,
				shortExplanation: sentence(
					'{{WALLET_NAME}} supports transaction batching, but not atomic transaction bundles.',
				),
			},
			details: mdParagraph(`
				{{WALLET_NAME}} implements ${eipMarkdownLinkAndTitle(eip5792)}.
				This means applications can request the wallet to bundle multiple
				transactions into a single operation.
				For example, this means token approval transactions need to be
				submitted separately from the transactions that spend these tokens.

				However, {{WALLET_NAME}} does not support **atomic** transaction
				bundles.
				This means that the wallet cannot guarantee that a transaction
				bundle is either **all executed** or **all non-executed**.
				Instead, it is possible that only **some** of the bundle's
				transactions are executed. This prevents some DeFi use-cases.
			`),
			howToImprove: sentence(`
				{{WALLET_NAME}} should implement atomic transaction batching.
			`),
		})
	}

	return ctx.build({
		outcome: {
			id: 'full_wallet_call_support',
			displayName: 'Full transaction batching support',
			rating: Rating.PASS,
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports transaction batching and atomic transaction bundles.',
			),
		},
		details: mdParagraph(`
			{{WALLET_NAME}} implements ${eipMarkdownLinkAndTitle(eip5792)}.
			This means applications can request the wallet to bundle multiple
			transactions into a single operation.
			For example, this means token approval transactions need to be
			submitted separately from the transactions that spend these tokens.

			In addition, {{WALLET_NAME}} supports **atomic** transaction bundles.
			This means that the wallet guarantees that a transaction bundle is
			either **all executed** or **all non-executed**. This enables some
			advanced DeFi use-cases.
		`),
	})
}

/**
 * Evaluates how the wallet presents an EIP-7702 delegation that an app's call
 * batch causes it to set. Returns null when the delegation is disclosed and
 * does not obscure the batch's calls.
 */
function evaluateAppTriggeredDelegation(
	ctx: EvaluationContext,
	appTriggeredDelegation: AppTriggeredDelegationDetails,
): Evaluation | null {
	if (!appTriggeredDelegation.delegationDisclosed) {
		return ctx.build({
			outcome: {
				id: 'undisclosed_app_triggered_delegation',
				displayName: 'Undisclosed account delegation in batches',
				rating: Rating.FAIL,
				shortExplanation: sentence(
					"{{WALLET_NAME}} can delegate your account while executing an app's transaction batch without telling you.",
				),
			},
			details: mdParagraph(`
				When an app sends a transaction batch for an account that is not
				yet delegated, {{WALLET_NAME}} sets an ${eipMarkdownLink(eip7702)}
				delegation on the account as part of executing the batch.
				The confirmation screen does not tell the user about this delegation.
			`),
			impact: paragraph(
				'Users approve a change to how their account works without being told, which makes the transaction confirmation screen less trustworthy.',
			),
			howToImprove: sentence(`
				{{WALLET_NAME}} should state on the batch's confirmation screen
				that approving it also delegates the account.
			`),
		})
	}

	if (!appTriggeredDelegation.batchCallDetailsIdenticalToDelegatedFlow) {
		return ctx.build({
			outcome: {
				id: 'app_triggered_delegation_obscures_batch',
				displayName: 'Account delegation obscures batch details',
				rating: Rating.PARTIAL,
				shortExplanation: sentence(
					"{{WALLET_NAME}} shows fewer details about an app's transaction batch when the batch also delegates your account.",
				),
			},
			details: mdParagraph(`
				When an app sends a transaction batch for an account that is not
				yet delegated, {{WALLET_NAME}} sets an ${eipMarkdownLink(eip7702)}
				delegation on the account as part of executing the batch, and says
				so on the confirmation screen. However, the batch's calls are shown
				with less detail than the same batch sent from an account that is
				already delegated.
			`),
			howToImprove: sentence(`
				{{WALLET_NAME}} should show the batch's calls with the same level
				of detail whether or not the batch also delegates the account.
			`),
		})
	}

	return null
}

export const transactionBatching: Attribute = {
	id: 'transactionBatching',
	icon: 'transaction_batching',
	displayName: 'Transaction batching',
	wording: {
		midSentenceName: 'transaction batching',
	},
	question: sentence(
		'Does the wallet support bundling multiple operations as a single transaction?',
	),
	why: markdown(`
		Transaction batching is one of the longstanding features without which
		Ethereum user experience (UX) has suffered. One of the most common pain
		points for DeFi, for example, has been the need to perform separate
		"token approval" transactions, followed by a separate transaction to
		actually execute the user's original intent.
	`),
	methodology: markdown(`
		Smart account types such as ${eipMarkdownLink(erc4337)} and
		${eipMarkdownLink(eip7702)} unlock the ability to perform multiple
		operations as a single transaction. This is exposed to applications
		through ${eipMarkdownLinkAndTitle(eip5792)}.

		To qualify for a passing rating, the wallet must:

		- Support at least one type of smart account.
		- Implement ${eipMarkdownLinkAndTitle(eip5792)}.
		- Support atomic transaction bundles, as per the \`atomic\` capability
		  declared in \`wallet_getCapabilities\`.

		Apps cannot choose a delegate contract. However, when an app sends a
		batch for an account that is not yet delegated, the wallet may delegate
		the account to its own delegate contract while executing the batch.
		When it does, the batch's confirmation screen must say that the account
		is being delegated; otherwise the wallet fails. The delegation must also
		not reduce the detail shown about the batch's calls, compared to the
		same batch sent from an already-delegated account; otherwise the rating
		is at most partial.
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: false,
		fail: [
			exampleRating(
				sentence('The wallet does not support any type of smart account.'),
				evaluateTransactionBatching(
					EvaluationContext.forTest(() => transactionBatching),
					{
						eoa: supported({
							canExportPrivateKey: true,
							keyDerivation: {
								type: 'BIP32',
								derivationPath: 'BIP44',
								seedPhrase: 'BIP39',
								canExportSeedPhrase: true,
							},
							ref: refNotNecessary,
						}),
						safe: notSupported,
						mpc: notSupportedWithRef({ ref: refNotNecessary }),
						eip7702: notSupportedWithRef({ ref: refNotNecessary }),
						rawErc4337: notSupportedWithRef({ ref: refNotNecessary }),
						defaultAccountType: AccountType.eoa,
					},
					notSupported,
				),
			),
			exampleRating(
				mdSentence(
					`The wallet supports smart accounts but does not support ${eipMarkdownLinkAndTitle(eip5792)}.`,
				),
				evaluateTransactionBatching(
					EvaluationContext.forTest(() => transactionBatching),
					{
						eoa: notSupportedWithRef({ ref: refNotNecessary }),
						mpc: notSupportedWithRef({ ref: refNotNecessary }),
						safe: notSupported,
						eip7702: supported({
							ref: refNotNecessary,
							contract: 'UNKNOWN',
						}),
						rawErc4337: notSupportedWithRef({ ref: refNotNecessary }),
						defaultAccountType: AccountType.eip7702,
					},
					notSupported,
				),
			),
		],
		partial: exampleRating(
			mdSentence(
				`The wallet supports ${eipMarkdownLinkAndTitle(eip5792)}, but does not support atomic bundles.`,
			),
			evaluateTransactionBatching(
				EvaluationContext.forTest(() => transactionBatching),
				{
					eoa: notSupportedWithRef({ ref: refNotNecessary }),
					mpc: notSupportedWithRef({ ref: refNotNecessary }),
					safe: notSupported,
					eip7702: supported({
						ref: refNotNecessary,
						contract: 'UNKNOWN',
					}),
					rawErc4337: notSupportedWithRef({ ref: refNotNecessary }),
					defaultAccountType: AccountType.eip7702,
				},
				supported({
					ref: refNotNecessary,
					atomicMultiTransactions: notSupported,
				}),
			),
		),
		pass: exampleRating(
			mdSentence(
				`The wallet supports ${eipMarkdownLinkAndTitle(eip5792)} including atomic bundles.`,
			),
			evaluateTransactionBatching(
				EvaluationContext.forTest(() => transactionBatching),
				{
					eoa: notSupportedWithRef({ ref: refNotNecessary }),
					mpc: notSupportedWithRef({ ref: refNotNecessary }),
					safe: notSupported,
					eip7702: supported({
						ref: refNotNecessary,
						contract: 'UNKNOWN',
					}),
					rawErc4337: notSupportedWithRef({ ref: refNotNecessary }),
					defaultAccountType: AccountType.eip7702,
				},
				supported({
					ref: refNotNecessary,
					atomicMultiTransactions: featureSupported,
				}),
			),
		),
	},
	evaluate: ctx => {
		ctx.setVerifiability(Verifiability.VERIFIABLE) // Self-testable.

		if (ctx.features.type !== WalletType.SOFTWARE) {
			return exempt(
				ctx,
				sentence('Only software wallets are expected to deal with transaction batching.'),
			)
		}

		if (ctx.features.profile === WalletProfile.PAYMENTS) {
			return exempt(
				ctx,
				sentence(`
					{{WALLET_NAME}} is exempt as it is a payments-focused wallet,
					for which transaction batching is not very useful.
				`),
			)
		}

		if (ctx.features.accountSupport === null || ctx.features.walletCall === null) {
			return unrated(ctx)
		}

		const evaluation = evaluateTransactionBatching(
			ctx,
			ctx.features.accountSupport,
			ctx.features.walletCall,
		)
		const { appTriggeredDelegation } = ctx.features.ecosystem

		if (
			appTriggeredDelegation === null ||
			!isSupported<AppTriggeredDelegationDetails>(appTriggeredDelegation)
		) {
			return evaluation
		}

		ctx.addRef(appTriggeredDelegation)
		const delegationEvaluation = evaluateAppTriggeredDelegation(ctx, appTriggeredDelegation)

		return delegationEvaluation === null
			? evaluation
			: pickWorstRating([evaluation, delegationEvaluation])
	},
	aggregate: pickWorstRating,
}

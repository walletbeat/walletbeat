import { eip5792 } from '@/data/eips/eip-5792'
import { eip7702 } from '@/data/eips/eip-7702'
import { erc4337 } from '@/data/eips/erc-4337'
import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import { eipMarkdownLink, eipMarkdownLinkAndTitle } from '@/schema/eips'
import type { ResolvedFeatures } from '@/schema/features'
import {
	type AccountSupport,
	AccountType,
	type AccountType4337,
	type AccountType7702,
} from '@/schema/features/account-support'
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
import { mergeRefs, refNotNecessary, refs, type WithRef } from '@/schema/reference'
import { WalletType } from '@/schema/wallet-types'
import { markdown, mdParagraph, mdSentence, paragraph, sentence } from '@/types/content'

import { exempt, pickWorstRating, unrated } from '../common'

export type TransactionBatchingValue = Value

function evaluateTransactionBatching(
	accountSupport: AccountSupport,
	walletCall: Support<WithRef<WalletCallIntegration>>,
): Evaluation<TransactionBatchingValue> {
	if (
		!isSupported<AccountType7702>(accountSupport.eip7702) &&
		!isSupported<AccountType4337>(accountSupport.rawErc4337)
	) {
		return {
			value: {
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
			references: mergeRefs(
				isSupported(accountSupport.eip7702) ? refs(accountSupport.eip7702) : [],
				isSupported(accountSupport.rawErc4337) ? refs(accountSupport.rawErc4337) : [],
			),
		}
	}

	let references = mergeRefs(isSupported(walletCall) ? refs(walletCall) : [])

	if (!isSupported<WalletCallIntegration>(walletCall)) {
		return {
			value: {
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
			references,
		}
	}

	references = mergeRefs(references, refs(walletCall))

	if (!isSupported<Support>(walletCall.atomicMultiTransactions)) {
		return {
			value: {
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
			references,
		}
	}

	return {
		value: {
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
		references,
	}
}

export const transactionBatching: Attribute<TransactionBatchingValue> = {
	id: 'transactionBatching',
	icon: '\u{1f9fa}', // Basket
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
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: false,
		fail: [
			exampleRating(
				sentence('The wallet does not support any type of smart account.'),
				evaluateTransactionBatching(
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
	evaluate: (features: ResolvedFeatures): Evaluation<TransactionBatchingValue> => {
		if (features.type !== WalletType.SOFTWARE) {
			return exempt(
				transactionBatching,
				sentence('Only software wallets are expected to deal with transaction batching.'),
				null,
			)
		}

		if (features.profile === WalletProfile.PAYMENTS) {
			return exempt(
				transactionBatching,
				sentence(`
					{{WALLET_NAME}} is exempt as it is a payments-focused wallet,
					for which transaction batching is not very useful.
				`),
				null,
			)
		}

		if (features.accountSupport === null || features.integration.walletCall === null) {
			return unrated(transactionBatching, null)
		}

		return evaluateTransactionBatching(features.accountSupport, features.integration.walletCall)
	},
	aggregate: pickWorstRating<TransactionBatchingValue>,
}

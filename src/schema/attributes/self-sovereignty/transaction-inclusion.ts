import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
} from '@/schema/attributes'
import {
	TransactionSubmissionL2Support,
	TransactionSubmissionL2Type,
	transactionSubmissionL2Types,
} from '@/schema/features/self-sovereignty/transaction-submission'
import { isSupported } from '@/schema/features/support'
import { isNoRef } from '@/schema/reference'
import {
	verifiabilityRequiresAnyOf,
	verifiabilityRequiresCustomChainRpc,
	verifiabilityRequiresSourceCodeAccess,
} from '@/schema/verifiability'
import { markdown, paragraph, sentence } from '@/types/content'
import type {
	L1BroadcastSupport,
	TransactionInclusionDetails,
	TransactionInclusionL2Detail,
} from '@/types/content/details/transaction-inclusion'
import { isNonEmptyArray } from '@/types/utils/non-empty'

import { pickWorstRating, unrated } from '../common'

export type { L1BroadcastSupport } from '@/types/content/details/transaction-inclusion'

function transactionSubmissionEvaluation(
	ctx: EvaluationContext,
	details: TransactionInclusionDetails,
): Evaluation {
	const { l1Broadcast: supportsL1Broadcast } = details
	const supportAnyL2Transactions = details.l2s
		.filter(({ forceInclusion }) => forceInclusion === 'ARBITRARY_TRANSACTIONS')
		.map(({ l2 }) => l2)
	const supportForceWithdrawal = details.l2s
		.filter(({ forceInclusion }) => forceInclusion === 'WITHDRAWALS_ONLY')
		.map(({ l2 }) => l2)
	const unsupportedL2s = details.l2s
		.filter(({ forceInclusion }) => forceInclusion === 'NONE')
		.map(({ l2 }) => l2)

	if (!isNonEmptyArray(supportAnyL2Transactions) && !isNonEmptyArray(supportForceWithdrawal)) {
		return ctx.build({
			outcome: {
				id: 'no_l2_transaction_inclusion_support',
				rating: Rating.FAIL,
				displayName: 'No L2 force-inclusion support',
				shortExplanation: sentence(
					'{{WALLET_NAME}} requires trusting intermediaries in order to withdraw funds from L2s.',
				),
			},
			details,
			howToImprove: paragraph(
				'{{WALLET_NAME}} should add support for creating force-withdrawal transactions for L2s and broadcasting them on L1.',
			),
		})
	}

	if (supportsL1Broadcast === 'NO') {
		return ctx.build({
			outcome: {
				id: 'l2_transaction_inclusion_supported_but_no_l1',
				rating: Rating.PARTIAL,
				displayName: 'Intermediaries required for L1 transactions',
				shortExplanation: sentence(
					'{{WALLET_NAME}} relies on intermediaries when performing L1 transactions. This makes it possible for L1 transactions to be censored.',
				),
			},
			details,
			howToImprove: paragraph(
				"{{WALLET_NAME}} should add support for broadcasting L1 transaction over Ethereum's gossip layer if possible, or to allow users to use their own self-hosted Ethereum node to broadcast L1 transactions.",
			),
		})
	}

	const valueId = `l1${supportsL1Broadcast.toLowerCase()}_any${[...supportAnyL2Transactions].sort().join('-').toLocaleLowerCase()}_withdrawal${[...supportForceWithdrawal].sort().join('-').toLowerCase()}_no${[...unsupportedL2s].sort().join('-').toLowerCase()}`

	if (unsupportedL2s.length > 0) {
		return ctx.build({
			outcome: {
				id: valueId,
				rating: Rating.PARTIAL,
				displayName: 'No force-withdrawal for some L2s',
				shortExplanation: sentence(
					'{{WALLET_NAME}} does not implement L2 force-withdrawal transactions for all types of L2s.',
				),
			},
			details,
			howToImprove: paragraph(
				'{{WALLET_NAME}} should add support for force-withdrawal transactions on all L2 types it supports.',
			),
		})
	}

	return ctx.build({
		outcome: {
			id: valueId,
			rating: Rating.PASS,
			displayName: 'Can force-withdraw from L2s',
			shortExplanation: sentence(
				'{{WALLET_NAME}} supports L2 force-withdrawal transactions for all L2 types.',
			),
		},
		details,
	})
}

export const transactionInclusion: Attribute = {
	id: 'transactionInclusion',
	icon: 'transaction_inclusion',
	displayName: 'Transaction inclusion',
	wording: {
		midSentenceName: 'transaction inclusion',
	},
	question: sentence(
		'Can the wallet withdraw L2 funds to Ethereum L1 without relying on intermediaries?',
	),
	why: markdown(`
		One of the core tenets of Ethereum is **censorship resistance**.
		This means that users must be able to reliably get transactions
		included onchain, without the ability for intermediaries to prevent
		this from happening.

		This property is critical to ensure that all Ethereum participants are
		provided equal-opportunity, unfettered access to Ethereum, and to ensure
		that Ethereum is resilient to attackers that would want to prevent others
		from using Ethereum on such footing.

		In order to uphold this property on Ethereum L2s, users must be able to
		force transactions to be included on L2 chains as well. Most L2s
		implement such functionality by allowing L2 transactions to be
		submitted on the L1, and enforcing that their sequencing logic must
		respect such L1 force-inclusion requests by including them on the L2
		chain, typically within some fixed duration.

		By verifying that the wallet supports L2 force-withdrawal transactions,
		this attribute verifies censorship resistance at both levels: L1 and L2.
	`),
	methodology: markdown(`
		Wallets are rated based on whether users need to trust any intermediary
		in order to withdraw their funds from L2s.

		This fundamentally requires two major features:

		* A wallet must support the creation of an L1 transaction which forces the
			L2 to withdraw user funds back to the L1. This message is typically
			posted as an L1 transaction which forces the L2 sequencing process to
			take it into account.
		* Since L2 force-withdrawal transactions require an L1 transaction, the
			wallet must also be able to get this transaction included without
			relying on an external service to broadcast this transaction for block
			inclusion. Therefore, the wallet must also support either participating
			in Ethereum's L1 gossip network, or (for environments that do not
			support this such as browser extension wallets) support broadcasting
			L1 transactions through a user's self-hosted Ethereum node.

		With these two features in place, users can withdraw their L2 funds
		without trusting intermediaries.

		Walletbeat currently only considers OP Stack chains and Arbitrum One for
		this evaluation, but more L2 chains may be added as support for
		force-withdrawal transaction becomes feasible for them.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: [
			exampleRating(
				paragraph(
					"The wallet supports force-withdrawal transactions on L2s, and can be configured to broadcast this transaction using a user's self-hosted L1 node.",
				),
				transactionSubmissionEvaluation(
					EvaluationContext.forTest(() => transactionInclusion),
					{
						type: 'transactionInclusion',
						l1Broadcast: 'OWN_NODE',
						l2s: [
							{ l2: TransactionSubmissionL2Type.opStack, forceInclusion: 'WITHDRAWALS_ONLY' },
						],
					},
				),
			),
			exampleRating(
				paragraph(
					'The wallet supports force-withdrawal transactions on L2s, and supports directly gossiping such transactions over the Ethereum L1 network.',
				),
				transactionSubmissionEvaluation(
					EvaluationContext.forTest(() => transactionInclusion),
					{
						type: 'transactionInclusion',
						l1Broadcast: 'SELF_GOSSIP',
						l2s: [
							{ l2: TransactionSubmissionL2Type.opStack, forceInclusion: 'WITHDRAWALS_ONLY' },
						],
					},
				),
			),
		],
		partial: [
			exampleRating(
				paragraph(
					'The wallet supports force-withdrawal transactions on L2s, but requires the use of an external RPC provider to submit the L1 transaction that it would take to initiate this force-withdrawal transaction.',
				),
				transactionSubmissionEvaluation(
					EvaluationContext.forTest(() => transactionInclusion),
					{
						type: 'transactionInclusion',
						l1Broadcast: 'NO',
						l2s: [
							{ l2: TransactionSubmissionL2Type.opStack, forceInclusion: 'WITHDRAWALS_ONLY' },
						],
					},
				),
			),
			exampleRating(
				paragraph(
					'The wallet supports force-withdrawal transactions on some L2s, but not on all the L2s that are configured out of the box.',
				),
				transactionSubmissionEvaluation(
					EvaluationContext.forTest(() => transactionInclusion),
					{
						type: 'transactionInclusion',
						l1Broadcast: 'NO',
						l2s: [
							{ l2: TransactionSubmissionL2Type.opStack, forceInclusion: 'WITHDRAWALS_ONLY' },
							{ l2: TransactionSubmissionL2Type.arbitrum, forceInclusion: 'NONE' },
						],
					},
				),
			),
		],
		fail: exampleRating(
			paragraph('The wallet does not support force-withdrawal transactions on L2s.'),
			transactionSubmissionEvaluation(
				EvaluationContext.forTest(() => transactionInclusion),
				{
						type: 'transactionInclusion',
						l1Broadcast: 'NO',
						l2s: [],
					},
			),
		),
	},
	evaluate: ctx => {
		if (ctx.features.selfSovereignty.transactionSubmission === null) {
			return unrated(ctx)
		}

		if (
			ctx.features.selfSovereignty.transactionSubmission.l1.selfBroadcastViaDirectGossip === null ||
			ctx.features.selfSovereignty.transactionSubmission.l1.selfBroadcastViaSelfHostedNode === null
		) {
			return unrated(ctx)
		}

		ctx.setVerifiability(
			verifiabilityRequiresAnyOf(
				verifiabilityRequiresCustomChainRpc({
					mustBeAbleToConfigureL1: true,
					mustBeAbleToConfigureSpecificL2s: true,
				}),
				verifiabilityRequiresSourceCodeAccess({
					coreOnlyIsSufficient: true,
				}),
			),
		)

		const supportsL1Broadcast: L1BroadcastSupport = isSupported(
			ctx.features.selfSovereignty.transactionSubmission.l1.selfBroadcastViaDirectGossip,
		)
			? 'SELF_GOSSIP'
			: isSupported(
						ctx.features.selfSovereignty.transactionSubmission.l1.selfBroadcastViaSelfHostedNode,
				  )
				? 'OWN_NODE'
				: 'NO'
		const l2s: TransactionInclusionL2Detail[] = []

		for (const l2Type of transactionSubmissionL2Types) {
			if (!Object.hasOwn(ctx.features.selfSovereignty.transactionSubmission.l2, l2Type)) {
				continue
			}

			const l2 = l2Type
			const support = ctx.features.selfSovereignty.transactionSubmission.l2[l2]

			if (support === null) {
				return unrated(ctx)
			}

			if (support === TransactionSubmissionL2Support.NOT_SUPPORTED_BY_WALLET_BY_DEFAULT) {
				continue
			}

			// Each configured L2 is listed exactly once, keeping the distinction
			// between force-including arbitrary transactions and withdrawals only.
			switch (support) {
				case TransactionSubmissionL2Support.SUPPORTED_WITH_FORCE_INCLUSION_OF_ARBITRARY_TRANSACTIONS:
					l2s.push({ l2, forceInclusion: 'ARBITRARY_TRANSACTIONS' })
					break
				case TransactionSubmissionL2Support.SUPPORTED_WITH_FORCE_INCLUSION_OF_WITHDRAWALS:
					l2s.push({ l2, forceInclusion: 'WITHDRAWALS_ONLY' })
					break
				case TransactionSubmissionL2Support.SUPPORTED_BUT_NO_FORCE_INCLUSION:
					l2s.push({ l2, forceInclusion: 'NONE' })
			}
		}

		const { l1, l2 } = ctx.features.selfSovereignty.transactionSubmission

		ctx.addRef(l1, l2)

		return transactionSubmissionEvaluation(ctx, {
			type: 'transactionInclusion',
			l1Broadcast: supportsL1Broadcast,
			l2s,
			...(!isNoRef(l1.ref) && { l1References: l1.ref }),
			...(!isNoRef(l2.ref) && { l2References: l2.ref }),
		})
	},
	aggregate: pickWorstRating,
}

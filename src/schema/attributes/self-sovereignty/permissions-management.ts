import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	Verifiability,
} from '@/schema/attributes'
import {
	type PermissionsManagementSupport,
	SpendingApprovalsControl,
} from '@/schema/features/self-sovereignty/permissions-management'
import { isSupported, notSupported, type Support, supported } from '@/schema/features/support'
import { refTodo } from '@/schema/reference'
import { markdown, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

function describeStandard(control: SpendingApprovalsControl): string {
	switch (control) {
		case SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE:
			return 'can be inspected and revoked'
		case SpendingApprovalsControl.CAN_INSPECT_BUT_NOT_REVOKE:
			return 'can be inspected but not revoked'
		case SpendingApprovalsControl.CANNOT_INSPECT:
			return 'cannot be inspected or revoked'
	}
}

function worstControl(...controls: SpendingApprovalsControl[]): SpendingApprovalsControl {
	if (controls.includes(SpendingApprovalsControl.CANNOT_INSPECT)) {
		return SpendingApprovalsControl.CANNOT_INSPECT
	}

	if (controls.includes(SpendingApprovalsControl.CAN_INSPECT_BUT_NOT_REVOKE)) {
		return SpendingApprovalsControl.CAN_INSPECT_BUT_NOT_REVOKE
	}

	return SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE
}

function evaluate(
	ctx: EvaluationContext,
	control: Support<PermissionsManagementSupport>,
): Evaluation {
	if (!isSupported(control)) {
		return ctx.build({
			outcome: {
				id: 'not_supported',
				rating: Rating.FAIL,
				displayName: 'No approval management',
				shortExplanation: sentence('{{WALLET_NAME}} does not support token approval management.'),
			},
			details: paragraph(
				'{{WALLET_NAME}} does not provide any functionality for managing token approvals.',
			),
			impact: paragraph(
				'Without the ability to inspect and revoke approvals, users are exposed to risks from unlimited or unnecessary token approvals granted to other addresses.',
			),
			howToImprove: paragraph(
				'{{WALLET_NAME}} should add the ability to view and revoke token approvals.',
			),
		})
	}

	if (overallRating === Rating.PASS) {
		const approvalsText =
			perStandardBreakdown ??
			'{{WALLET_NAME}} allows you to view all existing token approvals granted to other addresses and revoke them directly from the wallet.'

		if (walletHasBuiltInSwap) {
			return ctx.build({
				outcome: {
					id: 'can_inspect_and_revoke_exact_amount_swaps',
					rating: Rating.PASS,
					displayName: 'Can inspect and revoke approvals; exact-amount swaps',
					shortExplanation: sentence(
						'{{WALLET_NAME}} lets you inspect and revoke token approvals, and its built-in swaps only request the amount needed.',
					),
				},
				details: markdown(`
					${approvalsText}

					Its built-in swap/bridge feature also ${swapBehaviorDescription(builtInSwapApprovals)}.
				`),
			})
		}

		return ctx.build({
			outcome: {
				id: 'can_inspect_and_revoke',
				rating: Rating.PASS,
				displayName: 'Can inspect and revoke approvals',
				shortExplanation: sentence('{{WALLET_NAME}} lets you inspect and revoke token approvals.'),
			},
			details:
				perStandardDetails ??
				paragraph(
					'{{WALLET_NAME}} allows you to view all existing token approvals granted to other addresses and revoke them directly from the wallet.',
				),
		})
	}

	if (overallRating === Rating.PARTIAL) {
		const isSwapDriven = approvalsRating === Rating.PASS && swapRating === Rating.PARTIAL

		return ctx.build({
			outcome: {
				id: isSwapDriven ? 'editable_unlimited_swap_approval' : 'can_inspect_not_revoke',
				rating: Rating.PARTIAL,
				displayName: isSwapDriven
					? 'Defaults to unlimited but editable swap approvals'
					: 'Can inspect but not revoke approvals',
				shortExplanation: isSwapDriven
					? sentence(
							"{{WALLET_NAME}}'s built-in swaps default to an unlimited approval, but let you edit the amount.",
						)
					: sentence('{{WALLET_NAME}} lets you inspect token approvals but not revoke them.'),
			},
			details:
				isSwapDriven && walletHasBuiltInSwap
					? paragraph(
							`{{WALLET_NAME}}'s built-in swap/bridge feature ${swapBehaviorDescription(builtInSwapApprovals)}.`,
						)
					: (perStandardDetails ??
						paragraph(
							'{{WALLET_NAME}} shows existing token approvals granted to other addresses but does not provide a way to revoke them from within the wallet.',
						)),
			howToImprove: isSwapDriven
				? requestExactAmountByDefaultAdvice
				: paragraph('{{WALLET_NAME}} should add the ability to revoke token approvals directly.'),
		})
	}

	return ctx.build({
		outcome: {
			id: 'cannot_inspect_or_revoke',
			rating: Rating.FAIL,
			displayName: 'No approval management',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not let you inspect or revoke token approvals.',
			),
		},
		details:
			perStandardDetails ??
			paragraph(
				'{{WALLET_NAME}} provides no way to inspect or revoke token approvals granted to other addresses.',
			),
		impact: paragraph(
			'Without the ability to inspect and revoke approvals, users are exposed to risks from unlimited or unnecessary token approvals granted to other addresses.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should add the ability to view and revoke token approvals.',
		),
	})
}

export const permissionsManagement: Attribute = {
	id: 'permissionsManagement',
	icon: 'permissions_management',
	displayName: 'Permissions management',
	wording: {
		midSentenceName: 'permissions management',
	},
	question: sentence(
		"Does {{WALLET_NAME}} let you inspect and manage the permissions you've granted to other contracts and apps?",
	),
	why: markdown(`
		Token approvals grant other addresses, such as contracts or accounts,
		permission to spend tokens on your behalf.
		Malicious or compromised contracts with existing approvals can drain your wallet,
		and approvals to other accounts carry the same risk.
		[Over $362M has been stolen since 2020](https://revoke.cash/exploits) through such
		approval hacks and exploits, where attackers use an existing approval to drain
		the funds a user approved without directly compromising their wallet.

		Being able to inspect and revoke approvals is an important tool for protecting
		your assets from unnecessary or dangerous delegated spending authority.

		A wallet's own built-in swap/bridge feature should also request proper
		token approvals by default, limited to the amount actually needed, rather
		than exposing users to the same risk through their own wallet's UI.
	`),
	methodology: markdown(`
		Wallets are rated based on whether they allow users to inspect existing
		token approvals and revoke them directly from within the wallet interface.
		ERC-20, ERC-721, and ERC-1155 approvals are each evaluated; the worst
		result across all token standards determines the overall rating.

		Wallets that offer a built-in swap or bridge feature are also evaluated on
		whether that feature requests an exact-amount approval by default. Only an
		exact-amount default passes. A default of unlimited fails this attribute
		regardless of whether it is disclosed to the user, and regardless of how
		well the wallet otherwise supports inspecting and revoking approvals; a
		default of unlimited that the user can edit down before signing is rated
		partial.

		As Account Abstraction becomes more prevalent, this methodology
		will also grow to encompass the management of more complex account permissions.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph('The wallet lets the user inspect and revoke token approvals.'),
			evaluate(
				EvaluationContext.forTest(() => permissionsManagement),
				supported({
					ref: refTodo,
					erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
					erc721Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
					erc1155Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
				}),
			),
		),
		partial: exampleRating(
			paragraph('The wallet lets the user inspect token approvals but not revoke them.'),
			evaluate(
				EvaluationContext.forTest(() => permissionsManagement),
				supported({
					ref: refTodo,
					erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_BUT_NOT_REVOKE,
					erc721Approvals: SpendingApprovalsControl.CAN_INSPECT_BUT_NOT_REVOKE,
					erc1155Approvals: SpendingApprovalsControl.CAN_INSPECT_BUT_NOT_REVOKE,
				}),
			),
		),
		fail: exampleRating(
			paragraph('The wallet provides no way to inspect or revoke token approvals.'),
			evaluate(
				EvaluationContext.forTest(() => permissionsManagement),
				notSupported,
			),
		),
	},
	evaluate: (ctx: EvaluationContext) => {
		ctx.setVerifiability(Verifiability.VERIFIABLE)

		const feature = ctx.features.selfSovereignty.permissionsManagement

		if (feature === null) {
			return unrated(ctx)
		}

		ctx.addRef(feature)

		return evaluate(ctx, feature)
	},
	aggregate: pickWorstRating,
}

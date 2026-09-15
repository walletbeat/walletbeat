import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	type ExplicitRating,
	Rating,
	Verifiability,
} from '@/schema/attributes'
import {
	BuiltInSwapDefaultApprovalBehavior,
	hasBuiltInSwap,
	type PermissionsManagementSupport,
	SpendingApprovalsControl,
	swapBehaviorDescription,
} from '@/schema/features/self-sovereignty/permissions-management'
import { isSupported, supported } from '@/schema/features/support'
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

function approvalsManagementRating(control: SpendingApprovalsControl): ExplicitRating {
	switch (control) {
		case SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE:
			return Rating.PASS
		case SpendingApprovalsControl.CAN_INSPECT_BUT_NOT_REVOKE:
			return Rating.PARTIAL
		case SpendingApprovalsControl.CANNOT_INSPECT:
			return Rating.FAIL
	}
}

/**
 * Evaluates the wallet's built-in swap/bridge approval defaults on their own.
 * Returns `NO_SWAP_APPROVAL_ISSUE` when there is nothing to complain about;
 * any unlimited default fails, whether disclosed or not.
 */
function swapApprovalsEvaluation(
	ctx: EvaluationContext,
	builtInSwapApprovals: BuiltInSwapDefaultApprovalBehavior | 'NO_BUILT_IN_SWAP',
): Evaluation | 'NO_SWAP_APPROVAL_ISSUE' {
	if (
		!hasBuiltInSwap(builtInSwapApprovals) ||
		builtInSwapApprovals === BuiltInSwapDefaultApprovalBehavior.MINIMAL_AMOUNT
	) {
		return 'NO_SWAP_APPROVAL_ISSUE'
	}

	const undisclosed =
		builtInSwapApprovals === BuiltInSwapDefaultApprovalBehavior.UNLIMITED_AND_UNDISCLOSED

	if (undisclosed) {
		return ctx.build({
			outcome: {
				id: 'undisclosed_unlimited_swap_approval',
				rating: Rating.FAIL,
				displayName: 'Silently requests unlimited swap approvals',
				shortExplanation: sentence(
					"{{WALLET_NAME}}'s built-in swaps can silently request unlimited token approvals.",
				),
			},
			details: paragraph(
				`{{WALLET_NAME}}'s built-in swap/bridge feature ${swapBehaviorDescription(builtInSwapApprovals)}.`,
			),
			impact: paragraph(
				'Users may unknowingly grant unlimited spending authority over a token to a contract, exposing them to the same risk as an approval-based drain, without ever having agreed to it explicitly.',
			),
			howToImprove: paragraph(
				'{{WALLET_NAME}} should default to requesting only the amount needed for the swap (plus a reasonable slippage buffer), rather than an unlimited approval.',
			),
		})
	}

	return ctx.build({
		outcome: {
			id: 'disclosed_unlimited_swap_approval',
			rating: Rating.FAIL,
			displayName: 'Requests unlimited swap approvals',
			shortExplanation: sentence(
				"{{WALLET_NAME}}'s built-in swaps default to an unlimited token approval.",
			),
		},
		details: paragraph(
			`{{WALLET_NAME}}'s built-in swap/bridge feature ${swapBehaviorDescription(builtInSwapApprovals)}.`,
		),
		impact: paragraph(
			'Users who do not notice or adjust the default before signing grant unlimited spending authority over a token to a contract, exposing them to the same risk as an approval-based drain.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should default to requesting only the amount needed for the swap (plus a reasonable slippage buffer), rather than an unlimited approval.',
		),
	})
}

/**
 * Evaluates the wallet's approvals inspection/revocation support on its own.
 * `passingSwapDetails`, when non-null, is appended to the PASS case's details
 * to mention that the wallet's built-in swap also behaves well, without that
 * fact changing the rating computed here.
 */
function approvalsManagementEvaluation(
	ctx: EvaluationContext,
	approvalsManagement: PermissionsManagementSupport['approvalsManagement'],
	passingSwapDetails: string | null,
): Evaluation {
	if (!isSupported(approvalsManagement)) {
		return ctx.build({
			outcome: {
				id: 'cannot_inspect_or_revoke',
				rating: Rating.FAIL,
				displayName: 'No approval management',
				shortExplanation: sentence(
					'{{WALLET_NAME}} does not let you inspect or revoke token approvals.',
				),
			},
			details: paragraph(
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

	const { erc20Approvals, erc721Approvals, erc1155Approvals } = approvalsManagement
	const rating = approvalsManagementRating(
		worstControl(erc20Approvals, erc721Approvals, erc1155Approvals),
	)
	const allSame = erc20Approvals === erc721Approvals && erc721Approvals === erc1155Approvals
	const perStandardBreakdown = allSame
		? null
		: `
			Per token standard:
			- ERC-20 approvals: ${describeStandard(erc20Approvals)}
			- ERC-721 approvals: ${describeStandard(erc721Approvals)}
			- ERC-1155 approvals: ${describeStandard(erc1155Approvals)}
		`
	const perStandardDetails = perStandardBreakdown === null ? null : markdown(perStandardBreakdown)

	switch (rating) {
		case Rating.PASS: {
			const approvalsText =
				perStandardBreakdown ??
				'{{WALLET_NAME}} allows you to view all existing token approvals granted to other addresses and revoke them directly from the wallet.'

			return ctx.build({
				outcome: {
					id:
						passingSwapDetails === null
							? 'can_inspect_and_revoke'
							: 'can_inspect_and_revoke_minimal_amount_swaps',
					rating: Rating.PASS,
					displayName:
						passingSwapDetails === null
							? 'Can inspect and revoke approvals'
							: 'Can inspect and revoke approvals; minimal-amount swaps',
					shortExplanation:
						passingSwapDetails === null
							? sentence('{{WALLET_NAME}} lets you inspect and revoke token approvals.')
							: sentence(
									'{{WALLET_NAME}} lets you inspect and revoke token approvals, and its built-in swaps only request the amount needed.',
								),
				},
				details:
					passingSwapDetails === null
						? (perStandardDetails ?? paragraph(approvalsText))
						: markdown(`
							${approvalsText}

							${passingSwapDetails}
						`),
			})
		}

		case Rating.PARTIAL:
			return ctx.build({
				outcome: {
					id: 'can_inspect_not_revoke',
					rating: Rating.PARTIAL,
					displayName: 'Can inspect but not revoke approvals',
					shortExplanation: sentence(
						'{{WALLET_NAME}} lets you inspect token approvals but not revoke them.',
					),
				},
				details:
					perStandardDetails ??
					paragraph(
						'{{WALLET_NAME}} shows existing token approvals granted to other addresses but does not provide a way to revoke them from within the wallet.',
					),
				howToImprove: paragraph(
					'{{WALLET_NAME}} should add the ability to revoke token approvals directly.',
				),
			})

		case Rating.FAIL:
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
}

function evaluate(ctx: EvaluationContext, control: PermissionsManagementSupport): Evaluation {
	const { approvalsManagement, builtInSwapApprovals } = control

	const swapEvaluation = swapApprovalsEvaluation(ctx, builtInSwapApprovals)
	const passingSwapDetails =
		swapEvaluation === null && hasBuiltInSwap(builtInSwapApprovals)
			? `Its built-in swap/bridge feature also ${swapBehaviorDescription(builtInSwapApprovals)}.`
			: null
	const approvalsEvaluation = approvalsManagementEvaluation(
		ctx,
		approvalsManagement,
		passingSwapDetails,
	)

	if (swapEvaluation === null) {
		return approvalsEvaluation
	}

	return pickWorstRating([swapEvaluation, approvalsEvaluation])
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
		whether that feature requests only the approval needed for the swap by
		default. A default that is limited to roughly the amount needed, to account
		for reasonable buffer for price slippage, passes. A default of
		unlimited fails this attribute, regardless of disclosure or whether the
		user can edit the amount down before signing, even if the wallet
		otherwise supports inspecting and revoking approvals well.

		As Account Abstraction becomes more prevalent, this methodology
		will also grow to encompass the management of more complex account permissions.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph(
				'The wallet lets the user inspect and revoke token approvals, and its built-in swaps (if any) only request the amount needed.',
			),
			evaluate(
				EvaluationContext.forTest(() => permissionsManagement),
				{
					ref: refTodo,
					approvalsManagement: supported({
						erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
						erc721Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
						erc1155Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
					}),
					builtInSwapApprovals: BuiltInSwapDefaultApprovalBehavior.MINIMAL_AMOUNT,
				},
			),
		),
		partial: exampleRating(
			paragraph('The wallet lets the user inspect token approvals but not revoke them.'),
			evaluate(
				EvaluationContext.forTest(() => permissionsManagement),
				{
					ref: refTodo,
					approvalsManagement: supported({
						erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_BUT_NOT_REVOKE,
						erc721Approvals: SpendingApprovalsControl.CAN_INSPECT_BUT_NOT_REVOKE,
						erc1155Approvals: SpendingApprovalsControl.CAN_INSPECT_BUT_NOT_REVOKE,
					}),
					builtInSwapApprovals: 'NO_BUILT_IN_SWAP',
				},
			),
		),
		fail: exampleRating(
			paragraph(
				"The wallet's built-in swap feature silently requests unlimited token approvals without disclosing this to the user.",
			),
			evaluate(
				EvaluationContext.forTest(() => permissionsManagement),
				{
					ref: refTodo,
					approvalsManagement: supported({
						erc20Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
						erc721Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
						erc1155Approvals: SpendingApprovalsControl.CAN_INSPECT_AND_REVOKE,
					}),
					builtInSwapApprovals: BuiltInSwapDefaultApprovalBehavior.UNLIMITED_AND_UNDISCLOSED,
				},
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

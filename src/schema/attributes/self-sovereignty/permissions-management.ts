import {
	type Attribute,
	compareExplicitRatings,
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

/** Only an exact-amount-by-default approval passes; any unlimited default fails, whether disclosed or not. */
function ratingForSwapApprovals(behavior: BuiltInSwapDefaultApprovalBehavior): ExplicitRating {
	switch (behavior) {
		case BuiltInSwapDefaultApprovalBehavior.EXACT_AMOUNT:
			return Rating.PASS
		case BuiltInSwapDefaultApprovalBehavior.UNLIMITED_BUT_EDITABLE:
			return Rating.PARTIAL
		case BuiltInSwapDefaultApprovalBehavior.UNLIMITED_BUT_DISCLOSED:
		case BuiltInSwapDefaultApprovalBehavior.UNLIMITED_AND_UNDISCLOSED:
			return Rating.FAIL
	}
}

function evaluate(ctx: EvaluationContext, control: PermissionsManagementSupport): Evaluation {
	const { approvalsManagement, builtInSwapApprovals } = control

	const walletHasBuiltInSwap = hasBuiltInSwap(builtInSwapApprovals)
	const approvalsSupported = isSupported(approvalsManagement)
	const approvalsRating: ExplicitRating = approvalsSupported
		? approvalsManagementRating(
				worstControl(
					approvalsManagement.erc20Approvals,
					approvalsManagement.erc721Approvals,
					approvalsManagement.erc1155Approvals,
				),
			)
		: Rating.FAIL
	const perStandardBreakdown = approvalsSupported
		? (() => {
				const { erc20Approvals, erc721Approvals, erc1155Approvals } = approvalsManagement
				const allSame = erc20Approvals === erc721Approvals && erc721Approvals === erc1155Approvals

				return allSame
					? null
					: `
						Per token standard:
						- ERC-20 approvals: ${describeStandard(erc20Approvals)}
						- ERC-721 approvals: ${describeStandard(erc721Approvals)}
						- ERC-1155 approvals: ${describeStandard(erc1155Approvals)}
					`
			})()
		: null
	const perStandardDetails = perStandardBreakdown === null ? null : markdown(perStandardBreakdown)

	const swapRating = walletHasBuiltInSwap
		? ratingForSwapApprovals(builtInSwapApprovals)
		: 'NO_BUILT_IN_SWAP'
	const overallRating =
		swapRating === 'NO_BUILT_IN_SWAP'
			? approvalsRating
			: compareExplicitRatings(approvalsRating, swapRating) <= 0
				? approvalsRating
				: swapRating
	const requestExactAmountByDefaultAdvice = paragraph(
		'{{WALLET_NAME}} should request only the amount needed for the swap by default, rather than an unlimited approval.',
	)

	if (walletHasBuiltInSwap && swapRating === Rating.FAIL) {
		const undisclosed =
			builtInSwapApprovals === BuiltInSwapDefaultApprovalBehavior.UNLIMITED_AND_UNDISCLOSED

		return ctx.build({
			outcome: {
				id: undisclosed
					? 'undisclosed_unlimited_swap_approval'
					: 'disclosed_unlimited_swap_approval',
				rating: Rating.FAIL,
				displayName: undisclosed
					? 'Silently requests unlimited swap approvals'
					: 'Requests unlimited swap approvals',
				shortExplanation: undisclosed
					? sentence(
							"{{WALLET_NAME}}'s built-in swaps can silently request unlimited token approvals.",
						)
					: sentence("{{WALLET_NAME}}'s built-in swaps default to an unlimited token approval."),
			},
			details: paragraph(
				`{{WALLET_NAME}}'s built-in swap/bridge feature ${swapBehaviorDescription(builtInSwapApprovals)}.`,
			),
			impact: paragraph(
				'Users may unknowingly grant unlimited spending authority over a token to a contract, exposing them to the same risk as an approval-based drain, without ever having agreed to it explicitly.',
			),
			howToImprove: requestExactAmountByDefaultAdvice,
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
			details: perStandardDetails ?? paragraph(approvalsText),
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
					builtInSwapApprovals: BuiltInSwapDefaultApprovalBehavior.EXACT_AMOUNT,
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

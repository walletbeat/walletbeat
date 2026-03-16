import {
	type Attribute,
	type Evaluation,
	EvaluationContext,
	exampleRating,
	Rating,
	type Value,
	Verifiability,
} from '@/schema/attributes'
import type { DelegatedSpendingControlSupport } from '@/schema/features/self-sovereignty/delegated-spending-control'
import { isSupported, notSupported, type Support, supported } from '@/schema/features/support'
import { refTodo } from '@/schema/reference'
import { markdown, paragraph, sentence } from '@/types/content'

import { pickWorstRating, unrated } from '../common'

export type DelegatedSpendingControlValue = Value

function evaluate(
	ctx: EvaluationContext<DelegatedSpendingControlValue>,
	control: Support<DelegatedSpendingControlSupport>,
): Evaluation<DelegatedSpendingControlValue> {
	if (!isSupported<DelegatedSpendingControlSupport>(control)) {
		return ctx.build({
			value: {
				id: 'not_supported',
				rating: Rating.FAIL,
				displayName: 'No approval management',
				shortExplanation: sentence(
					'{{WALLET_NAME}} does not support ERC-20 token approval management.',
				),
			},
			details: paragraph(
				'{{WALLET_NAME}} does not provide any functionality for managing ERC-20 token approvals.',
			),
			impact: paragraph(
				'Without the ability to inspect and revoke approvals, users are exposed to risks from unlimited or unnecessary token approvals granted to other addresses.',
			),
			howToImprove: paragraph(
				'{{WALLET_NAME}} should add the ability to view and revoke ERC-20 token approvals.',
			),
		})
	}

	const { canInspectTokenApprovals, canRevokeTokenApprovals } = control.erc20Approvals

	if (canInspectTokenApprovals && canRevokeTokenApprovals) {
		return ctx.build({
			value: {
				id: 'can_inspect_and_revoke',
				rating: Rating.PASS,
				displayName: 'Can inspect and revoke approvals',
				shortExplanation: sentence(
					'{{WALLET_NAME}} lets you inspect and revoke ERC-20 token approvals.',
				),
			},
			details: paragraph(
				'{{WALLET_NAME}} allows you to view all existing ERC-20 token approvals granted to other addresses and revoke them directly from the wallet.',
			),
		})
	}

	if (canInspectTokenApprovals && !canRevokeTokenApprovals) {
		return ctx.build({
			value: {
				id: 'can_inspect_not_revoke',
				rating: Rating.PARTIAL,
				displayName: 'Can inspect but not revoke approvals',
				shortExplanation: sentence(
					'{{WALLET_NAME}} lets you inspect ERC-20 token approvals but not revoke them.',
				),
			},
			details: paragraph(
				'{{WALLET_NAME}} shows existing ERC-20 token approvals granted to other addresses but does not provide a way to revoke them from within the wallet.',
			),
			howToImprove: paragraph(
				'{{WALLET_NAME}} should add the ability to revoke ERC-20 token approvals directly.',
			),
		})
	}

	return ctx.build({
		value: {
			id: 'cannot_inspect_or_revoke',
			rating: Rating.FAIL,
			displayName: 'No approval management',
			shortExplanation: sentence(
				'{{WALLET_NAME}} does not let you inspect or revoke ERC-20 token approvals.',
			),
		},
		details: paragraph(
			'{{WALLET_NAME}} provides no way to inspect or revoke ERC-20 token approvals granted to other addresses.',
		),
		impact: paragraph(
			'Without the ability to inspect and revoke approvals, users are exposed to risks from unlimited or unnecessary token approvals granted to other addresses.',
		),
		howToImprove: paragraph(
			'{{WALLET_NAME}} should add the ability to view and revoke ERC-20 token approvals.',
		),
	})
}

export const delegatedSpendingControl: Attribute<DelegatedSpendingControlValue> = {
	id: 'delegatedSpendingControl',
	icon: '\u{1f511}', // Key
	displayName: 'Spending control',
	wording: {
		midSentenceName: 'delegated spending control',
	},
	question: sentence(
		'Can you inspect and revoke ERC-20 token approvals granted to other addresses, directly from within {{WALLET_NAME}}?',
	),
	why: markdown(`
		ERC-20 token approvals grant other addresses, such as contracts or accounts,
		permission to spend tokens on your behalf.
		Malicious or compromised contracts with existing approvals can drain your wallet,
		and approvals to other accounts carry the same risk.

		Being able to inspect and revoke approvals is an important tool for protecting
		your assets from unnecessary or dangerous delegated spending authority.
	`),
	methodology: markdown(`
		Wallets are rated based on whether they allow users to inspect existing ERC-20
		token approvals and revoke them directly from within the wallet interface.

		* **Pass**: The wallet lets users both inspect and revoke ERC-20 approvals.
		* **Partial**: The wallet lets users inspect approvals but not revoke them.
		* **Fail**: The wallet provides no approval inspection or revocation functionality.
	`),
	ratingScale: {
		display: 'pass-fail',
		exhaustive: true,
		pass: exampleRating(
			paragraph('The wallet lets the user inspect and revoke ERC-20 token approvals.'),
			evaluate(
				EvaluationContext.forTest(() => delegatedSpendingControl),
				supported({
					ref: refTodo,
					erc20Approvals: { canInspectTokenApprovals: true, canRevokeTokenApprovals: true },
				}),
			),
		),
		partial: exampleRating(
			paragraph('The wallet lets the user inspect ERC-20 token approvals but not revoke them.'),
			evaluate(
				EvaluationContext.forTest(() => delegatedSpendingControl),
				supported({
					ref: refTodo,
					erc20Approvals: { canInspectTokenApprovals: true, canRevokeTokenApprovals: false },
				}),
			),
		),
		fail: exampleRating(
			paragraph('The wallet provides no way to inspect or revoke ERC-20 token approvals.'),
			evaluate(
				EvaluationContext.forTest(() => delegatedSpendingControl),
				notSupported,
			),
		),
	},
	evaluate: (ctx: EvaluationContext<DelegatedSpendingControlValue>) => {
		ctx.setVerifiability(Verifiability.VERIFIABLE)

		const feature = ctx.features.selfSovereignty.delegatedSpendingControl

		if (feature === null) {
			return unrated(ctx, null)
		}

		ctx.addRef(feature)

		return evaluate(ctx, feature)
	},
	aggregate: pickWorstRating<DelegatedSpendingControlValue>,
}

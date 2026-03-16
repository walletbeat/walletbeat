import type { WithRef } from '@/schema/reference'

export interface Erc20ApprovalsControl {
	/**
	 * Can the user inspect existing token approvals through the wallet?
	 */
	canInspectTokenApprovals: boolean

	/**
	 * Can the user revoke an existing token approval through the wallet?
	 */
	canRevokeTokenApprovals: boolean
}

/**
 * How the wallet helps users inspect, constrain, and revoke delegated spending authority.
 *
 * In v1, only ERC-20 approvals may be rated. Additional mechanisms such as
 * smart-account spending limits and revocable pre-authorized payments can be
 * added over time.
 */
export interface DelegatedSpendingControl {
	/**
	 * ERC-20 token approvals granted to contracts.
	 */
	erc20Approvals: Erc20ApprovalsControl

	/**
	 * 	TODO: Add spending policies and pre authorized payment revocations post - launch
	 * 	spendingPolicies: Support | 'SMART_ACCOUNT_NOT_SUPPORTED'
	 *  preAuthorizedPaymentRevocation: Support
	 */
}

export type DelegatedSpendingControlSupport = WithRef<DelegatedSpendingControl>

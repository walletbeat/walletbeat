import type { WithRef } from '@/schema/reference'
import type { Support } from '@/schema/features/support'

/** The level of control a wallet provides over token approvals of a given standard. */
export enum SpendingApprovalsControl {
	/** The wallet does not show any existing approvals or allow revoking them. */
	CANNOT_INSPECT,
	/** The wallet shows existing approvals but does not allow revoking them. */
	CAN_INSPECT_BUT_NOT_REVOKE,
	/** The wallet shows existing approvals and allows revoking them directly. */
	CAN_INSPECT_AND_REVOKE,
}

/**
 * How the wallet lets users inspect and revoke existing token approvals,
 * broken down by token standard.
 */
export interface ApprovalsManagement {
	/**
	 * ERC-20 token approvals granted to other addresses.
	 */
	erc20Approvals: SpendingApprovalsControl

	/**
	 * ERC-721 token approvals granted to other addresses.
	 */
	erc721Approvals: SpendingApprovalsControl
	/**
	 * ERC-1155 token approvals granted to other addresses.
	 */
	erc1155Approvals: SpendingApprovalsControl
}

/**
 * How a wallet's own built-in swap/bridge feature requests token approvals
 * on the user's behalf by default.
 */
export enum BuiltInSwapDefaultApprovalBehavior {
	/**
	 * The wallet requests only the amount needed for the swap/bridge before signing.
	 */
	EXACT_AMOUNT,
	/**
	 * The wallet defaults to an unlimited approval, but the user can see and
	 * edit the amount before signing.
	 */
	UNLIMITED_BUT_EDITABLE,
	/**
	 * The wallet defaults to an unlimited approval and discloses this to the
	 * user before signing, but does not let them edit the amount.
	 */
	UNLIMITED_BUT_DISCLOSED,
	/**
	 * The wallet requests an unlimited approval by default without disclosing
	 * this to the user in the transaction confirmation UI.
	 */
	UNLIMITED_AND_UNDISCLOSED,
}

/**
 * How the wallet helps users inspect, constrain, and revoke delegated spending authority.
 */
export interface PermissionsManagement {
	/**
	 * Ability to inspect and revoke existing token approvals.
	 */
	approvalsManagement: Support<ApprovalsManagement>

	/**
	 * How the wallet's own built-in swap/bridge feature requests token
	 * approvals on the user's behalf by default.
	 */
	builtInSwapApprovals: BuiltInSwapDefaultApprovalBehavior
}

export type PermissionsManagementSupport = WithRef<PermissionsManagement>

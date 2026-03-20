import type { WithRef } from '@/schema/reference'

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
 * How the wallet helps users inspect, constrain, and revoke delegated spending authority.
 */
export interface PermissionsManagement {
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

export type PermissionsManagementSupport = WithRef<PermissionsManagement>

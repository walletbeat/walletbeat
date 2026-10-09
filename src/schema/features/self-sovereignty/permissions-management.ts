import type { Support } from '@/schema/features/support'
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
	 * The wallet requests only the minimum amount needed for the swap/bridge before signing.
	 */
	MINIMAL_AMOUNT,
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
	builtInSwapApprovals: BuiltInSwapDefaultApprovalBehavior | 'NO_BUILT_IN_SWAP'
}

export type PermissionsManagementSupport = WithRef<PermissionsManagement>

/** Which EIP-7702 delegations the user can remove from within the wallet. */
export enum DelegationRevocationScope {
	/** The wallet offers no way to remove the account's delegation. */
	CANNOT_REVOKE,
	/**
	 * The wallet can only remove a delegation to its own delegate contract.
	 */
	OWN_DELEGATE_CONTRACT_ONLY,
	/**
	 * The wallet can remove a delegation to any contract, including one set
	 * by another wallet or app.
	 */
	ANY_DELEGATE_CONTRACT,
}

/**
 * How the wallet lets users inspect and remove the EIP-7702 delegation of
 * their account, e.g. to take back control after delegating it to a
 * malicious contract. Removing a delegation means signing an EIP-7702
 * authorization that delegates the account to the zero address.
 *
 * To test:
 * - `showsCurrentDelegate`: From another wallet or a script, delegate the
 *   test account to a contract that is not the wallet's own delegate
 *   contract. Check whether the wallet shows the account as delegated and
 *   names or links that contract.
 * - `revocation`: Look in the account settings for a "Revoke delegation",
 *   "Switch back to a standard account" or similar option. Try it with the
 *   account delegated to the wallet's own delegate contract, then to a
 *   contract set by another wallet, and check on a block explorer that the
 *   account no longer has delegated code.
 */
export interface DelegationRevocation {
	/**
	 * Does the wallet show which contract the account is currently delegated
	 * to, including a contract set by another wallet or app?
	 */
	showsCurrentDelegate: boolean

	/** Which delegations can the user remove from within the wallet? */
	revocation: DelegationRevocationScope
}

/**
 * EIP-7702 delegation revocation support, or `EIP_7702_NOT_SUPPORTED` for
 * wallets that cannot sign EIP-7702 authorizations at all.
 */
export type DelegationRevocationSupport = 'EIP_7702_NOT_SUPPORTED' | WithRef<DelegationRevocation>

/** Whether the wallet has a built-in swap/bridge feature to rate approval behavior for. */
export function hasBuiltInSwap(
	builtInSwapApprovals: PermissionsManagement['builtInSwapApprovals'],
): builtInSwapApprovals is BuiltInSwapDefaultApprovalBehavior {
	return builtInSwapApprovals !== 'NO_BUILT_IN_SWAP'
}

export function swapBehaviorDescription(behavior: BuiltInSwapDefaultApprovalBehavior): string {
	switch (behavior) {
		case BuiltInSwapDefaultApprovalBehavior.MINIMAL_AMOUNT:
			return 'requests only the minimum amount needed for the swap'
		case BuiltInSwapDefaultApprovalBehavior.UNLIMITED_BUT_EDITABLE:
			return 'defaults to an unlimited approval, but lets the user edit the amount before signing'
		case BuiltInSwapDefaultApprovalBehavior.UNLIMITED_BUT_DISCLOSED:
			return 'defaults to an unlimited approval and discloses this before signing, but does not let the user edit the amount'
		case BuiltInSwapDefaultApprovalBehavior.UNLIMITED_AND_UNDISCLOSED:
			return 'requests an unlimited approval by default without disclosing this before signing'
	}
}

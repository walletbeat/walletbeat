import type { WithRef } from '@/schema/reference'
import type { NonEmptyArray } from '@/types/utils/non-empty'

import type { Support } from '../support'

/**
 * Fields shared by every scam-alert warning: does the lookup process leak
 * identifying information about the user to an external service?
 */
export interface ScamAlertLeaks {
	/**
	 * Whether the lookup process leaks the user's Ethereum address to an
	 * external service.
	 */
	leaksUserAddress: boolean

	/**
	 * Whether the lookup process leaks the user's IP address to an external
	 * service, as opposed to using an anonymizing proxy.
	 */
	leaksUserIp: boolean
}

export type ScamUrlWarning = WithRef<
	ScamAlertLeaks & {
		/**
		 * Whether the scam site lookup process leaks the visited URL to an
		 * external service, as opposed to something like a partial hash match
		 * like the Google Safe Browsing API for checking spam domains without
		 * leaking the domains being visited to Google.
		 */
		leaksVisitedUrl: 'FULL_URL' | 'DOMAIN_ONLY' | 'PARTIAL_HASH_OF_DOMAIN' | 'NO'
	}
>

export type ContractTransactionWarning = WithRef<
	ScamAlertLeaks & {
		/**
		 * Does the wallet warn the user when they are interacting with a contract
		 * they have not interacted with before?
		 */
		previousContractInteractionWarning: boolean

		/**
		 * Does the wallet warn the user when they are interacting with a contract
		 * that has only recently been deployed to the chain?
		 */
		recentContractWarning: boolean

		/**
		 * Does the wallet check a registry of known scam/non-scam contracts and
		 * use it to warn the user?
		 */
		contractRegistry: boolean

		/**
		 * Whether the contract lookup process leaks the contract address to an
		 * external service, as opposed to something like a partial match against
		 * a static list.
		 */
		leaksContractAddress: boolean
	}
>

export type SendTransactionWarning = WithRef<
	ScamAlertLeaks & {
		/**
		 * Does the wallet feature a user-editable whitelist, outside of which
		 * the wallet warns when sending to other addresses?
		 */
		userWhitelist: boolean

		/**
		 * Does the wallet warn the user when they are sending to an address they
		 * have not sent funds to before?
		 */
		newRecipientWarning: boolean

		/**
		 * Does the wallet warn the user when they are sending to an address that
		 * closely resembles, and may be a "poisoned" look-alike of, an address
		 * already in their transaction history or whitelist?
		 */
		addressPoisoningDetection: boolean

		/**
		 * Whether the lookup process leaks the recipient address to an external
		 * service.
		 */
		leaksRecipient: boolean
	}
>

/**
 * A specific scenario in which a wallet may choose to warn the user before
 * granting an unlimited/infinite ERC-20 token allowance, when it does not
 * warn unconditionally.
 */
export enum UnlimitedApprovalWarningCondition {
	/** The spender is an externally-owned account (EOA), not a contract. */
	EOA = 'EOA',

	/** The spender contract is not a known/verified contract. */
	UNKNOWN_CONTRACTS = 'UNKNOWN_CONTRACTS',

	/** The spender contract appears on a blocklist of known-scam contracts. */
	BLACKLISTED_CONTRACTS = 'BLACKLISTED_CONTRACTS',

	/** The spender contract was only recently deployed onchain. */
	NEW_CONTRACTS = 'NEW_CONTRACTS',

	/** The wallet has not seen the user interact with the spender contract before. */
	CONTRACTS_NOT_INTERACTED_BEFORE = 'CONTRACTS_NOT_INTERACTED_BEFORE',
}

export type UnlimitedApprovalWarning = WithRef<
	ScamAlertLeaks & {
		/**
		 * Under which circumstances the wallet warns the user before a
		 * transaction or signature that grants unlimited/infinite token
		 * allowance.
		 *
		 * - `ALWAYS`: The wallet warns regardless of whether the spender is
		 *   considered trusted/known.
		 * - A non-empty array of `UnlimitedApprovalWarningCondition`: The
		 *   wallet only warns in the listed scenarios, e.g. only when the
		 *   spender is an untrusted/unknown contract.
		 */
		warnsOnUnlimitedApproval: 'ALWAYS' | NonEmptyArray<UnlimitedApprovalWarningCondition>

		/**
		 * Whether the spender/contract lookup process leaks the spender address
		 * to an external service.
		 */
		leaksSpenderAddress: boolean
	}
>

/**
 * Whether the wallet supports scam alerts.
 */
export interface ScamAlerts {
	/** Does the wallet warn the user when visiting a known-scam site? */
	scamUrlWarning: Support<ScamUrlWarning>

	/** Does the wallet warn the user before executing a contract transaction? */
	contractTransactionWarning: Support<ContractTransactionWarning>

	/** Does the wallet warn the user before executing a send transaction? */
	sendTransactionWarning: Support<SendTransactionWarning>

	/**
	 * Does the wallet warn the user before a transaction or signature
	 * that grants unlimited/infinite ERC-20 token allowance?
	 */
	unlimitedApprovalWarning: Support<UnlimitedApprovalWarning>
}

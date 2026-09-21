import type { WithRef } from '@/schema/reference'

import { featureSupported, type Support } from '../support'

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
 * Benchmark spenders for unlimited ERC-20 token approvals.
 *
 * Each entry is a concrete, pinned on-chain address.
 * Instead of describing a category of spender, we grant unlimited
 * approval to this specific address and evaluate whether the wallet warns.
 */
export enum UnlimitedApprovalWarningBenchmarkSpenders {
	/**
	 * 0xc9C8C560BA80e840A71bE2F9409600B6133a119f: The Walletbeat staging
	 * treasury address, an externally-owned account (EOA), not a contract.
	 */
	WALLETBEAT_EOA = 'WALLETBEAT_EOA',

	/**
	 * Uniswap V3 SwapRouter, 0xE592427A0AEce92De3Edee1F18E0157C05861564: A
	 * verified, widely-used, reputable contract.
	 */
	UNISWAP_V3_ROUTER = 'UNISWAP_V3_ROUTER',

	/**
	 * 0x9fA7bB759641FCd37fe4aE41f725e0f653f2C726, labeled "PinkDrainer:
	 * Wallet 2" on Etherscan. Pink Drainer was a scam-as-a-service
	 * operation that stole over $85M from more than 21,000 victims across
	 * 2023–2024 before its operators shut it down in May 2024.
	 * Stays valid as a benchmark as long as this address remains publicly flagged.
	 */
	PINK_PHISHING_ADDRESS = 'PINK_PHISHING_ADDRESS',

	/**
	 * A contract the test wallet has never interacted with before. Any real
	 * contract works, as long as the tester's wallet has no prior history
	 * with it. Walletbeat's own testing contracts is a convenient
	 * default, since it's guaranteed untouched until deliberately used for
	 * this benchmark.
	 */
	CONTRACT_NOT_INTERACTED_BEFORE = 'CONTRACT_NOT_INTERACTED_BEFORE',

	/**
	 * A contract that was only recently deployed onchain. Any real contract
	 * works, as long as it was deployed shortly before testing.
	 * Walletbeat's own testing contracts is a convenient default, since it
	 * can be redeployed on demand.
	 */
	RECENTLY_DEPLOYED_CONTRACT = 'RECENTLY_DEPLOYED_CONTRACT',
}

/**
 * Per-benchmark data on whether the wallet warns for that specific
 * unlimited-approval spender.
 *
 * `null` means the benchmark has not been tested yet for the wallet.
 */
export type UnlimitedApprovalWarningBenchmarks = Record<
	UnlimitedApprovalWarningBenchmarkSpenders,
	Support | null
>

export type UnlimitedApprovalWarning = WithRef<
	ScamAlertLeaks & {
		/**
		 * Which unlimited-approval benchmark spenders the wallet is known to
		 * warn on.
		 */
		warnsOnUnlimitedApproval: UnlimitedApprovalWarningBenchmarks

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

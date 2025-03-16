import type { WithRef } from '@/schema/reference'
import type { Support } from '../support'

/**
 * Whether the wallet supports scam alerts.
 */
export interface ScamAlerts {
	/** Does the wallet warn the user when visiting a known-scam site? */
	scamUrlWarning: Support<
		WithRef<{
			/**
			 * Whether the scam site lookup process leaks the visited URL to an
			 * external service, as opposed to something like a partial hash match
			 * like the Google Safe Browsing API for checking spam domains without
			 * leaking the domains being visited to Google.
			 */
			leaksVisitedUrl: 'FULL_URL' | 'DOMAIN_ONLY' | 'PARTIAL_HASH_OF_DOMAIN' | 'NO'

			/**
			 * Whether the contract lookup process leaks the user's Ethereum address
			 * to an external service.
			 */
			leaksUserAddress: boolean

			/**
			 * Whether the scam site lookup process leaks the user's IP to an external
			 * service, as opposed to using an anonymizing proxy.
			 */
			leaksIp: boolean
		}>
	>

	/** Does the wallet warn the user before executing a contract transaction? */
	contractTransactionWarning: Support<
		WithRef<{
			/**
			 * Does the wallet warn the user when they are interacting with a contract
			 * they have not interacted with before?
			 */
			previousContractInteractionWarning: boolean

			/**
			 * Does the wallet warn the user when they are interacting with a contract
			 * that has only recently been deployed to the chain.
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

			/**
			 * Whether the contract lookup process leaks the user's Ethereum address
			 * to an external service.
			 */
			leaksUserAddress: boolean

			/**
			 * Whether the contract lookup process leaks the user's IP address to an
			 * external service.
			 */
			leaksUserIp: boolean
		}>
	>

	/** Does the wallet warn the user before executing a send transaction? */
	sendTransactionWarning: Support<
		WithRef<{
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
			 * Whether the lookup process leaks the recipient address to an external
			 * service.
			 */
			leaksRecipient: boolean

			/**
			 * Whether the lookup process leaks the user's Ethereum address to an
			 * external service.
			 */
			leaksUserAddress: boolean

			/**
			 * Whether the lookup process leaks the user's IP address to an external
			 * service.
			 */
			leaksUserIp: boolean
		}>
	>
}

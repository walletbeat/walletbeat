import type { Support } from '../support'

/**
 * Can a chain's RPC endpoint be configured, and if so, when?
 */
export enum RpcEndpointConfiguration {
	/**
	 * It is possible to set a custom RPC endpoint address before the wallet
	 * makes any request to its default RPC endpoint setting.
	 * To test: install the wallet fresh, open the network/chain settings
	 * before doing anything else, and verify you can change the RPC URL
	 * before any network requests have been made. Use the browser devtools
	 * Network tab to confirm no RPC calls fired before you reached the setting.
	 */
	YES_BEFORE_ANY_REQUEST = 'YES_BEFORE_ANY_REQUEST',

	/**
	 * It is possible to set a custom RPC endpoint address, but the wallet makes
	 * sensitive requests to its default RPC endpoint before the user has a
	 * chance to get to the configuration options for RPC endpoints.
	 * To test: install the wallet fresh and watch the browser devtools Network
	 * tab during onboarding. If requests to a default RPC fire before you can
	 * reach the RPC configuration screen, this is the correct value.
	 */
	YES_AFTER_OTHER_REQUESTS = 'YES_AFTER_OTHER_REQUESTS',

	/**
	 * The RPC endpoint is not configurable by the user.
	 * To test: look for any network or chain settings in the wallet. If there
	 * is no option to change the RPC URL for any chain, use this value.
	 */
	NO = 'NO',
}

/** Can the wallet's usage of a particular chain be configured? */
export interface SingleChainConfigurability {
	/**
	 * Can the wallet's RPC endpoint for the chain be configured?
	 * To test: navigate to the wallet's network or chain settings and look
	 * for an option to change the RPC URL for a given chain.
	 */
	rpcEndpointConfiguration: RpcEndpointConfiguration
}

/** Can the wallet be used to perform basic operations only using a self-hosted node? */
export interface SelfHostedNodeL1BasicOperationsSupport {
	/**
	 * Can the wallet be used to perform basic operations only using
	 * the L1 RPC provider?
	 *
	 * These operations must be tested in an environment with no network
	 * connectivity to external services, other than to a user's L1 RPC
	 * endpoint.
	 *
	 * To set up the test environment: point the wallet at a self-hosted node,
	 * then block all other outbound traffic using firewall rules, `/etc/hosts`, or browser DevTools →
	 * Network conditions → Offline (with a localhost RPC proxy still reachable).
	 * Then attempt each operation below and record whether it succeeds.
	 */
	withNoConnectivityExceptL1RPCEndpoint: {
		/**
		 * Can you create an account?
		 * To test: go through the wallet's new account / seed phrase creation
		 * flow in the restricted environment and check if it completes successfully.
		 */
		accountCreation: Support

		/**
		 * Can you import an account?
		 * To test: import an existing seed phrase or private key in the restricted
		 * environment and check if the wallet loads without errors.
		 */
		accountImport: Support

		/**
		 * Can you see your Ether balance?
		 * To test: after setup, check if the ETH balance is displayed using only
		 * the self-hosted L1 RPC, with no external API calls.
		 */
		etherBalanceLookup: Support

		/**
		 * Can you look up an ERC-20 token balance?
		 * Requiring the user to input the ERC-20 contract address is OK,
		 * the token does not need to be automatically discovered.
		 * To test: manually enter a known ERC-20 contract address and check
		 * if the balance loads using only the L1 RPC.
		 */
		erc20BalanceLookup: Support

		/**
		 * Can you send an ERC-20 token to another address?
		 * Requiring the user to input the ERC-20 contract address is OK,
		 * the token does not need to be automatically discovered.
		 * Must be able to send to a different address than your own.
		 * To test: attempt to send an ERC-20 token to a different address in the
		 * restricted environment. The transaction should broadcast successfully
		 * using only the L1 RPC, with no external API calls required.
		 */
		erc20TokenSend: Support
	}
}

/**
 * Customization options that exist for chains.
 */
export interface ChainConfigurability {
	/**
	 * Does the wallet support using Ethereum L1 at all?
	 * To test: check if the wallet lists Ethereum mainnet as an available network
	 * and can send transactions on it.
	 */
	l1: Support<SingleChainConfigurability & SelfHostedNodeL1BasicOperationsSupport>

	/**
	 * Does the wallet support non-L1 Ethereum chains?
	 * (e.g. The wallet allows switching to or adding Arbitrum, Base, Optimism, or other L2s.)
	 */
	nonL1: Support<SingleChainConfigurability>

	/**
	 * Does the wallet support adding custom chains?
	 * (e.g. The wallet has an "Add network" option where you can input a custom
	 * chain ID, RPC URL, and currency symbol — beyond just editing existing chains.)
	 */
	customChainRpcEndpoint: Support
}

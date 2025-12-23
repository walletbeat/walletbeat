import type { Support } from '../support'

/**
 * Can a chain's RPC endpoint be configured, and if so, when?
 */
export enum RpcEndpointConfiguration {
	/**
	 * It is possible to set a custom RPC endpoint address before the wallet
	 * makes any sensitive request to its default RPC endpoint setting.
	 *
	 * "Sensitive request" is defined as containing any user data, such as the
	 * user's wallet address.
	 */
	YES_BEFORE_ANY_SENSITIVE_REQUEST = 'YES_BEFORE_ANY_SENSITIVE_REQUEST',

	/**
	 * It is possible to set a custom RPC endpoint address, but the wallet makes
	 * sensitive requests to its default RPC endpoint before the user has a
	 * chance to get to the configuration options for RPC endpoints.
	 *
	 * "Sensitive request" is defined as containing any user data, such as the
	 * user's wallet address.
	 */
	YES_AFTER_OTHER_SENSITIVE_REQUESTS = 'YES_AFTER_OTHER_SENSITIVE_REQUESTS',

	/** The RPC endpoint is not configurable by the user. */
	NO = 'NO',
}

/** Can the wallet's usage of a particular chain be configured? */
export interface SingleChainConfigurability {
	/** Can the wallet's RPC endpoint for the chain be configured? */
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
	 */
	withNoConnectivityExceptL1RPCEndpoint: {
		/** Can you create an account? */
		accountCreation: Support

		/** Can you import an account? */
		accountImport: Support

		/** Can you see your Ether balance? */
		etherBalanceLookup: Support

		/**
		 * Can you look up an ERC-20 token balance?
		 * Requiring the user to input the ERC-20 contract address is OK,
		 * the token does not need to be automatically discovered.
		 */
		erc20BalanceLookup: Support

		/**
		 * Can you send an ERC-20 token to another address?
		 * Requiring the user to input the ERC-20 contract address is OK,
		 * the token does not need to be automatically discovered.
		 * Must be able to send to a different address than your own.
		 */
		erc20TokenSend: Support
	}
}

/**
 * Customization options that exist for chains.
 */
export interface ChainConfigurability {
	/** Does the wallet support using Ethereum L1 at all? */
	l1: Support<SingleChainConfigurability & SelfHostedNodeL1BasicOperationsSupport>

	/** Does the wallet support non-L1 Ethereum chains? */
	nonL1: Support<SingleChainConfigurability>

	/** Does the wallet support adding custom chains? */
	customChainRpcEndpoint: Support
}

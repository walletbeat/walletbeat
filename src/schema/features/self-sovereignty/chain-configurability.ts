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

/**
 * Customization options that exist for chains.
 */
export interface ChainConfigurability {
	/** Does the wallet support using Ethereum L1 at all? */
	l1: Support<SingleChainConfigurability>

	/** Does the wallet support non-L1 Ethereum chains? */
	nonL1: Support<SingleChainConfigurability>

	/** Does the wallet support adding custom chains? */
	customChainRpcEndpoint: Support
}

/**
 * Customization options for each chain.
 */
export enum RpcEndpointConfiguration {
	/**
	 * It is possible to set a custom RPC endpoint address before the wallet
	 * makes any sensitive request to its default RPC endpoint setting.
	 *
	 * "Sensitive request" is defined as containing any user data, such as the
	 * user's wallet address.
	 */
	YES_BEFORE_ANY_REQUEST = 'YES_BEFORE_ANY_REQUEST',

	/**
	 * It is possible to set a custom RPC endpoint address, but the wallet makes
	 * sensitive requests to its default RPC endpoint before the user has a
	 * chance to get to the configuration options for RPC endpoints.
	 *
	 * "Sensitive request" is defined as containing any user data, such as the
	 * user's wallet address.
	 */
	YES_AFTER_OTHER_REQUESTS = 'YES_AFTER_OTHER_REQUESTS',

	/** The RPC endpoint is not configurable by the user. */
	NO = 'NO',

	/** The wallet never uses this chain so it has no setting for it. */
	NEVER_USED = 'NEVER_USED',
}

/**
 * Customization options that exist for chains.
 */
export interface ChainConfigurability {
	/** Can set a custom RPC endpoint address for L1. */
	l1RpcEndpoint: RpcEndpointConfiguration

	/**
	 * Can override the RPC endpoint for built-in chains other than L1.
	 */
	otherRpcEndpoints: RpcEndpointConfiguration

	/** Can add custom chains. */
	customChains: boolean
}

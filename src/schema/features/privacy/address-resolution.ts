import type { Support } from '../support'

/** Which methods of address resolution a wallet supports. */
export interface AddressResolution<ARS = Support<AddressResolutionData> | null> {
	/**
	 * Support for basic ENS lookups (ENS domain to non-chain-specific raw hex
	 * address).
	 * To test: type `vitalik.eth` in the send address field. If it resolves, it is supported.
	 */
	nonChainSpecificEnsResolution: ARS

	/** Chain-specific address lookups. */
	chainSpecificAddressing: {
		/**
		 * Address lookup through ERC-7828.
		 * To test: type `vitalik@optimism.eth` in the send address field and check if it resolves.
		 */
		erc7828: ARS

		/**
		 * Address lookup through ERC-7831.
		 * To test: type `vitalik.eth:optimism:1` in the send address field and check if it resolves.
		 */
		erc7831: ARS
	}
}

/** How a wallet resolves addresses. */
export type AddressResolutionData =
	| {
			/**
			 * The wallet reuses its own chain client provider to look up the
			 * necessary data, inheriting its privacy and verifiability properties.
			 * To test: open the browser devtools Network tab, trigger an ENS resolution,
			 * and verify that no requests are made to external ENS APIs, only to the
			 * wallet's configured RPC endpoint.
			 */
			medium: 'CHAIN_CLIENT'
	  }
	| {
			/**
			 * The wallet uses an external offchain provider to look up the necessary
			 * data.
			 * To test: open the browser devtools Network tab, trigger an ENS resolution,
			 * and check if requests are made to an external API (e.g. `api.ens.domains`).
			 * Determining the values below requires inspecting the wallet's source code
			 * or official documentation.
			 */
			medium: 'OFFCHAIN'

			/**
			 * Whether the external offchain provider's data is verified,
			 * for example through a light client.
			 * This is generally not visible in the UI — check the wallet's source code
			 * or privacy/security documentation to determine the correct value.
			 * (e.g. `VERIFIABLE`: the wallet cross-checks the offchain result against
			 * on-chain data or uses a light client to verify it.
			 * `NOT_VERIFIABLE`: the wallet trusts the offchain provider's response as-is.)
			 */
			offchainDataVerifiability: 'VERIFIABLE' | 'NOT_VERIFIABLE'

			/**
			 * Whether the wallet directly connects to the external offchain
			 * provider (thereby revealing information about who is doing the
			 * lookup), or using anonymizing proxies to do so.
			 * To test: monitor outbound network requests during ENS resolution. If requests
			 * go directly to a third-party ENS API from the user's IP, use `DIRECT_CONNECTION`.
			 * `UNIQUE_PROXY_CIRCUIT` requires source code or documentation confirming the
			 * wallet routes lookups through anonymizing proxies.
			 */
			offchainProviderConnection: 'DIRECT_CONNECTION' | 'UNIQUE_PROXY_CIRCUIT'
	  }

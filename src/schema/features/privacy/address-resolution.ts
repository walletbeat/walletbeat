import { Enum } from '@/utils/enum'

import type { Support } from '../support'

/** A naming service whose names a wallet may resolve when sending funds. */
export enum NameService {
	/**
	 * Ethereum Name Service (`.eth`).
	 * To test: type `wallet.ensdao.eth` in the send address field. If it
	 * resolves, the wallet supports ENS lookups.
	 */
	ENS = 'ens',

	/**
	 * Gwei Name Service (`.gwei`), an ENS alternative on Ethereum.
	 * To test: type a known registered name, such as `gns.gwei`, in the send
	 * address field. If it resolves, the wallet supports Gwei Name Service
	 * lookups.
	 */
	GWEI = 'gwei',

	/**
	 * Wei Name Service (`.wei`), an ENS alternative on Ethereum.
	 * To test: type a known registered name, such as `roll.wei`, in the send
	 * address field. If it resolves, the wallet supports Wei Name Service
	 * lookups.
	 */
	WEI = 'wei',

	/**
	 * MegaNames (`.mega`) on MegaETH.
	 * To test: type a known registered name, such as `bread.mega`, in the send
	 * address field. If it resolves, the wallet supports MegaNames lookups.
	 */
	MEGA = 'mega',

	/**
	 * Hyperliquid Names (`.hl`) on HyperEVM.
	 * To test: type a known registered name, such as `jeff.hl`, in the send
	 * address field. If it resolves, the wallet supports Hyperliquid Names
	 * lookups.
	 */
	HYPERLIQUID = 'hyperliquid',
}

/**
 * Every naming service tracked by Walletbeat.
 *
 * Adding a member to `NameService` fails to type-check until it is added here.
 */
export const trackedNameServices = new Enum<NameService>({
	[NameService.ENS]: true,
	[NameService.GWEI]: true,
	[NameService.WEI]: true,
	[NameService.MEGA]: true,
	[NameService.HYPERLIQUID]: true,
})

/** Human-readable information about a naming service. */
export interface NameServiceInfo {
	/** Name of the naming service, for display in user-facing content. */
	displayName: string

	/** Suffix of names registered with the naming service. */
	suffix: string

	/** A registered name to use when testing support for the naming service. */
	exampleName: string
}

/** Human-readable information about every tracked naming service. */
export const nameServiceInfo: Record<NameService, NameServiceInfo> = {
	[NameService.ENS]: {
		displayName: 'ENS',
		suffix: '.eth',
		exampleName: 'wallet.ensdao.eth',
	},
	[NameService.GWEI]: {
		displayName: 'Gwei Name Service',
		suffix: '.gwei',
		exampleName: 'gns.gwei',
	},
	[NameService.WEI]: {
		displayName: 'Wei Name Service',
		suffix: '.wei',
		exampleName: 'roll.wei',
	},
	[NameService.MEGA]: {
		displayName: 'MegaNames',
		suffix: '.mega',
		exampleName: 'bread.mega',
	},
	[NameService.HYPERLIQUID]: {
		displayName: 'Hyperliquid Names',
		suffix: '.hl',
		exampleName: 'jeff.hl',
	},
}

/**
 * Support for resolving names from each tracked naming service.
 *
 * Each naming service is tracked separately because a wallet may resolve
 * names from one registry without resolving names from another, and may use
 * a different lookup method for each.
 *
 * Only naming services with meaningful adoption are tracked. Smaller-reach
 * services are considered only when there is a clear inclusion criterion.
 */
export type NameServiceSupport<ARS = Support<AddressResolutionData> | null> = Record<
	NameService,
	ARS
>

/** Which methods of address resolution a wallet supports. */
export interface AddressResolution<ARS = Support<AddressResolutionData> | null> {
	/** Support for each tracked naming service. */
	nameServices: NameServiceSupport<ARS>

	/** Chain-specific address lookups. */
	chainSpecificAddressing: {
		/**
		 * Address lookup through ERC-7828.
		 * To test: type `wallet.ensdao.eth@ethereum` in the send address field and check if it resolves.
		 */
		erc7828: ARS

		/**
		 * Address lookup through ERC-7831.
		 * To test: type `wallet.ensdao.eth:ethereum` in the send address field and check if it resolves.
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
			 * To test: open the browser devtools Network tab, trigger a name
			 * resolution, and verify that no requests are made to external name
			 * service APIs, only to the wallet's configured RPC endpoint.
			 */
			medium: 'CHAIN_CLIENT'
	  }
	| {
			/**
			 * The wallet uses an external offchain provider to look up the necessary
			 * data.
			 * To test: open the browser devtools Network tab, trigger a name
			 * resolution, and check if requests are made to an external API (e.g.
			 * `api.ens.domains`). Determining the values below requires inspecting
			 * the wallet's source code or official documentation.
			 */
			medium: 'OFFCHAIN'

			/**
			 * Whether the external offchain provider's data is verified,
			 * for example through a light client.
			 * This is generally not visible in the UI — check the wallet's source code
			 * or privacy/security documentation to determine the correct value.
			 *   - `VERIFIABLE`: the wallet cross-checks the offchain result against
			 *     onchain data or uses a light client to verify it.
			 *   - `NOT_VERIFIABLE`: the wallet trusts the offchain provider's response as-is.
			 */
			offchainDataVerifiability: 'VERIFIABLE' | 'NOT_VERIFIABLE'

			/**
			 * Whether the wallet directly connects to the external offchain
			 * provider (thereby revealing information about who is doing the
			 * lookup), or using anonymizing proxies to do so.
			 * To test: monitor outbound network requests during name resolution. If
			 * requests go directly to an external name service API from the user's
			 * IP, use `DIRECT_CONNECTION`.
			 * `UNIQUE_PROXY_CIRCUIT` requires source code or documentation confirming
			 * the wallet routes lookups through anonymizing proxies.
			 */
			offchainProviderConnection: 'DIRECT_CONNECTION' | 'UNIQUE_PROXY_CIRCUIT'
	  }

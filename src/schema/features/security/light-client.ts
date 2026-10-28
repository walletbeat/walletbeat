import type { LabeledUrl } from '../../url'
import type { AtLeastOneSupported } from '../support'

/**
 * Known Ethereum L1 light client implementations a wallet may embed.
 * Sometimes visible in the UI, but more reliably identified by checking the
 * wallet's documentation for light client claims, or by searching the source
 * code for imports of helios or similar libraries.
 */
export enum EthereumL1LightClient {
	/** Helios: a fast, trustless Ethereum light client written in Rust. */
	helios = 'helios',

	/** Helios-Mobi: a mobile-optimized port of Helios. */
	heliosMobi = 'heliosMobi',

	/**
	 * Colibri Stateless: a stateless light client that verifies RPC responses
	 * against Merkle proofs and zero-knowledge proofs of the sync committee.
	 */
	colibri = 'colibri',
}

/**
 * Human-friendly name for a given L1 light client.
 */
export function ethereumL1LightClientName(l1LightClient: EthereumL1LightClient): string {
	switch (l1LightClient) {
		case EthereumL1LightClient.helios:
			return 'Helios'
		case EthereumL1LightClient.heliosMobi:
			return 'Helios-Mobi'
		case EthereumL1LightClient.colibri:
			return 'Colibri Stateless'
	}
}

/**
 * External URL for a given L1 light client.
 */
export function ethereumL1LightClientUrl(l1LightClient: EthereumL1LightClient): LabeledUrl {
	switch (l1LightClient) {
		case EthereumL1LightClient.helios:
			return {
				url: 'https://helios.a16zcrypto.com/',
				label: ethereumL1LightClientName(l1LightClient),
			}
		case EthereumL1LightClient.heliosMobi:
			return {
				url: 'https://github.com/hsyodyssey/helios-mobi',
				label: ethereumL1LightClientName(l1LightClient),
			}
		case EthereumL1LightClient.colibri:
			return {
				url: 'https://github.com/corpus-core/colibri-stateless',
				label: ethereumL1LightClientName(l1LightClient),
			}
	}
}

/**
 * How much of the chain data the wallet relies on is verified by its
 * light client(s).
 */
export interface EthereumL1LightClientCoverage {
	/**
	 * Whether light client verification is active without the user having to
	 * opt into it (e.g. by toggling a setting).
	 */
	enabledByDefault: boolean

	/**
	 * Whether the chain state used to simulate transactions before signing is
	 * verified by the light client, as opposed to only some other data such as
	 * displayed balances.
	 */
	verifiesTransactionSimulation: boolean
}

export type EthereumL1LightClientSupport = AtLeastOneSupported<EthereumL1LightClient> &
	EthereumL1LightClientCoverage

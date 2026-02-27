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
	}
}

export type EthereumL1LightClientSupport = AtLeastOneSupported<EthereumL1LightClient>

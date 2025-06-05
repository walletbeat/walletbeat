import type { LabeledUrl } from '../../url'
import type { AtLeastOneSupported } from '../support'

/** Enum of known Ethereum L1 light clients. */
export enum EthereumL1LightClient {
	/** Helios light client. */
	helios = 'helios',

	/** Helios-Mobi light client. */
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

/**
 * A set of Ethereum L1 light clients that a wallet may use.
 * At least one must be supported.
 */
export type EthereumL1LightClientSupport = AtLeastOneSupported<EthereumL1LightClient>

import {
	type EthereumL1LightClient,
	ethereumL1LightClientUrl,
} from '@/schema/features/security/light-client'
import type { NonEmptyArray } from '@/types/utils/non-empty'
import { commaListFormat } from '@/types/utils/text'

export interface ChainVerificationDetails {
	type: 'chainVerification'
	lightClients: NonEmptyArray<EthereumL1LightClient>
}

export function chainVerificationSentence(details: ChainVerificationDetails): string {
	const clients = details.lightClients.map(client => {
		const { url, label } = ethereumL1LightClientUrl(client)

		return `[${label}](${url})`
	})

	return `**{{WALLET_NAME}}** performs L1 chain state verification using ${commaListFormat(
		clients,
	)} light client${details.lightClients.length === 1 ? '' : 's'}.`
}

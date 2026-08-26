import type { EthereumL1LightClient } from '@/schema/features/security/light-client'
import type { NonEmptyArray } from '@/types/utils/non-empty'

export interface ChainVerificationDetails {
	type: 'chainVerification'
	lightClients: NonEmptyArray<EthereumL1LightClient>
}

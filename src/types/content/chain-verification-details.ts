import type { EthereumL1LightClient } from '@/schema/features/security/light-client'
import type { NonEmptyArray } from '@/types/utils/non-empty'

/**
 * Canonical detail model for L1 chain state verification.
 *
 * Only the supported light-client identities are canonical. Display labels and
 * links belong to the adapters, which derive them from the shared light-client
 * helpers rather than printing the raw enum value.
 *
 * The unsupported case stays ordinary typographic prose: it has no structure
 * worth modeling. Verification references stay on the evaluation's flat
 * reference list, where `ctx.popRefs` already puts them.
 */
export interface ChainVerificationDetails {
	type: 'chainVerification'
	lightClients: NonEmptyArray<EthereumL1LightClient>
}

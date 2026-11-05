import type { MustRef } from '@/schema/reference'
import type { Url } from '@/schema/url'

/**
 * An ERC-7730 metadata source used by a wallet.
 * Record observed configuration or documented use, not inferred adoption.
 * A registry identifies the descriptor collection. An endpoint identifies
 * the service or file URL from which the wallet obtains descriptors.
 */
export type Erc7730MetadataSource = MustRef<{
	/** Name of the metadata provider or descriptor collection. */
	name: string
	/** Registry or repository URL. Use null when the upstream collection is unknown. */
	registry: Url | null
	/** Retrieval endpoint URL. Use null when it has not been established. */
	endpoint: Url | null
}>

import type { Entity } from '@/schema/entity'
import type { Url } from '@/schema/url'

/**
 * An external dataset that Walletbeat citations may be adapted from.
 * The JSON export and UI id is `entity.id`; `DataSource` has no separate id.
 */
export interface DataSource {
	entity: Entity
	license: { name: string; url: Url }
	/** Credit line shown in the UI; must indicate adaptation for CC BY. */
	attributionText: string
}

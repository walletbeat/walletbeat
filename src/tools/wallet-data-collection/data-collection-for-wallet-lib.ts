import { type DataCollection } from '@/schema/features/privacy/data-collection'
import type { AtLeastOneVariant, Variant, VariantFeature } from '@/schema/variants'
import { variantEnum } from '@/schema/variants'

/**
 * Gather multiple variant-specific `DataCollection` objects into a single
 * `VariantFeature` for them.
 *
 * @param variantData A mapping from wallet variant to the `DataCollection`
 *   observed for that variant. Variants that were not captured must be
 *   omitted.
 * @returns A `VariantFeature<DataCollection>` with an entry for every
 *   variant; uncaptured variants map to `null`. Returns `null` when no
 *   variant data was provided.
 */
export function capturedWalletDataCollection(
	variantData: Partial<Record<Variant, unknown>>,
): VariantFeature<DataCollection> {
	const result: Partial<Record<Variant, DataCollection | null>> = {}

	let foundAny = false

	for (const variant of variantEnum.items) {
		const dataCollection = variantData[variant]

		if (dataCollection !== undefined) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Already validated by tests.
			result[variant] = dataCollection as DataCollection
			foundAny = true
		} else {
			result[variant] = null
		}
	}

	if (!foundAny) {
		return null
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- At least one variant has data above, so `result` is non-empty.
	return result as AtLeastOneVariant<DataCollection | null>
}

import { type DataCollection } from '@/schema/features/privacy/data-collection'
import { variantEnum, type VariantFeature } from '@/schema/variants'

export interface DataCollectionJSON {
	walletId: string
	walletVariant: string
	dataCollection: DataCollection
}

/**
 * Gather multiple `DataCollectionJSON` entries into a single VariantFeature
 * for them.
 */
export function capturedWalletDataCollection(
	jsonObjects: unknown[],
): () => VariantFeature<DataCollection> {
	return () => {
		if (jsonObjects.length === 0) {
			return null
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Not inherently safe, but there is a unit test that verifies the objects passed to this function match the expected JSON format we want, so this is as correct as that test is.
		const dataCollectionJsons = jsonObjects as DataCollectionJSON[]

		// TODO: Verify all `dataCollectionJsons` have the same walletId and unique variants.
		return Object.fromEntries(
			dataCollectionJsons.map(dc => [variantEnum.assert(dc.walletVariant), dc.dataCollection]),
		)
	}
}

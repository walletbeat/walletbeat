import { getNewsForWallet } from '@/data/news'
import { refs, toFullyQualified } from '@/schema/reference'
import type { RatedWallet } from '@/schema/wallet'
import { referenceImageDimensions } from '@/utils/reference-image-metadata'

/** Derive image metadata from the evaluations and news rendered by a fixture. */
export function fixtureImageDimensions(wallet: RatedWallet<string>) {
	const evaluations = [
		wallet.overall,
		...Object.values(wallet.variants).map(variant => variant.attributes),
	]

	return referenceImageDimensions([
		...evaluations.flatMap(tree =>
			Object.values(tree).flatMap(group =>
				Object.values(group).flatMap(attribute =>
					toFullyQualified(attribute.evaluation.references),
				),
			),
		),
		...getNewsForWallet(wallet.metadata.id).flatMap(refs),
	])
}

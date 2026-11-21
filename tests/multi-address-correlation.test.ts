import { describe, expect, it } from 'vitest'

import { ambire } from '@/data/software-wallets/ambire'
import { EvaluationContext, Rating } from '@/schema/attributes'
import { multiAddressCorrelation } from '@/schema/attributes/privacy/multi-address-correlation'
import type { ResolvedFeatures } from '@/schema/features'
import { resolveFeatures } from '@/schema/features'
import {
	CollectionPolicy,
	type DataCollectionByEntity,
	MultiAddressPolicy,
	userFlow,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import type { WithRef } from '@/schema/reference'
import { Variant } from '@/schema/variants'

const baseFeatures = resolveFeatures(ambire.features, ambire.variants, Variant.BROWSER)

/** Ambire's ENS lookup row, which sends all addresses in one request. */
const templateRow = (() => {
	const dataCollection = baseFeatures.privacy.dataCollection

	if (dataCollection === null) {
		throw new Error('Ambire has no data collection data')
	}

	for (const flow of userFlow.items) {
		const forFlow = dataCollection[flow]

		if (forFlow === null || forFlow === undefined || forFlow === 'FLOW_NOT_SUPPORTED') {
			continue
		}

		const row = forFlow.collected.find(
			collected =>
				collected.dataCollection.multiAddress?.type ===
				MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES,
		)

		if (row !== undefined) {
			return row
		}
	}

	throw new Error('Ambire has no bulk multi-address request')
})()

function row(
	accountAddress: CollectionPolicy,
	multiAddress:
		| MultiAddressPolicy.ACTIVE_ADDRESS_ONLY
		| MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES,
): WithRef<DataCollectionByEntity> {
	return {
		...templateRow,
		dataCollection: {
			...templateRow.dataCollection,
			[WalletInfo.ACCOUNT_ADDRESS]: accountAddress,
			multiAddress: { type: multiAddress },
		},
	}
}

/** Ambire's features, with all data collection replaced by `rows`. */
function featuresWithCollected(rows: Array<WithRef<DataCollectionByEntity>>): ResolvedFeatures {
	const dataCollection = structuredClone(baseFeatures.privacy.dataCollection)

	if (dataCollection === null) {
		throw new Error('Ambire has no data collection data')
	}

	let placed = false

	for (const flow of userFlow.items) {
		const forFlow = dataCollection[flow]

		if (forFlow === null || forFlow === undefined || forFlow === 'FLOW_NOT_SUPPORTED') {
			continue
		}

		forFlow.collected = placed ? [] : rows
		placed = true
	}

	return {
		...baseFeatures,
		privacy: { ...baseFeatures.privacy, dataCollection },
	}
}

function evaluate(rows: Array<WithRef<DataCollectionByEntity>>) {
	const features = featuresWithCollected(rows)

	return multiAddressCorrelation.evaluate(
		EvaluationContext.create(multiAddressCorrelation, features),
	).outcome
}

const activeOnlyByDefault = row(CollectionPolicy.BY_DEFAULT, MultiAddressPolicy.ACTIVE_ADDRESS_ONLY)

describe('multiAddressCorrelation', () => {
	it('passes when only the active address is sent by default', () => {
		expect(evaluate([activeOnlyByDefault])).toMatchObject({
			id: 'active_address_only',
			rating: Rating.PASS,
		})
	})

	for (const policy of [CollectionPolicy.OPT_IN, CollectionPolicy.PROMPTED]) {
		it(`is partial when ${policy} endpoints receive multiple addresses at once`, () => {
			expect(
				evaluate([
					activeOnlyByDefault,
					row(policy, MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES),
				]),
			).toMatchObject({ id: 'optional_bulk_requests', rating: Rating.PARTIAL })
		})
	}

	it('is partial when the only multi-address requests are optional bulk requests', () => {
		expect(
			evaluate([
				row(CollectionPolicy.OPT_IN, MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES),
			]),
		).toMatchObject({ id: 'optional_bulk_requests', rating: Rating.PARTIAL })
	})

	it('ignores optional endpoints that only receive the active address', () => {
		expect(
			evaluate([
				activeOnlyByDefault,
				row(CollectionPolicy.OPT_IN, MultiAddressPolicy.ACTIVE_ADDRESS_ONLY),
			]),
		).toMatchObject({ id: 'active_address_only', rating: Rating.PASS })
	})

	it('ignores endpoints that never receive account addresses', () => {
		expect(
			evaluate([
				activeOnlyByDefault,
				row(CollectionPolicy.NEVER, MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES),
			]),
		).toMatchObject({ id: 'active_address_only', rating: Rating.PASS })
	})

	it('still fails when bulk requests happen by default', () => {
		expect(
			evaluate([
				row(CollectionPolicy.BY_DEFAULT, MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES),
				row(CollectionPolicy.OPT_IN, MultiAddressPolicy.SINGLE_REQUEST_WITH_MULTIPLE_ADDRESSES),
			]),
		).toMatchObject({ id: 'bulkRequests', rating: Rating.FAIL })
	})
})

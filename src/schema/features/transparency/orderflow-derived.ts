import type { WithRef } from '@/schema/reference'

import {
	CollectionPolicy,
	type DataCollection,
	type DataCollectionByEntity,
	type DataCollectionForUserFlowOrUnsupported,
	DataCollectionPurpose,
	isWithEndpoint,
	qualifiedDataCollection,
	UserFlow,
	WalletInfo,
} from '../privacy/data-collection'

export { endpointIsVerifiablyNonExtractive } from '../privacy/data-collection'

/** Transaction flows used for orderflow transparency derived helpers. */
export const orderflowTransactionFlows = [
	UserFlow.SEND_ETHER,
	UserFlow.SEND_USDC,
	UserFlow.NATIVE_SWAP,
	UserFlow.MAKE_TRANSACTION,
] as const

type OrderflowTransactionFlow = (typeof orderflowTransactionFlows)[number]

function flowDataCollection(
	dataCollection: DataCollection,
	flow: OrderflowTransactionFlow,
): DataCollectionForUserFlowOrUnsupported {
	switch (flow) {
		case UserFlow.SEND_ETHER:
			return dataCollection[UserFlow.SEND_ETHER]
		case UserFlow.SEND_USDC:
			return dataCollection[UserFlow.SEND_USDC]
		case UserFlow.NATIVE_SWAP:
			return dataCollection[UserFlow.NATIVE_SWAP]
		case UserFlow.MAKE_TRANSACTION:
			return dataCollection[UserFlow.MAKE_TRANSACTION]
	}
}

function allOrderFlowsResearched(dataCollection: DataCollection): boolean {
	for (const flow of orderflowTransactionFlows) {
		if (flowDataCollection(dataCollection, flow) === null) {
			return false
		}
	}

	return true
}

function mempoolCollectedByDefaultOrAlways(
	collectionByEntity: WithRef<DataCollectionByEntity>,
): boolean {
	const policy = qualifiedDataCollection(collectionByEntity.dataCollection)[
		WalletInfo.MEMPOOL_TRANSACTIONS
	]

	return policy === CollectionPolicy.BY_DEFAULT || policy === CollectionPolicy.ALWAYS
}

function rowsMatchingMempoolPreInclusionWithEndpoint(
	flow: DataCollectionForUserFlowOrUnsupported,
): WithRef<DataCollectionByEntity>[] {
	if (flow === null || flow === 'FLOW_NOT_SUPPORTED') {
		return []
	}

	const matching: WithRef<DataCollectionByEntity>[] = []

	for (const collectionByEntity of flow.collected) {
		if (!isWithEndpoint(collectionByEntity.dataCollection)) {
			continue
		}

		if (mempoolCollectedByDefaultOrAlways(collectionByEntity)) {
			matching.push(collectionByEntity)
		}
	}

	return matching
}

/**
 * Whether any pre-inclusion mempool collection row in the orderflow transaction
 * flows lacks endpoint information (attribute UNRATED when true).
 */
export function hasMempoolCollectionWithoutEndpoint(
	dataCollection: DataCollection | null,
): boolean {
	if (dataCollection === null || !allOrderFlowsResearched(dataCollection)) {
		return false
	}

	for (const flow of orderflowTransactionFlows) {
		const flowData = flowDataCollection(dataCollection, flow)

		if (flowData === null || flowData === 'FLOW_NOT_SUPPORTED') {
			continue
		}

		for (const collectionByEntity of flowData.collected) {
			if (
				!isWithEndpoint(collectionByEntity.dataCollection) &&
				mempoolCollectedByDefaultOrAlways(collectionByEntity)
			) {
				return true
			}
		}
	}

	return false
}

/** Pre-inclusion recipients (with endpoint) reached by default across orderflow flows. */
export function preInclusionRecipientsByDefault(
	dataCollection: DataCollection | null,
): WithRef<DataCollectionByEntity>[] | null {
	if (dataCollection === null || !allOrderFlowsResearched(dataCollection)) {
		return null
	}

	const collectionsByEntity: WithRef<DataCollectionByEntity>[] = []

	for (const flow of orderflowTransactionFlows) {
		collectionsByEntity.push(
			...rowsMatchingMempoolPreInclusionWithEndpoint(flowDataCollection(dataCollection, flow)),
		)
	}

	return collectionsByEntity
}

/** Pre-inclusion recipients that auction orderflow by default. */
export function auctionsOrderflowByDefault(
	dataCollection: DataCollection | null,
): WithRef<DataCollectionByEntity>[] | null {
	const preInclusion = preInclusionRecipientsByDefault(dataCollection)

	if (preInclusion === null) {
		return null
	}

	return preInclusion.filter(collectionByEntity =>
		collectionByEntity.purposes.includes(DataCollectionPurpose.ORDERFLOW_AUCTION),
	)
}

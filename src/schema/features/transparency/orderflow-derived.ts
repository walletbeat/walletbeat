import type { WithRef } from '@/schema/reference'

import {
	CollectionPolicy,
	type DataCollection,
	type DataCollectionByEntity,
	type DataCollectionForUserFlowOrUnsupported,
	DataCollectionPurpose,
	endpointIsVerifiablyNonExtractive,
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

function mempoolCollectedByDefaultOrAlways(
	collectionByEntity: WithRef<DataCollectionByEntity>,
): boolean {
	const policy = qualifiedDataCollection(collectionByEntity.dataCollection)[
		WalletInfo.MEMPOOL_TRANSACTIONS
	]

	return policy === CollectionPolicy.BY_DEFAULT || policy === CollectionPolicy.ALWAYS
}

export type OrderflowFacts =
	| { status: 'incomplete' }
	| {
			status: 'complete'
			hasMempoolWithoutEndpoint: boolean
			preInclusionRecipients: WithRef<DataCollectionByEntity>[]
			auctioneers: WithRef<DataCollectionByEntity>[]
	  }

/** Derived orderflow-related facts from privacy data collection in a single pass. */
export function deriveOrderflowFacts(dataCollection: DataCollection | null): OrderflowFacts {
	if (dataCollection === null) {
		return { status: 'incomplete' }
	}

	const preInclusionRecipients: WithRef<DataCollectionByEntity>[] = []
	let hasMempoolWithoutEndpoint = false

	for (const flow of orderflowTransactionFlows) {
		const flowData = flowDataCollection(dataCollection, flow)

		if (flowData === null) {
			return { status: 'incomplete' }
		}

		if (flowData === 'FLOW_NOT_SUPPORTED') {
			continue
		}

		for (const collectionByEntity of flowData.collected) {
			if (!mempoolCollectedByDefaultOrAlways(collectionByEntity)) {
				continue
			}

			if (!isWithEndpoint(collectionByEntity.dataCollection)) {
				hasMempoolWithoutEndpoint = true
				continue
			}

			preInclusionRecipients.push(collectionByEntity)
		}
	}

	const auctioneers = preInclusionRecipients.filter(collectionByEntity =>
		collectionByEntity.purposes.includes(DataCollectionPurpose.ORDERFLOW_AUCTION),
	)

	return {
		status: 'complete',
		hasMempoolWithoutEndpoint,
		preInclusionRecipients,
		auctioneers,
	}
}

/** Partition default pre-inclusion recipients by whether their endpoint is verifiably non-extractive. */
export function partitionPreInclusionRecipientsByExtractiveness(
	recipients: WithRef<DataCollectionByEntity>[],
): {
	nonExtractive: WithRef<DataCollectionByEntity>[]
	extractive: WithRef<DataCollectionByEntity>[]
} {
	const nonExtractive: WithRef<DataCollectionByEntity>[] = []
	const extractive: WithRef<DataCollectionByEntity>[] = []

	for (const row of recipients) {
		if (endpointIsVerifiablyNonExtractive(row.dataCollection.endpoint)) {
			nonExtractive.push(row)
		} else {
			extractive.push(row)
		}
	}

	return { nonExtractive, extractive }
}

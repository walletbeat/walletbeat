import type { MustRef, WithRef } from '@/schema/reference'
import type { CalendarDate } from '@/types/date'

import {
	collectedByDefault,
	type DataCollection,
	type DataCollectionByEntity,
	DataCollectionPurpose,
	endpointIsVerifiablyNonExtractive,
	qualifiedDataCollection,
	UserFlow,
	WalletInfo,
} from '../privacy/data-collection'
import { type Support } from '../support'
import { type FeeDisplay, FeeDisplayLevel, validateFeeDisplay } from './fee-display'

/**
 * What level of orderflow / MEV auctioning information is shown by default and
 * after a user action during transaction confirmation.
 */
export enum OrderflowDisclosureLevel {
	/** No mention of auction / orderflow / MEV. */
	NONE = 'NONE',

	/**
	 * Single line or toggle (e.g. "MEV protection", "Private tx") without full
	 * breakdown.
	 */
	MENTIONED = 'MENTIONED',

	/**
	 * Clear block: auctioning disclosed, stats or kickback called out, Learn more
	 * to practices page.
	 */
	COMPREHENSIVE = 'COMPREHENSIVE',
}

/**
 * How much orderflow / MEV information is displayed by default and after a user action.
 *
 * `byDefault` and `afterSingleAction` must tell a consistent story: one user action may
 * reveal the same or more detail, but never less. Valid pairs are enforced by the
 * discriminated union below.
 *
 * Valid pairs include `(NONE, NONE)`, `(NONE, MENTIONED)`, `(MENTIONED, MENTIONED)`,
 * `(MENTIONED, COMPREHENSIVE)`, and `(COMPREHENSIVE, COMPREHENSIVE)`.
 *
 * Invalid examples:
 * - `(MENTIONED, NONE)` — e.g. "MEV protection: on" is visible by default, but nothing
 *   orderflow-related appears after the user taps it.
 * - `(COMPREHENSIVE, MENTIONED)` — a full orderflow block is shown by default, but one
 *   action collapses it to a single line.
 */
export type OrderflowDisclosure =
	| {
			/** Level shown with default settings and no orderflow-related user action. */
			byDefault: OrderflowDisclosureLevel.NONE
			/**
			 * Level shown after at most one orderflow-related user action (e.g. tapping a
			 * row, toggle, or "Learn more"), with no settings changed.
			 */
			afterSingleAction: OrderflowDisclosureLevel
	  }
	| {
			byDefault: OrderflowDisclosureLevel.MENTIONED
			afterSingleAction: OrderflowDisclosureLevel.MENTIONED | OrderflowDisclosureLevel.COMPREHENSIVE
	  }
	| {
			byDefault: OrderflowDisclosureLevel.COMPREHENSIVE
			afterSingleAction: OrderflowDisclosureLevel.COMPREHENSIVE
	  }

/** Whether the wallet documents how users can verify onchain outcomes. */
export enum OnchainVerificationDocumentation {
	NO_METHOD_DOCUMENTED = 'NO_METHOD_DOCUMENTED',
	METHOD_DOCUMENTED = 'METHOD_DOCUMENTED',
	METHOD_DOCUMENTED_AND_EFFECTIVE = 'METHOD_DOCUMENTED_AND_EFFECTIVE',
}

/** Contents researchers evaluate on the wallet's orderflow practices page. */
export interface OrderflowPracticesPageContents {
	listsEntitiesAndWhatTheyDo: boolean
	explainsDefaultOrderflowAuctioning: boolean
	documentsHowToChangeDefaults: boolean
	onchainVerification: OnchainVerificationDocumentation
	/** Calendar date shown on the wallet's practices page (YYYY-MM-DD). */
	pageLastUpdated: CalendarDate
}

/** Orderflow transparency practices beyond data-collection entity rows. */
export type OrderflowPractices = {
	disclosure: WithRef<OrderflowDisclosure>
	userCanRemoveAuctioning: Support<WithRef<{}>>
	practicesPage: Support<
		MustRef<{
			contents: OrderflowPracticesPageContents
		}>
	>
}

function compareProminenceLevels(
	orderflowLevel: OrderflowDisclosureLevel,
	feeLevel: FeeDisplayLevel,
): -1 | 0 | 1 {
	const rank = (level: OrderflowDisclosureLevel | FeeDisplayLevel): number => {
		switch (level) {
			case OrderflowDisclosureLevel.COMPREHENSIVE:
			case FeeDisplayLevel.COMPREHENSIVE:
				return 2
			case OrderflowDisclosureLevel.MENTIONED:
			case FeeDisplayLevel.AGGREGATED:
				return 1
			case OrderflowDisclosureLevel.NONE:
			case FeeDisplayLevel.NONE:
				return 0
		}
	}

	const orderflowRank = rank(orderflowLevel)
	const feeRank = rank(feeLevel)

	if (orderflowRank > feeRank) {
		return 1
	}

	if (orderflowRank < feeRank) {
		return -1
	}

	return 0
}

/**
 * Compares orderflow UI disclosure prominence to fee display.
 *
 * Returns:
 *   * `1` if orderflow disclosure is more prominent than fees
 *   * `0` if prominence is equal at both by-default and after-single-action levels
 *   * `-1` if orderflow disclosure is less prominent than fees
 *
 * Compares `feeDisplay.byDefault` and `feeDisplay.afterSingleAction` to the
 * corresponding orderflow disclosure levels using the same prominence ordering.
 */
export function compareOrderflowDisclosureToFeeDisplay(
	disclosure: OrderflowDisclosure,
	feeDisplay: FeeDisplay,
): -1 | 0 | 1 {
	validateFeeDisplay(feeDisplay)

	const byDefaultCompare = compareProminenceLevels(disclosure.byDefault, feeDisplay.byDefault)

	if (byDefaultCompare !== 0) {
		return byDefaultCompare
	}

	return compareProminenceLevels(disclosure.afterSingleAction, feeDisplay.afterSingleAction)
}

/** Transaction flows used for orderflow transparency helpers derived from data collection. */
export const orderflowTransactionFlows = [
	UserFlow.SEND_ETHER,
	UserFlow.SEND_USDC,
	UserFlow.NATIVE_SWAP,
	UserFlow.MAKE_TRANSACTION,
] as const

function mempoolCollectedByDefaultOrAlways(
	collectionByEntity: WithRef<DataCollectionByEntity>,
): boolean {
	const policy = qualifiedDataCollection(collectionByEntity.dataCollection)[
		WalletInfo.MEMPOOL_TRANSACTIONS
	]

	return collectedByDefault(policy)
}

export type OrderflowFacts =
	| { status: 'incomplete' }
	| {
			status: 'complete'
			preInclusionRecipients: WithRef<DataCollectionByEntity>[]
			auctioneers: WithRef<DataCollectionByEntity>[]
	  }

/** Derived orderflow-related facts from privacy data collection in a single pass. */
export function deriveOrderflowFacts(dataCollection: DataCollection | null): OrderflowFacts {
	if (dataCollection === null) {
		return { status: 'incomplete' }
	}

	const preInclusionRecipients: WithRef<DataCollectionByEntity>[] = []

	for (const flow of orderflowTransactionFlows) {
		const flowData = dataCollection[flow]

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

			preInclusionRecipients.push(collectionByEntity)
		}
	}

	const auctioneers = preInclusionRecipients.filter(collectionByEntity =>
		collectionByEntity.purposes.includes(DataCollectionPurpose.ORDERFLOW_AUCTION),
	)

	return {
		status: 'complete',
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

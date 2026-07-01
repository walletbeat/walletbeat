import { describe, expect, it } from 'vitest'

import {
	exampleOrderflowAuctioneer,
	exampleWalletDevelopmentCompany,
} from '@/data/entities/example'
import {
	CollectionPolicy,
	type DataCollection,
	type DataCollectionByEntity,
	type DataCollectionForFlow,
	DataCollectionPurpose,
	type Endpoint,
	endpointIsVerifiablyNonExtractive,
	RegularEndpoint,
	UserFlow,
	validateDataCollectionByEntityRow,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { type FeeDisplay, FeeDisplayLevel } from '@/schema/features/transparency/fee-display'
import {
	compareOrderflowDisclosureToFeeDisplay,
	deriveOrderflowFacts,
	OrderflowDisclosureLevel,
	orderflowTransactionFlows,
	partitionPreInclusionRecipientsByExtractiveness,
	validateOrderflowDisclosure,
} from '@/schema/features/transparency/orderflow'
import { refNotNecessary, type WithRef } from '@/schema/reference'

const emptyFlow: DataCollectionForFlow = { collected: [] }

/** ORDERFLOW_AUCTION on a row where mempool collection is NEVER (must be BY_DEFAULT or ALWAYS). */
const invalidOrderflowAuctionRow: DataCollectionByEntity = {
	byEntity: exampleOrderflowAuctioneer,
	dataCollection: {
		[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.NEVER,
		endpoint: RegularEndpoint,
	},
	purposes: [DataCollectionPurpose.ORDERFLOW_AUCTION],
}

function researchedDataCollection(
	overrides: Partial<Pick<DataCollection, UserFlow.MAKE_TRANSACTION | UserFlow.SEND_ETHER>>,
): DataCollection {
	return {
		[UserFlow.INSTALL]: emptyFlow,
		[UserFlow.ONBOARDING_NEW]: {
			collected: [],
			publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
		},
		[UserFlow.ONBOARDING_IMPORT]: {
			collected: [],
			publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
		},
		[UserFlow.SEND_ETHER]: emptyFlow,
		[UserFlow.SEND_USDC]: emptyFlow,
		[UserFlow.NATIVE_SWAP]: emptyFlow,
		[UserFlow.MAKE_TRANSACTION]: emptyFlow,
		[UserFlow.APP_CONNECTION]: emptyFlow,
		...overrides,
	}
}

const verifiedEnclaveVerifiability: Extract<Endpoint, { type: 'SECURE_ENCLAVE' }>['verifiability'] =
	{
		ref: refNotNecessary,
		clientVerification: {
			type: 'VERIFIED',
			ref: 'https://example.com',
			verificationCodeAudit: { ref: 'https://example.com' },
		},
		independentCodeAudit: { ref: 'https://example.com' },
		reproducibleBuilds: true,
		sourceAvailable: true,
	}

const fullEnclaveEndpoint: Endpoint = {
	type: 'SECURE_ENCLAVE',
	endToEndEncryption: { type: 'TERMINATED_INSIDE_ENCLAVE' },
	externalLogging: { type: 'NO' },
	verifiability: verifiedEnclaveVerifiability,
}

const enclaveWithExternalLogging: Endpoint = {
	type: 'SECURE_ENCLAVE',
	endToEndEncryption: { type: 'TERMINATED_INSIDE_ENCLAVE' },
	externalLogging: { type: 'YES' },
	verifiability: verifiedEnclaveVerifiability,
}

const enclaveWithoutClientVerification: Endpoint = {
	type: 'SECURE_ENCLAVE',
	endToEndEncryption: { type: 'TERMINATED_INSIDE_ENCLAVE' },
	externalLogging: { type: 'NO' },
	verifiability: {
		ref: refNotNecessary,
		clientVerification: { type: 'NOT_VERIFIED' },
		independentCodeAudit: { ref: 'https://example.com' },
		reproducibleBuilds: true,
		sourceAvailable: true,
	},
}

describe('endpointIsVerifiablyNonExtractive', () => {
	it('returns false for regular endpoints', () => {
		expect(endpointIsVerifiablyNonExtractive(RegularEndpoint)).toBe(false)
	})

	it('returns false when external logging is not NO', () => {
		expect(endpointIsVerifiablyNonExtractive(enclaveWithExternalLogging)).toBe(false)
	})

	it('returns false when client verification is not VERIFIED', () => {
		expect(endpointIsVerifiablyNonExtractive(enclaveWithoutClientVerification)).toBe(false)
	})

	it('returns true for a fully documented secure enclave', () => {
		expect(endpointIsVerifiablyNonExtractive(fullEnclaveEndpoint)).toBe(true)
	})
})

describe('orderflow data-collection helpers', () => {
	it('exports the four transaction flows', () => {
		expect(orderflowTransactionFlows).toEqual([
			UserFlow.SEND_ETHER,
			UserFlow.SEND_USDC,
			UserFlow.NATIVE_SWAP,
			UserFlow.MAKE_TRANSACTION,
		])
	})

	it('returns incomplete when any orderflow flow is not researched', () => {
		expect(deriveOrderflowFacts(researchedDataCollection({ [UserFlow.SEND_ETHER]: null }))).toEqual(
			{ status: 'incomplete' },
		)
	})

	it('detects mempool collection without endpoint', () => {
		const row: WithRef<DataCollectionByEntity> = {
			ref: refNotNecessary,
			byEntity: exampleOrderflowAuctioneer,
			dataCollection: {
				[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.BY_DEFAULT,
				endpoint: RegularEndpoint,
			},
			purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
		}

		// Incomplete research: endpoint removed before row is fully documented.
		Reflect.deleteProperty(row.dataCollection, 'endpoint')

		const dataCollection = researchedDataCollection({
			[UserFlow.MAKE_TRANSACTION]: {
				collected: [row],
			},
		})

		const facts = deriveOrderflowFacts(dataCollection)

		expect(facts).toMatchObject({ status: 'complete', hasMempoolWithoutEndpoint: true })
	})

	it('concatenates pre-inclusion rows and filters auctioneers', () => {
		const auctionRow: WithRef<DataCollectionByEntity> = {
			ref: refNotNecessary,
			byEntity: exampleOrderflowAuctioneer,
			dataCollection: {
				[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.BY_DEFAULT,
				endpoint: RegularEndpoint,
			},
			purposes: [DataCollectionPurpose.ORDERFLOW_AUCTION],
		}

		const dataCollection = researchedDataCollection({
			[UserFlow.MAKE_TRANSACTION]: { collected: [auctionRow] },
			[UserFlow.SEND_ETHER]: {
				collected: [
					{
						ref: refNotNecessary,
						byEntity: exampleWalletDevelopmentCompany,
						dataCollection: {
							[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
							endpoint: RegularEndpoint,
						},
						purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
					},
				],
			},
		})

		const facts = deriveOrderflowFacts(dataCollection)

		expect(facts).toMatchObject({ status: 'complete', hasMempoolWithoutEndpoint: false })

		if (facts.status !== 'complete') {
			return
		}

		expect(facts.preInclusionRecipients).toHaveLength(2)
		expect(facts.auctioneers).toEqual([auctionRow])
	})

	it('partitions pre-inclusion recipients by endpoint extractiveness', () => {
		const enclaveRow: WithRef<DataCollectionByEntity> = {
			ref: refNotNecessary,
			byEntity: exampleWalletDevelopmentCompany,
			dataCollection: {
				[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.BY_DEFAULT,
				endpoint: fullEnclaveEndpoint,
			},
			purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
		}

		const regularRow: WithRef<DataCollectionByEntity> = {
			ref: refNotNecessary,
			byEntity: exampleOrderflowAuctioneer,
			dataCollection: {
				[WalletInfo.MEMPOOL_TRANSACTIONS]: CollectionPolicy.ALWAYS,
				endpoint: RegularEndpoint,
			},
			purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
		}

		expect(partitionPreInclusionRecipientsByExtractiveness([])).toEqual({
			nonExtractive: [],
			extractive: [],
		})

		expect(partitionPreInclusionRecipientsByExtractiveness([enclaveRow])).toEqual({
			nonExtractive: [enclaveRow],
			extractive: [],
		})

		expect(partitionPreInclusionRecipientsByExtractiveness([enclaveRow, regularRow])).toEqual({
			nonExtractive: [enclaveRow],
			extractive: [regularRow],
		})
	})
})

const comprehensiveFeeDisplay: FeeDisplay = {
	byDefault: FeeDisplayLevel.COMPREHENSIVE,
	afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
	fullySponsored: false,
}

const aggregatedFeeDisplay: FeeDisplay = {
	byDefault: FeeDisplayLevel.AGGREGATED,
	afterSingleAction: FeeDisplayLevel.AGGREGATED,
	fullySponsored: false,
}

const fullySponsoredFeeDisplay: FeeDisplay = {
	byDefault: FeeDisplayLevel.NONE,
	afterSingleAction: FeeDisplayLevel.NONE,
	fullySponsored: true,
}

describe('compareOrderflowDisclosureToFeeDisplay', () => {
	it('returns 0 when prominence levels match', () => {
		expect(
			compareOrderflowDisclosureToFeeDisplay(
				{
					byDefault: OrderflowDisclosureLevel.COMPREHENSIVE,
					afterSingleAction: OrderflowDisclosureLevel.COMPREHENSIVE,
				},
				comprehensiveFeeDisplay,
			),
		).toBe(0)
	})

	it('returns 1 when orderflow disclosure is more prominent', () => {
		expect(
			compareOrderflowDisclosureToFeeDisplay(
				{
					byDefault: OrderflowDisclosureLevel.COMPREHENSIVE,
					afterSingleAction: OrderflowDisclosureLevel.COMPREHENSIVE,
				},
				aggregatedFeeDisplay,
			),
		).toBe(1)
	})

	it('returns -1 when orderflow disclosure is less prominent', () => {
		expect(
			compareOrderflowDisclosureToFeeDisplay(
				{
					byDefault: OrderflowDisclosureLevel.AGGREGATED,
					afterSingleAction: OrderflowDisclosureLevel.AGGREGATED,
				},
				comprehensiveFeeDisplay,
			),
		).toBe(-1)
	})

	it('ranks sponsored fees with no fee UI as NONE when orderflow is visible', () => {
		expect(
			compareOrderflowDisclosureToFeeDisplay(
				{
					byDefault: OrderflowDisclosureLevel.AGGREGATED,
					afterSingleAction: OrderflowDisclosureLevel.AGGREGATED,
				},
				fullySponsoredFeeDisplay,
			),
		).toBe(1)
	})

	it('returns -1 when fees are fully sponsored but fee UI is still shown', () => {
		expect(
			compareOrderflowDisclosureToFeeDisplay(
				{
					byDefault: OrderflowDisclosureLevel.AGGREGATED,
					afterSingleAction: OrderflowDisclosureLevel.AGGREGATED,
				},
				{
					byDefault: FeeDisplayLevel.COMPREHENSIVE,
					afterSingleAction: FeeDisplayLevel.COMPREHENSIVE,
					fullySponsored: true,
				},
			),
		).toBe(-1)
	})

	it('returns 0 when fully sponsored fees match orderflow prominence levels', () => {
		expect(
			compareOrderflowDisclosureToFeeDisplay(
				{
					byDefault: OrderflowDisclosureLevel.AGGREGATED,
					afterSingleAction: OrderflowDisclosureLevel.AGGREGATED,
				},
				{
					byDefault: FeeDisplayLevel.AGGREGATED,
					afterSingleAction: FeeDisplayLevel.AGGREGATED,
					fullySponsored: true,
				},
			),
		).toBe(0)
	})

	it('returns -1 when comprehensive fees exceed aggregated orderflow disclosure', () => {
		expect(
			compareOrderflowDisclosureToFeeDisplay(
				{
					byDefault: OrderflowDisclosureLevel.AGGREGATED,
					afterSingleAction: OrderflowDisclosureLevel.COMPREHENSIVE,
				},
				comprehensiveFeeDisplay,
			),
		).toBe(-1)
	})
})

describe('validateOrderflowDisclosure', () => {
	it('rejects aggregated default with none after action', () => {
		expect(() =>
			validateOrderflowDisclosure({
				byDefault: OrderflowDisclosureLevel.AGGREGATED,
				afterSingleAction: OrderflowDisclosureLevel.NONE,
			}),
		).toThrow()
	})

	it('accepts comprehensive default and after action', () => {
		expect(() =>
			validateOrderflowDisclosure({
				byDefault: OrderflowDisclosureLevel.COMPREHENSIVE,
				afterSingleAction: OrderflowDisclosureLevel.COMPREHENSIVE,
			}),
		).not.toThrow()
	})
})

describe('validateDataCollectionByEntityRow', () => {
	it('rejects ORDERFLOW_AUCTION without default mempool collection', () => {
		expect(() => validateDataCollectionByEntityRow(invalidOrderflowAuctionRow)).toThrow()
	})
})

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
import {
	OrderflowDisclosureLevel,
	validateOrderflowDisclosure,
} from '@/schema/features/transparency/orderflow'
import {
	auctionsOrderflowByDefault,
	hasMempoolCollectionWithoutEndpoint,
	orderflowTransactionFlows,
	preInclusionRecipientsByDefault,
} from '@/schema/features/transparency/orderflow-derived'
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

describe('orderflow-derived helpers', () => {
	it('exports the four transaction flows', () => {
		expect(orderflowTransactionFlows).toEqual([
			UserFlow.SEND_ETHER,
			UserFlow.SEND_USDC,
			UserFlow.NATIVE_SWAP,
			UserFlow.MAKE_TRANSACTION,
		])
	})

	it('returns null when any orderflow flow is not researched', () => {
		expect(
			preInclusionRecipientsByDefault(researchedDataCollection({ [UserFlow.SEND_ETHER]: null })),
		).toBeNull()
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

		expect(hasMempoolCollectionWithoutEndpoint(dataCollection)).toBe(true)
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

		expect(preInclusionRecipientsByDefault(dataCollection)).toHaveLength(2)
		expect(auctionsOrderflowByDefault(dataCollection)).toEqual([auctionRow])
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

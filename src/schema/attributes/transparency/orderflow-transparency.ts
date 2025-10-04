import { exampleNodeCompany } from '@/data/entities/example'
import {
	type Attribute,
	type Evaluation,
	exampleRating,
	Rating,
	type Value,
} from '@/schema/attributes'
import type { Entity } from '@/schema/entity'
import type { ResolvedFeatures } from '@/schema/features'
import {
	collectedByDefault,
	type Collection,
	CollectionPolicy,
	type DataCollection,
	type DataCollectionByEntity,
	dataCollectionForAllSupportedFlows,
	DataCollectionPurpose,
	dataCollectionPurposeToText,
	type Endpoint,
	endpointRunsVerifiedCode,
	isSecureEnclaveEndpoint,
	qualifiedDataCollection,
	RegularEndpoint,
	UserFlow,
	type UserInfo,
	WalletInfo,
} from '@/schema/features/privacy/data-collection'
import { WalletProfile } from '@/schema/features/profile'
import {
	isTransactionHandlingSecureEndpoint,
	type OrderflowDisclosures,
	OrderflowDisclosureType,
	orderflowDisclosureType,
	type TransactionHandlingSecureEndpoint,
} from '@/schema/features/transparency/orderflow'
import { refs } from '@/schema/reference'
import type { AtLeastOneVariant } from '@/schema/variants'
import { markdown, paragraph, sentence } from '@/types/content'
import {
	nonEmptyFirst,
	type NonEmptySet,
	nonEmptySet,
	setContains,
	setItems,
	setSize,
	setUnion,
} from '@/types/utils/non-empty'

import { exempt, pickWorstRating, unrated } from '../common'

const brand = 'attributes.transparency.orderflow_transparency'

interface EntityDisclosureInfo {
	entity: Entity
	disclosures: NonEmptySet<OrderflowDisclosureType>
}

export type OrderflowTransparencyValue = Value & {
	entityInfo: Map<string, EntityDisclosureInfo>
	__brand: 'attributes.transparency.orderflow_transparency'
}

function userInfoRequiresDisclosure(collection: Collection<UserInfo>): boolean {
	const qualifiedCollection = qualifiedDataCollection(collection)

	for (const infoRequiringDisclosure of [
		WalletInfo.TRANSACTION_INTENT,
		WalletInfo.TRANSACTION_DATA,
	]) {
		if (collectedByDefault(qualifiedCollection[infoRequiringDisclosure])) {
			return true
		}
	}

	return false
}

function dataCollectionPurposeRequiresDisclosure(
	dataCollectionPurpose: DataCollectionPurpose,
): boolean {
	switch (dataCollectionPurpose) {
		case DataCollectionPurpose.SWAP_QUOTE:
			return true
		case DataCollectionPurpose.TRANSACTION_BROADCAST:
			return true
		case DataCollectionPurpose.TRANSACTION_SIMULATION:
			return true
		default:
			return false
	}
}

/** Returns whether a given endpoint requires disclosure. */
function endpointRequiresDisclosure(endpoint: Endpoint): boolean {
	if (!isSecureEnclaveEndpoint(endpoint)) {
		// Not running in an enclave, so can't prove what the endpoint is doing.
		return true
	}

	if (!endpointRunsVerifiedCode(endpoint)) {
		// Running in an enclave but not verifiably.
		return true
	}

	if (!isTransactionHandlingSecureEndpoint(endpoint)) {
		return true
	}

	if (endpoint.exportsNonIncludedTransactionData) {
		// Non-included transaction data is exported out of the enclave, so the
		// fact that it is running in an enclave provides no user benefit.
		return true
	}

	if (endpoint.externalLogging.type === 'UNKNOWN' || endpoint.externalLogging.type === 'YES') {
		// The endpoint may log transaction data, effectively exfiltrating them.
		return true
	}

	if (!endpoint.provablyFairOrdering) {
		// Ordering is not provably fair, so some foul play is still possible,
		// and disclosure is required.
		return true
	}

	if (endpoint.canGenerateOwnTransactions) {
		// The endpoint can generate its own frontrunning transactions, so the
		// possibility of frontrunning still exists and thus disclosure is still
		// required.
		return true
	}

	// Endpoint acts in a verifiable, provably-fair manner, does not generate
	// frontrunning transactions, and does not export transaction data prior to
	// inclusion. No disclosure required.
	return false
}

function compareProminentDisclosureTypes(
	disclosureType1: OrderflowDisclosureType,
	disclosureType2: OrderflowDisclosureType,
): number {
	const disclosureProminence = (disclosureType: OrderflowDisclosureType): number => {
		switch (disclosureType) {
			case OrderflowDisclosureType.NOT_DISCLOSED:
				return 0
			case OrderflowDisclosureType.DISCLOSED_DURING_USER_ONBOARDING:
				return 1
			case OrderflowDisclosureType.DISCLOSED_DURING_TRANSACTION_FLOW:
				return 2
		}
	}

	return disclosureProminence(disclosureType1) - disclosureProminence(disclosureType2)
}

function mostProminentDisclosure(
	entityDisclosureInfo: EntityDisclosureInfo,
): OrderflowDisclosureType {
	return nonEmptyFirst(
		setItems(entityDisclosureInfo.disclosures),
		compareProminentDisclosureTypes,
		true,
	)
}

function completeDataCollection(dataCollection: Partial<DataCollection>): DataCollection {
	return {
		[UserFlow.NATIVE_SWAP]: dataCollection[UserFlow.NATIVE_SWAP] ?? { collected: [] },
		[UserFlow.DAPP_CONNECTION]: dataCollection[UserFlow.DAPP_CONNECTION] ?? { collected: [] },
		[UserFlow.SEND]: dataCollection[UserFlow.SEND] ?? { collected: [] },
		[UserFlow.TRANSACTION]: dataCollection[UserFlow.TRANSACTION] ?? { collected: [] },
		[UserFlow.UNCLASSIFIED]: dataCollection[UserFlow.UNCLASSIFIED] ?? { collected: [] },
		[UserFlow.ONBOARDING]: dataCollection[UserFlow.ONBOARDING] ?? {
			collected: [],
			publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
		},
	}
}

function evaluateOrderflowTransparency(
	walletProfile: WalletProfile,
	dataCollection: DataCollection,
	orderflowDisclosures: OrderflowDisclosures,
): Evaluation<OrderflowTransparencyValue> {
	if (walletProfile === WalletProfile.PAYMENTS) {
		return exempt(
			orderflowTransparency,
			sentence(`
				{{WALLET_NAME}} is a payments-focused wallet, which is not susceptible to
				MEV or frontrunning. As such, it does not need orderflow disclosures.
			`),
			brand,
			{ entityInfo: new Map() },
		)
	}

	if (
		dataCollection[UserFlow.NATIVE_SWAP] === 'FLOW_NOT_SUPPORTED' &&
		dataCollection[UserFlow.TRANSACTION] === 'FLOW_NOT_SUPPORTED'
	) {
		return exempt(
			orderflowTransparency,
			sentence(`
			{{WALLET_NAME}} does not support MEV-susceptible transaction types, so no disclosures are required.
		`),
			brand,
			{ entityInfo: new Map() },
		)
	}

	const dataCollectionByEntities = dataCollectionForAllSupportedFlows(dataCollection)

	if (dataCollectionByEntities === null) {
		return unrated(orderflowTransparency, brand, { entityInfo: new Map() })
	}

	const references = refs(orderflowDisclosures)
	const entityInfo = new Map<string, EntityDisclosureInfo>()

	for (const disclosureType of orderflowDisclosureType.items) {
		const entitiesForDisclosureType: Entity[] | undefined = orderflowDisclosures[disclosureType]

		if (entitiesForDisclosureType === undefined) {
			continue
		}

		for (const entity of entitiesForDisclosureType) {
			const entityDisclosureInfo = entityInfo.get(entity.id)

			if (entityDisclosureInfo === undefined) {
				entityInfo.set(entity.id, {
					entity,
					disclosures: nonEmptySet<OrderflowDisclosureType>(disclosureType),
				})
			} else {
				entityDisclosureInfo.disclosures = setUnion([
					entityDisclosureInfo.disclosures,
					nonEmptySet<OrderflowDisclosureType>(disclosureType),
				])
			}
		}
	}
	const entitiesNeedingDisclosure = new Map<string, DataCollectionByEntity[]>()

	for (const dataCollectionByEnt of dataCollectionByEntities) {
		if (!userInfoRequiresDisclosure(dataCollectionByEnt.dataCollection)) {
			for (const purpose of dataCollectionByEnt.purposes) {
				if (dataCollectionPurposeRequiresDisclosure(purpose)) {
					throw new Error(
						`Wallet sends data to ${dataCollectionByEnt.byEntity.name} for the purpose of ${dataCollectionPurposeToText(purpose)}, which inherently requires disclosing transaction intent and/or transaction data. Please adjust the entry.`,
					)
				}
			}
			continue
		}

		if (!endpointRequiresDisclosure(dataCollectionByEnt.dataCollection.endpoint)) {
			continue
		}

		if (!entityInfo.has(dataCollectionByEnt.byEntity.id)) {
			throw new Error(
				`Wallet's dataCollection lists entity ${dataCollectionByEnt.byEntity.name} which can learn of user's transaction data or intent, so it should be listed in orderflowDisclosures as well.`,
			)
		}

		let byEntRequiringDisclosure: DataCollectionByEntity[] | undefined =
			entitiesNeedingDisclosure.get(dataCollectionByEnt.byEntity.id)

		if (byEntRequiringDisclosure === undefined) {
			byEntRequiringDisclosure = []
			entitiesNeedingDisclosure.set(dataCollectionByEnt.byEntity.id, byEntRequiringDisclosure)
		}

		byEntRequiringDisclosure.push(dataCollectionByEnt)
	}

	if (entitiesNeedingDisclosure.size === 0) {
		if (orderflowDisclosures.localOnly) {
			return {
				value: {
					id: 'local_only',
					displayName: 'Local-only wallet',
					entityInfo,
					rating: Rating.PASS,
					shortExplanation: sentence(`
						{{WALLET_NAME}} does not send your transaction data to any external provider.
					`),
					__brand: brand,
				},
				details: markdown(`
					{{WALLET_NAME}} does not send transaction data to any external provider.
					Therefore, there are no disclosures it could make about how your
					transaction data is handled.
				`),
				references,
			}
		}

		if (dataCollection[UserFlow.NATIVE_SWAP] !== 'FLOW_NOT_SUPPORTED') {
			throw new Error(
				'Wallet has a built-in swap feature (`UserFlow.NATIVE_SWAP`), which inherently requires getting swap quote data from somewhere (`WalletInfo.TRANSACTION_INTENT`). Please ensure this is reflected in the data collected by entities.',
			)
		}

		if (dataCollection[UserFlow.TRANSACTION] !== 'FLOW_NOT_SUPPORTED') {
			throw new Error(
				'Wallet has a transaction flow (`UserFlow.TRANSACTION`) and is not local-only (`orderflowDisclosures.localOnly: false`), which inherently means that at least some external RPC provider must be relied upon to broadcast transaction data to the mempool (`WalletInfo.TRANSACTION_DATA`). Please ensure this is reflected in the data collected by entities.',
			)
		}

		throw new Error('Unimplemented case') // Wallet doesn't support swaps or even transactions?
	}

	let leastProminentRequiredDisclosure: OrderflowDisclosureType | null = null

	for (const [entityId, entityDisclosureInfo] of entityInfo.entries()) {
		const entityDataCollection = entitiesNeedingDisclosure.get(entityId)

		if (entityDataCollection === undefined) {
			throw new Error(
				`Wallet has entity ${entityDisclosureInfo.entity.name} listed in orderflowDisclosures but no corresponding data for this entity in dataCollection (or the data for this entity is missing some of the information it collects, such as WalletInfo.TRANSACTION_DATA).`,
			)
		}

		if (
			setContains<OrderflowDisclosureType>(
				entityDisclosureInfo.disclosures,
				OrderflowDisclosureType.NOT_DISCLOSED,
			) &&
			setSize(entityDisclosureInfo.disclosures) > 1
		) {
			throw new Error(
				`Entity ${entityDisclosureInfo.entity.name} is declared as being both undisclosed and disclosed.`,
			)
		}

		if (leastProminentRequiredDisclosure === null) {
			leastProminentRequiredDisclosure = mostProminentDisclosure(entityDisclosureInfo)
		} else {
			leastProminentRequiredDisclosure = nonEmptyFirst(
				[leastProminentRequiredDisclosure, mostProminentDisclosure(entityDisclosureInfo)],
				compareProminentDisclosureTypes,
			)
		}
	}

	if (leastProminentRequiredDisclosure === null) {
		throw new Error('Unreachable')
	}

	switch (leastProminentRequiredDisclosure) {
		case OrderflowDisclosureType.NOT_DISCLOSED:
			return {
				value: {
					id: 'lacking_disclosures',
					displayName: 'Non-transparent orderflow practices',
					entityInfo,
					rating: Rating.FAIL,
					shortExplanation: sentence(`
						{{WALLET_NAME}} does not fully disclose who gets to see your
						transactions before they land onchain.
					`),
					__brand: brand,
				},
				details: markdown(`
					{{WALLET_NAME}} send transaction data to one or more external
					providers before your transaction is included onchain, putting
					them in a position to be able to extract MEV from this data.
					However, {{WALLET_NAME}} does not disclose this transparently.
				`),
				howToImprove: markdown(`
					Because MEV is a fee being taken from the user, disclosures should
					be at least as prominent as transaction fees during the transaction
					flow.
				`),
				references,
			}
		case OrderflowDisclosureType.DISCLOSED_DURING_USER_ONBOARDING:
			if (orderflowDisclosures.singleTransactionTypeUseCase) {
				return {
					value: {
						id: 'single_transaction_type_disclosed_during_onboarding',
						displayName: 'Onboarding-time orderflow disclosures',
						entityInfo,
						rating: Rating.PASS,
						shortExplanation: sentence(`
							{{WALLET_NAME}} discloses who gets to see your transactions
							before they land onchain as part of user onboarding.
						`),
						__brand: brand,
					},
					details: markdown(`
						{{WALLET_NAME}} send transaction data to one or more external
						providers before your transaction is included onchain, putting
						them in a position to be able to extract MEV from this data.
						{{WALLET_NAME}} discloses this information transparently during
						onboarding. As all transactions' orderflow goes through the same
						entities, disclosing this at transaction time would be overly
						repetitive to the user.
					`),
					references,
				}
			}

			return {
				value: {
					id: 'onboarding_only_disclosures',
					displayName: 'Semi-transparent orderflow disclosures',
					entityInfo,
					rating: Rating.PARTIAL,
					shortExplanation: sentence(`
						{{WALLET_NAME}} discloses who gets to see your transactions
						before they land onchain as part of user onboarding only.
					`),
					__brand: brand,
				},
				details: markdown(`
					{{WALLET_NAME}} send transaction data to one or more external
					providers before your transaction is included onchain, putting
					them in a position to be able to extract MEV from this data.
					{{WALLET_NAME}} makes this information available as part of the
					user onboarding flow, but not the transaction flow.
				`),
				howToImprove: markdown(`
					Because MEV is a fee being taken from the user, disclosures should
					be at least as prominent as transaction fees during the transaction
					flow.
				`),
				references,
			}
		case OrderflowDisclosureType.DISCLOSED_DURING_TRANSACTION_FLOW:
			return {
				value: {
					id: 'proper_disclosures',
					displayName: 'Transparent orderflow disclosures',
					entityInfo,
					rating: Rating.PASS,
					shortExplanation: sentence(`
						{{WALLET_NAME}} fully discloses who gets to see your transactions
						before they land onchain.
					`),
					__brand: brand,
				},
				details: markdown(`
					{{WALLET_NAME}} send transaction data to one or more external
					providers before your transaction is included onchain, putting
					them in a position to be able to extract MEV from this data.
					{{WALLET_NAME}} makes this information transparent as part of
					the transaction flow.
				`),
				references,
			}
	}
}

export const orderflowTransparency: Attribute<OrderflowTransparencyValue> = {
	id: 'orderflowTransparency',
	icon: '\u{1f500}', // Shuffle Tracks, symbolizing frontrunning. Other ideas: ⚗️ (extract), 🗜️ (squeeze), ✂️ (take a cut), 💳 (skim fees)
	displayName: 'Orderflow transparency',
	wording: {
		midSentenceName: 'orderflow transparency',
	},
	question: sentence(`
		Does the wallet clearly disclose which entities may monetize your orderflow?
	`),
	why: markdown(`
		[Payment for order flow (PFOF)](https://en.wikipedia.org/wiki/Payment_for_order_flow)
		is the practice of stockbroker selling customer trade information to a market maker
		who can extract profit from it. In the Ethereum world,
		[Maximal Extractable Value (MEV)](https://ethereum.org/developers/docs/mev/) refers
		to a similar revenue stream for entities that are part of the block-building supply
		chain. These actors can profit from knowledge about upcoming transactions prior to
		their inclusion onchain. For this reason, wallet developers have an incentive to
		have their users' transactions go through these actors from who they can get a
		kickback, some of which may be shared with the user in the form of MEV rebates.

		Orderflow transparency helps wallet users understand who they are selling or
		giving away their valuable transaction orderflow data to, and what compensation
		they are getting from it.
	`),
	methodology: markdown(`
		Wallets are evaluated based on how transparently they disclose the set of
		entities that they transmit MEV-susceptible transaction data to, and the
		share of the kickbacks that the user will receive as a result of sending
		this information.

		To be recognized as transparently disclosing orderflow practices,
		wallets must disclose which entities may obtain information about user
		transaction intent as part of the transaction flow, prior to onchain
		transaction inclusion. A link to these entities' privacy policy or
		similar public document describing their transaction data handling
		practices must be included.

		Note that this disclosure must recursively include all entities which
		*may* profit from orderflow, not just those who are *known to*.
		This includes services for swap quotes, cross-chain bridge quotes,
		transaction simulation services, transaction scam detection services, etc.

		Since MEV extraction is often a form of fee-taking from the user,
		such disclosures must be at least as visually prominent and accessible
		as the way the wallet displays transaction fees.

		**Exemptions**:

		- Transactions that have no MEV value do not need disclosures.
			This includes simple token transfers, SIWE signature requests,
			ERC-20 token approvals, as well as non-financial transactions
			such as ENS record updates or multisig key rotation transactions.
		- Wallets which _only_ ever deal with one transaction type (e.g.
			trading-focused wallets that only support swaps) may provide a single
			disclosure upfront as part of user onboarding, rather than on each
			transaction.
		- Disclosures are not required if a wallet locally verifies that an
			entity **cannot** use transaction data for profit or user data mining.
			For example, a wallet may locally verify that the scam transaction
			detection service it is connecting to is running in a secure enclave,
			and is running code which has been audited to ensure that transaction
			data never leaks out of the enclave. If such verification is successful,
			then no disclosure is needed.
		- If a wallet only works purely locally (e.g. using a user's own node),
			then no disclosure is needed.
	`),
	ratingScale: {
		display: 'fail-pass',
		exhaustive: true,
		fail: [
			exampleRating(
				paragraph(`
					The wallet sends transactions to an RPC service provider for transaction inclusion
					and does not disclose the ability for that provider to frontrun the transaction.
				`),
				evaluateOrderflowTransparency(
					WalletProfile.GENERIC,
					completeDataCollection({
						[UserFlow.NATIVE_SWAP]: {
							collected: [
								{
									byEntity: exampleNodeCompany,
									dataCollection: {
										[WalletInfo.TRANSACTION_DATA]: CollectionPolicy.BY_DEFAULT,
										endpoint: RegularEndpoint,
									},
									purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
								},
							],
						},
					}),
					{
						[OrderflowDisclosureType.NOT_DISCLOSED]: [exampleNodeCompany],
						singleTransactionTypeUseCase: false,
						localOnly: false,
					},
				).value,
			),
		],
		partial: [
			exampleRating(
				paragraph(`
					During the user onboarding flow, the wallet discloses all entities
					to which user transaction data is sent, along with links to their
					respective privacy policies or data handling practices. However,
					this information is not shown during the transaction flow.
				`),
				evaluateOrderflowTransparency(
					WalletProfile.GENERIC,
					completeDataCollection({
						[UserFlow.NATIVE_SWAP]: {
							collected: [
								{
									byEntity: exampleNodeCompany,
									dataCollection: {
										[WalletInfo.TRANSACTION_DATA]: CollectionPolicy.BY_DEFAULT,
										endpoint: RegularEndpoint,
									},
									purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
								},
							],
						},
					}),
					{
						[OrderflowDisclosureType.DISCLOSED_DURING_USER_ONBOARDING]: [exampleNodeCompany],
						singleTransactionTypeUseCase: false,
						localOnly: false,
					},
				).value,
			),
		],
		pass: [
			exampleRating(
				paragraph(`
					The wallet discloses all entities to which user transaction data is
					sent, along with links to their respective privacy policies or data
					handling practices. This disclosure is visible on the transaction
					approval screen with the same level of visual prominence as the
					transaction fee.
				`),
				evaluateOrderflowTransparency(
					WalletProfile.GENERIC,
					completeDataCollection({
						[UserFlow.NATIVE_SWAP]: {
							collected: [
								{
									byEntity: exampleNodeCompany,
									dataCollection: {
										[WalletInfo.TRANSACTION_DATA]: CollectionPolicy.BY_DEFAULT,
										endpoint: RegularEndpoint,
									},
									purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
								},
							],
						},
					}),
					{
						[OrderflowDisclosureType.DISCLOSED_DURING_TRANSACTION_FLOW]: [exampleNodeCompany],
						singleTransactionTypeUseCase: false,
						localOnly: false,
					},
				).value,
			),
			exampleRating(
				paragraph(`
					The wallet only supports one transaction type (e.g. token swaps),
					and the set of entities to which transaction data is sent never
					changes. The wallet provides a disclosure of these entities and
					links to their privacy policies as a dedicated step of the user
					onboarding flow.
				`),
				evaluateOrderflowTransparency(
					WalletProfile.GENERIC,
					completeDataCollection({
						[UserFlow.NATIVE_SWAP]: {
							collected: [
								{
									byEntity: exampleNodeCompany,
									dataCollection: {
										[WalletInfo.TRANSACTION_DATA]: CollectionPolicy.BY_DEFAULT,
										endpoint: RegularEndpoint,
									},
									purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
								},
							],
						},
					}),
					{
						[OrderflowDisclosureType.DISCLOSED_DURING_USER_ONBOARDING]: [exampleNodeCompany],
						singleTransactionTypeUseCase: true,
						localOnly: false,
					},
				).value,
			),
			exampleRating(
				paragraph(`
					The wallet only supports transaction types which are not susceptible
					to MEV, such as peer-to-peer payments or non-financial transactions.
				`),
				evaluateOrderflowTransparency(
					WalletProfile.PAYMENTS,
					completeDataCollection({
						[UserFlow.TRANSACTION]: {
							collected: [
								{
									byEntity: exampleNodeCompany,
									dataCollection: {
										[WalletInfo.TRANSACTION_DATA]: CollectionPolicy.BY_DEFAULT,
										endpoint: RegularEndpoint,
									},
									purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
								},
							],
						},
					}),
					{
						[OrderflowDisclosureType.DISCLOSED_DURING_USER_ONBOARDING]: [exampleNodeCompany],
						singleTransactionTypeUseCase: false,
						localOnly: false,
					},
				).value,
			),
			exampleRating(
				paragraph(`
					The wallet sends transaction intent and transaction data exclusively
					to services which run in verifiable secure environments, which the
					wallet verifies. These services are verified to act in a provably
					fair manner, cannot generate transactions on their own, and do not
					export transaction data prior to onchain inclusion.
				`),
				evaluateOrderflowTransparency(
					WalletProfile.PAYMENTS,
					completeDataCollection({
						[UserFlow.TRANSACTION]: {
							collected: [
								{
									byEntity: exampleNodeCompany,
									dataCollection: {
										[WalletInfo.TRANSACTION_DATA]: CollectionPolicy.BY_DEFAULT,
										endpoint: {
											type: 'SECURE_ENCLAVE',
											endToEndEncryption: { type: 'TERMINATED_INSIDE_ENCLAVE' },
											externalLogging: { type: 'NO' },
											verifiability: {
												clientVerification: {
													type: 'VERIFIED',
													ref: 'https://some-repository.devnull',
												},
												reproducibleBuilds: true,
												sourceAvailable: true,
											},
											canGenerateOwnTransactions: false,
											exportsNonIncludedTransactionData: false,
											provablyFairOrdering: true,
										} as TransactionHandlingSecureEndpoint,
									},
									purposes: [DataCollectionPurpose.TRANSACTION_BROADCAST],
								},
							],
						},
					}),
					{
						[OrderflowDisclosureType.NOT_DISCLOSED]: [exampleNodeCompany],
						singleTransactionTypeUseCase: false,
						localOnly: false,
					},
				).value,
			),
		],
	},
	evaluate: (features: ResolvedFeatures): Evaluation<OrderflowTransparencyValue> => {
		if (features.transparency.orderflow === null || features.privacy.dataCollection === null) {
			return unrated(orderflowTransparency, brand, { entityInfo: new Map() })
		}

		return evaluateOrderflowTransparency(
			features.profile,
			features.privacy.dataCollection,
			features.transparency.orderflow,
		)
	},
	aggregate: (perVariant: AtLeastOneVariant<Evaluation<OrderflowTransparencyValue>>) =>
		pickWorstRating<OrderflowTransparencyValue>(perVariant),
}

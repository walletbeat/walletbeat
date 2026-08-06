/**
 * Parses the JSON produced by `generate-data-collection.ts` (see that file)
 * back into a real, fully-typed `VariantFeature<DataCollection>` — the same
 * pattern `parseBrowserExtensionManifest` uses for browser extension
 * manifests: validate the raw `unknown` JSON field by field, using this
 * schema's own enum/type-guard helpers, rather than casting it into shape.
 *
 * This only recognizes the shapes `WalletCaptureFile.toDataCollection` (see
 * wallet-capture-file.ts) actually produces today; anything else throws
 * loudly rather than silently mis-parsing, so if that method starts
 * emitting new shapes (e.g. `multiAddress`, non-`REGULAR` endpoints, real
 * onchain-published data, or real references), this file will need
 * updating alongside it.
 */
import { entityById, isValidEntityId } from '@/data/entities'
import type { Entity } from '@/schema/entity'
import {
	CollectionPolicy,
	collectionPolicyEnum,
	type DataCollection,
	type DataCollectionByEntity,
	type DataCollectionForFlow,
	type DataCollectionForFlowWithOnchainData,
	dataCollectionPurpose,
	type Endpoint,
	type EndpointCollection,
	EntityRole,
	entityRoleEnum,
	RegularEndpoint,
	UserFlow,
	type UserInfo,
	userInfoEnums,
} from '@/schema/features/privacy/data-collection'
import { isNoRef, type NoRef, type WithRef } from '@/schema/reference'
import { Variant, variantEnum, type VariantFeature } from '@/schema/variants'
import { isNonEmptyArray, nonEmptyMapToRecord } from '@/types/utils/non-empty'

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Safe stand-in for `String(value)` that never falls back to `[object Object]`. */
function describe(value: unknown): string {
	if (typeof value === 'string') {
		return value
	}

	try {
		return JSON.stringify(value) ?? Object.prototype.toString.call(value)
	} catch {
		return Object.prototype.toString.call(value)
	}
}

function parseEntity(value: unknown): Entity {
	const id = isPlainObject(value) ? value.id : value

	if (typeof id !== 'string' || !isValidEntityId(id)) {
		throw new Error(`Unknown entity id: ${describe(id)}`)
	}

	return entityById(id)
}

function parseRole(value: unknown): EntityRole {
	if (!entityRoleEnum.is(value)) {
		throw new Error(`Unrecognized EntityRole value: ${describe(value)}`)
	}

	return value
}

function parseCollectionPolicy(key: string, value: unknown): CollectionPolicy {
	if (!collectionPolicyEnum.is(value)) {
		throw new Error(`Unrecognized CollectionPolicy value for ${key}: ${describe(value)}`)
	}

	return value
}

function parsePurposes(value: unknown): DataCollectionByEntity['purposes'] {
	if (!Array.isArray(value)) {
		throw new Error(`Expected a purposes array, got: ${describe(value)}`)
	}

	const purposes = value.map(purpose => {
		if (!dataCollectionPurpose.is(purpose)) {
			throw new Error(`Unrecognized DataCollectionPurpose value: ${describe(purpose)}`)
		}

		return purpose
	})

	if (!isNonEmptyArray(purposes)) {
		throw new Error('Expected a non-empty purposes array')
	}

	return purposes
}

function parseRef(value: unknown): NoRef {
	if (!isNoRef(value)) {
		throw new Error(
			`Unsupported ref value (only refNotNecessary/refTodo are currently produced by the capture tool): ${describe(value)}`,
		)
	}

	return value
}

function parseEndpoint(value: unknown): Endpoint {
	if (!isPlainObject(value) || value.type !== 'REGULAR') {
		throw new Error(
			`Unsupported endpoint (only REGULAR is currently produced by the capture tool): ${describe(value)}`,
		)
	}

	return RegularEndpoint
}

function parseEndpointCollection(value: unknown): EndpointCollection {
	if (!isPlainObject(value)) {
		throw new Error(`Expected an entity data collection object, got: ${describe(value)}`)
	}

	if (Object.hasOwn(value, 'multiAddress') && value.multiAddress !== undefined) {
		throw new Error(
			'multiAddress is not yet populated by the capture tool (see wallet-capture-file.ts TODO); ' +
				'parse-data-collection.ts needs updating once it is.',
		)
	}

	const userInfoKeys: UserInfo[] = []

	for (const key of Object.keys(value)) {
		if (key === 'endpoint' || key === 'multiAddress') {
			continue
		}

		if (!userInfoEnums.is(key)) {
			throw new Error(`Unrecognized data collection key: ${key}`)
		}

		userInfoKeys.push(key)
	}

	if (!isNonEmptyArray(userInfoKeys)) {
		throw new Error('Expected at least one piece of collected user info')
	}

	return {
		endpoint: parseEndpoint(value.endpoint),
		...nonEmptyMapToRecord(userInfoKeys, key => parseCollectionPolicy(key, value[key])),
	}
}

function parseRow(value: unknown): WithRef<DataCollectionByEntity> {
	if (!isPlainObject(value)) {
		throw new Error(`Expected a data collection row, got: ${describe(value)}`)
	}

	return {
		byEntity: parseEntity(value.byEntity),
		role: parseRole(value.role),
		dataCollection: parseEndpointCollection(value.dataCollection),
		purposes: parsePurposes(value.purposes),
		ref: parseRef(value.ref),
	}
}

function parseFlowData(value: unknown): DataCollectionForFlow {
	if (!isPlainObject(value)) {
		throw new Error(`Expected flow data object, got: ${describe(value)}`)
	}

	if (!Array.isArray(value.collected)) {
		throw new Error(
			`Expected flow data 'collected' to be an array, got: ${describe(value.collected)}`,
		)
	}

	return { collected: value.collected.map(parseRow) }
}

function parsePublishedOnchain(
	value: unknown,
): DataCollectionForFlowWithOnchainData['publishedOnchain'] {
	if (value !== 'NO_DATA_PUBLISHED_ONCHAIN') {
		throw new Error(
			'Onboarding onchain data is not yet supported by the capture tool (see wallet-capture-file.ts TODO); ' +
				`parse-data-collection.ts needs updating once it is. Got: ${describe(value)}`,
		)
	}

	return value
}

function parseFlow(value: unknown): DataCollectionForFlow | null {
	return value === null ? null : parseFlowData(value)
}

function parseOnboardingFlow(value: unknown): DataCollectionForFlowWithOnchainData | null {
	if (value === null) {
		return null
	}

	if (!isPlainObject(value)) {
		throw new Error(`Expected onboarding flow data object, got: ${describe(value)}`)
	}

	return {
		...parseFlowData(value),
		publishedOnchain: parsePublishedOnchain(value.publishedOnchain),
	}
}

function parseFlowOrUnsupported(
	value: unknown,
): DataCollectionForFlow | null | 'FLOW_NOT_SUPPORTED' {
	if (value === 'FLOW_NOT_SUPPORTED' || value === null) {
		return value
	}

	return parseFlowData(value)
}

function parseDataCollectionForVariant(value: unknown): DataCollection {
	if (!isPlainObject(value)) {
		throw new Error(`Expected a per-variant data collection object, got: ${describe(value)}`)
	}

	return {
		[UserFlow.INSTALL]: parseFlow(value[UserFlow.INSTALL]),
		[UserFlow.ONBOARDING_NEW]: parseOnboardingFlow(value[UserFlow.ONBOARDING_NEW]),
		[UserFlow.ONBOARDING_IMPORT]: parseOnboardingFlow(value[UserFlow.ONBOARDING_IMPORT]),
		[UserFlow.SEND_ETHER]: parseFlowOrUnsupported(value[UserFlow.SEND_ETHER]),
		[UserFlow.SEND_USDC]: parseFlowOrUnsupported(value[UserFlow.SEND_USDC]),
		[UserFlow.NATIVE_SWAP]: parseFlowOrUnsupported(value[UserFlow.NATIVE_SWAP]),
		[UserFlow.MAKE_TRANSACTION]: parseFlowOrUnsupported(value[UserFlow.MAKE_TRANSACTION]),
		[UserFlow.APP_CONNECTION]: parseFlowOrUnsupported(value[UserFlow.APP_CONNECTION]),
	}
}

/**
 * Parse the JSON emitted by `generate-data-collection.ts` into a real
 * `VariantFeature<DataCollection>`, ready to assign directly to a wallet's
 * `privacy.dataCollection` field with no cast.
 */
export function parseDataCollection(raw: unknown): VariantFeature<DataCollection> {
	if (raw === null) {
		return null
	}

	if (!isPlainObject(raw)) {
		throw new Error(`Expected data collection JSON to be an object or null, got: ${describe(raw)}`)
	}

	const presentVariants: Variant[] = variantEnum.items.filter(variant => variant in raw)

	if (!isNonEmptyArray(presentVariants)) {
		throw new Error('Expected data collection JSON to have at least one variant')
	}

	return nonEmptyMapToRecord(presentVariants, variant => {
		const value = raw[variant]

		return value === null ? null : parseDataCollectionForVariant(value)
	})
}

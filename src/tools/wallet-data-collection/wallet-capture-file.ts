import fs from 'fs'
import path from 'path'

import { assertValidEntityId } from '@/data/entities'
import { entitiesForDomain } from '@/data/entities/domains/entity-domains'
import type { Entity } from '@/schema/entity'
import {
	CollectionPolicy,
	collectionPolicyEnum,
	compareUserInfo,
	type DataCollection,
	type DataCollectionByEntity,
	type DataCollectionForFlow,
	type DataCollectionForFlowWithOnchainData,
	DataCollectionPurpose,
	dataCollectionPurpose,
	EntityRole,
	leastConfigurableCollectionPolicy,
	PersonalInfo,
	RegularEndpoint,
	UserFlow,
	userFlow,
	userFlowMayBeMarkedUnsupported,
	type UserInfo,
	userInfoEnums,
	validateDataCollectionByEntityRow,
} from '@/schema/features/privacy/data-collection'
import { refNotNecessary, type WithRef } from '@/schema/reference'
import { type Variant, variantEnum } from '@/schema/variants'
import { type WalletType, walletTypes } from '@/schema/wallet-types'
import { isInVocabulary, isLikelyEnglish } from '@/tests/utils/grammar'
import { getErrorMessage } from '@/types/errors'
import { type Erc55Address, ethereumErc55Address } from '@/types/utils/ethereum-address'
import {
	assertNonEmptyArray,
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyConcat,
	nonEmptyGet,
	nonEmptyMapToRecord,
	nonEmptySet,
	setItems,
} from '@/types/utils/non-empty'
import { Enum, excludeFromEnum, mergeEnums } from '@/utils/enum'

import {
	expectArray,
	expectBoolean,
	expectNumber,
	expectRecord,
	expectString,
	isSameJson,
	stableJSONStringify,
} from './json-utils'
import { StringEntropy } from './string-entropy'
import {
	type SaveOptions,
	type WalletCaptureAnnotations,
	type WalletRequestMatcher,
} from './wallet-capture-annotations'

export enum RecordedOnlyFlow {
	IDLE_PRE_INSTALL = 'IDLE_PRE_INSTALL',
}

const recordedOnlyFlow = new Enum<RecordedOnlyFlow>({
	[RecordedOnlyFlow.IDLE_PRE_INSTALL]: true,
})

export type RecordedFlow = Exclude<UserFlow, UserFlow.UNCLASSIFIED> | RecordedOnlyFlow

export const recordedFlow: Enum<RecordedFlow> = mergeEnums(
	excludeFromEnum<UserFlow, UserFlow.UNCLASSIFIED>(
		userFlow,
		nonEmptySet<UserFlow>(UserFlow.UNCLASSIFIED),
	),
	recordedOnlyFlow,
)

export const flowsNotRequiringWalletAddress = nonEmptySet<RecordedFlow>(
	RecordedOnlyFlow.IDLE_PRE_INSTALL,
	UserFlow.INSTALL,
	UserFlow.ONBOARDING_NEW,
)

interface EncodedWalletDataFlow {
	requests: EncodedWalletDataRequest[]
}

/**
 * Encoded representation of a UserDataString: raw string with optional piece classification.
 */
interface EncodedUserDataString {
	str: string
	piece?: UserInfo
	pieces?: UserInfo[]
}

/**
 * Encoded representation of a deduplicated set of UserDataString objects.
 */
type EncodedUserDataStringStore = EncodedUserDataString[]

interface EncodedWalletDataRequest {
	domain: string
	path: string
	sessionTime: number

	/**
	 * Encoded as omitted if empty, otherwise Record<key, string | string[]>.
	 */
	query?: EncodedMultiDict

	/**
	 * Encoded as:
	 * - omitted if empty
	 * - a string if exactly one method
	 * - an array of strings if multiple methods
	 */
	jsonRpcMethod?: string | string[]

	/**
	 * Encoded as omitted if absent, otherwise a plain string for ASCII content,
	 * or a base64 object for non-ASCII content.
	 */
	content?: string | EncodedContentBase64

	cookies?: EncodedMultiDict
	refererDomain?: string
	oddHeaders?: EncodedMultiDict
	oddTrailers?: EncodedMultiDict

	/**
	 * Encoded only when present and not 200.
	 */
	responseStatus?: number

	/**
	 * Encoded as omitted if empty, otherwise EncodedMultiDict.
	 * Mirrors the structure of oddHeaders/oddTrailers.
	 */
	responseOddHeaders?: EncodedMultiDict

	/**
	 * Encoded as omitted if absent or trivial (empty / "{}"),
	 * otherwise one of:
	 * - a plain string (≤4096 bytes, ASCII)
	 * - a { type: 'base64', base64: ... } object (≤4096 bytes, non-ASCII)
	 * - a { type: 'abbreviated', ... } object (>4096 bytes)
	 */
	responsePayload?: EncodedResponsePayload

	review?: EncodedWalletRequestReview
}

/**
 * Encoded representation of request content when it contains non-ASCII characters.
 */
interface EncodedContentBase64 {
	type: 'base64'
	base64: string
}

/**
 * Encoded representation of a response payload.
 * - plain string: ≤4096 bytes, ASCII only
 * - base64 object: ≤4096 bytes, contains non-ASCII
 * - abbreviated object: >4096 bytes
 */
interface EncodedResponsePayloadBase64 {
	type: 'base64'
	base64: string
}

interface EncodedResponsePayloadAbbreviated {
	type: 'abbreviated'
	length: number
	encoding: 'raw' | 'base64'
	prefix: string
	suffix: string
	sha256: string
	format: 'unknown' | 'json' | 'ndjson' | 'query'
	uniqueKeys?: string[] | string
	prunedUniqueKeys?: number
	ethereum?: string[]
}

type EncodedResponsePayload =
	| string
	| EncodedResponsePayloadBase64
	| EncodedResponsePayloadAbbreviated

/**
 * How query params / cookies / headers are encoded.
 * Each key maps to either:
 * - a single string (if only one value)
 * - or an array of strings (if multiple values)
 */
type EncodedMultiDict = Record<string, string | NonEmptyArray<string>>

interface EncodedWalletRequestReview {
	manuallyReviewed: boolean
	extraPurposes?: 'NOT_WALLET_INITIATED' | DataCollectionPurpose[]
	extraUserData?: UserInfo[]
	collectionPolicy?: CollectionPolicy
}

interface EncodedWalletCaptureFlow {
	requests: EncodedWalletDataRequest[]
}

interface EncodedWalletCaptureFile {
	identity: WalletCaptureFileIdentity
	flows: Record<string, EncodedWalletCaptureFlow | 'NOT_SUPPORTED'>
	userData: EncodedUserDataStringStore
	sessions: number
}

function parseEncodedWalletRequestReview(v: unknown, at: string): EncodedWalletRequestReview {
	const obj = expectRecord(v, at)

	const manuallyReviewed = expectBoolean(obj.manuallyReviewed, `${at}.manuallyReviewed`)

	let extraPurposes: DataCollectionPurpose[] | 'NOT_WALLET_INITIATED' | undefined

	if (obj.extraPurposes !== undefined) {
		if (Array.isArray(obj.extraPurposes)) {
			const rawPurposes = expectArray(obj.extraPurposes, `${at}.extraPurposes`)

			extraPurposes = rawPurposes.map((p, i) =>
				dataCollectionPurpose.assert(expectString(p, `${at}.extraPurposes[${i}]`)),
			)
		} else if (typeof obj.extraPurposes === 'string') {
			if (obj.extraPurposes !== 'NOT_WALLET_INITIATED') {
				throw new Error(`Unexpected ${at}.extraPurposes=${obj.extraPurposes}`)
			}

			extraPurposes = 'NOT_WALLET_INITIATED'
		} else {
			throw new Error(`Unexpected type for ${at}.extraPurposes: ${typeof obj.extraPurposes}`)
		}
	}

	let extraUserData: UserInfo[] | undefined

	if (obj.extraUserData !== undefined) {
		const rawData = expectArray(obj.extraUserData, `${at}.extraUserData`)

		extraUserData = rawData.map((d, i) =>
			userInfoEnums.assert(expectString(d, `${at}.extraUserData[${i}]`)),
		)
	}

	let collectionPolicy: CollectionPolicy | undefined = undefined

	if (obj.collectionPolicy !== undefined) {
		collectionPolicy = collectionPolicyEnum.assert(
			expectString(obj.collectionPolicy, `${at}.collectionPolicy`),
		)
	}

	return {
		manuallyReviewed,
		...(extraPurposes !== undefined && extraPurposes.length > 0 ? { extraPurposes } : {}),
		...(extraUserData !== undefined && extraUserData.length > 0 ? { extraUserData } : {}),
		...(collectionPolicy !== undefined ? { collectionPolicy } : {}),
	}
}

function parseEncodedMultiDict(v: unknown, at: string): EncodedMultiDict {
	const obj = expectRecord(v, at)
	const out: EncodedMultiDict = {}

	for (const [k, rawVal] of Object.entries(obj)) {
		const keyAt = `${at}[${JSON.stringify(k)}]`

		if (Array.isArray(rawVal)) {
			out[k] = assertNonEmptyArray(rawVal.map((x, i) => expectString(x, `${keyAt}[${i}]`)))
		} else if (typeof rawVal === 'string') {
			out[k] = expectString(rawVal, keyAt)
		}
	}

	return out
}

function _collectUniqueKeysFromObj(obj: unknown): Set<string> {
	const keys = new Set<string>()

	if (typeof obj === 'object' && obj !== null) {
		if (Array.isArray(obj)) {
			for (const item of obj) {
				const subKeys = _collectUniqueKeysFromObj(item)

				for (const key of subKeys) {
					keys.add(key)
				}
			}
		} else {
			for (const [key, value] of Object.entries(obj)) {
				keys.add(key)
				const subKeys = _collectUniqueKeysFromObj(value)

				for (const key of subKeys) {
					keys.add(key)
				}
			}
		}
	}

	return keys
}

/** Regex that matches 0x-prefixed hex strings (case-insensitive), bounded by non-hex chars. */
const ethereumHexPattern = /(?<![0-9a-fA-F])(0x[0-9a-fA-F]+)(?![0-9a-fA-F])/gi

function _isEthereumTxid(s: string): boolean {
	return s.length === 66 && s.startsWith('0x', 0)
}

function _isEthereumAddress(s: string): boolean {
	return s.length === 42 && s.startsWith('0x', 0)
}

function _extractEthereumValues(
	text: string,
): { addresses: Erc55Address[]; txids: string[] } | null {
	const matches = text.match(ethereumHexPattern)

	if (!matches) {
		return null
	}

	const addresses = new Set<Erc55Address>()
	const txids = new Set<string>()

	for (const m of matches) {
		const lower = m.toLowerCase()

		if (_isEthereumTxid(lower)) {
			txids.add(lower)
		} else if (_isEthereumAddress(lower)) {
			addresses.add(ethereumErc55Address(lower))
		}
	}

	if (addresses.size === 0 && txids.size === 0) {
		return null
	}

	return {
		addresses: [...addresses].sort(),
		txids: [...txids].sort(),
	}
}

function _tryParseUniqueKeys(str: string): {
	format: 'unknown' | 'json' | 'ndjson' | 'query'
	uniqueKeys: string[] | null
} {
	// Attempt JSON
	try {
		const parsed: unknown = JSON.parse(str.trim())
		const keys = _collectUniqueKeysFromObj(parsed)

		if (keys.size > 0) {
			return { format: 'json', uniqueKeys: [...keys].sort() }
		}

		return { format: 'json', uniqueKeys: null }
	} catch {
		/* Not JSON */
	}

	// Attempt NDJSON
	if (str.includes('\n')) {
		const lines = str.split('\n').filter(line => line.trim() !== '')

		if (lines.length > 0) {
			const allKeys = new Set<string>()
			let ndjsonOk = true

			for (const line of lines) {
				try {
					const parsed: unknown = JSON.parse(line.trim())
					const keys = _collectUniqueKeysFromObj(parsed)

					for (const key of keys) {
						allKeys.add(key)
					}
				} catch {
					ndjsonOk = false
					break
				}
			}

			if (ndjsonOk) {
				if (allKeys.size > 0) {
					return { format: 'ndjson', uniqueKeys: [...allKeys].sort() }
				}

				return { format: 'ndjson', uniqueKeys: null }
			}
		}
	}

	// Attempt query string
	if (str.includes('&') || str.includes('=')) {
		try {
			const decoded = decodeURIComponent(str)
			const qsKeys = new Set<string>()

			for (const pair of decoded.split('&')) {
				if (!pair) {
					continue
				}

				const eqIdx = pair.indexOf('=')
				const key = eqIdx >= 0 ? pair.slice(0, eqIdx) : pair

				qsKeys.add(key)
			}

			if (qsKeys.size > 0) {
				return { format: 'query', uniqueKeys: [...qsKeys].sort() }
			}

			return { format: 'query', uniqueKeys: null }
		} catch {
			/* Not a valid query string */
		}
	}

	return { format: 'unknown', uniqueKeys: null }
}

function _decodeBase64ToBytes(b64: string): Uint8Array {
	const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
	const binaryStr = atob(padded)
	const bytes = new Uint8Array(binaryStr.length)

	for (let i = 0; i < binaryStr.length; i++) {
		bytes[i] = binaryStr.charCodeAt(i)
	}

	return bytes
}

function _validateResponsePayloadEncoding(
	v: unknown,
	at: string,
): asserts v is EncodedResponsePayload {
	if (typeof v === 'string') {
		return
	}

	const obj = expectRecord(v, at)

	if (obj.type === 'base64') {
		if (typeof obj.base64 !== 'string') {
			throw new Error(`Expected string at ${at}.base64`)
		}

		if (Object.keys(obj).length !== 2) {
			throw new Error(`Unexpected extra keys in ${at}: expected only 'type' and 'base64'`)
		}

		return
	}

	if (obj.type === 'abbreviated') {
		if (typeof obj.length !== 'number') {
			throw new Error(`Expected number at ${at}.length`)
		}

		if (obj.encoding !== 'raw' && obj.encoding !== 'base64') {
			throw new Error(`Expected 'raw' or 'base64' at ${at}.encoding, got ${String(obj.encoding)}`)
		}

		if (typeof obj.prefix !== 'string') {
			throw new Error(`Expected string at ${at}.prefix`)
		}

		if (typeof obj.suffix !== 'string') {
			throw new Error(`Expected string at ${at}.suffix`)
		}

		if (typeof obj.sha256 !== 'string') {
			throw new Error(`Expected string at ${at}.sha256`)
		}

		const validFormats = ['unknown', 'json', 'ndjson', 'query']

		if (typeof obj.format !== 'string' || !validFormats.includes(obj.format)) {
			throw new Error(
				`Expected format in [${validFormats.join(', ')}] at ${at}.format, got ${String(obj.format)}`,
			)
		}

		if (obj.uniqueKeys !== undefined) {
			if (typeof obj.uniqueKeys === 'string') {
				expectString(obj.uniqueKeys, `${at}.uniqueKeys`)
			} else {
				const keys = expectArray(obj.uniqueKeys, `${at}.uniqueKeys`)

				keys.forEach((k, i) => expectString(k, `${at}.uniqueKeys[${i}]`))
			}
		}

		if (obj.prunedUniqueKeys !== undefined) {
			expectNumber(obj.prunedUniqueKeys, `${at}.prunedUniqueKeys`)
		}

		return
	}

	throw new Error(`Unexpected type at ${at}.type: ${String(obj.type)}`)
}

function parseEncodedResponsePayload(v: unknown, at: string): EncodedResponsePayload {
	_validateResponsePayloadEncoding(v, at)

	return v
}

/**
 * Decoded representation of a response payload.
 * The full string is only available for payloads ≤4096 bytes (cases a/b).
 * For abbreviated payloads, str() returns null and metadata is available.
 */
export class DecodedResponsePayload {
	private readonly _encoded: EncodedResponsePayload
	private _str: string | null = null
	private _uniqueKeys: string[] = []
	private _byteLength: number = 0
	private _format: 'unknown' | 'json' | 'ndjson' | 'query' = 'unknown'
	private _sha256: string | null = null
	private _prefix: string | null = null
	private _suffix: string | null = null
	private _ethereumAddresses: Erc55Address[] = []
	private _ethereumTransactions: string[] = []
	private _computed = false

	private constructor(encoded: EncodedResponsePayload) {
		this._encoded = encoded
	}

	/** Returns the full string if available, or null otherwise. */
	public str(): string | null {
		this._ensureComputed()

		return this._str
	}

	/** Returns unique keys. */
	public uniqueKeys(): string[] {
		this._ensureComputed()

		return this._uniqueKeys
	}

	/** Byte length of the full response. */
	public byteLength(): number {
		this._ensureComputed()

		return this._byteLength
	}

	/** Format. */
	public format(): 'unknown' | 'json' | 'ndjson' | 'query' {
		this._ensureComputed()

		return this._format
	}

	/** SHA-256 hex digest. Only available for abbreviated payloads. */
	public sha256(): string | null {
		this._ensureComputed()

		return this._sha256
	}

	/** Returns prefix for abbreviated payloads, or null for full payloads. */
	public prefix(): string | null {
		this._ensureComputed()

		return this._str === null ? this._prefix : null
	}

	/** Returns suffix for abbreviated payloads, or null for full payloads. */
	public suffix(): string | null {
		this._ensureComputed()

		return this._str === null ? this._suffix : null
	}

	/**
	 * Returns Ethereum addresses found in the payload.
	 * For abbreviated payloads with the pre-extracted `ethereum` field,
	 * uses that data. For full payloads (string/base64), scans the raw text.
	 * Returns addresses normalized to lowercase.
	 */
	public ethereumAddresses(): Erc55Address[] {
		this._ensureComputed()

		return this._ethereumAddresses
	}

	/**
	 * Returns Ethereum transaction hashes found in the payload.
	 * For abbreviated payloads with the pre-extracted `ethereum` field,
	 * uses that data. For full payloads (string/base64), scans the raw text.
	 * Returns txids normalized to lowercase.
	 */
	public ethereumTransactions(): string[] {
		this._ensureComputed()

		return this._ethereumTransactions
	}

	private _ensureComputed(): void {
		if (this._computed) {
			return
		}

		if (typeof this._encoded === 'string') {
			this._str = this._encoded
			this._byteLength = new TextEncoder().encode(this._encoded).byteLength
			const { format, uniqueKeys } = _tryParseUniqueKeys(this._encoded)

			this._format = format
			this._uniqueKeys = uniqueKeys ?? []

			const ethValues = _extractEthereumValues(this._encoded)

			if (ethValues) {
				this._ethereumAddresses = ethValues.addresses
				this._ethereumTransactions = ethValues.txids
			}
		} else if (this._encoded.type === 'base64') {
			const bytes = _decodeBase64ToBytes(this._encoded.base64)

			this._str = new TextDecoder('utf-8').decode(bytes)
			this._byteLength = bytes.byteLength
			const { format, uniqueKeys } = _tryParseUniqueKeys(this._str)

			this._format = format
			this._uniqueKeys = uniqueKeys ?? []

			const ethValues = _extractEthereumValues(this._str)

			if (ethValues) {
				this._ethereumAddresses = ethValues.addresses
				this._ethereumTransactions = ethValues.txids
			}
		} else {
			this._str = null
			this._byteLength = this._encoded.length
			this._format = this._encoded.format
			this._uniqueKeys =
				typeof this._encoded.uniqueKeys === 'string'
					? this._encoded.uniqueKeys.split('|')
					: (this._encoded.uniqueKeys ?? [])
			this._sha256 = this._encoded.sha256
			this._prefix = this._encoded.prefix
			this._suffix = this._encoded.suffix

			if (this._encoded.ethereum) {
				// Pre-extracted ethereum field: split by length (txids = 66, addresses = 42)
				for (const val of this._encoded.ethereum) {
					if (val.length === 66) {
						this._ethereumTransactions.push(val)
					} else {
						this._ethereumAddresses.push(ethereumErc55Address(val))
					}
				}
			}
		}

		this._computed = true
	}

	public static fromEncoded(encoded: EncodedResponsePayload): DecodedResponsePayload {
		return new DecodedResponsePayload(encoded)
	}
}

function parseWalletDataRequest(v: unknown, at: string): EncodedWalletDataRequest {
	const obj = expectRecord(v, at)

	const domain = expectString(obj.domain, `${at}.domain`)
	const path = expectString(obj.path, `${at}.path`)
	const sessionTime = expectNumber(obj.sessionTime, `${at}.sessionTime`)

	let query: EncodedMultiDict | undefined

	if (obj.query !== undefined) {
		query = parseEncodedMultiDict(obj.query, `${at}.query`)
	}

	let cookies: EncodedMultiDict | undefined

	if (obj.cookies !== undefined) {
		cookies = parseEncodedMultiDict(obj.cookies, `${at}.cookies`)
	}

	let refererDomain: string | undefined

	if (obj.refererDomain !== undefined) {
		refererDomain = expectString(obj.refererDomain, `${at}.refererDomain`)
	}

	let oddHeaders: EncodedMultiDict | undefined

	if (obj.oddHeaders !== undefined) {
		oddHeaders = parseEncodedMultiDict(obj.oddHeaders, `${at}.oddHeaders`)
	}

	let oddTrailers: EncodedMultiDict | undefined

	if (obj.oddTrailers !== undefined) {
		oddTrailers = parseEncodedMultiDict(obj.oddTrailers, `${at}.oddTrailers`)
	}

	let content: string | undefined

	if (obj.content !== undefined) {
		if (typeof obj.content === 'string') {
			content = expectString(obj.content, `${at}.content`)
		} else {
			const record = expectRecord(obj.content, `${at}.content`)

			if (record.type !== 'base64') {
				throw new Error(`Expected 'base64' at ${at}.content.type, got ${String(record.type)}`)
			}

			if (typeof record.base64 !== 'string') {
				throw new Error(`Expected string at ${at}.content.base64`)
			}

			const b64 = record.base64
			const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)

			content = new TextDecoder('utf-8').decode(Uint8Array.from(atob(padded), c => c.charCodeAt(0)))
		}
	}

	let jsonRpcMethod: string | string[] | undefined

	if (obj.jsonRpcMethod !== undefined) {
		if (typeof obj.jsonRpcMethod === 'string') {
			jsonRpcMethod = obj.jsonRpcMethod
		} else if (Array.isArray(obj.jsonRpcMethod)) {
			jsonRpcMethod = obj.jsonRpcMethod.map((x, i) => expectString(x, `${at}.jsonRpcMethod[${i}]`))
		} else {
			throw new Error(`Expected string or string[] at ${at}.jsonRpcMethod`)
		}
	}

	let review: EncodedWalletRequestReview | undefined

	if (obj.review !== undefined) {
		review = parseEncodedWalletRequestReview(obj.review, `${at}.review`)
	}

	let responseStatus: number | undefined

	if (obj.responseStatus !== undefined) {
		responseStatus = expectNumber(obj.responseStatus, `${at}.responseStatus`)
	}

	let responseOddHeaders: EncodedMultiDict | undefined

	if (obj.responseOddHeaders !== undefined) {
		responseOddHeaders = parseEncodedMultiDict(obj.responseOddHeaders, `${at}.responseOddHeaders`)
	}

	let responsePayload: EncodedResponsePayload | undefined

	if (obj.responsePayload !== undefined) {
		responsePayload = parseEncodedResponsePayload(obj.responsePayload, `${at}.responsePayload`)
	}

	return {
		domain,
		path,
		sessionTime,
		...(query && Object.keys(query).length ? { query } : {}),
		...(cookies && Object.keys(cookies).length ? { cookies } : {}),
		...(refererDomain ? { refererDomain } : {}),
		...(oddHeaders && Object.keys(oddHeaders).length ? { oddHeaders } : {}),
		...(oddTrailers && Object.keys(oddTrailers).length ? { oddTrailers } : {}),
		...(content ? { content } : {}),
		...(jsonRpcMethod ? { jsonRpcMethod } : {}),
		...(responseStatus !== undefined ? { responseStatus } : {}),
		...(responseOddHeaders && Object.keys(responseOddHeaders).length ? { responseOddHeaders } : {}),
		...(responsePayload ? { responsePayload } : {}),
		...(review ? { review } : {}),
	}
}

function parseWalletDataFlow(v: unknown, at: string): EncodedWalletDataFlow {
	const obj = expectRecord(v, at)
	const requestsRaw = expectArray(obj.requests, `${at}.requests`)
	const requests = requestsRaw.map((x, i) => parseWalletDataRequest(x, `${at}.requests[${i}]`))

	return { requests }
}

// ============  UserDataString  ============

/**
 * A raw string paired with classified UserInfo pieces. Stored with deduplication.
 */
export class UserDataString {
	public readonly str: string
	public readonly pieces: ReadonlySet<UserInfo>

	constructor(str: string, pieces: Iterable<UserInfo>) {
		this.str = str
		this.pieces = new Set(pieces)

		if (str === '' && this.pieces.size > 0) {
			throw new Error('Cannot create a user-data-carrying UserDataString with an empty string')
		}
	}

	public static decode(data: unknown, at: string): UserDataString {
		const record = expectRecord(data, at)
		const pieces: UserInfo[] = []

		if (record.piece !== undefined) {
			pieces.push(userInfoEnums.assert(record.piece))
		}

		if (record.pieces !== undefined) {
			pieces.push(...userInfoEnums.assertArray(record.pieces))
		}

		return new UserDataString(expectString(record.str, `${at}.str`), assertNonEmptyArray(pieces))
	}

	public encode(): EncodedUserDataString {
		const sortedPieces = [...this.pieces].sort(compareUserInfo)
		const result: EncodedUserDataString = { str: this.str }

		if (sortedPieces.length === 1) {
			result.piece = sortedPieces[0]
		} else if (sortedPieces.length > 1) {
			result.pieces = sortedPieces
		}

		return result
	}

	public equals(other: UserDataString): boolean {
		if (this.str !== other.str || this.pieces.size !== other.pieces.size) {
			return false
		}

		for (const item of this.pieces) {
			if (!other.pieces.has(item)) {
				return false
			}
		}

		return true
	}

	public withMerged(...userInfo: UserInfo[]): UserDataString {
		const newSet: Set<UserInfo> = new Set()

		for (const info of this.pieces) {
			newSet.add(info)
		}

		for (const info of userInfo) {
			newSet.add(info)
		}

		return new UserDataString(this.str, newSet)
	}
}

/**
 * A deduplicated set of UserDataString objects.
 */
export class UserDataStringStore {
	private readonly _index: Map<string, UserDataString> = new Map()

	public static newStore(): UserDataStringStore {
		return new UserDataStringStore()
	}

	public static fromJSON(data: unknown, at: string): UserDataStringStore {
		const store = new UserDataStringStore()

		for (const itemData of expectArray(data, `${at}.userData`)) {
			const item = UserDataString.decode(itemData, `${at}.userData[]`)

			store.add(item)
		}

		return store
	}

	public add(item: UserDataString): void {
		const existing = this._index.get(item.str)

		if (existing === undefined) {
			this._index.set(item.str, item)
		} else {
			this._index.set(item.str, existing.withMerged(...item.pieces))
		}
	}

	public get(str: string): UserDataString | undefined {
		return this._index.get(str)
	}

	public toJSON(): EncodedUserDataStringStore {
		return Array.from(this._index.values())
			.sort((a, b) => a.str.localeCompare(b.str))
			.map(item => item.encode())
	}
}

// ============  WalletDataString  ============

enum WalletStringOccurrenceType {
	HEADER = 'HEADER',
	TRAILER = 'TRAILER',
	QUERY = 'QUERY',
	COOKIE = 'COOKIE',
	PAYLOAD = 'PAYLOAD',
	RESPONSE_HEADER = 'RESPONSE_HEADER',
	RESPONSE_PAYLOAD = 'RESPONSE_PAYLOAD',
}

const walletStringOccurrenceType = new Enum<WalletStringOccurrenceType>({
	[WalletStringOccurrenceType.HEADER]: true,
	[WalletStringOccurrenceType.TRAILER]: true,
	[WalletStringOccurrenceType.QUERY]: true,
	[WalletStringOccurrenceType.COOKIE]: true,
	[WalletStringOccurrenceType.PAYLOAD]: true,
	[WalletStringOccurrenceType.RESPONSE_HEADER]: true,
	[WalletStringOccurrenceType.RESPONSE_PAYLOAD]: true,
})

export type WalletDataStringBreadcrumb =
	| {
			type: WalletStringOccurrenceType.HEADER
	  }
	| {
			type: WalletStringOccurrenceType.TRAILER
	  }
	| {
			type: WalletStringOccurrenceType.QUERY
	  }
	| {
			type: WalletStringOccurrenceType.COOKIE
	  }
	| {
			type: WalletStringOccurrenceType.PAYLOAD
	  }
	| {
			type: WalletStringOccurrenceType.RESPONSE_HEADER
	  }
	| {
			type: WalletStringOccurrenceType.RESPONSE_PAYLOAD
	  }
	| {
			type: 'INDEX'
			index: number
	  }
	| { type: 'KEY'; key: string; branch: 'KEY' | 'VALUE' }
	| ({ type: 'MULTI_KEY'; key: string } & (
			| {
					branch: 'KEY'
			  }
			| {
					branch: 'VALUE'
					index: number
			  }
	  ))
	| {
			type: 'BASE64_DECODE'
	  }
	| { type: 'JSON_DECODE' }
	| { type: 'NDJSON_DECODE' }
	| { type: 'QUERY_STRING_DECODE' }
	| { type: 'SUBSTRING'; from: number; to: number }

function breadcrumbToString(breadcrumb: WalletDataStringBreadcrumb): string {
	if (walletStringOccurrenceType.is(breadcrumb.type)) {
		return breadcrumb.type.toString()
	}

	switch (breadcrumb.type) {
		case 'BASE64_DECODE':
			return 'BASE64_DECODE'
		case 'INDEX':
			return `INDEX:${breadcrumb.index}`
		case 'JSON_DECODE':
			return 'JSON_DECODE'
		case 'NDJSON_DECODE':
			return 'NDJSON_DECODE'
		case 'QUERY_STRING_DECODE':
			return 'QUERY_STRING_DECODE'
		case 'KEY':
			return `KEY:${breadcrumb.key}:${breadcrumb.branch}`
		case 'MULTI_KEY':
			return `MULTI_KEY:${breadcrumb.key}:${breadcrumb.branch}:${breadcrumb.branch === 'KEY' ? '' : ':' + breadcrumb.index.toString()}`
		case 'SUBSTRING':
			return `SUBSTRING:${breadcrumb.from}:${breadcrumb.to}`
		default:
			throw new Error('unimplemented breadcrumb type')
	}
}

export class WalletDataStringBreadcrumbs {
	private readonly breadcrumbs: NonEmptyArray<WalletDataStringBreadcrumb>
	constructor(breadcrumbs: NonEmptyArray<WalletDataStringBreadcrumb>) {
		this.breadcrumbs = breadcrumbs
	}
	public get key(): string {
		return this.breadcrumbs.map(breadcrumbToString).join(',')
	}
	public toString(): string {
		return this.breadcrumbs.map(breadcrumbToString).join(' → ')
	}
	public add(breadcrumb: WalletDataStringBreadcrumb): WalletDataStringBreadcrumbs {
		return new WalletDataStringBreadcrumbs(nonEmptyConcat([this.breadcrumbs, [breadcrumb]]))
	}

	/**
	 * @returns A map key that can be used to roughly verify whether this WalletDataStringBreadcrumbs came from a similar-ish source as another, if the keys match.
	 */
	public roughKey(): string {
		const second = <T extends WalletDataStringBreadcrumb['type']>(
			assertType: T,
		): WalletDataStringBreadcrumb & { type: T } => {
			if (this.breadcrumbs.length < 2) {
				throw new Error('unexpected breadcrumb sequence')
			}

			const second = this.breadcrumbs[1]

			if (second.type !== assertType) {
				throw new Error(
					`second breadcrumb after ${this.breadcrumbs[0].type} was of unexpected type ${second.type} (want: ${assertType})`,
				)
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we just checked.
			return second as WalletDataStringBreadcrumb & { type: T }
		}

		switch (this.breadcrumbs[0].type) {
			case WalletStringOccurrenceType.COOKIE:
				return `Cookie: ${second('MULTI_KEY').key}`
			case WalletStringOccurrenceType.HEADER:
				return `Header: ${second('MULTI_KEY').key}`
			case WalletStringOccurrenceType.TRAILER:
				return `Trailer: ${second('MULTI_KEY').key}`
			case WalletStringOccurrenceType.QUERY:
				return `Query: ${second('MULTI_KEY').key}`
			case WalletStringOccurrenceType.PAYLOAD:
				return 'Payload'
			case WalletStringOccurrenceType.RESPONSE_HEADER:
				return `RespHeader: ${second('MULTI_KEY').key}`
			case WalletStringOccurrenceType.RESPONSE_PAYLOAD:
				return 'Response'
			case 'BASE64_DECODE':
				return ''
			case 'INDEX':
				return ''
			case 'JSON_DECODE':
				return ''
			case 'KEY':
				return ''
			case 'MULTI_KEY':
				return ''
			case 'NDJSON_DECODE':
				return ''
			case 'QUERY_STRING_DECODE':
				return ''
			case 'SUBSTRING':
				return ''
			default:
				throw new Error('unimplemented breadcrumb type')
		}
	}
}

export class WalletDataStringOrigin {
	public readonly request: WalletRequest
	public readonly breadcrumbs: WalletDataStringBreadcrumbs
	constructor(request: WalletRequest, breadcrumbs: WalletDataStringBreadcrumbs) {
		this.request = request
		this.breadcrumbs = breadcrumbs
	}
	public get key(): string {
		return `${this.request.key}:${this.breadcrumbs.key}`
	}
	public add(breadcrumb: WalletDataStringBreadcrumb): WalletDataStringOrigin {
		return new WalletDataStringOrigin(this.request, this.breadcrumbs.add(breadcrumb))
	}
	public keyByDomainAndRoughBreadcrumbs(): string {
		return `${this.request.domain}: ${this.breadcrumbs.roughKey()}`
	}
}

export class WalletDataString {
	public static highestScoreFirst(a: WalletDataString, b: WalletDataString): number {
		return b.score - a.score
	}

	public static async createMany(
		strings: WalletDataStrings,
		str: string,
		origin: WalletDataStringOrigin,
	): Promise<WalletDataString[]> {
		if (str === '') {
			return []
		}

		// Try JSON parsing
		const jsonResult = await WalletDataString._tryParseAsJson(strings, str, origin)

		if (jsonResult !== null) {
			return jsonResult
		}

		if (str.includes('\n')) {
			const ndjsonResult = await WalletDataString._tryParseAsJsonLines(strings, str, origin)

			if (ndjsonResult !== null) {
				return ndjsonResult
			}
		}

		// Try query string parsing
		const queryResult = await WalletDataString._tryParseAsQueryString(strings, str, origin)

		if (queryResult !== null) {
			return queryResult
		}

		const substrResult = await WalletDataString._tryFindSubstrings(strings, str, origin)

		if (substrResult !== null) {
			return substrResult
		}

		// Check if we are dealing with english text.
		// Normalize slugs and CamelCase as we go.
		const normalizedText = str.replaceAll(/([a-z])([A-Z])/g, '$1 $2').replaceAll(/[-_.,/\s]+/g, ' ')

		if (isInVocabulary(normalizedText)) {
			return []
		}

		if (
			normalizedText.includes(' ') &&
			normalizedText.split(' ').every(v => v.trim() === '' || isInVocabulary(v.trim()))
		) {
			return []
		}

		if (await isLikelyEnglish(normalizedText)) {
			return []
		}

		// Fallback: treat the entire string as a single WalletDataString
		return [new WalletDataString(new UserDataString(str, new Set()), origin)]
	}

	private static async _tryParseAsQueryString(
		strings: WalletDataStrings,
		str: string,
		origin: WalletDataStringOrigin,
	): Promise<WalletDataString[] | null> {
		// Only attempt if the string contains query-like characters
		if (!str.includes('&') && !str.includes('=')) {
			return null
		}

		let decoded: string

		try {
			decoded = decodeURIComponent(str)
		} catch {
			return null
		}

		const results: WalletDataString[] = []
		const pairs = decoded.split('&')
		const originWithQuery = origin.add({ type: 'QUERY_STRING_DECODE' })
		const numOccurrences: Map<string, number> = new Map()

		for (let i = 0; i < pairs.length; i++) {
			const pair = pairs[i]

			if (pair === '') {
				continue
			}

			const eqIndex = pair.indexOf('=')

			if (eqIndex === -1) {
				// Key without value
				if (!numOccurrences.has(pair)) {
					results.push(
						...(await WalletDataString.createMany(
							strings,
							pair,
							originWithQuery.add({
								type: 'MULTI_KEY',
								key: pair,
								branch: 'KEY',
							}),
						)),
					)
					numOccurrences.set(pair, 0)
				}
			} else {
				const key = pair.slice(0, eqIndex)

				if (!numOccurrences.has(key)) {
					results.push(
						...(await WalletDataString.createMany(
							strings,
							key,
							originWithQuery.add({
								type: 'MULTI_KEY',
								key: key,
								branch: 'KEY',
							}),
						)),
					)
				}

				const numOccurrence = numOccurrences.get(key) ?? 0
				const value = pair.slice(eqIndex + 1)

				results.push(
					...(await WalletDataString.createMany(
						strings,
						value,
						originWithQuery.add({
							type: 'MULTI_KEY',
							key: key,
							branch: 'VALUE',
							index: numOccurrence,
						}),
					)),
				)
				numOccurrences.set(pair, numOccurrence + 1)
			}
		}

		if (results.length === 0) {
			return null
		}

		return results
	}

	private static async _tryParseAsJson(
		strings: WalletDataStrings,
		str: string,
		origin: WalletDataStringOrigin,
	): Promise<WalletDataString[] | null> {
		let parsed: unknown

		try {
			parsed = JSON.parse(str.trim())
		} catch {
			return null
		}

		return await WalletDataString._extractJsonStrings(
			strings,
			parsed,
			origin.add({ type: 'JSON_DECODE' }),
		)
	}

	private static async _tryParseAsJsonLines(
		strings: WalletDataStrings,
		str: string,
		origin: WalletDataStringOrigin,
	): Promise<WalletDataString[] | null> {
		const lines = str.split('\n').filter(line => line.trim() !== '')

		if (lines.length === 0) {
			return null
		}

		const results: WalletDataString[] = []
		const originWithNDJSON = origin.add({ type: 'NDJSON_DECODE' })

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim()
			let parsed: unknown

			try {
				parsed = JSON.parse(line)
			} catch {
				return null
			}

			results.push(
				...(await WalletDataString._extractJsonStrings(
					strings,
					parsed,
					originWithNDJSON.add({ type: 'INDEX', index: i }),
				)),
			)
		}

		return results
	}

	private static async _extractJsonStrings(
		strings: WalletDataStrings,
		value: unknown,
		origin: WalletDataStringOrigin,
	): Promise<WalletDataString[]> {
		const results: WalletDataString[] = []

		if (value === undefined || value === null) {
			return results
		}

		if (typeof value === 'string') {
			results.push(...(await WalletDataString.createMany(strings, value, origin)))
		} else if (Array.isArray(value)) {
			await Promise.all(
				value.map(async (val, i) => {
					results.push(
						...(await WalletDataString._extractJsonStrings(
							strings,
							val,
							origin.add({ type: 'INDEX', index: i }),
						)),
					)
				}),
			)
		} else if (typeof value === 'object') {
			for (const key of Object.keys(value).sort()) {
				results.push(
					...(await WalletDataString.createMany(
						strings,
						key,
						origin.add({ type: 'KEY', key, branch: 'KEY' }),
					)),
				)

				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know `key` is a key of `value`.
				const obj = value as { [key]: unknown }

				results.push(
					...(await WalletDataString._extractJsonStrings(
						strings,
						obj[key],
						origin.add({ type: 'KEY', key, branch: 'VALUE' }),
					)),
				)
			}
		}
		// Primitives (number, boolean, null, etc) are ignored

		return results
	}

	private static async _tryFindSubstrings(
		strings: WalletDataStrings,
		str: string,
		origin: WalletDataStringOrigin,
	): Promise<WalletDataString[] | null> {
		const strLength = str.length
		const substrings: (WalletDataStringBreadcrumb & { type: 'SUBSTRING' })[] = []

		for (const existing of strings.longestFirstUserInfoOnlyStrings()) {
			const existingStr = existing.str.str

			if (existingStr.length >= strLength) {
				continue
			}

			const bits = str.split(existingStr)

			if (bits.length <= 1) {
				continue
			}

			let strIndex = 0

			for (let i = 0; i < bits.length - 1; i++) {
				const fromIndex = strIndex + bits[i].length

				if (bits[i].length > 0) {
					substrings.push({ type: 'SUBSTRING', from: strIndex, to: fromIndex })
				}

				strIndex = fromIndex + existingStr.length
				substrings.push({ type: 'SUBSTRING', from: fromIndex, to: strIndex })
			}

			if (strIndex < strLength) {
				substrings.push({ type: 'SUBSTRING', from: strIndex, to: strLength })
			}
		}

		if (substrings.length === 0) {
			return null
		}

		return (
			await Promise.all(
				substrings.map(breadcrumb =>
					WalletDataString.createMany(
						strings,
						str.substring(breadcrumb.from, breadcrumb.to),
						origin.add(breadcrumb),
					),
				),
			)
		).flat()
	}

	public str: UserDataString
	private readonly _firstOrigin: WalletDataStringOrigin
	private readonly origins: Map<string, WalletDataStringOrigin>
	private readonly occurrencesByRoughKey: Map<string, number>
	private readonly entropy: StringEntropy
	private _score: number | null = null

	private constructor(str: UserDataString, firstOrigin: WalletDataStringOrigin) {
		this.str = str
		this.origins = new Map()
		this.occurrencesByRoughKey = new Map()
		this._firstOrigin = firstOrigin
		this.addOccurrence(firstOrigin)
		this.entropy = StringEntropy.compute(str.str)
	}

	/**
	 * Returns the first request that sourced this data string.
	 */
	public get firstOrigin(): WalletDataStringOrigin {
		return this._firstOrigin
	}

	/**
	 * Returns a readonly view of the occurrences map.
	 */
	public getOrigins(): ReadonlyMap<string, WalletDataStringOrigin> {
		return this.origins
	}

	/**
	 * @returns A readonly view of the number of occurrences of this string, keyed by rough key (domain and basic breadcrumbs)
	 */
	public getRoughOccurrences(): ReadonlyMap<string, number> {
		return this.occurrencesByRoughKey
	}

	public addOccurrencesFrom(other: WalletDataString) {
		if (this.str.str !== other.str.str) {
			throw new Error(`mismatching WalletDataString objects: ${this.str.str} vs ${other.str.str}`)
		}

		for (const [_, origin] of other.origins.entries()) {
			if (this.addOccurrence(origin)) {
				this._score = null
			}
		}
	}

	public addOccurrence(origin: WalletDataStringOrigin): boolean {
		const key = origin.key

		if (this.origins.has(key)) {
			return false
		}

		this.origins.set(key, origin)
		const roughKey = origin.keyByDomainAndRoughBreadcrumbs()
		const numOccurrences = this.occurrencesByRoughKey.get(roughKey)

		this.occurrencesByRoughKey.set(roughKey, numOccurrences === undefined ? 1 : numOccurrences + 1)
		this._score = null

		return true
	}

	public addUserInfoFrom(userDataString: UserDataString) {
		if (userDataString.str !== this.str.str) {
			throw new Error(`mismatching strings: ${userDataString.str} vs ${this.str.str}`)
		}

		this.str = this.str.withMerged(...userDataString.pieces)
	}

	public get score(): number {
		if (this._score === null) {
			let appearances = 0.0

			for (const [_, v] of this.occurrencesByRoughKey.entries()) {
				appearances += Math.pow(v, 1.25)
			}
			this._score = Math.pow(this.entropy.entropy, 1.5) * Math.pow(appearances, 0.5)
		}

		return this._score
	}
}

export class WalletDataStrings {
	private captureFile: WalletCaptureFile
	private _strings: Map<string, WalletDataString> = new Map()
	private _highestScoreFirstStrings: WalletDataString[] | null = null
	private _longestFirstStrings: WalletDataString[] | null = null

	constructor(captureFile: WalletCaptureFile) {
		this.captureFile = captureFile
	}

	public add(s: WalletDataString) {
		const key = s.str.str

		if (this.captureFile.isBenignString(key)) {
			return
		}

		const existing = this._strings.get(key)

		if (existing) {
			existing.addOccurrencesFrom(s)
		} else {
			const ud = this.captureFile.userData.get(s.str.str)

			if (ud !== undefined) {
				s.addUserInfoFrom(ud)
			}

			this._strings.set(key, s)
		}

		this._highestScoreFirstStrings = null
		this._longestFirstStrings = null
	}

	public get size(): number {
		return this._strings.size
	}

	public strings(): ReadonlyArray<WalletDataString> {
		if (this._highestScoreFirstStrings === null) {
			this._highestScoreFirstStrings = Array.from(this._strings.values()).sort((a, b) =>
				WalletDataString.highestScoreFirst(a, b),
			)
		}

		return this._highestScoreFirstStrings
	}

	public get(str: string): WalletDataString | undefined {
		return this._strings.get(str)
	}

	public longestFirstUserInfoOnlyStrings(): ReadonlyArray<WalletDataString> {
		if (this._longestFirstStrings === null) {
			this._longestFirstStrings = Array.from(this._strings.values())
				.filter(s => s.str.pieces.size > 0)
				.sort((a, b) => b.str.str.length - a.str.str.length)
		}

		return this._longestFirstStrings
	}
}

export type UserDataDict = Record<string, NonEmptyArray<string>>

function decodeUserDataDict(encoded: EncodedMultiDict | undefined, _at: string): UserDataDict {
	if (encoded === undefined) {
		return {}
	}

	const out: UserDataDict = {}

	for (const [k, v] of Object.entries(encoded)) {
		if (typeof v === 'string') {
			out[k] = [v]
		} else {
			out[k] = v
		}
	}

	return out
}

export class WalletCaptureSessionTime {
	public readonly session: number
	public readonly milliseconds: number

	/**
	 * `raw` is the Python `WalletCaptureFile.session_time()` integer:
	 *   session_number * 1_000_000_000 + milliseconds_since_session_start
	 */
	public constructor(raw: number) {
		if (!Number.isFinite(raw) || raw < 0) {
			throw new Error(`Invalid sessionTime: ${raw}`)
		}

		this.session = Math.floor(raw / 1_000_000_000)
		this.milliseconds = raw % 1_000_000_000
	}

	public toNumber(): number {
		return this.session * 1_000_000_000 + this.milliseconds
	}

	public toString(): string {
		return `${this.session}@${this.milliseconds}ms`
	}
}

export class WalletRequestReview {
	public readonly request: WalletRequest
	private reviewed: boolean | null
	private extraPurposes: 'NOT_WALLET_INITIATED' | DataCollectionPurpose[]
	private extraUserData: UserInfo[]
	private collectionPolicy: CollectionPolicy | null

	private constructor(args: {
		request: WalletRequest
		reviewed: boolean | null
		extraPurposes: 'NOT_WALLET_INITIATED' | DataCollectionPurpose[]
		extraUserData: UserInfo[]
		collectionPolicy: CollectionPolicy | null
	}) {
		this.request = args.request
		this.reviewed = args.reviewed
		this.extraPurposes = args.extraPurposes
		this.extraUserData = args.extraUserData
		this.collectionPolicy = args.collectionPolicy
	}

	public static unspecified(req: WalletRequest): WalletRequestReview {
		return new WalletRequestReview({
			request: req,
			reviewed: null,
			extraPurposes: [],
			extraUserData: [],
			collectionPolicy: null,
		})
	}

	public static fromEncoded(
		req: WalletRequest,
		review: EncodedWalletRequestReview,
	): WalletRequestReview {
		return new WalletRequestReview({
			request: req,
			reviewed: review.manuallyReviewed,
			extraPurposes: review.extraPurposes ?? [],
			extraUserData: review.extraUserData ?? [],
			collectionPolicy: review.collectionPolicy ?? null,
		})
	}

	public toJSON(): EncodedWalletRequestReview | undefined {
		if (this.reviewed === null) {
			return undefined
		}

		return {
			manuallyReviewed: this.reviewed,
			...(this.extraPurposes === 'NOT_WALLET_INITIATED' || this.extraPurposes.length > 0
				? { extraPurposes: this.extraPurposes }
				: {}),
			...(this.extraUserData.length > 0 ? { extraUserData: this.extraUserData } : {}),
			...(this.collectionPolicy !== null ? { collectionPolicy: this.collectionPolicy } : {}),
		}
	}

	public isManuallyReviewed(): boolean {
		return this.reviewed === true
	}

	public setNotWalletInitiated() {
		if (this.extraPurposes === 'NOT_WALLET_INITIATED') {
			return
		}

		if (this.extraPurposes.length === 0) {
			this.extraPurposes = 'NOT_WALLET_INITIATED'

			return
		}

		throw new Error(
			`Request already marked as having purposes ${this.extraPurposes.join(' & ')}; cannot additionally mark it as NOT_WALLET_INITIATED`,
		)
	}

	public addPurpose(purpose: DataCollectionPurpose) {
		if (this.extraPurposes === 'NOT_WALLET_INITIATED') {
			throw new Error(
				'Request already marked as NOT_WALLET_INITIATED; cannot mark it as having any other purpose.',
			)
		}

		if (!this.extraPurposes.includes(purpose)) {
			this.extraPurposes.push(purpose)
		}
	}

	public addUserInfo(userInfo: UserInfo) {
		if (!this.extraUserData.includes(userInfo)) {
			this.extraUserData.push(userInfo)
		}
	}

	public setCollectionPolicy(policy: CollectionPolicy) {
		this.collectionPolicy = policy
	}

	public reset() {
		this.reviewed = null
		this.extraPurposes = []
		this.extraUserData = []
	}

	public markAsReviewed() {
		this.reviewed = true
	}

	public getExtraPurposes(): ReadonlyArray<DataCollectionPurpose> | 'NOT_WALLET_INITIATED' {
		return this.extraPurposes
	}

	public getExtraUserData(): ReadonlyArray<UserInfo> {
		return this.extraUserData
	}

	public getCollectionPolicy(_userInfo: UserInfo): CollectionPolicy | null {
		return this.collectionPolicy
	}
}

export class WalletRequest {
	private readonly _captureFile: WalletCaptureFile

	public readonly domain: string
	public readonly path: string
	public readonly sessionTime: WalletCaptureSessionTime
	public readonly query: UserDataDict
	public readonly jsonRpcMethods: string[]
	public readonly content: string | null
	public readonly cookies: UserDataDict
	public readonly refererDomain: string | null
	public readonly oddHeaders: UserDataDict
	public readonly oddTrailers: UserDataDict
	public readonly responseStatus: number | null
	public readonly responseOddHeaders: UserDataDict
	private readonly _responsePayloadEncoded: EncodedResponsePayload | null
	private readonly _responsePayload: DecodedResponsePayload | null
	public readonly review: WalletRequestReview
	private readonly _key: string

	private constructor(args: {
		captureFile: WalletCaptureFile
		domain: string
		path: string
		sessionTime: WalletCaptureSessionTime
		query: UserDataDict
		jsonRpcMethods: string[]
		content: string | null
		cookies: UserDataDict
		refererDomain: string | null
		oddHeaders: UserDataDict
		oddTrailers: UserDataDict
		responseStatus: number | null
		responseOddHeaders: UserDataDict
		responsePayloadEncoded: EncodedResponsePayload | null
		review: EncodedWalletRequestReview | null
	}) {
		this._captureFile = args.captureFile
		this.domain = args.domain
		this.path = args.path
		this.sessionTime = args.sessionTime
		this.query = args.query
		this.jsonRpcMethods = args.jsonRpcMethods
		this.content = args.content
		this.cookies = args.cookies
		this.refererDomain = args.refererDomain
		this.oddHeaders = args.oddHeaders
		this.oddTrailers = args.oddTrailers
		this.responseStatus = args.responseStatus
		this.responseOddHeaders = args.responseOddHeaders
		this._responsePayloadEncoded = args.responsePayloadEncoded
		this._responsePayload =
			args.responsePayloadEncoded !== null
				? DecodedResponsePayload.fromEncoded(args.responsePayloadEncoded)
				: null
		this._key = `${this.sessionTime.toString()}:${this.domain}:${this.path}`
		this.review =
			args.review === null
				? WalletRequestReview.unspecified(this)
				: WalletRequestReview.fromEncoded(this, args.review)
	}

	/**
	 * Equivalent to Python `WalletRequest.decode(...)` (for requests already stored in JSON).
	 */
	public static fromEncoded(
		captureFile: WalletCaptureFile,
		req: EncodedWalletDataRequest,
		at = '$',
	): WalletRequest {
		const jsonRpcMethods =
			req.jsonRpcMethod === undefined
				? []
				: typeof req.jsonRpcMethod === 'string'
					? [req.jsonRpcMethod]
					: [...req.jsonRpcMethod]

		return new WalletRequest({
			captureFile,
			domain: req.domain,
			path: req.path,
			sessionTime: new WalletCaptureSessionTime(req.sessionTime),
			query: decodeUserDataDict(req.query, `${at}.query`),
			jsonRpcMethods,
			content:
				(() => {
					const raw = req.content

					if (raw === undefined) {
						return null
					}

					if (typeof raw === 'string') {
						return raw
					}

					const padded = raw.base64 + '='.repeat((4 - (raw.base64.length % 4)) % 4)

					return new TextDecoder('utf-8').decode(
						Uint8Array.from(atob(padded), c => c.charCodeAt(0)),
					)
				})() ?? null,
			cookies: decodeUserDataDict(req.cookies, `${at}.cookies`),
			refererDomain: req.refererDomain ?? null,
			oddHeaders: decodeUserDataDict(req.oddHeaders, `${at}.oddHeaders`),
			oddTrailers: decodeUserDataDict(req.oddTrailers, `${at}.oddTrailers`),
			responseStatus: req.responseStatus ?? null,
			responseOddHeaders: decodeUserDataDict(req.responseOddHeaders, `${at}.responseOddHeaders`),
			responsePayloadEncoded: req.responsePayload ?? null,
			review: req.review ?? null,
		})
	}

	public toJSON(): EncodedWalletDataRequest {
		const encodeDict = (d: UserDataDict): EncodedMultiDict | undefined => {
			const keys = Object.keys(d)

			if (keys.length === 0) {
				return undefined
			}

			const out: EncodedMultiDict = {}

			for (const k of keys) {
				const vals = d[k]

				out[k] = vals.length === 1 ? nonEmptyGet(vals) : vals
			}

			return out
		}

		const query = encodeDict(this.query)
		const cookies = encodeDict(this.cookies)
		const oddHeaders = encodeDict(this.oddHeaders)
		const oddTrailers = encodeDict(this.oddTrailers)
		const responseOddHeaders = encodeDict(this.responseOddHeaders)

		const jsonRpcMethod =
			this.jsonRpcMethods.length === 0
				? undefined
				: this.jsonRpcMethods.length === 1
					? this.jsonRpcMethods[0]
					: [...this.jsonRpcMethods]

		const responsePayloadEncoded = this._responsePayloadEncoded

		const contentEncoded =
			this.content === null
				? undefined
				: (() => {
						const bytes = new TextEncoder().encode(this.content)

						const isAscii = bytes.every(b => b < 128)

						if (isAscii) {
							return this.content
						}

						const b64 = btoa(String.fromCharCode(...bytes)).replace(/=+$/, '')

						return { type: 'base64' as const, base64: b64 }
					})()

		return {
			domain: this.domain,
			path: this.path,
			sessionTime: this.sessionTime.toNumber(),
			...(query ? { query } : {}),
			...(jsonRpcMethod ? { jsonRpcMethod } : {}),
			...(contentEncoded !== undefined ? { content: contentEncoded } : {}),
			...(cookies ? { cookies } : {}),
			...(this.refererDomain !== null ? { refererDomain: this.refererDomain } : {}),
			...(oddHeaders ? { oddHeaders } : {}),
			...(oddTrailers ? { oddTrailers } : {}),
			...(this.responseStatus !== null && this.responseStatus !== 200
				? { responseStatus: this.responseStatus }
				: {}),
			...(responseOddHeaders ? { responseOddHeaders } : {}),
			...(responsePayloadEncoded !== null ? { responsePayload: responsePayloadEncoded } : {}),
			...(this.review.toJSON() === undefined ? {} : { review: this.review.toJSON() }),
		}
	}

	public toString(): string {
		const fmtMultiDict = (name: string, d: UserDataDict): string => {
			const keys = Object.keys(d)

			if (keys.length === 0) {
				return ''
			}

			const parts = keys.sort().map(k => {
				const vals = d[k]
				const v =
					vals.length === 1 ? vals[0].toString() : `[${vals.map(x => x.toString()).join(', ')}]`

				return `${k}=${v}`
			})

			return ` ${name}=${parts.join(',')}`
		}

		const rpc =
			this.jsonRpcMethods.length === 0 ? '' : ` rpc=${[...this.jsonRpcMethods].sort().join(',')}`

		const content = this.content ? ` content=${this.content.toString()}` : ''
		const refererDomain = this.refererDomain ? ` referer=${this.refererDomain.toString()}` : ''

		const responseStatus = this.responseStatus !== null ? ` status=${this.responseStatus}` : ''
		const responsePayload =
			this._responsePayload === null
				? ''
				: this._responsePayload.str() !== null
					? ` resp=${this._responsePayload.str()}`
					: ` resp=[${this._responsePayload.byteLength()} bytes, sha256=${(this._responsePayload.sha256() ?? '??').slice(0, 12)}...]`

		return (
			`${this.domain}: ${this.path}` +
			fmtMultiDict('query', this.query) +
			rpc +
			content +
			fmtMultiDict('cookie', this.cookies) +
			refererDomain +
			fmtMultiDict('headers', this.oddHeaders) +
			fmtMultiDict('trailers', this.oddTrailers) +
			responseStatus +
			fmtMultiDict('resp_headers', this.responseOddHeaders) +
			responsePayload
		)
	}

	public get key(): string {
		return this._key
	}

	public domains(): NonEmptyArray<string> {
		if (
			this.refererDomain !== null &&
			this.refererDomain.toLowerCase() !== this.domain.toLowerCase()
		) {
			return [this.domain, this.refererDomain]
		}

		return [this.domain]
	}

	public response(): DecodedResponsePayload | null {
		return this._responsePayload
	}

	public async userInfo(
		matcherCollectionPolicy: CollectionPolicy | null,
		includeManualReview: boolean,
	): Promise<Map<UserInfo, CollectionPolicy | null>> {
		const infos = new Map<UserInfo, CollectionPolicy | null>()

		const setInfo = (info: UserInfo, collectionPolicy: CollectionPolicy | null) => {
			const previous = infos.get(info)

			if (previous === undefined) {
				infos.set(info, collectionPolicy)

				return
			}

			if (previous === null) {
				if (collectionPolicy !== null) {
					infos.set(info, collectionPolicy)
				}

				return
			}

			if (collectionPolicy === null || previous === collectionPolicy) {
				return
			}

			const leastConfig = leastConfigurableCollectionPolicy(previous, collectionPolicy)

			if (leastConfig !== previous) {
				infos.set(info, leastConfig)
			}
		}

		setInfo(PersonalInfo.IP_ADDRESS, matcherCollectionPolicy)
		const reqStrings = new WalletDataStrings(this._captureFile)

		await this.populateStringsInto(reqStrings)

		for (const dataString of reqStrings.strings()) {
			for (const userInfo of dataString.str.pieces) {
				setInfo(userInfo, matcherCollectionPolicy)
			}
		}

		if (includeManualReview) {
			for (const userInfo of this.review.getExtraUserData()) {
				infos.set(userInfo, null)
			}

			for (const info of infos.keys()) {
				const manualPolicy = this.review.getCollectionPolicy(info)

				if (manualPolicy !== null) {
					infos.set(info, manualPolicy)
				}
			}
		}

		return infos
	}

	public async populateStringsInto(strings: WalletDataStrings) {
		await this._processUserDataDict(strings, this.query, WalletStringOccurrenceType.QUERY)
		await this._processUserDataDict(strings, this.cookies, WalletStringOccurrenceType.COOKIE)
		await this._processUserDataDict(strings, this.oddHeaders, WalletStringOccurrenceType.HEADER)
		await this._processUserDataDict(strings, this.oddTrailers, WalletStringOccurrenceType.TRAILER)

		if (this.content !== null) {
			const dataStrings = await WalletDataString.createMany(
				strings,
				this.content,
				new WalletDataStringOrigin(
					this,
					new WalletDataStringBreadcrumbs([{ type: WalletStringOccurrenceType.PAYLOAD }]),
				),
			)

			for (const ds of dataStrings) {
				strings.add(ds)
			}
		}

		// Note: Response headers and payload are explicitly excluded here.
		// We want to measure the data that the wallet is sending, not what it is
		// receiving. The response headers and payload data are only useful for
		// understanding the purpose of a request, but by itself has no user
		// privacy implications.
	}

	private async _processUserDataDict(
		strings: WalletDataStrings,
		dict: UserDataDict,
		occurrenceType: WalletStringOccurrenceType,
	) {
		for (const [key, piecesArray] of Object.entries(dict)) {
			const keyStrings = await WalletDataString.createMany(
				strings,
				key,
				new WalletDataStringOrigin(
					this,
					new WalletDataStringBreadcrumbs([
						{ type: occurrenceType },
						{
							type: 'MULTI_KEY',
							key,
							branch: 'KEY',
						},
					]),
				),
			)

			for (const ds of keyStrings) {
				strings.add(ds)
			}

			for (let i = 0; i < piecesArray.length; i++) {
				const dataStrings = await WalletDataString.createMany(
					strings,
					piecesArray[i],
					new WalletDataStringOrigin(
						this,
						new WalletDataStringBreadcrumbs([
							{ type: occurrenceType },
							{
								type: 'MULTI_KEY',
								key,
								branch: 'VALUE',
								index: i,
							},
						]),
					),
				)

				for (const ds of dataStrings) {
					strings.add(ds)
				}
			}
		}
	}
}

export class WalletCaptureFlow {
	public readonly file: WalletCaptureFile
	public readonly flow: RecordedFlow

	private _requests: WalletRequest[]

	public get requests(): ReadonlyArray<WalletRequest> {
		return this._requests
	}

	constructor(file: WalletCaptureFile, flow: RecordedFlow, data: EncodedWalletDataFlow) {
		this.file = file
		this.flow = flow

		this._requests = data.requests.map((r, i) =>
			WalletRequest.fromEncoded(file, r, `$.flows[${JSON.stringify(flow)}].requests[${i}]`),
		)
	}

	public toJSON(): EncodedWalletCaptureFlow {
		return {
			requests: this._requests.map(r => r.toJSON()),
		}
	}

	public getSessions(): Set<number> {
		const sessions = new Set<number>()

		for (const req of this._requests) {
			sessions.add(req.sessionTime.session)
		}

		return sessions
	}

	public deleteSession(sessionId: number): number {
		const originalCount = this._requests.length

		this._requests = this._requests.filter(r => r.sessionTime.session !== sessionId)

		return originalCount - this._requests.length
	}

	public check(): WalletCaptureIssue[] {
		const issues: WalletCaptureIssue[] = []

		for (const req of this._requests) {
			if (this.file.findMatcherForReq(req) === null) {
				issues.push(
					new WalletCaptureIssue({
						section: ['Request annotations'],
						issue: `Request ${req.toString()} does not have any assigned purpose.`,
						suggestions: [
							{
								suggestion: 'Declare the purpose of this request.',
								subcommand: `explain-request --domain='${req.domain}' [--path='${req.path}']${req.jsonRpcMethods.length === 0 ? '' : ` [--method=${req.jsonRpcMethods[0]}]`} '--purposes=purpose1,purpose2,...|NOT_WALLET_INITIATED'`,
							},
						],
					}),
				)
			}
		}

		return issues
	}

	public unreviewedRequests(): WalletRequestReview[] {
		return this._requests
			.filter(req => {
				const matcher = this.file.findMatcherForReq(req)

				return matcher === null || matcher.purposes !== 'NOT_WALLET_INITIATED'
			})
			.map(req => req.review)
			.filter(review => !review.isManuallyReviewed())
	}
}

export interface WalletCaptureSuggestion {
	suggestion: string
	subcommand?: string
}

export class WalletCaptureIssue {
	public readonly section: NonEmptyArray<string>
	public readonly issue: string
	public readonly suggestions: NonEmptyArray<WalletCaptureSuggestion>
	constructor({
		section,
		issue,
		suggestions,
	}: {
		section: NonEmptyArray<string>
		issue: string
		suggestions: NonEmptyArray<WalletCaptureSuggestion>
	}) {
		this.section = section
		this.issue = issue
		this.suggestions = suggestions
	}

	public prependSection(section: string): WalletCaptureIssue {
		return new WalletCaptureIssue({
			section: [section, ...this.section],
			issue: this.issue,
			suggestions: this.suggestions,
		})
	}
}

/**
 * AutoGenerationOptions is a set of options controlling the feature data
 * generation process.
 */
export interface AutoGenerationOptions {
	/**
	 * Whether to strictly verify the generated data.
	 * Set to `true` in tests; omit in feature data files.
	 */
	strict?: boolean
}

export interface WalletCaptureFileIdentity {
	walletType: WalletType
	walletVariant: Variant
	walletId: string
}

export class WalletCaptureFile {
	public readonly identity: WalletCaptureFileIdentity
	public readonly path: string | null
	public readonly userData: UserDataStringStore
	private readonly flows: Partial<Record<RecordedFlow, WalletCaptureFlow | 'NOT_SUPPORTED'>>
	private readonly sessions: number
	private readonly annotations: WalletCaptureAnnotations

	public static async fromFile(
		identity: WalletCaptureFileIdentity | null,
		path: string,
		annotations: WalletCaptureAnnotations,
	): Promise<WalletCaptureFile> {
		let text = ''

		if (fs.existsSync(path)) {
			text = fs.readFileSync(path, 'utf8')
		}

		text = text.trim()

		if (text === '') {
			text = '{}'
		}

		const wasNew = text === '{}'

		if (wasNew && identity === null) {
			throw new Error('Cannot create a new WalletCaptureFile without providing wallet identity')
		}

		const parsed: unknown = JSON.parse(text)
		const captureFile = new WalletCaptureFile(identity, path, parsed, annotations)

		if (wasNew) {
			await captureFile.saveCaptureFileOnly(false)
		} else {
			const reEncoded = captureFile.toJSON()
			const loadedStable = stableJSONStringify(parsed)
			const reEncodedStable = stableJSONStringify(reEncoded)

			if (!wasNew && loadedStable !== reEncodedStable) {
				throw new Error(
					[
						'WalletCaptureFile integrity check failed: re-encoded JSON does not match loaded JSON.',
						`File: ${path}`,
						`Loaded:     ${loadedStable}`,
						`Re-encoded: ${reEncodedStable}`,
					].join('\n'),
				)
			}
		}

		return captureFile
	}

	public static fromData(
		identity: WalletCaptureFileIdentity | null,
		data: unknown,
		annotations: WalletCaptureAnnotations,
	): WalletCaptureFile {
		return new WalletCaptureFile(identity, null, data, annotations)
	}

	private constructor(
		identity: WalletCaptureFileIdentity | null,
		path: string | null,
		jsonBody: unknown,
		annotations: WalletCaptureAnnotations,
	) {
		this.path = path
		this.annotations = annotations
		const root = expectRecord(jsonBody, '$')
		let loadedIdentity: WalletCaptureFileIdentity | null = null

		if (root.identity !== undefined) {
			const loadedIdentityObj = expectRecord(root.identity, '$.identity')
			const loadedWalletId = expectString(loadedIdentityObj.walletId, '$.identity.walletId')
			const loadedWalletType = walletTypes.assert(
				expectString(loadedIdentityObj.walletType, '$.identity.walletType'),
			)
			const loadedWalletVariant = variantEnum.assert(
				expectString(loadedIdentityObj.walletVariant, '$.identity.walletVariant'),
			)

			loadedIdentity = {
				walletId: loadedWalletId,
				walletType: loadedWalletType,
				walletVariant: loadedWalletVariant,
			}
		}

		if (loadedIdentity !== null && identity !== null) {
			if (identity !== null) {
				if (
					loadedIdentity.walletId !== identity.walletId ||
					loadedIdentity.walletType !== identity.walletType ||
					loadedIdentity.walletVariant !== identity.walletVariant
				) {
					throw new Error(
						`Mismatching identities: expected ${JSON.stringify(identity)}, found ${JSON.stringify(loadedIdentity)}`,
					)
				}
			}

			this.identity = identity
		} else if (identity === null && loadedIdentity !== null) {
			this.identity = loadedIdentity
		} else if (identity !== null) {
			this.identity = identity
		} else {
			throw new Error('Cannot construct a WalletCaptureFile without an identity')
		}

		this.userData = ((): UserDataStringStore => {
			if (root.userData === undefined) {
				return UserDataStringStore.newStore()
			}

			return UserDataStringStore.fromJSON(root.userData, '$.userData')
		})()
		const flowsRaw = root.flows === undefined ? {} : expectRecord(root.flows, '$.flows')
		const captureFlows: Partial<Record<RecordedFlow, WalletCaptureFlow | 'NOT_SUPPORTED'>> = {}

		for (const [flowName, flowValue] of Object.entries(flowsRaw)) {
			const flowVal = recordedFlow.assert(flowName)

			if (typeof flowValue === 'string' && flowValue === 'NOT_SUPPORTED') {
				captureFlows[flowVal] = 'NOT_SUPPORTED'
				continue
			}

			const data = parseWalletDataFlow(flowValue, `$.flows[${JSON.stringify(flowVal)}]`)

			captureFlows[flowVal] = new WalletCaptureFlow(this, flowVal, data)
		}

		this.flows = captureFlows
		this.sessions = root.sessions === undefined ? 0 : expectNumber(root.sessions, '$.sessions')
	}

	private toJSON(): EncodedWalletCaptureFile {
		const flowsOut: Record<string, EncodedWalletCaptureFlow | 'NOT_SUPPORTED'> = {}

		for (const flowName of Object.keys(this.flows)) {
			const flow = this.flows[recordedFlow.assert(flowName)]

			if (!flow) {
				continue
			}

			if (flow === 'NOT_SUPPORTED') {
				flowsOut[flowName] = 'NOT_SUPPORTED'
			} else {
				flowsOut[flowName] = flow.toJSON()
			}
		}

		const out: EncodedWalletCaptureFile = {
			identity: this.identity,
			flows: flowsOut,
			userData: this.userData.toJSON(),
			sessions: this.sessions,
		}

		return out
	}

	/**
	 * Convert to `DataCollection`.
	 * If `strict` is true, generate errors as we go.
	 * Otherwise, all errors are silenced. Useful for being able to include
	 * partial data into wallet feature data without breakage. Unit tests
	 * should check in strict mode.
	 */
	public async toDataCollection(options: AutoGenerationOptions): Promise<DataCollection> {
		const dataCollection: DataCollection = {
			[UserFlow.INSTALL]: null,
			[UserFlow.ONBOARDING_NEW]: null,
			[UserFlow.ONBOARDING_IMPORT]: null,
			[UserFlow.SEND_ETHER]: null,
			[UserFlow.SEND_USDC]: null,
			[UserFlow.NATIVE_SWAP]: null,
			[UserFlow.MAKE_TRANSACTION]: null,
			[UserFlow.APP_CONNECTION]: null,
		}

		for (const recFlow of recordedFlow.items) {
			const flow = this.getFlow(recFlow)

			if (flow === null) {
				continue
			}

			if (!userFlow.is(recFlow)) {
				continue
			}

			if (flow === 'NOT_SUPPORTED') {
				if (!userFlowMayBeMarkedUnsupported(recFlow)) {
					throw new Error(`Flow ${recFlow} cannot be marked as NOT_SUPPORTED.`)
				}

				dataCollection[recFlow] = 'FLOW_NOT_SUPPORTED' as const
				continue
			}

			const collected = await this.processFlowRequests(flow, options.strict ?? false)
			const flowData: DataCollectionForFlow = {
				collected,
			}

			if (recFlow === UserFlow.ONBOARDING_NEW || recFlow === UserFlow.ONBOARDING_IMPORT) {
				// TODO: Handle onboarding flows with onchain data.
				const flowDataWithOnchain: DataCollectionForFlowWithOnchainData = {
					...flowData,
					publishedOnchain: 'NO_DATA_PUBLISHED_ONCHAIN',
				}

				dataCollection[recFlow] = flowDataWithOnchain
			} else {
				dataCollection[recFlow] = flowData
			}
		}

		return dataCollection
	}

	/**
	 * Process flow requests to build DataCollectionByEntity array.
	 */
	private async processFlowRequests(
		flow: WalletCaptureFlow,
		strict: boolean,
	): Promise<WithRef<DataCollectionByEntity>[]> {
		const maybeThrow = (error: string) => {
			if (strict) {
				throw new Error(error)
			}
		}
		// Keyed by entity ID and role, so that an entity that operates one
		// domain and fronts another gets one entry per role.
		const perEntity = new Map<
			string,
			{
				entity: Entity
				role: EntityRole
				info: Map<UserInfo, CollectionPolicy>
				purposes: Set<DataCollectionPurpose>
			}
		>()

		for (const request of flow.requests) {
			const resolved = entitiesForDomain(request.domain)

			if (resolved === null) {
				maybeThrow(`no entity for domain ${request.domain}`)
				continue
			}

			const matcher = this.findMatcherForReq(request)
			const userInfos = await request.userInfo(matcher === null ? null : matcher.policy, true)
			const purposes = new Set<DataCollectionPurpose>()

			if (matcher !== null) {
				if (matcher.purposes === 'NOT_WALLET_INITIATED') {
					continue // Not a wallet-initiated request; skip.
				}

				if (matcher.purposes !== null) {
					for (const purpose of setItems(matcher.purposes)) {
						purposes.add(purpose)
					}
				}
			}

			const extraPurposes = request.review.getExtraPurposes()

			if (extraPurposes === 'NOT_WALLET_INITIATED') {
				continue
			}

			for (const purpose of extraPurposes) {
				purposes.add(purpose)
			}

			// The data is seen by the operator and by every intermediary on the
			// way there, so record one receipt per entity with its role.
			const receivingEntities: Array<{ entity: Entity; role: EntityRole }> = [
				{ entity: resolved.operator, role: EntityRole.OPERATOR },
				...resolved.intermediaries.map(entity => ({
					entity,
					role: EntityRole.INTERMEDIARY,
				})),
			]

			for (const { entity, role } of receivingEntities) {
				const perEntityKey = `${assertValidEntityId(entity.id)}:${role}`
				let entData = perEntity.get(perEntityKey)

				if (entData === undefined) {
					entData = {
						entity,
						role,
						info: new Map<UserInfo, CollectionPolicy>(),
						purposes: new Set<DataCollectionPurpose>(),
					}
					perEntity.set(perEntityKey, entData)
				}

				for (const [info, policy] of userInfos.entries()) {
					if (policy === null) {
						maybeThrow(`Cannot figure out collection policy of request: ${request.toString()}`)
						continue
					}

					const existingPolicy = entData.info.get(info)

					if (existingPolicy === undefined) {
						entData.info.set(info, policy)
					} else {
						entData.info.set(info, leastConfigurableCollectionPolicy(existingPolicy, policy))
					}
				}

				for (const purpose of purposes) {
					entData.purposes.add(purpose)
				}
			}
		}

		const collected: WithRef<DataCollectionByEntity>[] = []

		for (const entData of perEntity.values()) {
			const userInfos = Array.from(entData.info.keys())

			if (!isNonEmptyArray(userInfos)) {
				continue // Entity collects no user data.
			}

			const purposes = Array.from(entData.purposes)

			if (!isNonEmptyArray(purposes)) {
				maybeThrow(`Entity ${entData.entity.id} has requests with no purpose assigned`)
				continue
			}

			const row: WithRef<DataCollectionByEntity> = {
				byEntity: entData.entity,
				role: entData.role,
				dataCollection: {
					// TODO: Implement support for other values here once any wallet supports this...
					endpoint: RegularEndpoint,
					// TODO: Handle multiAddress.
					multiAddress: undefined,
					...nonEmptyMapToRecord(userInfos, info => {
						const policy = entData.info.get(info)

						if (policy === undefined) {
							maybeThrow(`Policy for user info ${info} entity ${entData.entity.id} is undefined`)

							return CollectionPolicy.ALWAYS
						}

						return policy
					}),
				},
				purposes: purposes,
				ref: refNotNecessary,
			}

			if (strict) {
				try {
					validateDataCollectionByEntityRow(row)
				} catch (e) {
					maybeThrow(getErrorMessage(e))
				}
			}

			collected.push(row)
		}

		return collected
	}

	private async saveCaptureFileOnly(verifyExisting: boolean): Promise<string[]> {
		if (this.path === null) {
			throw new Error('WalletCaptureFile was constructed without a path; cannot save.')
		}

		const data = this.toJSON()
		const content = JSON.stringify(data, null, '\t') + '\n'

		// Verify no non-ASCII characters are present before writing
		const badIdx = content.search(/[\x80-\uFFFF]/)

		if (badIdx !== -1) {
			const badChar = content[badIdx]
			const context = content.slice(Math.max(0, badIdx - 40), badIdx + 40)

			throw new Error(
				`Non-ASCII character detected in JSON output for ${this.path}. ` +
					`Found U+${badChar.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()} at offset ${badIdx}. ` +
					`Surrounding context: ${JSON.stringify(context)}`,
			)
		}

		// Check if content differs from what's on disk
		let needsWrite = true

		if (fs.existsSync(this.path)) {
			const existingContent = fs.readFileSync(this.path, 'utf8')

			if (isSameJson(existingContent, content)) {
				needsWrite = false
			}
		}

		const changed: string[] = []

		if (verifyExisting) {
			if (needsWrite) {
				throw new Error(`File not in sync: ${this.path}`)
			}
		} else if (needsWrite) {
			const tmpPath = this.path + '.tmp'

			await fs.promises.mkdir(path.dirname(tmpPath), { recursive: true })
			await fs.promises.writeFile(tmpPath, content, 'utf8')
			await fs.promises.rename(tmpPath, this.path)
			changed.push(this.path)
		}

		return changed
	}

	public async save(opts: SaveOptions): Promise<string[]> {
		const changed = await this.saveCaptureFileOnly(opts.verifyExisting)
		const annotationsChanged = await this.annotations.save(opts)

		return changed.concat(...annotationsChanged)
	}

	public getFlow(flow: RecordedFlow): WalletCaptureFlow | 'NOT_SUPPORTED' | null {
		return this.flows[flow] ?? null
	}

	public getSessions(): Set<number> {
		const sessions = new Set<number>()

		for (const f of recordedFlow.items) {
			const flow = this.getFlow(f)

			if (flow === null || flow === 'NOT_SUPPORTED') {
				continue
			}

			for (const session of flow.getSessions()) {
				sessions.add(session)
			}
		}

		return sessions
	}

	public deleteSession(sessionId: number): void {
		let totalDeleted = 0

		for (const f of recordedFlow.items) {
			const flow = this.getFlow(f)

			if (flow && flow !== 'NOT_SUPPORTED') {
				totalDeleted += flow.deleteSession(sessionId)
			}
		}

		if (totalDeleted === 0) {
			throw new Error(`Session ${sessionId} was not found in any flow.`)
		}
	}

	public async check(): Promise<WalletCaptureIssue[]> {
		if (recordedFlow.items.map(this.getFlow.bind(this)).every(v => v === null)) {
			return [
				new WalletCaptureIssue({
					section: ['Capture'],
					issue: 'No network capture data for this wallet.',
					suggestions: [
						{
							suggestion: 'Start capturing data for the IDLE_PRE_INSTALL flow.',
							subcommand: `capture --flow=${RecordedOnlyFlow.IDLE_PRE_INSTALL}`,
						},
					],
				}),
			]
		}

		const issues: WalletCaptureIssue[] = []
		let numUnreviewedRequests = 0
		const allDomains = new Set<string>()

		for (const f of recordedFlow.items) {
			const flow = this.getFlow(f)

			if (flow === null) {
				issues.push(
					new WalletCaptureIssue({
						section: ['Capture flows'],
						issue: `No data for flow: ${f}.`,
						suggestions: [
							{
								suggestion: 'Capture data for this flow',
								subcommand: `capture --flow=${f}`,
							},
							{
								suggestion: 'Mark this flow as unsupported by the wallet',
								subcommand: `mark-flow-unsupported --flow=${f}`,
							},
						],
					}),
				)
				continue
			}

			if (flow === 'NOT_SUPPORTED') {
				continue
			}

			for (const req of flow.requests) {
				for (const domain of req.domains()) {
					allDomains.add(domain.toLowerCase())
				}
			}

			for (const issue of flow.check()) {
				issues.push(issue.prependSection(`Flow ${f}`))
			}
			numUnreviewedRequests += flow.unreviewedRequests().length
		}

		// Deduplicate domains: keep only "most parental" domains
		// If we have api.example.com and example.com, keep only example.com
		const domainsToCheck = new Set<string>(allDomains)

		for (const domain of allDomains) {
			for (const otherDomain of allDomains) {
				if (domain !== otherDomain && domain.endsWith('.' + otherDomain)) {
					// domain is a subdomain of otherDomain, remove the subdomain
					domainsToCheck.delete(domain)
					break
				}
			}
		}

		// Check each domain for entity mapping
		let hasUnassociatedDomain = false

		for (const domain of Array.from(domainsToCheck).sort()) {
			const entity = entitiesForDomain(domain)

			if (entity === null) {
				hasUnassociatedDomain = true
				issues.push(
					new WalletCaptureIssue({
						section: ['Domain matching'],
						issue: `Domain '${domain}' does not have a known entity mapping.`,
						suggestions: [
							{
								suggestion:
									'Mark this domain as belonging to a known entity (entity must be manually added to codebase first)',
								subcommand: `mark-domain --domain='${domain}' --entity='<entity-id>'`,
							},
						],
					}),
				)
			}
		}

		if (!hasUnassociatedDomain && numUnreviewedRequests > 0) {
			issues.push(
				new WalletCaptureIssue({
					section: ['Requests review'],
					issue: `There are ${numUnreviewedRequests} unreviewed requests.`,
					suggestions: [
						{
							suggestion:
								'Tag high-entropy strings as benign, tracking identifiers, or user information (makes `review-requests` less tedious)',
							subcommand: 'review-strings',
						},
						{
							suggestion: `Review request${numUnreviewedRequests === 1 ? '' : 's'}${issues.length > 0 ? ' (consider using matchers or `review-strings` before doing so)' : ''}`,
							subcommand: 'review-requests',
						},
					],
				}),
			)
		}

		if (issues.length === 0) {
			// Double-check that this is the case by trying to convert in strict mode:
			try {
				await this.toDataCollection({
					strict: true,
				})
			} catch (e) {
				return [
					new WalletCaptureIssue({
						section: ['Unknown'],
						issue: `Could not convert to DataCollection despite finding no errors: ${getErrorMessage(e)}`,
						suggestions: [
							{
								suggestion: 'Investigate the above failure, then re-run the `check` subcommand.',
								subcommand: 'check',
							},
						],
					}),
				]
			}
		}

		return issues
	}

	public markFlowUnsupported(f: RecordedFlow) {
		if (!userFlow.is(f)) {
			throw new Error(
				`Flow ${f} may not be marked as unsupported as it is not a wallet user UX flow.`,
			)
		}

		if (!userFlowMayBeMarkedUnsupported(f)) {
			if (f === UserFlow.ONBOARDING_IMPORT) {
				throw new Error(
					`Flow ${f} may not be marked as unsupported. If the wallet does not support e.g. importing a new seed phrase after already having created an account, then restart from a blank wallet and go through the account import flow from there.`,
				)
			}

			throw new Error(`Flow ${f} may not be marked as unsupported.`)
		}

		const flow = this.getFlow(f)

		if (flow !== null && flow === 'NOT_SUPPORTED') {
			throw new Error(`Flow ${f} is already marked as not supported.`)
		}

		if (flow === null) {
			this.flows[f] = 'NOT_SUPPORTED'
		} else if (flow.requests.length > 0) {
			throw new Error(`Flow ${f} already has recorded data! Can no longer mark it as unsupported.`)
		} else {
			this.flows[f] = 'NOT_SUPPORTED'
		}
	}

	public findMatcherForReq(request: WalletRequest): WalletRequestMatcher | null {
		return this.annotations.matches(request)
	}

	public addRequestMatcher(
		matcher: WalletRequestMatcher,
		force: boolean,
	): NonEmptyArray<WalletRequest> {
		const matched: WalletRequest[] = []

		for (const f of recordedFlow.items) {
			const flow = this.getFlow(f)

			if (flow === null) {
				if (force) {
					continue
				}

				throw new Error(`Cannot add request matchers until all flows are recorded; missing: ${f}`)
			}

			if (flow === 'NOT_SUPPORTED') {
				continue
			}

			for (const req of flow.requests) {
				if (matcher.matches(req)) {
					matched.push(req)
					const existingMatcher = this.annotations.matches(req)

					if (existingMatcher !== null) {
						throw new Error(
							`Matcher ${matcher.toString()} matches request ${req.toString()}, but that request is already matched by existing matcher ${existingMatcher.toString()}; requests must be matched by exactly one matcher.`,
						)
					}
				}
			}
		}

		if (!isNonEmptyArray(matched)) {
			throw new Error(`Matcher ${matcher.toString()} does not match any recorded request.`)
		}

		this.annotations.add(matcher)

		for (const req of matched) {
			if (req.review.isManuallyReviewed()) {
				req.review.reset()
			}
		}

		return matched
	}

	public removeRequestMatcher(matcher: WalletRequestMatcher) {
		this.annotations.remove(matcher)
	}

	public addBenignString(str: string, global: boolean) {
		this.annotations.addBenignString(str, global)
	}

	public isBenignString(str: string): boolean {
		return this.annotations.isBenign(str)
	}

	public async gatherStrings(): Promise<WalletDataStrings> {
		const strings = new WalletDataStrings(this)

		for (const f of recordedFlow.items) {
			const flow = this.getFlow(f)

			if (flow === null || flow === 'NOT_SUPPORTED') {
				continue
			}

			for (const req of flow.requests) {
				const matcher = this.findMatcherForReq(req)

				if (matcher === null || matcher.purposes !== 'NOT_WALLET_INITIATED') {
					await req.populateStringsInto(strings)
				}
			}
		}

		return strings
	}
}

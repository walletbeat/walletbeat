import fs from 'fs'
import path from 'path'

import { assertValidEntityId, type EntityId } from '@/data/entities'
import { entityForDomain } from '@/data/entities/domains/entity-domains'
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
	leastConfigurableCollectionPolicy,
	PersonalInfo,
	RegularEndpoint,
	UserFlow,
	userFlow,
	userFlowMayBeMarkedUnsupported,
	type UserInfo,
	userInfoEnums,
} from '@/schema/features/privacy/data-collection'
import { refNotNecessary, type WithRef } from '@/schema/reference'
import { type Variant, variantEnum } from '@/schema/variants'
import { type WalletType, walletTypes } from '@/schema/wallet-types'
import { isInVocabulary, isLikelyEnglish } from '@/tests/utils/grammar'
import { getErrorMessage } from '@/types/errors'
import {
	assertNonEmptyArray,
	isNonEmptyArray,
	type NonEmptyArray,
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
} from './json-utils'
import { StringEntropy } from './string-entropy'
import {
	globalBenignPlaceholder,
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
interface EncodedUserDataStringStore {
	userData: EncodedUserDataString[]
}

interface EncodedWalletDataRequest {
	domain: string
	path: string
	sessionTime: number

	/**
	 * Encoded as:
	 * - omitted if empty
	 * - otherwise: Record<key, EncodedUserDataPieces | EncodedUserDataPieces[]>
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
	 * Encoded as omitted if absent, otherwise EncodedUserDataPieces.
	 */
	content?: EncodedUserDataPieces

	cookies?: EncodedMultiDict
	refererDomain?: string
	oddHeaders?: EncodedMultiDict
	oddTrailers?: EncodedMultiDict

	review?: EncodedWalletRequestReview
}

/**
 * How query params / cookies / headers are encoded.
 * Each key maps to either:
 * - a single EncodedUserDataPieces (if only one value)
 * - or an array of EncodedUserDataPieces (if multiple values)
 */
type EncodedMultiDict = Record<string, EncodedUserDataPieces | EncodedUserDataPieces[]>

/**
 * EncodedUserDataPieces encoding:
 * - If no pieces were detected: encoded directly as a raw string.
 * - If pieces were detected: encoded as an object with `sample` plus `piece` or `pieces`.
 */
type EncodedUserDataPieces =
	| string
	| { sample: string; piece: UserInfo }
	| { sample: string; pieces: UserInfo[] }

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

function parseEncodedUserDataPieces(v: unknown, at: string): EncodedUserDataPieces {
	if (typeof v === 'string') {
		return expectString(v, at)
	}

	const obj = expectRecord(v, at)

	// sample is required in object form
	const sample = expectString(obj.sample, `${at}.sample`)

	const hasPiece = Object.prototype.hasOwnProperty.call(obj, 'piece')
	const hasPieces = Object.prototype.hasOwnProperty.call(obj, 'pieces')

	if (hasPiece === hasPieces) {
		// either both present or neither present
		throw new Error(`Expected exactly one of "piece" or "pieces" at ${at}`)
	}

	if (hasPiece) {
		const piece = userInfoEnums.assert(expectString(obj.piece, `${at}.piece`))

		return { sample, piece }
	}

	const piecesRaw = expectArray(obj.pieces, `${at}.pieces`)
	const pieces = piecesRaw.map((x, i) =>
		userInfoEnums.assert(expectString(x, `${at}.pieces[${i}]`)),
	)

	return { sample, pieces }
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
			out[k] = rawVal.map((x, i) => parseEncodedUserDataPieces(x, `${keyAt}[${i}]`))
		} else {
			out[k] = parseEncodedUserDataPieces(rawVal, keyAt)
		}
	}

	return out
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

	let content: EncodedUserDataPieces | undefined

	if (obj.content !== undefined) {
		content = parseEncodedUserDataPieces(obj.content, `${at}.content`)
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
		...(review ? { review } : {}),
	}
}

function parseWalletDataFlow(v: unknown, at: string): EncodedWalletDataFlow {
	const obj = expectRecord(v, at)
	const requestsRaw = expectArray(obj.requests, `${at}.requests`)
	const requests = requestsRaw.map((x, i) => parseWalletDataRequest(x, `${at}.requests[${i}]`))

	return { requests }
}

function stableJSONStringify(v: unknown): string {
	if (v === null || typeof v !== 'object') {
		return JSON.stringify(v)
	}

	if (Array.isArray(v)) {
		return `[${v.map(stableJSONStringify).join(',')}]`
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we checked it was an object and not an array.
	const obj = v as Record<string, unknown>
	const keys = Object.keys(obj).sort()

	return `{${keys.map(k => `${JSON.stringify(k)}:${stableJSONStringify(obj[k])}`).join(',')}}`
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
		if (typeof data === 'string') {
			return new UserDataString(data, [])
		}

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
}

/**
 * A deduplicated set of UserDataString objects.
 */
export class UserDataStringStore {
	private readonly _strings: Set<UserDataString> = new Set()
	private readonly _index: Map<string, UserDataString> = new Map()

	public static newStore(): UserDataStringStore {
		return new UserDataStringStore()
	}

	public static fromJSON(data: unknown, at: string): UserDataStringStore {
		const record = expectRecord(data, at)
		const store = new UserDataStringStore()

		for (const itemData of expectArray(record.userData, `${at}.userData`)) {
			const item = UserDataString.decode(itemData, `${at}.userData[]`)

			store.add(item)
		}

		return store
	}

	public add(item: UserDataString): void {
		const key = this._makeKey(item)

		if (!this._index.has(key)) {
			this._strings.add(item)
			this._index.set(key, item)
		}
	}

	private _makeKey(item: UserDataString): string {
		return item.str + '|' + [...item.pieces].sort(compareUserInfo).join(',')
	}

	public toJSON(): EncodedUserDataStringStore {
		const sorted = [...this._strings].sort((a, b) => a.str.localeCompare(b.str))

		return { userData: sorted.map(item => item.encode()) }
	}

	public *iter(): Iterable<UserDataString> {
		yield* this._strings
	}

	public get size(): number {
		return this._strings.size
	}
}

// ============  WalletDataString  ============

enum WalletStringOccurrenceType {
	HEADER = 'HEADER',
	TRAILER = 'TRAILER',
	QUERY_PARAMETER = 'QUERY_PARAMETER',
	COOKIE = 'COOKIE',
	WHOLE_PAYLOAD = 'WHOLE_PAYLOAD',
	PAYLOAD_PARAMETER = 'PAYLOAD_PARAMETER',
}

type WalletStringOccurrenceKey = `${WalletStringOccurrenceType}:${string}`

export class WalletDataString {
	public static highestScoreFirst(a: WalletDataString, b: WalletDataString): number {
		return b.score - a.score
	}

	/**
	 * Construct WalletDataString instances from a UserDataPieces sample.
	 */
	public static async fromUserDataPieces(
		pieces: UserDataPieces,
		occurrence: WalletStringOccurrenceType,
		paramName: string,
		sourceRequest: WalletRequest,
	): Promise<WalletDataString[]> {
		// Reconstruct string: replace user-data parts with placeholder
		const sampleStr = pieces.sample.str

		// If the sample has pieces marked, replace the whole thing with a placeholder
		const reconstitutedStr = sampleStr

		return await WalletDataString.createMany(reconstitutedStr, occurrence, paramName, sourceRequest)
	}

	/**
	 * Break down a payload string by attempting to parse it as a query string, or JSON.
	 * Recursively processes decoded values. Falls back to a single WalletDataString if no
	 * parsing strategy succeeds.
	 *
	 * @param str The payload string to parse.
	 * @param occurrence The occurrence type for tracking.
	 * @param paramName The parameter name for tracking.
	 * @param sourceRequest Wallet request that sourced this string.
	 * @returns An array of WalletDataString instances representing the decomposed payload.
	 */
	private static async createMany(
		str: string,
		occurrence: WalletStringOccurrenceType,
		paramName: string,
		sourceRequest: WalletRequest,
	): Promise<WalletDataString[]> {
		if (str === '') {
			return []
		}

		if (str === globalBenignPlaceholder) {
			return []
		}

		// Try query string parsing first
		const queryResult = await WalletDataString._tryParseAsQueryString(
			str,
			occurrence,
			paramName,
			sourceRequest,
		)

		if (queryResult !== null) {
			return queryResult
		}

		// Try JSON parsing
		const jsonResult = await WalletDataString._tryParseAsJson(
			str,
			occurrence,
			paramName,
			sourceRequest,
		)

		if (jsonResult !== null) {
			return jsonResult
		}

		if (str.includes('\n')) {
			const ndjsonResult = await WalletDataString._tryParseAsJsonLines(
				str,
				occurrence,
				paramName,
				sourceRequest,
			)

			if (ndjsonResult !== null) {
				return ndjsonResult
			}
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

		if (str.includes(globalBenignPlaceholder)) {
			const parts = str.split(globalBenignPlaceholder)
			const partWise: WalletDataString[] = []

			for (const part of parts) {
				if (part.trim() === '') {
					continue
				}

				partWise.push(
					...(await WalletDataString.createMany(part, occurrence, paramName, sourceRequest)),
				)
			}

			if (partWise.length > 0) {
				return partWise
			}
		}

		// Fallback: treat the entire string as a single WalletDataString
		const instance = new WalletDataString(str, sourceRequest)

		instance.addOccurrence(occurrence, paramName)

		return [instance]
	}

	private static async _tryParseAsQueryString(
		str: string,
		occurrence: WalletStringOccurrenceType,
		paramName: string,
		sourceRequest: WalletRequest,
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

		for (const pair of pairs) {
			if (pair === '') {
				continue
			}

			const eqIndex = pair.indexOf('=')

			if (eqIndex === -1) {
				// Key without value
				results.push(
					...(await WalletDataString.createMany(pair, occurrence, paramName, sourceRequest)),
				)
			} else {
				const key = pair.slice(0, eqIndex)
				const value = pair.slice(eqIndex + 1)

				results.push(
					...(await WalletDataString.createMany(key, occurrence, paramName, sourceRequest)),
				)
				results.push(
					...(await WalletDataString.createMany(value, occurrence, paramName, sourceRequest)),
				)
			}
		}

		if (results.length === 0) {
			return null
		}

		return results
	}

	private static async _tryParseAsJson(
		str: string,
		occurrence: WalletStringOccurrenceType,
		paramName: string,
		sourceRequest: WalletRequest,
	): Promise<WalletDataString[] | null> {
		let parsed: unknown

		try {
			parsed = JSON.parse(str.trim())
		} catch {
			return null
		}

		return await WalletDataString._extractJsonStrings(
			parsed,
			'',
			occurrence,
			paramName,
			sourceRequest,
		)
	}

	private static async _tryParseAsJsonLines(
		str: string,
		occurrence: WalletStringOccurrenceType,
		paramName: string,
		sourceRequest: WalletRequest,
	): Promise<WalletDataString[] | null> {
		const lines = str.split('\n').filter(line => line.trim() !== '')

		if (lines.length === 0) {
			return null
		}

		const results: WalletDataString[] = []

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim()
			let parsed: unknown

			try {
				parsed = JSON.parse(line)
			} catch {
				return null
			}

			const linePath = lines.length > 1 ? `[${i}]` : ''
			const extracted = await WalletDataString._extractJsonStrings(
				parsed,
				linePath,
				occurrence,
				paramName,
				sourceRequest,
			)

			results.push(...extracted)
		}

		return results
	}

	private static async _extractJsonStrings(
		value: unknown,
		path: string,
		occurrence: WalletStringOccurrenceType,
		paramName: string,
		sourceRequest: WalletRequest,
	): Promise<WalletDataString[]> {
		const results: WalletDataString[] = []

		if (value === undefined || value === null) {
			return results
		}

		if (typeof value === 'string') {
			results.push(
				...(await WalletDataString.createMany(value, occurrence, path || paramName, sourceRequest)),
			)
		} else if (Array.isArray(value)) {
			for (const val of value) {
				results.push(
					...(await WalletDataString._extractJsonStrings(
						val,
						`${path}[]`,
						occurrence,
						paramName,
						sourceRequest,
					)),
				)
			}
		} else if (typeof value === 'object') {
			for (const key of Object.keys(value).sort()) {
				results.push(
					...(await WalletDataString.createMany(key, occurrence, path || paramName, sourceRequest)),
				)
				const childPath = path ? `${path}.${key}` : key

				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Safe because we know `key` is a key of `value`.
				const obj = value as { [key]: unknown }

				results.push(
					...(await WalletDataString._extractJsonStrings(
						obj[key],
						childPath,
						occurrence,
						paramName,
						sourceRequest,
					)),
				)
			}
		}
		// Primitives (number, boolean, null) are ignored

		return results
	}

	public readonly str: string | UserDataString
	private readonly firstSourceRequest: WalletRequest
	private readonly occurrences: Map<WalletStringOccurrenceKey, number>
	private readonly entropy: StringEntropy
	private _score: number | null = null

	private constructor(str: string | UserDataString, firstSourceRequest: WalletRequest) {
		if (typeof str === 'string' && str === '') {
			throw new Error('Cannot create a WalletDataString with the empty string')
		}

		this.str = str
		this.firstSourceRequest = firstSourceRequest
		this.occurrences = new Map()
		this.entropy =
			typeof str === 'string' ? StringEntropy.compute(str) : StringEntropy.compute(str.str)
	}

	/**
	 * Returns the first request that sourced this data string.
	 */
	public getFirstSourceRequest(): WalletRequest {
		return this.firstSourceRequest
	}

	/**
	 * Returns a readonly view of the occurrences map.
	 */
	public getOccurrences(): ReadonlyMap<WalletStringOccurrenceKey, number> {
		return this.occurrences
	}

	public addOccurrencesFrom(other: WalletDataString) {
		if (typeof this.str === 'string') {
			if (typeof other.str !== 'string') {
				throw new Error('incompatible WalletDataString types')
			}

			if (this.str !== other.str) {
				throw new Error('mismatching WalletDataString objects')
			}
		} else {
			if (typeof other.str !== 'object') {
				throw new Error('incompatible WalletDataString types')
			}

			if (this.str.str !== other.str.str) {
				throw new Error('mismatching WalletDataString objects')
			}
		}

		for (const [key, count] of other.occurrences.entries()) {
			const existing = this.occurrences.get(key) ?? 0

			this.occurrences.set(key, existing + count)
		}

		this._score = null
	}

	public addOccurrence(occurrence: WalletStringOccurrenceType, paramName: string) {
		const key: WalletStringOccurrenceKey = `${occurrence}:${paramName}`
		const got = this.occurrences.get(key)

		this.occurrences.set(key, got === undefined ? 1 : got + 1)
		this._score = null
	}

	public get score(): number {
		if (this._score === null) {
			let appearances = 0.0

			for (const [_, v] of this.occurrences.entries()) {
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

	constructor(captureFile: WalletCaptureFile) {
		this.captureFile = captureFile
	}

	public add(s: WalletDataString) {
		const key = typeof s.str === 'string' ? s.str : s.str.str

		if (this.captureFile.isBenignString(key)) {
			return
		}

		const existing = this._strings.get(key)

		if (existing) {
			existing.addOccurrencesFrom(s)
		} else {
			this._strings.set(key, s)
		}
	}

	public size(): number {
		return this._strings.size
	}

	public strings(): WalletDataString[] {
		return Array.from(this._strings.values()).sort((a, b) =>
			WalletDataString.highestScoreFirst(a, b),
		)
	}
}

export type UserDataDict = Record<string, NonEmptyArray<UserDataPieces>>

function decodeUserDataDict(encoded: EncodedMultiDict | undefined, at: string): UserDataDict {
	if (!encoded) {
		return {}
	}

	const out: UserDataDict = {}

	for (const [k, raw] of Object.entries(encoded)) {
		const keyAt = `${at}[${JSON.stringify(k)}]`

		if (Array.isArray(raw)) {
			try {
				out[k] = assertNonEmptyArray(raw.map((x, i) => UserDataPieces.decode(x, `${keyAt}[${i}]`)))
			} catch (e) {
				throw new Error(`${getErrorMessage(e)} at ${keyAt}`)
			}
		} else {
			out[k] = [UserDataPieces.decode(raw, keyAt)]
		}
	}

	return out
}

export class UserDataPieces {
	public readonly sample: UserDataString
	public readonly pieces: ReadonlySet<UserInfo>

	private constructor(args: { sample: UserDataString; pieces: Iterable<UserInfo> }) {
		this.sample = args.sample
		this.pieces = new Set(args.pieces)
	}

	public static decode(data: EncodedUserDataPieces, at = '$'): UserDataPieces {
		try {
			let sample: UserDataString

			if (typeof data === 'string') {
				sample = new UserDataString(data, [])
			} else {
				sample = new UserDataString(data.sample, [])
			}

			if (typeof data === 'string') {
				return new UserDataPieces({ sample, pieces: [] })
			}

			if ('piece' in data) {
				return new UserDataPieces({ sample, pieces: [data.piece] })
			}

			if ('pieces' in data) {
				return new UserDataPieces({ sample, pieces: data.pieces })
			}

			return new UserDataPieces({ sample, pieces: [] })
		} catch (e) {
			throw new Error(`${getErrorMessage(e)} at ${at}`)
		}
	}

	public encode(): EncodedUserDataPieces {
		const sampleStr = this.sample.str
		const samplePieces = this.sample.pieces

		// Merge sample pieces with our own pieces
		const allPieces = new Set<UserInfo>([...this.pieces, ...samplePieces])

		if (allPieces.size === 0) {
			return sampleStr
		}

		const sortedPieces = [...allPieces].sort(compareUserInfo)

		if (sortedPieces.length === 1) {
			return { sample: sampleStr, piece: sortedPieces[0] }
		}

		return { sample: sampleStr, pieces: sortedPieces }
	}

	public toSkeletonString(placeholder: string | null): string {
		const sampleRepr = placeholder !== null ? placeholder : this.sample.str

		if (this.pieces.size === 0) {
			return sampleRepr
		}

		const pieces = [...this.pieces].sort().join(' ')

		return `${sampleRepr} [${pieces}]`
	}

	public toString(): string {
		const sampleRepr = JSON.stringify(this.sample.encode())

		if (this.pieces.size === 0) {
			return sampleRepr
		}

		const pieces = [...this.pieces].sort().join(' ')

		return `${sampleRepr} [${pieces}]`
	}
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

export type UserDataPiecesWithDomain = UserDataPieces & {
	domain: string
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
	public readonly content: UserDataPieces | null
	public readonly cookies: UserDataDict
	public readonly refererDomain: string | null
	public readonly oddHeaders: UserDataDict
	public readonly oddTrailers: UserDataDict
	public readonly review: WalletRequestReview

	private constructor(args: {
		captureFile: WalletCaptureFile
		domain: string
		path: string
		sessionTime: WalletCaptureSessionTime
		query: UserDataDict
		jsonRpcMethods: string[]
		content: UserDataPieces | null
		cookies: UserDataDict
		refererDomain: string | null
		oddHeaders: UserDataDict
		oddTrailers: UserDataDict
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
				req.content === undefined ? null : UserDataPieces.decode(req.content, `${at}.content`),
			cookies: decodeUserDataDict(req.cookies, `${at}.cookies`),
			refererDomain: req.refererDomain ?? null,
			oddHeaders: decodeUserDataDict(req.oddHeaders, `${at}.oddHeaders`),
			oddTrailers: decodeUserDataDict(req.oddTrailers, `${at}.oddTrailers`),
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

				out[k] = vals.length === 1 ? vals[0].encode() : vals.map(v => v.encode())
			}

			return out
		}

		const query = encodeDict(this.query)
		const cookies = encodeDict(this.cookies)
		const oddHeaders = encodeDict(this.oddHeaders)
		const oddTrailers = encodeDict(this.oddTrailers)

		const jsonRpcMethod =
			this.jsonRpcMethods.length === 0
				? undefined
				: this.jsonRpcMethods.length === 1
					? this.jsonRpcMethods[0]
					: [...this.jsonRpcMethods]

		return {
			domain: this.domain,
			path: this.path,
			sessionTime: this.sessionTime.toNumber(),
			...(query ? { query } : {}),
			...(jsonRpcMethod ? { jsonRpcMethod } : {}),
			...(this.content ? { content: this.content.encode() } : {}),
			...(cookies ? { cookies } : {}),
			...(this.refererDomain !== null ? { refererDomain: this.refererDomain } : {}),
			...(oddHeaders ? { oddHeaders } : {}),
			...(oddTrailers ? { oddTrailers } : {}),
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

		return (
			`${this.domain}: ${this.path}` +
			fmtMultiDict('query', this.query) +
			rpc +
			content +
			fmtMultiDict('cookie', this.cookies) +
			refererDomain +
			fmtMultiDict('headers', this.oddHeaders) +
			fmtMultiDict('trailers', this.oddTrailers)
		)
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

		const processUserDataPieces = async (piece: UserDataPieces) => {
			for (const userInfo of piece.pieces) {
				setInfo(userInfo, matcherCollectionPolicy)
			}
			const dataStrings = new WalletDataStrings(this._captureFile)

			await this.populateStringsInto(dataStrings)

			for (const dataString of dataStrings.strings()) {
				if (typeof dataString.str === 'object') {
					for (const userInfo of dataString.str.pieces) {
						setInfo(userInfo, matcherCollectionPolicy)
					}
				}
			}
		}

		const processDict = async (dict: UserDataDict) => {
			for (const values of Object.values(dict)) {
				for (const piece of values) {
					await processUserDataPieces(piece)
				}
			}
		}

		await processDict(this.query)
		await processDict(this.cookies)
		await processDict(this.oddHeaders)
		await processDict(this.oddTrailers)

		if (this.content !== null) {
			await processUserDataPieces(this.content)
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
		await this._processUserDataDict(this.query, WalletStringOccurrenceType.QUERY_PARAMETER, strings)
		await this._processUserDataDict(this.cookies, WalletStringOccurrenceType.COOKIE, strings)
		await this._processUserDataDict(this.oddHeaders, WalletStringOccurrenceType.HEADER, strings)
		await this._processUserDataDict(this.oddTrailers, WalletStringOccurrenceType.TRAILER, strings)

		if (this.content !== null) {
			const dataStrings = await WalletDataString.fromUserDataPieces(
				this.content,
				WalletStringOccurrenceType.WHOLE_PAYLOAD,
				'payload',
				this,
			)

			for (const ds of dataStrings) {
				strings.add(ds)
			}
		}
	}

	private async _processUserDataDict(
		dict: UserDataDict,
		occurrenceType: WalletStringOccurrenceType,
		strings: WalletDataStrings,
	) {
		for (const [key, piecesArray] of Object.entries(dict)) {
			for (const pieces of piecesArray) {
				const dataStrings = await WalletDataString.fromUserDataPieces(
					pieces,
					occurrenceType,
					key,
					this,
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
		const perEntity = new Map<
			EntityId,
			{
				entity: Entity
				info: Map<UserInfo, CollectionPolicy>
				purposes: Set<DataCollectionPurpose>
			}
		>()

		for (const request of flow.requests) {
			const entity = entityForDomain(request.domain)

			if (entity === null) {
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

			const entityId = assertValidEntityId(entity.id)
			let entData = perEntity.get(entityId)

			if (entData === undefined) {
				entData = {
					entity,
					info: new Map<UserInfo, CollectionPolicy>(),
					purposes: new Set<DataCollectionPurpose>(),
				}
				perEntity.set(entityId, entData)
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

			collected.push({
				byEntity: entData.entity,
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
			})
		}

		return collected
	}

	private async saveCaptureFileOnly(verifyExisting: boolean): Promise<string[]> {
		if (this.path === null) {
			throw new Error('WalletCaptureFile was constructed without a path; cannot save.')
		}

		const data = this.toJSON()
		const content = JSON.stringify(data, null, '\t') + '\n'

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
			const entity = entityForDomain(domain)

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
							suggestion: `Review request${numUnreviewedRequests === 1 ? '' : 's'}${issues.length > 0 ? ' (consider using matchers before doing so)' : ''}`,
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

	public async allStrings(): Promise<WalletDataStrings> {
		const strings = new WalletDataStrings(this)

		for (const f of recordedFlow.items) {
			const flow = this.getFlow(f)

			if (flow === null || flow === 'NOT_SUPPORTED') {
				continue
			}

			for (const req of flow.requests) {
				await req.populateStringsInto(strings)
			}
		}

		return strings
	}
}

import { createHash, randomBytes } from 'node:crypto'

import fs from 'fs'
import path from 'path'

import { assertValidEntityId, type EntityId } from '@/data/entities'
import { entityForDomain } from '@/data/entities/domains/entity-domains'
import type { Entity } from '@/schema/entity'
import {
	CollectionPolicy,
	compareUserInfo,
	type DataCollection,
	type DataCollectionByEntity,
	type DataCollectionForFlow,
	type DataCollectionForFlowWithOnchainData,
	DataCollectionPurpose,
	dataCollectionPurpose,
	leastConfigurableCollectionPolicy,
	normalizedStrForUserInfo,
	RegularEndpoint,
	UserFlow,
	userFlow,
	userFlowMayBeMarkedUnsupported,
	type UserInfo,
	userInfoEnums,
	variationsOnStrForUserInfo,
} from '@/schema/features/privacy/data-collection'
import { refNotNecessary, type WithRef } from '@/schema/reference'
import { type Variant, variantEnum } from '@/schema/variants'
import { type WalletType, walletTypes } from '@/schema/wallet-types'
import { getErrorMessage } from '@/types/errors'
import {
	assertNonEmptyArray,
	isNonEmptyArray,
	type NonEmptyArray,
	nonEmptyMapToRecord,
	type NonEmptySet,
	nonEmptySet,
	nonEmptySetFromArray,
	nonEmptySorted,
	setContains,
	setItems,
	setUnion,
} from '@/types/utils/non-empty'
import { Enum, excludeFromEnum, mergeEnums } from '@/utils/enum'

import { expectArray, expectBoolean, expectNumber, expectRecord, expectString } from './json-utils'
import type {
	SaveOptions,
	WalletCaptureAnnotations,
	WalletRequestMatcher,
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
 * A "~R:"-prefixed string produced by RedactedString.encode().
 * Format is "~R:" + <escapeChar> + <redactedPayload>.
 */
type RedactedEncodedString = `~R:${string}`

interface EncodedRedactedStringStore {
	salt: string
	redactions: EncodedRedactedData[]
}

type EncodedRedactedData = {
	labelPrefix: string
	labelIndex: number
	hash: string
	origHash?: string
	length: number
	firstChar: string
	hint?: string
} & (
	| {
			piece: UserInfo
	  }
	| { pieces: NonEmptyArray<UserInfo> }
)

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
 * - If no pieces were detected: encoded directly as a redacted string.
 * - If pieces were detected: encoded as an object with `sample` plus `piece` or `pieces`.
 */
type EncodedUserDataPieces =
	| RedactedEncodedString
	| EncodedUserDataPieceSingle
	| EncodedUserDataPiecesMultiple

interface EncodedUserDataPieceSingle {
	sample: RedactedEncodedString
	piece: UserInfo
}

interface EncodedUserDataPiecesMultiple {
	sample: RedactedEncodedString
	pieces: UserInfo[]
}

interface EncodedWalletRequestReview {
	manuallyReviewed: boolean
	extraPurposes?: DataCollectionPurpose[]
	extraUserData?: UserInfo[]
	collectionPolicy?: CollectionPolicy
}

interface EncodedWalletCaptureFlow {
	requests: EncodedWalletDataRequest[]
}

interface EncodedWalletCaptureFile {
	identity: WalletCaptureFileIdentity
	flows: Record<string, EncodedWalletCaptureFlow | 'NOT_SUPPORTED'>
	redactions: EncodedRedactedStringStore
	sessions: number
}

function parseRedactedEncodedString(v: unknown, at: string): RedactedEncodedString {
	const s = expectString(v, at)

	if (!s.startsWith('~R:') || s.length < 4) {
		throw new Error(`Expected "~R:"-encoded redacted string at ${at}`)
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We checked.
	return s as RedactedEncodedString
}

function parseEncodedUserDataPieces(v: unknown, at: string): EncodedUserDataPieces {
	if (typeof v === 'string') {
		return parseRedactedEncodedString(v, at)
	}

	const obj = expectRecord(v, at)

	// sample is required in object form
	const sample = parseRedactedEncodedString(obj.sample, `${at}.sample`)

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

	let extraPurposes: DataCollectionPurpose[] | undefined

	if (obj.extraPurposes !== undefined) {
		const rawPurposes = expectArray(obj.extraPurposes, `${at}.extraPurposes`)

		extraPurposes = rawPurposes.map((p, i) =>
			dataCollectionPurpose.assert(expectString(p, `${at}.extraPurposes[${i}]`)),
		)
	}

	let extraUserData: UserInfo[] | undefined

	if (obj.extraUserData !== undefined) {
		const rawData = expectArray(obj.extraUserData, `${at}.extraUserData`)

		extraUserData = rawData.map((d, i) =>
			userInfoEnums.assert(expectString(d, `${at}.extraUserData[${i}]`)),
		)
	}

	return {
		manuallyReviewed,
		...(extraPurposes !== undefined && extraPurposes.length > 0 ? { extraPurposes } : {}),
		...(extraUserData !== undefined && extraUserData.length > 0 ? { extraUserData } : {}),
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

function parseRedactedDataJSON(v: unknown, at: string): EncodedRedactedData {
	const obj = expectRecord(v, at)
	const labelPrefix = expectString(obj.labelPrefix, `${at}.labelPrefix`)
	const labelIndex = expectNumber(obj.labelIndex, `${at}.labelIndex`)
	const hash = expectString(obj.hash, `${at}.hash`)
	const length = expectNumber(obj.length, `${at}.length`)
	const firstChar = expectString(obj.firstChar, `${at}.firstChar`)

	let piece: UserInfo | undefined

	if (obj.piece !== undefined) {
		piece = userInfoEnums.assert(expectString(obj.piece, `${at}.piece`))
	}

	let pieces: NonEmptyArray<UserInfo> | undefined

	if (obj.pieces !== undefined) {
		pieces = assertNonEmptyArray(
			expectArray(obj.pieces, `${at}.pieces`)
				.map((x, i) => expectString(x, `${at}.pieces[${i}]`))
				.map(x => userInfoEnums.assert(x)),
		)
	}

	let hint: string | undefined

	if (obj.hint !== undefined) {
		hint = expectString(obj.hint, `${at}.hint`)
	}

	let origHash: string | undefined

	if (obj.origHash !== undefined) {
		origHash = expectString(obj.origHash, `${at}.origHash`)
	}

	const result = {
		labelPrefix,
		labelIndex,
		hash,
		...(origHash ? { origHash } : {}),
		length,
		firstChar,
		...(piece ? { piece } : {}),
		...(pieces ? { pieces } : {}),
		...(hint ? { hint } : {}),
	}

	if (result.piece === undefined && result.pieces === undefined) {
		throw new Error(`Missing redacted piece/pieces at ${at}.*`)
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We checked.
	return result as EncodedRedactedData
}

function parseRedactedStringStore(v: unknown, at: string): RedactedStringStore {
	const obj = expectRecord(v, at)
	const salt = expectString(obj.salt, `${at}.salt`)
	const redactionsRaw = expectArray(obj.redactions, `${at}.redactions`)
	const redactions = redactionsRaw.map((x, i) => parseRedactedDataJSON(x, `${at}.redactions[${i}]`))

	return RedactedStringStore.fromJSON({ salt, redactions })
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

function assert(cond: unknown, msg: string): asserts cond {
	if (!cond) {
		throw new Error(msg)
	}
}

function labelKey(labelPrefix: string, labelIndex: number): string {
	return `${labelPrefix}:${labelIndex}`
}

function parseLabelToken(token: string): { labelPrefix: string; labelIndex: number } | null {
	// Python: label_prefix, label_index_str = component.split("_", 2)
	// Here we enforce the expected format.
	const m = /^([^_]+)_(\d+)$/.exec(token)

	if (!m) {
		return null
	}

	return { labelPrefix: m[1], labelIndex: Number(m[2]) }
}

export class RedactedData {
	public readonly labelPrefix: string
	public readonly labelIndex: number

	/**
	 * Not encoded in JSON, but the store may learn it later via `redact(...)`.
	 */
	public realStr: string | null

	public readonly hash: string
	public origHash: string
	public pieces: NonEmptySet<UserInfo>
	public hint: string | null
	public readonly length: number
	public readonly firstChar: string

	private constructor(args: {
		redactor: RedactedStringStore
		labelPrefix: string
		labelIndex: number
		realStr: string | null
		hash: string
		origHash: string
		pieces: NonEmptySet<UserInfo>
		hint: string | null
		length: number
		firstChar: string
	}) {
		if (args.realStr !== null && args.realStr.length === 0) {
			throw new Error('Redacted string realStr cannot be an empty string.')
		}

		this.labelPrefix = args.labelPrefix
		this.labelIndex = args.labelIndex
		this.realStr = args.realStr
		this.hash = args.hash
		this.origHash = args.origHash
		this.pieces = args.pieces
		this.hint = args.hint
		this.length = args.realStr != null ? args.realStr.length : args.length
		this.firstChar =
			args.realStr != null ? args.realStr[0].toLowerCase() : args.firstChar.toLowerCase()
	}

	public static fromJSON(redactor: RedactedStringStore, data: EncodedRedactedData): RedactedData {
		const pieces = ((): RedactedData['pieces'] => {
			if (Object.hasOwn(data, 'piece')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We checked it exists.
				return nonEmptySet((data as { piece: UserInfo })['piece'])
			}

			if (Object.hasOwn(data, 'pieces')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- We checked it exists.
				return nonEmptySetFromArray((data as { pieces: NonEmptyArray<UserInfo> })['pieces'])
			}

			throw new Error('Unreachable')
		})()

		return new RedactedData({
			redactor,
			labelPrefix: data.labelPrefix,
			labelIndex: data.labelIndex,
			realStr: null,
			hash: data.hash,
			origHash: data.origHash ?? data.hash,
			pieces,
			hint: data.hint ?? null,
			length: data.length,
			firstChar: data.firstChar,
		})
	}

	public static createNew(args: {
		redactor: RedactedStringStore
		labelPrefix: string
		labelIndex: number
		realStr: string
		hash: string
		origHash: string
		pieces: NonEmptySet<UserInfo>
		hint: string | null
	}): RedactedData {
		if (args.realStr === '') {
			throw new Error('Cannot redact the empty string')
		}

		return new RedactedData({
			redactor: args.redactor,
			labelPrefix: args.labelPrefix,
			labelIndex: args.labelIndex,
			realStr: args.realStr,
			hash: args.hash,
			origHash: args.origHash,
			pieces: args.pieces,
			hint: args.hint,
			length: args.realStr.length,
			firstChar: args.realStr[0],
		})
	}

	public get label(): string {
		return `${this.labelPrefix}_${this.labelIndex}`
	}

	/**
	 * `augment(...)`:
	 * - learns realStr (not encoded)
	 * - may set piece/hint (encoded)
	 * Returns true if encoded metadata changed (piece/hint).
	 */
	public augment(args: {
		realStr?: string
		origHash?: string
		pieces?: NonEmptySet<UserInfo>
		hint?: string
	}): boolean {
		let changed = false

		if (args.realStr != undefined) {
			if (this.realStr != null) {
				assert(this.realStr === args.realStr, 'Hash collision')
			}

			assert(args.realStr.length > 0, 'String is empty')
			assert(args.realStr.length === this.length, 'Length mismatch')
			assert(args.realStr[0].toLowerCase() === this.firstChar, 'First character mismatch')
			this.realStr = args.realStr
		}

		if (args.origHash != undefined) {
			if (this.origHash != args.origHash) {
				assert(this.origHash === args.origHash, 'origHash mismatch')
			}

			this.origHash = args.origHash
		}

		if (args.pieces !== undefined) {
			for (const piece of setItems(args.pieces)) {
				if (!setContains(this.pieces, piece)) {
					this.pieces = setUnion([this.pieces, nonEmptySet(piece)])
					changed = true
				}
			}
		}

		if (args.hint != null) {
			if (this.hint != null) {
				assert(this.hint === args.hint, 'Conflicting hint')
			}

			changed = changed || this.hint !== args.hint
			this.hint = args.hint
		}

		return changed
	}

	public toJSON(): EncodedRedactedData {
		const out: EncodedRedactedData = {
			labelPrefix: this.labelPrefix,
			labelIndex: this.labelIndex,
			hash: this.hash,
			...(this.origHash === this.hash ? {} : { origHash: this.origHash }),
			length: this.length,
			firstChar: this.firstChar,
			...(setItems(this.pieces).length === 1
				? { piece: setItems(this.pieces)[0] }
				: { pieces: nonEmptySorted(setItems(this.pieces), compareUserInfo) }),
			...(this.hint !== null ? { hint: this.hint } : {}),
		}

		return out
	}
}

export class RedactedStringStore {
	private readonly salt: string
	private readonly labelNextIndex = new Map<string, number>()
	private readonly hashToLabel = new Map<string, { labelPrefix: string; labelIndex: number }>()
	private readonly redactions = new Map<string, RedactedData>()
	private relevantLengths: number[] = [] // Sorted in decreasing order, unique.
	private relevantChunks = new Map<number, Set<string>>() // Maps each length in `relevantLengths` to the potential firstChar to expect for that length.

	private constructor(args: { salt: string; redactions?: Iterable<RedactedData> }) {
		this.salt = args.salt

		if (args.redactions !== undefined) {
			for (const r of args.redactions) {
				this.installDecodedRedaction(r)
			}
		}
	}

	public static newStore(): RedactedStringStore {
		const bytes = randomBytes(32)
		const salt = Array.from(bytes, b => String.fromCharCode(97 + (b % 26))).join('')

		return new RedactedStringStore({ salt })
	}

	public static fromJSON(data: EncodedRedactedStringStore): RedactedStringStore {
		const store = new RedactedStringStore({ salt: data.salt })

		for (const raw of data.redactions) {
			const r = RedactedData.fromJSON(store, raw)

			store.installDecodedRedaction(r)
		}

		return store
	}

	public getRedaction(labelPrefix: string, labelIndex: number): RedactedData {
		const key = labelKey(labelPrefix, labelIndex)
		const r = this.redactions.get(key)

		assert(r != null, `Unknown redaction label: ${labelPrefix}_${labelIndex}`)

		return r
	}

	public redactionsSorted(): ReadonlyArray<RedactedData> {
		const all = Array.from(this.redactions.values())

		all.sort((a, b) => {
			if (a.labelPrefix < b.labelPrefix) {
				return -1
			}

			if (a.labelPrefix > b.labelPrefix) {
				return 1
			}

			return a.labelIndex - b.labelIndex
		})

		return all
	}

	public toJSON(): EncodedRedactedStringStore {
		return {
			salt: this.salt,
			redactions: this.redactionsSorted().map(r => r.toJSON()),
		}
	}

	private hash(s: string): string {
		const h = createHash('sha256')

		h.update(this.salt, 'utf8')
		h.update(s, 'utf8')

		return h.digest('hex')
	}

	private registerLengthAndChunk(len: number, firstChar: string) {
		let set = this.relevantChunks.get(len)

		if (set === undefined) {
			set = new Set()
			this.relevantChunks.set(len, set)

			// Maintain relevantLengths sorted descending
			this.relevantLengths.push(len)
			this.relevantLengths.sort((a, b) => b - a)
		}

		set.add(firstChar.toLowerCase())
	}

	private installDecodedRedaction(r: RedactedData): void {
		const key = labelKey(r.labelPrefix, r.labelIndex)

		this.redactions.set(key, r)
		this.hashToLabel.set(r.hash, { labelPrefix: r.labelPrefix, labelIndex: r.labelIndex })
		const next = this.labelNextIndex.get(r.labelPrefix) ?? 1

		if (r.labelIndex >= next) {
			this.labelNextIndex.set(r.labelPrefix, r.labelIndex + 1)
		}

		this.registerLengthAndChunk(r.length, r.firstChar)
	}

	public mark({
		realStr,
		pieces,
		hint,
	}: {
		realStr: string
		pieces: NonEmptySet<UserInfo>
		hint?: string
	}): NonEmptyArray<RedactedData> {
		let origNormalized: string | null = null

		for (const piece of setItems(pieces)) {
			const pieceNormalized = normalizedStrForUserInfo(realStr, piece)

			if (origNormalized === null) {
				origNormalized = pieceNormalized
			} else if (origNormalized !== pieceNormalized) {
				throw new Error(
					`cannot normalize "${realStr}" for pieces ${setItems(pieces)
						.map(v => v.toString())
						.join(
							' & ',
						)}: obtained conflicting normalized forms "${origNormalized}" and "${pieceNormalized}"`,
				)
			}
		}

		if (origNormalized === null) {
			throw new Error('unreachable')
		}

		const origHash = this.hash(origNormalized)
		const normalizedStrs = new Set<string>()

		normalizedStrs.add(realStr)
		normalizedStrs.add(realStr.toLowerCase())
		normalizedStrs.add(realStr.toUpperCase())
		normalizedStrs.add(origNormalized)
		normalizedStrs.add(origNormalized.toLowerCase())
		normalizedStrs.add(origNormalized.toUpperCase())

		let previousSetSize = -1

		while (normalizedStrs.size !== previousSetSize) {
			previousSetSize = normalizedStrs.size

			for (const piece of setItems(pieces)) {
				for (const normalizedStr of Array.from(normalizedStrs)) {
					for (const renormalizedStr of setItems(
						variationsOnStrForUserInfo(normalizedStr, piece),
					)) {
						normalizedStrs.add(renormalizedStr)
						normalizedStrs.add(renormalizedStr.toLowerCase())
						normalizedStrs.add(renormalizedStr.toUpperCase())
					}
				}
			}
		}
		const redacted: RedactedData[] = []

		for (const str of normalizedStrs) {
			assert(str.length > 0, 'Tried to add empty string')

			const h = this.hash(str)
			const existingLabel = this.hashToLabel.get(h)

			if (existingLabel) {
				const existing = this.getRedaction(existingLabel.labelPrefix, existingLabel.labelIndex)

				existing.augment({ realStr: str, origHash, pieces, hint })
				redacted.push(existing)
				continue
			}

			const labelPrefix = setItems(pieces).toSorted(compareUserInfo)[0].replaceAll('_', '')
			const labelIndex = this.labelNextIndex.get(labelPrefix) ?? 1

			const data = RedactedData.createNew({
				redactor: this,
				labelPrefix,
				labelIndex,
				realStr: str,
				hash: h,
				origHash,
				pieces,
				hint: hint === undefined ? null : hint,
			})

			redacted.push(data)

			this.redactions.set(labelKey(labelPrefix, labelIndex), data)
			this.hashToLabel.set(h, { labelPrefix, labelIndex })
			this.labelNextIndex.set(labelPrefix, labelIndex + 1)

			this.registerLengthAndChunk(data.length, data.firstChar)
		}

		return assertNonEmptyArray(redacted)
	}

	public redact(input: string, escapeChar?: string): [string, ReadonlySet<RedactedData>] {
		assert(!input.startsWith('~R:'), 'String was already redacted, cannot redact twice.')

		const esc = escapeChar ?? RedactedString.pickEscapeChar(input)
		const redactions = new Set<RedactedData>()

		const round = (s: string): string => {
			let isRedaction = false
			let offsetFromStart = 0

			const parts = s.split(esc)

			for (const part of parts) {
				if (!isRedaction) {
					// Scan literal component for any known substrings of known lengths.
					for (const relevantLen of this.relevantLengths) {
						if (part.length < relevantLen) {
							continue
						}

						const relevantFirstChars = this.relevantChunks.get(relevantLen)

						if (relevantFirstChars === undefined) {
							throw new Error('Logic error')
						}

						for (let offset = 0; offset <= part.length - relevantLen; offset++) {
							if (!relevantFirstChars.has(part[offset].toLowerCase())) {
								continue
							}

							const substr = part.slice(offset, offset + relevantLen)

							for (const substrVariant of [substr, substr.toLowerCase()]) {
								const label = this.hashToLabel.get(this.hash(substrVariant))

								if (label === undefined) {
									continue
								}

								const r = this.getRedaction(label.labelPrefix, label.labelIndex)

								r.augment({ realStr: substrVariant })
								redactions.add(r)

								return (
									s.slice(0, offsetFromStart + offset) +
									`${esc}${label.labelPrefix}_${label.labelIndex}${esc}` +
									s.slice(offsetFromStart + offset + relevantLen)
								)
							}
						}
					}
				} else {
					// This component is a label token between escape chars.
					const parsed = parseLabelToken(part)

					if (parsed) {
						const r = this.getRedaction(parsed.labelPrefix, parsed.labelIndex)

						redactions.add(r)
					}
				}

				isRedaction = !isRedaction
				offsetFromStart += part.length + esc.length
			}

			return s
		}

		let s = input

		while (true) {
			const next = round(s)

			if (next === s) {
				break
			}

			s = next
		}

		return [s, redactions]
	}
}

export class RedactedString {
	private static readonly POSSIBLE_ESCAPE_CHARS = '~+!@#$%^&*:;?.,`|-/'

	private readonly _redactor: RedactedStringStore
	private readonly _escapeChar: string
	private readonly _payload: string

	private constructor(args: {
		redactor: RedactedStringStore
		escapeChar: string
		payload: string
	}) {
		this._redactor = args.redactor
		this._escapeChar = args.escapeChar
		this._payload = args.payload
	}

	public static pickEscapeChar(realStr: string): string {
		for (const c of RedactedString.POSSIBLE_ESCAPE_CHARS) {
			if (!realStr.includes(c)) {
				return c
			}
		}
		throw new Error(`Cannot find an escape character in string: ${JSON.stringify(realStr)}`)
	}

	/**
	 * Equivalent to Python RedactedString.from_real(...)
	 */
	public static fromReal(realStr: string, redactor: RedactedStringStore): RedactedString {
		const escapeChar = RedactedString.pickEscapeChar(realStr)

		return new RedactedString({ redactor, escapeChar, payload: realStr })
	}

	/**
	 * Equivalent to Python RedactedString.decode(...)
	 */
	public static decode(
		encoded: RedactedEncodedString,
		redactor: RedactedStringStore,
	): RedactedString {
		assert(encoded.startsWith('~R:'), 'Invalid redacted encoding (missing ~R:)')
		assert(encoded.length >= 4, 'Invalid redacted encoding (too short)')
		const escapeChar = encoded[3]
		const payload = encoded.slice(4)

		return new RedactedString({ redactor, escapeChar, payload })
	}

	public encode(): RedactedEncodedString {
		const [redacted] = this._redactor.redact(this._payload, this._escapeChar)

		return `~R:${this._escapeChar}${redacted}` as RedactedEncodedString
	}

	public toString(): string {
		return this.encode()
	}

	public get escapeChar(): string {
		return this._escapeChar
	}

	/**
	 * The *stored* payload (may be real or already-redacted depending on construction).
	 */
	public get payload(): string {
		return this._payload
	}
}

export type UserDataDict = Record<string, NonEmptyArray<UserDataPieces>>

function decodeUserDataDict(
	encoded: EncodedMultiDict | undefined,
	redactor: RedactedStringStore,
	at: string,
): UserDataDict {
	if (!encoded) {
		return {}
	}

	const out: UserDataDict = {}

	for (const [k, raw] of Object.entries(encoded)) {
		const keyAt = `${at}[${JSON.stringify(k)}]`

		if (Array.isArray(raw)) {
			try {
				out[k] = assertNonEmptyArray(
					raw.map((x, i) => UserDataPieces.decode(x, redactor, `${keyAt}[${i}]`)),
				)
			} catch (e) {
				throw new Error(`${getErrorMessage(e)} at ${keyAt}`)
			}
		} else {
			out[k] = [UserDataPieces.decode(raw, redactor, keyAt)]
		}
	}

	return out
}

export class UserDataPieces {
	public readonly sample: RedactedString
	public readonly pieces: ReadonlySet<UserInfo>

	private constructor(args: { sample: RedactedString; pieces: Iterable<UserInfo> }) {
		this.sample = args.sample
		this.pieces = new Set(args.pieces)
	}

	public static decode(
		data: EncodedUserDataPieces,
		redactor: RedactedStringStore,
		at = '$',
	): UserDataPieces {
		try {
			if (typeof data === 'string') {
				const sample = RedactedString.decode(data, redactor)

				return new UserDataPieces({ sample, pieces: [] })
			}

			const sample = RedactedString.decode(data.sample, redactor)

			if ('piece' in data) {
				return new UserDataPieces({ sample, pieces: [data.piece] })
			}

			return new UserDataPieces({ sample, pieces: data.pieces })
		} catch (e) {
			throw new Error(`${getErrorMessage(e)} at ${at}`)
		}
	}

	public encode(): EncodedUserDataPieces {
		if (this.pieces.size === 0) {
			return this.sample.encode()
		}

		const pieces = [...this.pieces].sort(compareUserInfo)

		if (pieces.length === 1) {
			return { sample: this.sample.encode(), piece: pieces[0] }
		}

		return { sample: this.sample.encode(), pieces }
	}

	public toString(): string {
		const sampleRepr = JSON.stringify(this.sample.encode())

		if (this.pieces.size === 0) {
			return `${sampleRepr} [no user data]`
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
	private extraPurposes: DataCollectionPurpose[]
	private extraUserData: UserInfo[]
	private collectionPolicy: CollectionPolicy | null

	private constructor(args: {
		request: WalletRequest
		reviewed: boolean | null
		extraPurposes: DataCollectionPurpose[]
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
			...(this.extraPurposes.length > 0 ? { extraPurposes: this.extraPurposes } : {}),
			...(this.extraUserData.length > 0 ? { extraUserData: this.extraUserData } : {}),
			...(this.collectionPolicy !== null ? { collectionPolicy: this.collectionPolicy } : {}),
		}
	}

	public isManuallyReviewed(): boolean {
		return this.reviewed === true
	}

	public addPurpose(purpose: DataCollectionPurpose) {
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

	public getExtraPurposes(): ReadonlyArray<DataCollectionPurpose> {
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
		req: EncodedWalletDataRequest,
		redactor: RedactedStringStore,
		at = '$',
	): WalletRequest {
		const jsonRpcMethods =
			req.jsonRpcMethod === undefined
				? []
				: typeof req.jsonRpcMethod === 'string'
					? [req.jsonRpcMethod]
					: [...req.jsonRpcMethod]

		return new WalletRequest({
			domain: req.domain,
			path: req.path,
			sessionTime: new WalletCaptureSessionTime(req.sessionTime),
			query: decodeUserDataDict(req.query, redactor, `${at}.query`),
			jsonRpcMethods,
			content:
				req.content === undefined
					? null
					: UserDataPieces.decode(req.content, redactor, `${at}.content`),
			cookies: decodeUserDataDict(req.cookies, redactor, `${at}.cookies`),
			refererDomain: req.refererDomain ?? null,
			oddHeaders: decodeUserDataDict(req.oddHeaders, redactor, `${at}.oddHeaders`),
			oddTrailers: decodeUserDataDict(req.oddTrailers, redactor, `${at}.oddTrailers`),
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

	public userInfo(
		matcherCollectionPolicy: CollectionPolicy | null,
		includeManualReview: boolean,
	): Map<UserInfo, CollectionPolicy | null> {
		const infos = new Map<UserInfo, CollectionPolicy | null>()

		const processDict = (dict: UserDataDict) => {
			for (const values of Object.values(dict)) {
				for (const piece of values) {
					for (const userInfo of piece.pieces) {
						infos.set(userInfo, matcherCollectionPolicy)
					}
				}
			}
		}

		processDict(this.query)
		processDict(this.cookies)
		processDict(this.oddHeaders)
		processDict(this.oddTrailers)

		if (this.content !== null) {
			for (const userInfo of this.content.pieces) {
				infos.set(userInfo, matcherCollectionPolicy)
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
			WalletRequest.fromEncoded(
				r,
				this.file.redactor,
				`$.flows[${JSON.stringify(flow)}].requests[${i}]`,
			),
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
		return this._requests.map(req => req.review).filter(review => !review.isManuallyReviewed())
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
	public readonly redactor: RedactedStringStore
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

		this.redactor = ((): RedactedStringStore => {
			if (root.redactions === undefined) {
				return RedactedStringStore.newStore()
			}

			return parseRedactedStringStore(root.redactions, '$.redactions')
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
			redactions: this.redactor.toJSON(),
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
	public toDataCollection(options: AutoGenerationOptions): DataCollection {
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

			const collected = this.processFlowRequests(flow, options.strict ?? false)
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
	private processFlowRequests(
		flow: WalletCaptureFlow,
		strict: boolean,
	): WithRef<DataCollectionByEntity>[] {
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
			const userInfos = request.userInfo(matcher === null ? null : matcher.policy, true)
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

			for (const purpose of request.review.getExtraPurposes()) {
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

			if (existingContent === content) {
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

	public check(): WalletCaptureIssue[] {
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
				this.toDataCollection({
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
}

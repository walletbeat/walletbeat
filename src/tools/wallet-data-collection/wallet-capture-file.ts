import { createHash, randomBytes } from 'node:crypto'

import fs from 'fs'

import {
	UserFlow,
	userFlow,
	type UserInfo,
	userInfoEnums,
} from '@/schema/features/privacy/data-collection'
import { getErrorMessage } from '@/types/errors'
import { assertNonEmptyArray, type NonEmptyArray, nonEmptySet } from '@/types/utils/non-empty'
import { Enum, excludeFromEnum, mergeEnums } from '@/utils/enum'

import { expectArray, expectNumber, expectRecord, expectString } from './json-utils'
import type { WalletCaptureAnnotations, WalletRequestMatcher } from './wallet-capture-annotations'

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
	redactor: RedactedStringStore
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

interface EncodedRedactedData {
	labelPrefix: string
	labelIndex: number
	hash: string
	length: number
	piece?: UserInfo
	hint?: string
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
	oddHeaders?: EncodedMultiDict
	oddTrailers?: EncodedMultiDict
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

interface EncodedWalletCaptureFlow {
	requests: EncodedWalletDataRequest[]
	redactor: EncodedRedactedStringStore
}

interface EncodedWalletCaptureFile {
	flows: Record<string, EncodedWalletCaptureFlow | 'NOT_SUPPORTED'>
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

	return {
		domain,
		path,
		sessionTime,
		...(query && Object.keys(query).length ? { query } : {}),
		...(cookies && Object.keys(cookies).length ? { cookies } : {}),
		...(oddHeaders && Object.keys(oddHeaders).length ? { oddHeaders } : {}),
		...(oddTrailers && Object.keys(oddTrailers).length ? { oddTrailers } : {}),
		...(content ? { content } : {}),
		...(jsonRpcMethod ? { jsonRpcMethod } : {}),
	}
}

function parseRedactedDataJSON(v: unknown, at: string): EncodedRedactedData {
	const obj = expectRecord(v, at)
	const labelPrefix = expectString(obj.labelPrefix, `${at}.labelPrefix`)
	const labelIndex = expectNumber(obj.labelIndex, `${at}.labelIndex`)
	const hash = expectString(obj.hash, `${at}.hash`)
	const length = expectNumber(obj.length, `${at}.length`)

	let piece: UserInfo | undefined

	if (obj.piece !== undefined) {
		piece = userInfoEnums.assert(expectString(obj.piece, `${at}.piece`))
	}

	let hint: string | undefined

	if (obj.hint !== undefined) {
		hint = expectString(obj.hint, `${at}.hint`)
	}

	return {
		labelPrefix,
		labelIndex,
		hash,
		length,
		...(piece ? { piece } : {}),
		...(hint ? { hint } : {}),
	}
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
	const redactor = parseRedactedStringStore(obj.redactor, `${at}.redactor`)

	return { requests, redactor }
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
	private readonly _redactor: RedactedStringStore
	public readonly labelPrefix: string
	public readonly labelIndex: number

	/**
	 * Not encoded in JSON, but the store may learn it later via `redact(...)`.
	 * (Matches Python behavior.)
	 */
	public realStr: string | null

	public readonly hash: string
	public piece?: UserInfo
	public hint?: string
	public readonly length: number

	private constructor(args: {
		redactor: RedactedStringStore
		labelPrefix: string
		labelIndex: number
		realStr: string | null
		hash: string
		piece?: UserInfo
		hint?: string
		length: number
	}) {
		this._redactor = args.redactor
		this.labelPrefix = args.labelPrefix
		this.labelIndex = args.labelIndex
		this.realStr = args.realStr
		this.hash = args.hash
		this.piece = args.piece
		this.hint = args.hint
		this.length = args.realStr != null ? args.realStr.length : args.length
	}

	public static fromJSON(redactor: RedactedStringStore, data: EncodedRedactedData): RedactedData {
		return new RedactedData({
			redactor,
			labelPrefix: data.labelPrefix,
			labelIndex: data.labelIndex,
			realStr: null,
			hash: data.hash,
			piece: data.piece,
			hint: data.hint,
			length: data.length,
		})
	}

	public static createNew(args: {
		redactor: RedactedStringStore
		labelPrefix: string
		labelIndex: number
		realStr: string
		hash: string
		piece?: UserInfo
		hint?: string
	}): RedactedData {
		return new RedactedData({
			redactor: args.redactor,
			labelPrefix: args.labelPrefix,
			labelIndex: args.labelIndex,
			realStr: args.realStr,
			hash: args.hash,
			piece: args.piece,
			hint: args.hint,
			length: args.realStr.length,
		})
	}

	public get label(): string {
		return `${this.labelPrefix}_${this.labelIndex}`
	}

	/**
	 * Python `augment(...)`:
	 * - learns realStr (not encoded)
	 * - may set piece/hint (encoded)
	 * Returns true if encoded metadata changed (piece/hint).
	 */
	public augment(args: {
		realStr?: string | null
		piece?: UserInfo
		hint?: string | null
	}): boolean {
		let changed = false

		if (args.realStr != null) {
			if (this.realStr != null) {
				assert(this.realStr === args.realStr, 'Hash collision')
			}

			assert(args.realStr.length === this.length, 'Length mismatch')
			this.realStr = args.realStr
		}

		if (args.piece != null) {
			if (this.piece != null) {
				assert(this.piece === args.piece, 'Conflicting piece')
			}

			this.piece = args.piece
			changed = true
		}

		if (args.hint != null) {
			if (this.hint != null) {
				assert(this.hint === args.hint, 'Conflicting hint')
			}

			this.hint = args.hint
			changed = true
		}

		return changed
	}

	public toJSON(): EncodedRedactedData {
		const out: EncodedRedactedData = {
			labelPrefix: this.labelPrefix,
			labelIndex: this.labelIndex,
			hash: this.hash,
			length: this.length,
		}

		if (this.piece != null) {
			out.piece = this.piece
		}

		if (this.hint != null) {
			out.hint = this.hint
		}

		return out
	}
}

export class RedactedStringStore {
	public readonly salt: string

	private readonly _labelNextIndex = new Map<string, number>()
	private readonly _hashToLabel = new Map<string, { labelPrefix: string; labelIndex: number }>()
	private readonly _redactions = new Map<string, RedactedData>()

	// Sorted desc, unique.
	private _lengths: number[] = []

	// For parity with Python (optional, but implemented).
	private _needsFlushing = 0

	public constructor(args: { salt: string; redactions?: Iterable<RedactedData> }) {
		this.salt = args.salt

		if (args.redactions) {
			for (const r of args.redactions) {
				this._installDecodedRedaction(r)
			}
		}
	}

	public static newStore(): RedactedStringStore {
		// Python uses 32 lowercase letters.
		const bytes = randomBytes(32)
		const salt = Array.from(bytes, b => String.fromCharCode(97 + (b % 26))).join('')

		return new RedactedStringStore({ salt })
	}

	public static fromJSON(data: EncodedRedactedStringStore): RedactedStringStore {
		const store = new RedactedStringStore({ salt: data.salt })

		for (const raw of data.redactions) {
			const r = RedactedData.fromJSON(store, raw)

			store._installDecodedRedaction(r)
		}
		store._needsFlushing = 0

		return store
	}

	public needsFlushing(): number {
		return this._needsFlushing
	}

	public markFlushed(amount: number): void {
		this._needsFlushing -= amount

		if (this._needsFlushing < 0) {
			this._needsFlushing = 0
		}
	}

	public getRedaction(labelPrefix: string, labelIndex: number): RedactedData {
		const key = labelKey(labelPrefix, labelIndex)
		const r = this._redactions.get(key)

		assert(r != null, `Unknown redaction label: ${labelPrefix}_${labelIndex}`)

		return r
	}

	public redactionsSorted(): ReadonlyArray<RedactedData> {
		const all = Array.from(this._redactions.values())

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

	private _hash(s: string): string {
		const h = createHash('sha256')

		h.update(this.salt, 'utf8')
		h.update(s, 'utf8')

		return h.digest('hex')
	}

	private _installDecodedRedaction(r: RedactedData): void {
		const key = labelKey(r.labelPrefix, r.labelIndex)

		// Store by label.
		this._redactions.set(key, r)

		// Map hash -> label (used by `redact` scanning).
		this._hashToLabel.set(r.hash, { labelPrefix: r.labelPrefix, labelIndex: r.labelIndex })

		// Maintain next index per prefix.
		const next = this._labelNextIndex.get(r.labelPrefix) ?? 1

		if (r.labelIndex >= next) {
			this._labelNextIndex.set(r.labelPrefix, r.labelIndex + 1)
		}

		// Maintain lengths list.
		if (!this._lengths.includes(r.length)) {
			this._lengths = [...this._lengths, r.length].sort((a, b) => b - a)
		}
	}

	/**
	 * Equivalent to Python RedactedStringStore.add(...)
	 */
	public add(args: {
		realStr: string
		labelPrefix: string
		piece?: UserInfo
		hint?: string
	}): RedactedData {
		const { realStr, labelPrefix, piece, hint } = args

		assert(realStr.length > 0, 'Tried to add empty string')

		const h = this._hash(realStr)
		const existingLabel = this._hashToLabel.get(h)

		if (existingLabel) {
			const data = this.getRedaction(existingLabel.labelPrefix, existingLabel.labelIndex)

			if (data.augment({ realStr, piece, hint })) {
				this._needsFlushing += 1
			}

			return data
		}

		const labelIndex = this._labelNextIndex.get(labelPrefix) ?? 1

		const data = RedactedData.createNew({
			redactor: this,
			labelPrefix,
			labelIndex,
			realStr,
			hash: h,
			piece,
			hint,
		})

		this._redactions.set(labelKey(labelPrefix, labelIndex), data)
		this._hashToLabel.set(h, { labelPrefix, labelIndex })
		this._labelNextIndex.set(labelPrefix, labelIndex + 1)
		this._needsFlushing += 1

		if (!this._lengths.includes(data.length)) {
			this._lengths = [...this._lengths, data.length].sort((a, b) => b - a)
		}

		return data
	}

	public redact(input: string, escapeChar?: string): [string, ReadonlySet<RedactedData>] {
		assert(!input.startsWith('~R:'), 'String was already redacted, cannot redact twice.')

		const esc = escapeChar ?? RedactedString.pickEscapeChar(input)
		const lengths = [...this._lengths] // snapshot
		const redactions = new Set<RedactedData>()

		const round = (s: string): string => {
			let isRedaction = false
			let offsetFromStart = 0

			const parts = s.split(esc)

			for (const part of parts) {
				if (!isRedaction) {
					// Scan literal component for any known substrings of known lengths.
					for (const relevantLen of lengths) {
						if (part.length < relevantLen) {
							continue
						}

						for (let offset = 0; offset <= part.length - relevantLen; offset++) {
							const substr = part.slice(offset, offset + relevantLen)
							const label = this._hashToLabel.get(this._hash(substr))

							if (!label) {
								continue
							}

							const r = this.getRedaction(label.labelPrefix, label.labelIndex)

							if (r.augment({ realStr: substr })) {
								this._needsFlushing += 1
							}

							redactions.add(r)

							// Replace exactly this match (first found) and return.
							return (
								s.slice(0, offsetFromStart + offset) +
								`${esc}${label.labelPrefix}_${label.labelIndex}${esc}` +
								s.slice(offsetFromStart + offset + relevantLen)
							)
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

		for (;;) {
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
	 * This matches Python, which stores the post-"~R:" string and re-redacts at encode time.
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

	/**
	 * Equivalent to Python `UserDataPieces.decode(...)`.
	 */
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

	/**
	 * Equivalent to Python `UserDataPieces.encode(...)`.
	 */
	public encode(): EncodedUserDataPieces {
		if (this.pieces.size === 0) {
			return this.sample.encode()
		}

		const pieces = [...this.pieces].sort()

		if (pieces.length === 1) {
			return { sample: this.sample.encode(), piece: pieces[0] }
		}

		return { sample: this.sample.encode(), pieces }
	}

	public toString(): string {
		// Python prints repr(sample), which includes quotes.
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

export class WalletRequest {
	public readonly domain: string
	public readonly path: string
	public readonly sessionTime: WalletCaptureSessionTime

	public readonly query: UserDataDict
	public readonly jsonRpcMethods: string[]
	public readonly content: UserDataPieces | null
	public readonly cookies: UserDataDict
	public readonly oddHeaders: UserDataDict
	public readonly oddTrailers: UserDataDict

	private constructor(args: {
		domain: string
		path: string
		sessionTime: WalletCaptureSessionTime
		query: UserDataDict
		jsonRpcMethods: string[]
		content: UserDataPieces | null
		cookies: UserDataDict
		oddHeaders: UserDataDict
		oddTrailers: UserDataDict
	}) {
		this.domain = args.domain
		this.path = args.path
		this.sessionTime = args.sessionTime
		this.query = args.query
		this.jsonRpcMethods = args.jsonRpcMethods
		this.content = args.content
		this.cookies = args.cookies
		this.oddHeaders = args.oddHeaders
		this.oddTrailers = args.oddTrailers
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
			oddHeaders: decodeUserDataDict(req.oddHeaders, redactor, `${at}.oddHeaders`),
			oddTrailers: decodeUserDataDict(req.oddTrailers, redactor, `${at}.oddTrailers`),
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
			...(oddHeaders ? { oddHeaders } : {}),
			...(oddTrailers ? { oddTrailers } : {}),
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

		return (
			`${this.domain}: ${this.path}` +
			fmtMultiDict('query', this.query) +
			rpc +
			content +
			fmtMultiDict('cookie', this.cookies) +
			fmtMultiDict('headers', this.oddHeaders) +
			fmtMultiDict('trailers', this.oddTrailers)
		)
	}
}

export class WalletCaptureFlow {
	public readonly file: WalletCaptureFile
	public readonly flow: RecordedFlow
	public readonly redactor: RedactedStringStore

	private readonly _requests: WalletRequest[]

	public get requests(): ReadonlyArray<WalletRequest> {
		return this._requests
	}

	constructor(file: WalletCaptureFile, flow: RecordedFlow, data: EncodedWalletDataFlow) {
		this.file = file
		this.flow = flow
		this.redactor = data.redactor

		this._requests = data.requests.map((r, i) =>
			WalletRequest.fromEncoded(
				r,
				this.redactor,
				`$.flows[${JSON.stringify(flow)}].requests[${i}]`,
			),
		)
	}

	public toJSON(): EncodedWalletCaptureFlow {
		return {
			requests: this._requests.map(r => r.toJSON()),
			redactor: this.redactor.toJSON(),
		}
	}

	public getSessions(): Set<number> {
		const sessions = new Set<number>()

		for (const req of this._requests) {
			sessions.add(req.sessionTime.session)
		}

		return sessions
	}

	public check(): WalletCaptureIssue[] {
		const issues: WalletCaptureIssue[] = []

		for (const req of this._requests) {
			if (this.file.findMatcherForReq(req) === null) {
				// TODO: Only report this issue about this request if all other problems
				// with this request are clear (i.e. no untagged user data etc).
				issues.push(
					new WalletCaptureIssue({
						section: ['Request annotations'],
						issue: `Request ${req.toString()} does not have any assigned purpose.`,
						suggestions: [
							{
								suggestion: 'Declare the purpose of this request.',
								subcommand: `explain-request --domain='${req.domain}' [--path='${req.path}']${req.jsonRpcMethods.length === 0 ? '' : ` [--method=${req.jsonRpcMethods[0]}]`} 'purpose1,purpose2,...'`,
							},
						],
					}),
				)
			}
		}

		return issues
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

export class WalletCaptureFile {
	public readonly path: string
	private readonly flows: Partial<Record<RecordedFlow, WalletCaptureFlow | 'NOT_SUPPORTED'>>
	private readonly sessions: number
	private readonly annotations: WalletCaptureAnnotations
	constructor(path: string, annotations: WalletCaptureAnnotations) {
		this.path = path
		this.annotations = annotations
		const text = fs.readFileSync(path, 'utf8')
		const trimmed = text.trim()
		const parsed: unknown = trimmed.length === 0 ? {} : JSON.parse(trimmed)
		const root = expectRecord(parsed, '$')
		const flowsRaw = root.flows === undefined ? {} : expectRecord(root.flows, '$.flows')
		const captureFlows: Partial<Record<RecordedFlow, WalletCaptureFlow>> = {}

		for (const [flowName, flowValue] of Object.entries(flowsRaw)) {
			const flowVal = recordedFlow.assert(flowName)

			const data = parseWalletDataFlow(flowValue, `$.flows[${JSON.stringify(flowVal)}]`)

			captureFlows[flowVal] = new WalletCaptureFlow(this, flowVal, data)
		}

		this.flows = captureFlows
		this.sessions = expectNumber(root.sessions, '$.sessions')
		const reEncoded = this.toJSON()
		const loadedStable = stableJSONStringify(root)
		const reEncodedStable = stableJSONStringify(reEncoded)

		if (loadedStable !== reEncodedStable) {
			throw new Error(
				[
					'WalletCaptureFile integrity check failed: re-encoded JSON does not match loaded JSON.',
					`File: ${this.path}`,
					`Loaded:     ${loadedStable}`,
					`Re-encoded: ${reEncodedStable}`,
				].join('\n'),
			)
		}
	}

	private toJSON(): EncodedWalletCaptureFile {
		const flowsOut: Record<string, EncodedWalletCaptureFlow | 'NOT_SUPPORTED'> = {}

		for (const [flowName, flow] of Object.entries(this.flows)) {
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
			flows: flowsOut,
			sessions: this.sessions,
		}

		return out
	}

	public async save(): Promise<void> {
		await this.annotations.save()
		const data = this.toJSON()
		const content = JSON.stringify(data, null, 2)
		const tmpPath = this.path + '.tmp'

		await fs.promises.writeFile(tmpPath, content, 'utf8')
		await fs.promises.rename(tmpPath, this.path)
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

	public check(): WalletCaptureIssue[] {
		const issues: WalletCaptureIssue[] = []

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

			for (const issue of flow.check()) {
				issues.push(issue.prependSection(`Flow ${f}`))
			}
		}

		return issues
	}

	public markFlowUnsupported(f: RecordedFlow) {
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

	public addRequestMatcher(matcher: WalletRequestMatcher) {
		let matchesOne = false

		for (const f of recordedFlow.items) {
			const flow = this.getFlow(f)

			if (flow === null) {
				throw new Error(`Cannot add request matchers until all flows are recorded; missing: ${f}`)
			}

			if (flow === 'NOT_SUPPORTED') {
				continue
			}

			for (const req of flow.requests) {
				if (matcher.matches(req)) {
					matchesOne = true
					const existingMatcher = this.annotations.matches(req)

					if (existingMatcher !== null) {
						throw new Error(
							`Matcher ${matcher.toString()} matches request ${req.toString()}, but that request is already matched by existing matcher ${existingMatcher.toString()}; requests must be matched by exactly one matcher.`,
						)
					}
				}
			}
		}

		if (!matchesOne) {
			throw new Error(`Matcher ${matcher.toString()} does not match any recorded request.`)
		}

		this.annotations.add(matcher)
	}
}

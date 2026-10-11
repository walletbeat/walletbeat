/**
 * Append-only classification audit log for the wallet-data-collection agent.
 *
 * The log lives at `data/collection/collection.audit.json` and records every
 * classification-impacting mutation the agent performs, together with the
 * rationale the agent supplies for each impacted request. See
 * `agent/NEW_FEATURE_SPEC.md` for the full schema and state machine.
 *
 * This module is a sibling of {@link WalletCaptureFile} (both live under
 * `src/tools/wallet-data-collection/`) and is shared by the CLI (which runs as a
 * child process and appends `justify`/`rollback` entries) and the harness (which
 * appends `open-mutation`/`close-mutation` entries and validates bash-originated
 * appends).
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { isLooseReference, type LooseReference } from '@/schema/reference'
import { getErrorMessage } from '@/types/errors'
import { assertNonEmptyArray, isNonEmptyArray, type NonEmptyArray } from '@/types/utils/non-empty'
import { getRepositoryRoot } from '@/utils/codebase'
import {
	expectArray,
	expectNumber,
	expectRecord,
	expectString,
	isSameJson,
	stableJSONStringify,
} from '@/utils/json'

import { AUDIT_LOG_RELATIVE_PATH, isAuditLogPath, writeFileAtomically } from './read-only'

/** Uniquely identifies a request (see `WalletCaptureImpactedRequestId`). */
export interface WalletCaptureImpactedRequestId {
	walletId: string
	walletVariant: string
	sessionTime: number
}

/** Fields shared by every audit-log entry. */
export interface WalletCaptureClassificationAuditLogEntryBase {
	/** Integer unix timestamp in milliseconds. */
	unixMillis: number
	/**
	 * SHA-256 hex digest of `${previous entry tip}||${this entry's unixMillis}`.
	 * For the first entry the previous tip is the empty string.
	 */
	tip: string
}

/** An `open-mutation` entry: a command changed some request classifications. */
export interface OpenMutationEntry extends WalletCaptureClassificationAuditLogEntryBase {
	type: 'open-mutation'
	/** The `pnpm wallet-data-collection:agent ...` command that caused the change. */
	command: string
	/** The request IDs impacted across the entire repository. Never empty. */
	impacted: NonEmptyArray<WalletCaptureImpactedRequestId>
}

/** A `justify` entry: the agent rationalizes a subset of the open-mutation's impacted IDs. */
export interface JustifyEntry extends WalletCaptureClassificationAuditLogEntryBase {
	type: 'justify'
	/** Non-empty subset of the latest open-mutation's `impacted`, never more than 16 per entry. */
	justified: NonEmptyArray<WalletCaptureImpactedRequestId>
	/** Non-empty string or a valid `LooseReference` object. */
	rationale: string | NonEmptyArray<LooseReference>
}

/** A `rollback` entry: the agent abandons the open mutation and restores the prior state. */
export interface RollbackEntry extends WalletCaptureClassificationAuditLogEntryBase {
	type: 'rollback'
	/** Non-empty string or a valid `LooseReference` object. */
	rationale: string | NonEmptyArray<LooseReference>
}

/** A `close-mutation` entry: all impacted IDs were justified (harness-only). */
export interface CloseMutationEntry extends WalletCaptureClassificationAuditLogEntryBase {
	type: 'close-mutation'
}

/** A single audit-log entry. */
export type WalletCaptureClassificationAuditLogEntry =
	OpenMutationEntry | JustifyEntry | RollbackEntry | CloseMutationEntry

/** The serialized `collection.audit.json` log. */
export interface WalletCaptureClassificationAuditLog {
	entries: WalletCaptureClassificationAuditLogEntry[]
}

/** The repo-root-relative path of the audit log. */
export { AUDIT_LOG_RELATIVE_PATH }

/** Re-exported so callers can check the audit-log path without importing read-only directly. */
export { isAuditLogPath }

/** Compute the SHA-256 hex digest of `data`. */
export function sha256(data: string): string {
	return createHash('sha256').update(data).digest('hex')
}

/** Compute the `tip` of an entry given the previous tip and its `unixMillis`. */
export function computeTip(previousTip: string | null, unixMillis: number): string {
	return sha256(`${previousTip ?? ''}||${unixMillis}`)
}

/** True when a string is a valid non-empty rationale string. */
export function isNonEmptyRationaleString(value: unknown): value is string {
	return typeof value === 'string' && value.trim() !== ''
}

/**
 * True when `value` is a valid `rationale`: either a non-empty string or a
 * non-empty array of `LooseReference` objects.
 */
export function isRationale(value: unknown): value is string | NonEmptyArray<LooseReference> {
	if (isNonEmptyRationaleString(value)) {
		return true
	}

	if (!Array.isArray(value) || value.length === 0) {
		return false
	}

	return value.every(item => isLooseReference(item))
}

/** True when `x` is a string of the form `walletId:walletVariant:sessionTime`. */
export function isRequestIdString(x: string): boolean {
	const parts = x.split(':')

	return (
		parts.length === 3 && parts[0] !== '' && parts[1] !== '' && Number.isInteger(Number(parts[2]))
	)
}

/**
 * Format an impacted request ID as `walletId:walletVariant:sessionTime`.
 */
export function requestIdToString(id: WalletCaptureImpactedRequestId): string {
	return `${id.walletId}:${id.walletVariant}:${id.sessionTime}`
}

/**
 * Parse a `walletId:walletVariant:sessionTime` string into a
 * {@link WalletCaptureImpactedRequestId}. Throws on malformed input.
 */
export function parseRequestId(value: string): WalletCaptureImpactedRequestId {
	if (!isRequestIdString(value)) {
		throw new Error(`Invalid request ID: ${JSON.stringify(value)}`)
	}

	const [walletId, walletVariant, sessionTimeRaw] = value.split(':')

	return {
		walletId,
		walletVariant,
		sessionTime: Number(sessionTimeRaw),
	}
}

/** True when two request IDs are equal. */
export function requestIdEquals(
	a: WalletCaptureImpactedRequestId,
	b: WalletCaptureImpactedRequestId,
): boolean {
	return (
		a.walletId === b.walletId &&
		a.walletVariant === b.walletVariant &&
		a.sessionTime === b.sessionTime
	)
}

/** The set of `walletId:walletVariant:sessionTime` strings in `ids`. */
function requestIdStrings(ids: readonly WalletCaptureImpactedRequestId[]): Set<string> {
	return new Set(ids.map(requestIdToString))
}

/** Decode a single entry from a JSON record, validating its shape. */
function decodeEntry(raw: unknown, at: string): WalletCaptureClassificationAuditLogEntry {
	const record = expectRecord(raw, at)
	const type = expectString(record.type, `${at}.type`)
	const unixMillis = expectNumber(record.unixMillis, `${at}.unixMillis`)
	const tip = expectString(record.tip, `${at}.tip`)

	const base = { unixMillis, tip }

	const decodeImpacted = (
		value: unknown,
		key: string,
	): NonEmptyArray<WalletCaptureImpactedRequestId> => {
		const arr = expectArray(value, `${at}.${key}`)

		return assertNonEmptyArray(
			arr.map((item, i) => {
				const rec = expectRecord(item, `${at}.${key}[${i}]`)
				const walletId = expectString(rec.walletId, `${at}.${key}[${i}].walletId`)
				const walletVariant = expectString(rec.walletVariant, `${at}.${key}[${i}].walletVariant`)
				const sessionTime = expectNumber(rec.sessionTime, `${at}.${key}[${i}].sessionTime`)

				return { walletId, walletVariant, sessionTime }
			}),
		)
	}

	const decodeRationale = (value: unknown, key: string): string | NonEmptyArray<LooseReference> => {
		if (isNonEmptyRationaleString(value)) {
			return value
		}

		const arr = expectArray(value, `${at}.${key}`)

		if (!isNonEmptyArray(arr) || !arr.every(item => isLooseReference(item))) {
			throw new Error(
				`${at}.${key} must be a non-empty string or a non-empty array of LooseReference`,
			)
		}

		return assertNonEmptyArray(arr)
	}

	switch (type) {
		case 'open-mutation':
			return {
				...base,
				type,
				command: expectString(record.command, `${at}.command`),
				impacted: decodeImpacted(record.impacted, 'impacted'),
			}
		case 'justify':
			return {
				...base,
				type,
				justified: decodeImpacted(record.justified, 'justified'),
				rationale: decodeRationale(record.rationale, 'rationale'),
			}
		case 'rollback':
			return {
				...base,
				type,
				rationale: decodeRationale(record.rationale, 'rationale'),
			}
		case 'close-mutation':
			return { ...base, type }
		default:
			throw new Error(`${at}.type is not a valid audit-log entry type: ${JSON.stringify(type)}`)
	}
}

/**
 * Validate the sequence invariants of an audit-log entry list. Returns an array of
 * error strings (empty when the sequence is valid). `validRequestIds` is the set of
 * `walletId:walletVariant:sessionTime` strings that refer to existing requests, used
 * to validate that every impacted/justified ID actually exists.
 */
export function validateLogSequence(
	entries: readonly WalletCaptureClassificationAuditLogEntry[],
	validRequestIds: ReadonlySet<string> | null,
): string[] {
	const errors: string[] = []

	let openMutation: OpenMutationEntry | null = null
	let previousTip: string | null = null
	const justifiedInOpen = new Set<string>()

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i]
		const at = `entries[${i}]`

		// Tip chain continuity.
		const expectedTip = computeTip(previousTip, entry.unixMillis)

		if (entry.tip !== expectedTip) {
			errors.push(`${at} has an invalid tip chain`)
		}

		previousTip = entry.tip

		const validateImpactedIds = (
			ids: readonly WalletCaptureImpactedRequestId[],
			key: string,
		): void => {
			if (ids.length === 0) {
				errors.push(`${at}.${key} must be non-empty`)
			}

			for (const id of ids) {
				if (validRequestIds !== null && !validRequestIds.has(requestIdToString(id))) {
					errors.push(`${at}.${key} references an unknown request: ${requestIdToString(id)}`)
				}
			}
		}

		switch (entry.type) {
			case 'open-mutation':
				if (openMutation !== null) {
					errors.push(`${at} opens a new mutation while another is still open`)
				}

				validateImpactedIds(entry.impacted, 'impacted')
				openMutation = entry
				justifiedInOpen.clear()
				break

			case 'justify': {
				if (openMutation === null) {
					errors.push(`${at} justify entry with no active open-mutation`)
					break
				}

				if (entry.justified.length > 16) {
					errors.push(`${at} justifies more than 16 requests`)
				}

				validateImpactedIds(entry.justified, 'justified')

				const impactedSet = requestIdStrings(openMutation.impacted)
				const newlyJustified = requestIdStrings(entry.justified)

				for (const id of newlyJustified) {
					if (!impactedSet.has(id)) {
						errors.push(`${at} justifies ${id} which is not in the open-mutation's impacted list`)
					} else if (justifiedInOpen.has(id)) {
						errors.push(`${at} justifies ${id} which was already justified`)
					}
				}

				if (!isRationale(entry.rationale)) {
					errors.push(
						`${at}.rationale must be a non-empty string or a non-empty array of LooseReference`,
					)
				}

				for (const id of newlyJustified) {
					justifiedInOpen.add(id)
				}
				break
			}

			case 'rollback':
				if (openMutation === null) {
					errors.push(`${at} rollback entry with no active open-mutation`)
				}

				if (!isRationale(entry.rationale)) {
					errors.push(
						`${at}.rationale must be a non-empty string or a non-empty array of LooseReference`,
					)
				}

				openMutation = null
				justifiedInOpen.clear()
				break

			case 'close-mutation':
				if (openMutation === null) {
					errors.push(`${at} close-mutation entry with no active open-mutation`)
				}

				// A close-mutation must follow full justification of every impacted ID.
				if (openMutation !== null) {
					const impactedSet = requestIdStrings(openMutation.impacted)

					for (const id of impactedSet) {
						if (!justifiedInOpen.has(id)) {
							errors.push(`${at} closes the mutation before ${id} was justified`)
						}
					}
				}

				openMutation = null
				justifiedInOpen.clear()
				break
		}
	}

	return errors
}

/**
 * Parse and validate the audit log from a JSON string. `validRequestIds` is used to
 * validate that every referenced request exists (pass `null` to skip that check).
 */
export function parseAuditLog(
	text: string,
	validRequestIds: ReadonlySet<string> | null,
): WalletCaptureClassificationAuditLog {
	let parsed: unknown

	try {
		parsed = JSON.parse(text) as unknown
	} catch (e) {
		throw new Error(`Invalid JSON in audit log: ${getErrorMessage(e)}`, { cause: e })
	}

	const root = expectRecord(parsed, '$')
	const entriesRaw = root.entries === undefined ? [] : expectArray(root.entries, '$.entries')
	const entries: WalletCaptureClassificationAuditLogEntry[] = []

	for (let i = 0; i < entriesRaw.length; i++) {
		entries.push(decodeEntry(entriesRaw[i], `$.entries[${i}]`))
	}

	const errors = validateLogSequence(entries, validRequestIds)

	if (errors.length > 0) {
		throw new Error(`Audit log sequence is invalid:\n${errors.join('\n')}`)
	}

	return { entries }
}

/** An audit-log entry without its `tip` field (distributed union so `type` narrows). */
export type WalletCaptureClassificationAuditLogEntryWithoutTip =
	| Omit<OpenMutationEntry, 'tip'>
	| Omit<JustifyEntry, 'tip'>
	| Omit<RollbackEntry, 'tip'>
	| Omit<CloseMutationEntry, 'tip'>

/**
 * Class that loads, inspects, and appends to the audit log file. Modeled on
 * {@link WalletCaptureFile} but kept in its own file (see the feature spec).
 */
export class WalletCaptureClassificationAuditLogFile {
	private readonly path: string
	private readonly entries: WalletCaptureClassificationAuditLogEntry[]

	private constructor(path: string, entries: WalletCaptureClassificationAuditLogEntry[]) {
		this.path = path
		this.entries = entries
	}

	/**
	 * Load the audit log from `path`, creating an empty log when the file does not
	 * exist. `validRequestIds` (optional) validates that every referenced request
	 * exists. Throws on malformed content or an invalid sequence.
	 */
	public static fromFile(
		filePath: string,
		validRequestIds?: ReadonlySet<string> | null,
	): WalletCaptureClassificationAuditLogFile {
		const abs = path.resolve(filePath)

		if (!fs.existsSync(abs)) {
			return new WalletCaptureClassificationAuditLogFile(abs, [])
		}

		const text = fs.readFileSync(abs, 'utf8')
		const parsed = parseAuditLog(text, validRequestIds ?? null)

		return new WalletCaptureClassificationAuditLogFile(abs, parsed.entries)
	}

	public static fromData(
		entries: WalletCaptureClassificationAuditLogEntry[],
	): WalletCaptureClassificationAuditLogFile {
		return new WalletCaptureClassificationAuditLogFile('', [...entries])
	}

	/** The log entries, in append order. */
	public get entriesList(): ReadonlyArray<WalletCaptureClassificationAuditLogEntry> {
		return this.entries
	}

	/** The number of entries in the log. */
	public get entryCount(): number {
		return this.entries.length
	}

	/** The last entry, or `null` when the log is empty. */
	public get lastEntry(): WalletCaptureClassificationAuditLogEntry | null {
		return this.entries.length === 0 ? null : this.entries[this.entries.length - 1]
	}

	/** The `tip` of the last entry, or `null` when the log is empty. */
	public get lastTip(): string | null {
		return this.lastEntry === null ? null : this.lastEntry.tip
	}

	/**
	 * Append an entry, computing its `tip` from the previous tip and `unixMillis`.
	 * `entryWithoutTip` must contain everything but `tip`. Returns the appended entry.
	 */
	public appendEntry(
		entryWithoutTip: WalletCaptureClassificationAuditLogEntryWithoutTip,
	): WalletCaptureClassificationAuditLogEntry {
		const unixMillis = entryWithoutTip.unixMillis
		const tip = computeTip(this.lastTip, unixMillis)

		let entry: WalletCaptureClassificationAuditLogEntry

		switch (entryWithoutTip.type) {
			case 'open-mutation':
				entry = { ...entryWithoutTip, tip }
				break
			case 'justify':
				entry = { ...entryWithoutTip, tip }
				break
			case 'rollback':
				entry = { ...entryWithoutTip, tip }
				break
			case 'close-mutation':
				entry = { ...entryWithoutTip, tip }
				break
		}

		this.entries.push(entry)

		return entry
	}

	/**
	 * Verify that a single valid entry was appended relative to the given previous
	 * state: the entry count grew by exactly one and the new last entry's `tip`
	 * matches `sha256(previousTip||unixMillis)`. Returns the appended entry when
	 * valid, or `null` otherwise. Used by the harness to double-check a bash-originated
	 * write to the audit log.
	 */
	public validateAppend(
		previousEntryCount: number,
		previousLastTip: string | null,
	): WalletCaptureClassificationAuditLogEntry | null {
		if (this.entries.length !== previousEntryCount + 1) {
			return null
		}

		const last = this.lastEntry

		if (last === null) {
			return null
		}

		const expectedTip = computeTip(previousLastTip, last.unixMillis)

		if (last.tip !== expectedTip) {
			return null
		}

		return last
	}

	/**
	 * The latest `open-mutation` entry that has not been closed by a subsequent
	 * `rollback`/`close-mutation`, or `null` when there is no active open mutation.
	 */
	public getOpenMutation(): OpenMutationEntry | null {
		let open: OpenMutationEntry | null = null

		for (const entry of this.entries) {
			if (entry.type === 'open-mutation') {
				open = entry
			} else if (entry.type === 'rollback' || entry.type === 'close-mutation') {
				open = null
			}
		}

		return open
	}

	/**
	 * The index of the latest open-mutation entry that has not been closed, or `-1` when
	 * there is no active open mutation.
	 */
	private findOpenMutationIndex(): number {
		for (let i = this.entries.length - 1; i >= 0; i--) {
			if (this.entries[i].type === 'open-mutation') {
				return i
			}
		}

		return -1
	}

	/**
	 * The set of `walletId:walletVariant:sessionTime` strings justified by the current
	 * open mutation. Only `justify` entries that appear <em>after</em> the latest open
	 * mutation (and before any subsequent close/rollback) are considered, so a request
	 * justified in a <em>prior, already-closed</em> mutation does not count as justified
	 * for the current one.
	 */
	public getJustifiedImpacted(): Set<string> {
		const justified = new Set<string>()
		const openIndex = this.findOpenMutationIndex()

		if (openIndex === -1) {
			return justified
		}

		for (let i = openIndex + 1; i < this.entries.length; i++) {
			const entry = this.entries[i]

			if (entry.type === 'justify') {
				for (const id of entry.justified) {
					justified.add(requestIdToString(id))
				}
			} else if (entry.type === 'rollback' || entry.type === 'close-mutation') {
				// The open mutation has since been closed; nothing further to collect.
				break
			}
		}

		return justified
	}

	/**
	 * The `impacted` list of the latest open-mutation minus the `justify` entries that
	 * belong to <em>that same</em> mutation, in order. Returns an empty array when there
	 * is no open mutation or everything has been justified.
	 */
	public getUnjustifiedImpacted(): WalletCaptureImpactedRequestId[] {
		const open = this.getOpenMutation()

		if (open === null) {
			return []
		}

		const justified = this.getJustifiedImpacted()

		return open.impacted.filter(id => !justified.has(requestIdToString(id)))
	}

	/** Serialize the log to its JSON form. */
	public toJSON(): WalletCaptureClassificationAuditLog {
		return { entries: [...this.entries] }
	}

	/** Write the log atomically to disk. */
	public async save(): Promise<void> {
		if (this.path === '') {
			throw new Error('Audit log was constructed without a path; cannot save.')
		}

		const content = JSON.stringify(this.toJSON(), null, '\t') + '\n'

		await writeFileAtomically(this.path, content)
	}

	/**
	 * Return true if the in-memory log content matches what is on disk (used for
	 * tests and verification).
	 */
	public isInSync(): boolean {
		if (this.path === '' || !fs.existsSync(this.path)) {
			return false
		}

		const onDisk = fs.readFileSync(this.path, 'utf8')
		const inMemory = JSON.stringify(this.toJSON(), null, '\t') + '\n'

		return isSameJson(onDisk, inMemory)
	}

	/** A stable string form of the log, used for equality/diffing. */
	public stableString(): string {
		return stableJSONStringify(this.toJSON())
	}
}

/**
 * Load the audit log, or create an empty one if the file does not exist.
 */
export function loadAuditLog(
	validRequestIds?: ReadonlySet<string> | null,
): WalletCaptureClassificationAuditLogFile {
	const repoRoot = getRepositoryRoot()
	const absPath = path.join(repoRoot, AUDIT_LOG_RELATIVE_PATH)

	return WalletCaptureClassificationAuditLogFile.fromFile(absPath, validRequestIds ?? null)
}

import { entitiesForDomain } from '@/data/entities/domains/entity-domains'
import { PersonalInfo, type UserInfo, WalletInfo } from '@/schema/features/privacy/data-collection'

import {
	type WalletDataString,
	WalletStringOccurrenceType,
	walletStringOccurrenceTypeName,
} from './wallet-capture-file'

const ETHEREUM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i

// AWS Application/Network Load Balancer session cookies (AWSALB, AWSALBAPP,
// AWSALBCORS). Their values are high-entropy opaque session tokens.
const AWS_LOAD_BALANCER_COOKIE_RE = /^AWSALB/

// Google Analytics cookies/values.
const GOOGLE_ANALYTICS_CLIENT_ID_RE = /^GA\d+\.\d+\.\d+\.\d+$/
const GOOGLE_ANALYTICS_SESSION_ID_RE = /^GS\d+\.\d+\./
const GOOGLE_ANALYTICS_MEASUREMENT_ID_RE = /^G-[A-Z0-9]{8,}$/
const GOOGLE_ANALYTICS_COOKIE_NAME_RE = /^_ga[_-]|^_gid$|^_gat$|^_gali$|^_gcl_au$/

// Matomo (Piwik) visitor identifier, typically sent as the `_id` query
// parameter with a 16-digit hex value.
const MATOMO_VISITOR_ID_VALUE_RE = /^[0-9a-f]{16}$/i

// ISO 8601 timestamps (e.g. Sentry `sent_at`/`timestamp` fields, API request
// time values). They carry no user-identifying information on their own.
const ISO_8601_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

// Sentry session identifier, sent as the `sid` field of a Sentry event
// envelope. Its value is a 32-hex-digit UUID.
const SENTRY_SESSION_ID_VALUE_RE = /^[0-9a-f]{32}$/

// Chrome extension internal URLs (e.g. the wallet's own popup/onboarding
// pages, `chrome-extension://<extension-id>/popup.html#/unlock`). These are
// the wallet extension's URLs, not the user's browsing history. Only match
// actual URLs: a host (the extension ID) followed by any valid path, query
// string, and/or fragment, with no other characters.
const CHROME_EXTENSION_URL_RE =
	/^chrome-extension:\/\/[A-Za-z0-9]+(?:\/[A-Za-z0-9._%-]*)*(?:\?[A-Za-z0-9._&=+%-]*)?(?:#[A-Za-z0-9/._?&=%+-]*)?$/

/**
 * All dict fields (cookie names, header names, query parameter names, ...)
 * that this string appears in across all of its origins.
 */
function dictFieldOccurrences(
	str: WalletDataString,
): Array<{ occurrence: WalletStringOccurrenceType; key: string; branch: 'KEY' | 'VALUE' }> {
	const fields: Array<{
		occurrence: WalletStringOccurrenceType
		key: string
		branch: 'KEY' | 'VALUE'
	}> = []

	for (const origin of str.getOrigins().values()) {
		const field = origin.breadcrumbs.getDictField()

		if (field !== null) {
			fields.push(field)
		}
	}

	return fields
}

/** Whether the string appears as the value of given dict occurrence type with a key equal to `key` (or matching `key` when it is a RegExp). */
function isValueFromDictKey(
	str: WalletDataString,
	occurrence: WalletStringOccurrenceType,
	key: string | RegExp,
): boolean {
	return dictFieldOccurrences(str).some(f => {
		if (f.branch !== 'VALUE' || f.occurrence !== occurrence) {
			return false
		}

		return key instanceof RegExp ? key.test(f.key) : key === f.key
	})
}

/**
 * All fields that this string appears as the value of across all of its
 * origins, including fields nested inside (ND)JSON or otherwise decoded
 * payload content (e.g. a Sentry envelope's `sid` field).
 */
function nestedDictFieldOccurrences(
	str: WalletDataString,
): Array<{ occurrence: WalletStringOccurrenceType; key: string; branch: 'KEY' | 'VALUE' }> {
	const fields: Array<{
		occurrence: WalletStringOccurrenceType
		key: string
		branch: 'KEY' | 'VALUE'
	}> = []

	for (const origin of str.getOrigins().values()) {
		const field = origin.breadcrumbs.findField()

		if (field !== null) {
			fields.push(field)
		}
	}

	return fields
}

/** Whether the string is the value of a field nested in a payload with a key equal to `key` (or matching `key` when it is a RegExp). */
function isValueFromPayloadField(str: WalletDataString, key: string | RegExp): boolean {
	return nestedDictFieldOccurrences(str).some(f => {
		if (f.branch !== 'VALUE') {
			return false
		}

		return key instanceof RegExp ? key.test(f.key) : key === f.key
	})
}

/** Whether any origin of this string is a request to a domain operated by the given entity. */
function isFromEntity(str: WalletDataString, entityId: string): boolean {
	for (const origin of str.getOrigins().values()) {
		const resolved = entitiesForDomain(origin.request.domain)

		if (resolved !== null && resolved.operator.id === entityId) {
			return true
		}
	}

	return false
}

// Matomo/Piwik analytics hosts, e.g. `matomo.debank.com`, `piwik.example.org`.
const MATOMO_HOST_RE = /(^|\.)matomo\.|(^|\.)piwik\./i

/** Whether any origin of this string is a request to a Matomo/Piwik analytics host. */
function isFromMatomoHost(str: WalletDataString): boolean {
	for (const origin of str.getOrigins().values()) {
		if (MATOMO_HOST_RE.test(origin.request.domain)) {
			return true
		}
	}

	return false
}

/** Whether the string appears in any origin under the given occurrence type. */
function hasOccurrenceType(str: WalletDataString, occurrence: WalletStringOccurrenceType): boolean {
	for (const origin of str.getOrigins().values()) {
		if (origin.breadcrumbs.containsType(occurrence)) {
			return true
		}
	}

	return false
}

interface StringHeuristic {
	readonly info: UserInfo | 'BENIGN'
	/**
	 * Explanatory power of the heuristic: how specifically it pins down the
	 * data type. When several heuristics suggest the same `info`, the one with
	 * the highest power wins, as its reason carries the most information.
	 */
	readonly power: number
	/** Returns a human-readable reason if the heuristic matches, otherwise `null`. */
	readonly tryMatch: (str: WalletDataString) => string | null
}

const stringHeuristics: StringHeuristic[] = [
	{
		info: WalletInfo.ACCOUNT_ADDRESS,
		power: 10,
		tryMatch: str =>
			ETHEREUM_ADDRESS_RE.test(str.str.str)
				? 'matches the pattern of an Ethereum account address (0x + 40 hex digits)'
				: null,
	},
	{
		info: PersonalInfo.EMAIL,
		power: 10,
		tryMatch: str =>
			EMAIL_RE.test(str.str.str) ? 'matches the pattern of an email address' : null,
	},
	{
		info: PersonalInfo.TRACKING_IDENTIFIER,
		power: 6,
		tryMatch: str =>
			isValueFromDictKey(str, WalletStringOccurrenceType.COOKIE, AWS_LOAD_BALANCER_COOKIE_RE)
				? 'is the value of an AWS load balancer session cookie (AWSALB)'
				: null,
	},
	{
		info: PersonalInfo.TRACKING_IDENTIFIER,
		power: 6,
		tryMatch: str => {
			if (
				GOOGLE_ANALYTICS_CLIENT_ID_RE.test(str.str.str) ||
				GOOGLE_ANALYTICS_SESSION_ID_RE.test(str.str.str) ||
				GOOGLE_ANALYTICS_MEASUREMENT_ID_RE.test(str.str.str)
			) {
				return 'is a Google Analytics tracking identifier (GA cookie value)'
			}

			if (
				isValueFromDictKey(str, WalletStringOccurrenceType.COOKIE, GOOGLE_ANALYTICS_COOKIE_NAME_RE)
			) {
				return 'is a Google Analytics tracking cookie'
			}

			return null
		},
	},
	{
		info: PersonalInfo.TRACKING_IDENTIFIER,
		power: 5,
		tryMatch: str =>
			isFromMatomoHost(str) &&
			MATOMO_VISITOR_ID_VALUE_RE.test(str.str.str) &&
			isValueFromDictKey(str, WalletStringOccurrenceType.QUERY, '_id')
				? 'is a Matomo visitor identifier (_id query parameter)'
				: null,
	},
	{
		info: PersonalInfo.TRACKING_IDENTIFIER,
		power: 5,
		tryMatch: str =>
			isFromMatomoHost(str) && isValueFromDictKey(str, WalletStringOccurrenceType.QUERY, 'pv_id')
				? 'is a Matomo page view identifier (pv_id query parameter)'
				: null,
	},
	{
		info: PersonalInfo.TRACKING_IDENTIFIER,
		power: 4,
		tryMatch: str =>
			isFromMatomoHost(str) && isValueFromDictKey(str, WalletStringOccurrenceType.QUERY, 'uadata')
				? 'is a Matomo user-agent/device fingerprint (uadata query parameter)'
				: null,
	},
	{
		info: PersonalInfo.TRACKING_IDENTIFIER,
		power: 5,
		tryMatch: str =>
			isFromEntity(str, 'sentry') &&
			SENTRY_SESSION_ID_VALUE_RE.test(str.str.str) &&
			isValueFromPayloadField(str, 'sid')
				? 'is a Sentry session ID (sid field in the event envelope)'
				: null,
	},
	{
		info: PersonalInfo.TRACKING_IDENTIFIER,
		power: 2,
		tryMatch: str =>
			str.length >= 3 && hasOccurrenceType(str, WalletStringOccurrenceType.COOKIE)
				? 'is sent as a cookie'
				: null,
	},
	{
		info: PersonalInfo.TRACKING_IDENTIFIER,
		power: 1,
		tryMatch: str =>
			str.length >= 3 && str.getRoughOccurrences().size >= 3 && str.entropy.likelyIdentifying()
				? 'is a high-entropy string repeated across multiple requests'
				: null,
	},
	{
		info: 'BENIGN',
		power: 10,
		tryMatch: str => {
			const resolved = entitiesForDomain(str.str.str)

			if (resolved === null) {
				return null
			}

			return `domain name known to be associated with ${resolved.operator.name}`
		},
	},
	{
		info: 'BENIGN',
		power: 3,
		tryMatch: str => (ISO_8601_TIMESTAMP_RE.test(str.str.str) ? 'is an ISO 8601 timestamp' : null),
	},
	{
		info: 'BENIGN',
		power: 3,
		tryMatch: str =>
			CHROME_EXTENSION_URL_RE.test(str.str.str)
				? "is the wallet extension's own URL, not user data"
				: null,
	},
	{
		info: 'BENIGN',
		power: 1,
		tryMatch: str => {
			if (str.length >= 3 && str.entropy.likelyIdentifying()) {
				return null
			}

			const reasons = dictFieldOccurrences(str)
				.filter(f => f.branch === 'KEY')
				.map(f => `is a ${walletStringOccurrenceTypeName(f.occurrence)} key/parameter`)

			if (reasons.length > 0) {
				return reasons[0]
			}

			return null
		},
	},
]

/**
 * Heuristically classify the user data that a string from a network capture is
 * carrying. Returns a map from user data type to a human-readable reason for
 * the suggestion. When several heuristics point to the same data type, the one
 * with the most explanatory power wins, so its reason is the one returned.
 */
export function classifyStringHeuristically(
	str: WalletDataString,
): Map<UserInfo | 'BENIGN', string> {
	const best = new Map<UserInfo | 'BENIGN', { power: number; reason: string }>()

	for (const heuristic of stringHeuristics) {
		const reason = heuristic.tryMatch(str)

		if (reason === null) {
			continue
		}

		const current = best.get(heuristic.info)

		if (current === undefined || heuristic.power > current.power) {
			best.set(heuristic.info, { power: heuristic.power, reason })
		}
	}

	return new Map(Array.from(best, ([info, { reason }]) => [info, reason]))
}

/**
 * Returns whether `str` is non-UTF8, i.e. whether it cannot be losslessly
 * represented as valid UTF-8 text (e.g. it contains lone surrogates or other
 * malformed byte sequences). Such strings must be stored as base64 rather than
 * as a plain JSON string.
 */
export function looksBinary(str: string): boolean {
	const bytes = new TextEncoder().encode(str)

	try {
		const roundTripped = new TextDecoder('utf-8', { fatal: true }).decode(bytes)

		return roundTripped !== str
	} catch {
		return true
	}
}

export interface BinaryAwareChunk {
	kind: 'printable' | 'binary'
	text: string
}

/**
 * Chunks a (possibly binary) string into interleaved runs of >=8 valid UTF-8
 * code points ("printable" chunks) and everything else (lone surrogates and
 * shorter printable runs, which are meant to be shown as escaped bytes). Runs
 * of valid UTF-8 with fewer than 8 characters are merged into the surrounding
 * binary chunk so that only longer printable subsequences are shown as
 * readable text.
 */
export function chunkBinaryAwareString(str: string): BinaryAwareChunk[] {
	const runs: BinaryAwareChunk[] = []
	let i = 0

	while (i < str.length) {
		const code = str.charCodeAt(i)
		let kind: BinaryAwareChunk['kind']
		let advance: number

		if (
			code >= 0xd800 &&
			code <= 0xdbff &&
			i + 1 < str.length &&
			str.charCodeAt(i + 1) >= 0xdc00 &&
			str.charCodeAt(i + 1) <= 0xdfff
		) {
			kind = 'printable'
			advance = 2
		} else if (code >= 0xd800 && code <= 0xdfff) {
			kind = 'binary'
			advance = 1
		} else {
			kind = 'printable'
			advance = 1
		}

		const last = runs[runs.length - 1]

		if (last !== undefined && last.kind === kind) {
			last.text += str.slice(i, i + advance)
		} else {
			runs.push({ kind, text: str.slice(i, i + advance) })
		}

		i += advance
	}

	// Merge short printable runs (<8 code points) into the surrounding binary
	// chunk so only runs of >=8 UTF-8 characters are shown as readable text.
	const chunks: BinaryAwareChunk[] = []
	let pendingBinary = ''

	for (const run of runs) {
		if (run.kind === 'printable' && Array.from(run.text).length >= 8) {
			if (pendingBinary !== '') {
				chunks.push({ kind: 'binary', text: pendingBinary })
				pendingBinary = ''
			}

			chunks.push(run)
		} else {
			pendingBinary += run.text
		}
	}

	if (pendingBinary !== '') {
		chunks.push({ kind: 'binary', text: pendingBinary })
	}

	return chunks
}

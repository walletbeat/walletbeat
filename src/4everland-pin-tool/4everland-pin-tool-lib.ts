/**
 * Client for the 4EVERLAND Pinning Services API (`GET /pins`).
 *
 * 4EVERLAND implements the standardized IPFS Pinning Services API
 * (https://ipfs.github.io/pinning-services-api-spec/). This module exposes the
 * operations needed by the 4everland-pin-tool CLI against the dedicated
 * 4EVERLAND endpoint.
 */

import { Enum } from '@/utils/enum'

/** Base URL of the 4EVERLAND Pinning Services API. */
export const API_BASE_URL = 'https://api.4everland.dev'

/**
 * Maximum number of records returned per request. The Pinning Services API
 * spec caps `limit` at 1000.
 */
const PAGE_LIMIT = 1000

/** A single pin record as returned by `GET /pins` (the `PinStatus` object). */
export interface EverlandPin {
	/** Globally unique identifier of the pin request. */
	requestid: string
	/** Current status of the pin (`queued`, `pinning`, `pinned`, `failed`). */
	status: string
	/** Immutable RFC 3339 timestamp of when the pin request was created. */
	created: string
	/** The pinned content descriptor. */
	pin: {
		/** Content Identifier (CID) of the pinned data. */
		cid: string
	}
}

/** Response shape of `GET /pins` (the `PinResults` object). */
interface PinResults {
	/** The total number of pin objects matching the query filters. */
	count: number
	/** The requested page of pin records. */
	results: EverlandPin[]
}

/** A pinned CID together with the timestamp of its most recent pin. */
export interface PinnedCID {
	/** Content Identifier (CID) of the pinned data. */
	cid: string
	/** RFC 3339 timestamp of when the pin was created (queued). */
	created: string
}

/** The statuses a pin object can have at a pinning service. */
export enum PinStatus {
	/** The pinning operation is waiting in the queue. */
	QUEUED = 'queued',
	/** The pinning operation is in progress. */
	PINNING = 'pinning',
	/** The pin was pinned successfully. */
	PINNED = 'pinned',
	/** The pinning service was unable to finish the pinning operation. */
	FAILED = 'failed',
}

/** Helper for parsing and validating {@link PinStatus} values. */
export const pinStatusEnum = new Enum<PinStatus>({
	[PinStatus.QUEUED]: true,
	[PinStatus.PINNING]: true,
	[PinStatus.PINNED]: true,
	[PinStatus.FAILED]: true,
})

/** Narrow an unknown value to {@link EverlandPin}. */
function isEverlandPin(value: unknown): value is EverlandPin {
	if (typeof value !== 'object' || value === null) {
		return false
	}

	const candidate = value as {
		requestid?: unknown
		status?: unknown
		created?: unknown
		pin?: unknown
	}

	return (
		typeof candidate.requestid === 'string' &&
		typeof candidate.status === 'string' &&
		typeof candidate.created === 'string' &&
		typeof candidate.pin === 'object' &&
		candidate.pin !== null &&
		typeof (candidate.pin as { cid?: unknown }).cid === 'string'
	)
}

/** Narrow an unknown value to {@link PinResults}. */
function isPinResults(value: unknown): value is PinResults {
	if (typeof value !== 'object' || value === null) {
		return false
	}

	const candidate = value as { count?: unknown; results?: unknown }

	return (
		typeof candidate.count === 'number' &&
		Array.isArray(candidate.results) &&
		candidate.results.every(isEverlandPin)
	)
}

/**
 * List the CIDs of every pin matching the given statuses pinned under the
 * account identified by the given access token.
 *
 * The result is de-duplicated by CID (keeping the most recent pin for a CID
 * that was pinned more than once). When `statuses` is omitted, only
 * successful (`pinned`) pins are returned, matching the API's default
 * behavior when no `status` filter is supplied. Results are paginated through
 * the `created` cursor so that accounts with more than one page of pins are
 * fully enumerated.
 *
 * @throws if the request fails or the API returns a non-2xx response.
 */
export async function listPinnedCIDs(
	token: string,
	statuses?: readonly PinStatus[],
): Promise<PinnedCID[]> {
	const byCid = new Map<string, string>()
	const seenRequestIds = new Set<string>()
	let before: string | undefined

	for (;;) {
		const query = new URLSearchParams({ limit: String(PAGE_LIMIT) })

		if (statuses !== undefined && statuses.length > 0) {
			query.set('status', statuses.join(','))
		}

		if (before !== undefined) {
			query.set('before', before)
		}

		const url = `${API_BASE_URL}/pins?${query.toString()}`

		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${token}` },
		})

		if (!response.ok) {
			const body = await response.text()

			throw new Error(`4EVERLAND /pins request failed (${response.status}): ${body}`)
		}

		const data = (await response.json()) as unknown

		if (!isPinResults(data)) {
			throw new Error('Unexpected response from the 4EVERLAND /pins endpoint.')
		}

		const { results } = data

		if (results.length === 0) {
			return [...byCid].map(([cid, created]) => ({ cid, created }))
		}

		let newRequestCount = 0
		let oldestCreated: string | undefined

		for (const result of results) {
			if (!seenRequestIds.has(result.requestid)) {
				seenRequestIds.add(result.requestid)
				newRequestCount += 1

				// De-duplicate by CID, keeping the most recent pin's timestamp.
				const existing = byCid.get(result.pin.cid)

				if (existing === undefined || result.created > existing) {
					byCid.set(result.pin.cid, result.created)
				}
			}

			if (oldestCreated === undefined || result.created < oldestCreated) {
				oldestCreated = result.created
			}
		}

		if (results.length < PAGE_LIMIT) {
			return [...byCid].map(([cid, created]) => ({ cid, created }))
		}

		if (oldestCreated === undefined) {
			return [...byCid].map(([cid, created]) => ({ cid, created }))
		}

		before =
			newRequestCount === 0 ? new Date(Date.parse(oldestCreated) - 1).toISOString() : oldestCreated
	}
}

import { cac } from 'cac'

import { getErrorMessage } from '@/types/errors'
import { Enum } from '@/utils/enum'

import {
	listPinnedCIDs,
	type PinnedCID,
	type PinStatus,
	pinStatusEnum,
} from './4everland-pin-tool-lib'

/** Options accepted by the `list-pinned` command. */
interface ListPinnedOptions {
	/** Comma-separated list of pin statuses to filter by. */
	status?: string
	/** Sort order for the listed CIDs. */
	sort?: string
	/** Only list pins created strictly before this date or RFC 3339 timestamp. */
	olderThan?: string
	/** Only list pins created strictly after this date or RFC 3339 timestamp. */
	newerThan?: string
}

/** Sort orders supported by the `--sort` flag. */
enum SortOrder {
	OLDEST_FIRST = 'oldest-first',
	NEWEST_FIRST = 'newest-first',
}

const sortOrderEnum = new Enum<SortOrder>({
	[SortOrder.OLDEST_FIRST]: true,
	[SortOrder.NEWEST_FIRST]: true,
})

/** Parse and validate the `--status` option into an array of pin statuses. */
function parseStatuses(raw: string | undefined): PinStatus[] | undefined {
	if (raw === undefined || raw === '') {
		return undefined
	}

	const statuses: PinStatus[] = []

	for (const part of raw.split(',')) {
		const trimmed = part.trim()

		if (trimmed === '') {
			continue
		}

		if (!pinStatusEnum.is(trimmed)) {
			throw new Error(
				`Invalid pin status \`${trimmed}\`. Expected one of: ${pinStatusEnum.items.join(', ')}`,
			)
		}

		statuses.push(trimmed)
	}

	return statuses
}

/**
 * Parse and validate the `--sort` option. Defaults to {@link SortOrder.OLDEST_FIRST}.
 */
function parseSortOrder(raw: string | undefined): SortOrder {
	if (raw === undefined || raw === '') {
		return SortOrder.OLDEST_FIRST
	}

	if (!sortOrderEnum.is(raw)) {
		throw new Error(
			`Invalid sort order \`${raw}\`. Expected one of: ${sortOrderEnum.items.join(', ')}`,
		)
	}

	return raw
}

/**
 * Normalize a `YYYY-MM-DD` date or RFC 3339 timestamp to an ISO-8601 UTC
 * timestamp. A bare date is interpreted as midnight (00:00:00) UTC.
 */
function parseTimestamp(input: string): string {
	const dateOnly = /^\d{4}-\d{2}-\d{2}$/

	if (dateOnly.test(input)) {
		const timestamp = `${input}T00:00:00.000Z`

		if (Number.isNaN(Date.parse(timestamp))) {
			throw new Error(`Invalid date \`${input}\`.`)
		}

		return timestamp
	}

	const time = Date.parse(input)

	if (Number.isNaN(time)) {
		throw new Error(`Invalid date or RFC 3339 timestamp \`${input}\`.`)
	}

	return new Date(time).toISOString()
}

/** Numeric comparison of two RFC 3339 / ISO-8601 timestamps. */
function compareTimestamps(a: string, b: string): number {
	return Date.parse(a) - Date.parse(b)
}

/**
 * Filter and sort the given pinned CIDs according to the `--newer-than`,
 * `--older-than` and `--sort` options.
 */
function arrangePinnedCIDs(
	pins: PinnedCID[],
	sortOrder: SortOrder,
	olderThan: string | undefined,
	newerThan: string | undefined,
): PinnedCID[] {
	const filtered = pins.filter(
		pin =>
			(olderThan === undefined || compareTimestamps(pin.created, olderThan) < 0) &&
			(newerThan === undefined || compareTimestamps(pin.created, newerThan) > 0),
	)

	const direction = sortOrder === SortOrder.NEWEST_FIRST ? -1 : 1

	return filtered.sort((a, b) => direction * compareTimestamps(a.created, b.created))
}

/**
 * CLI for managing pins on the 4EVERLAND Pinning Services API.
 *
 * Authenticates with the account access token supplied via the
 * `ACCESS_TOKEN_4EVERLAND` environment variable.
 */
const cli = cac('4everland-pin-tool')

cli
	.command('list-pinned', 'List all CIDs pinned under the account')
	.option(
		'--status <statuses>',
		`Comma-separated list of pin statuses to filter by (${pinStatusEnum.items.join(', ')})`,
	)
	.option('--sort <order>', `Sort listed CIDs (${sortOrderEnum.items.join(', ')})`)
	.option(
		'--older-than <timestamp>',
		'Only list pins created before this date (YYYY-MM-DD, UTC) or RFC 3339 timestamp',
	)
	.option(
		'--newer-than <timestamp>',
		'Only list pins created after this date (YYYY-MM-DD, UTC) or RFC 3339 timestamp',
	)
	.action(async (options: ListPinnedOptions) => {
		try {
			const token = process.env.ACCESS_TOKEN_4EVERLAND

			if (token === undefined || token === '') {
				throw new Error('The ACCESS_TOKEN_4EVERLAND environment variable is required.')
			}

			const statuses = parseStatuses(options.status)
			const sortOrder = parseSortOrder(options.sort)
			const olderThan =
				options.olderThan === undefined ? undefined : parseTimestamp(options.olderThan)
			const newerThan =
				options.newerThan === undefined ? undefined : parseTimestamp(options.newerThan)

			const pins = await listPinnedCIDs(token, statuses)
			const arranged = arrangePinnedCIDs(pins, sortOrder, olderThan, newerThan)

			for (const pin of arranged) {
				process.stdout.write(`${pin.cid}\n`)
			}
		} catch (error) {
			process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
			process.exit(1)
		}
	})

cli.help()
cli.version('1.0.0')

// With no subcommand given, print usage info instead of exiting silently.
if (process.argv.slice(2).length === 0) {
	cli.outputHelp()
	process.exit(0)
}

try {
	cli.parse()
} catch (error) {
	process.stderr.write(`Error: ${getErrorMessage(error)}\n`)
	process.exit(1)
}
